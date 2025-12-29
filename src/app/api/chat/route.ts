import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { buildChatSystemPrompt, FamilyContext } from '@/lib/ai/chat-system-prompt';
import { auth } from '@/lib/auth';
import { getWeekKey } from '@/lib/ritual/weekKey';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { getAgentContext } from '@/lib/agent';
import { fetchGoogleCalendarEvents, getWeekBoundaries, GoogleCalendarEvent } from '@/lib/calendar/google';
import {
  getOrCreateChatConversation,
  addMessage,
  getConversationMessages,
  ToolCall,
} from '@/lib/conversations';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Define tool schemas
const createTaskSchema = z.object({
  title: z.string().describe('What needs to be done - keep it concise'),
  description: z.string().optional().describe('Additional details about the task'),
  assignedTo: z.enum(['parent_a', 'parent_b', 'both']).optional()
    .describe('Who should handle this task. Default to "both" if unclear'),
  priority: z.enum(['low', 'normal', 'high']).optional()
    .describe('How urgent is this task'),
  childName: z.string().optional()
    .describe('Name of child this task relates to, if any'),
});

const createEventSchema = z.object({
  title: z.string().describe('Name of the event'),
  day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).describe('Day of the week'),
  time: z.string().describe('Time in format like "2:00 PM" or "14:00"'),
  duration: z.number().optional().describe('Duration in minutes'),
  parent: z.enum(['parent_a', 'parent_b', 'both']).optional()
    .describe('Who is responsible for this event'),
});

const queryWeekSchema = z.object({
  day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).optional()
    .describe('Specific day to query, or omit for whole week'),
});

const notifyPartnerSchema = z.object({
  message: z.string().describe('The message to send to your partner'),
  urgent: z.boolean().optional()
    .describe('If true, sends as an urgent notification'),
});

const swapEventsSchema = z.object({
  day1: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).describe('First day to swap'),
  day2: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).describe('Second day to swap'),
  eventDescription: z.string().optional()
    .describe('Description of what is being swapped (e.g., "school pickup")'),
});

const draftEmailSchema = z.object({
  to: z.string().describe('Recipient email address or descriptive name like "the school", "teacher", "coach"'),
  subject: z.string().describe('Email subject line'),
  body: z.string().describe('Email body content - write in a friendly, professional tone'),
  context: z.string().optional()
    .describe('Brief explanation of why this email is being sent, for the user to review'),
});

const getConflictsSchema = z.object({
  includeResolved: z.boolean().optional()
    .describe('Whether to include resolved conflicts. Default is false (only active conflicts)'),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, conversationId: requestedConversationId } = await req.json();

    // Fetch user's household data for context
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        household: {
          include: {
            children: true,
            tasks: {
              where: { weekKey: getWeekKey() },
              take: 10,
            },
            insights: {
              where: {
                status: { in: ['pending', 'sent'] },
                type: 'conflict',
              },
              take: 10,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        familyMember: {
          include: {
            calendars: {
              where: { included: true },
            },
          },
        },
      },
    });

    // Fetch agent context (memory, patterns, pending actions)
    let agentMemory: FamilyContext['agentMemory'] = undefined;
    if (user?.householdId) {
      try {
        const agentCtx = await getAgentContext(user.householdId, session.user.id);
        agentMemory = {
          preferences: agentCtx.preferences.map(p => ({
            key: p.key,
            value: p.value
          })),
          patterns: agentCtx.patterns.map(p => ({
            key: p.key,
            description: (p.value as { description?: string })?.description || p.key,
            confidence: p.confidence,
          })),
          pendingActions: agentCtx.pendingActions.map(a => ({
            actionType: a.actionType,
            description: JSON.stringify(a.actionData),
          })),
        };
      } catch (error) {
        console.error('Failed to fetch agent context:', error);
        // Continue without agent context
      }
    }

    // Build context with real data
    const context: FamilyContext = {
      today: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      weekKey: getWeekKey(),
      children: user?.household?.children.map(c => ({ name: c.name })) || [],
      userRole: (user?.familyMember?.role as 'parent_a' | 'parent_b') || 'parent_a',
      events: [], // Will be populated from calendar integration
      conflicts: [],
      tasks: user?.household?.tasks.map(t => ({ title: t.title, status: t.status })) || [],
      agentMemory,
    };

    // Get or create conversation for persistence
    let conversationId = requestedConversationId;
    if (!conversationId && user?.householdId) {
      conversationId = await getOrCreateChatConversation(session.user.id, user.householdId);
    }

    // Get the latest user message to persist
    const latestUserMessage = messages[messages.length - 1];
    if (conversationId && latestUserMessage?.role === 'user') {
      await addMessage(conversationId, 'user', latestUserMessage.content, 'chat');
    }

    // Define tools using the AI SDK tool() helper
    const tools = {
      createTask: tool({
        description: 'Create a new task or reminder for the family. Use this when the user wants to add a todo item, reminder, or task.',
        inputSchema: createTaskSchema,
      }),
      createEvent: tool({
        description: 'Create a new calendar event. Use this when the user wants to add something to the schedule.',
        inputSchema: createEventSchema,
      }),
      queryWeek: tool({
        description: 'Get events for a specific day or the whole week',
        inputSchema: queryWeekSchema,
        execute: async ({ day }) => {
          const tasks = user?.household?.tasks || [];
          const connectedCalendars = user?.familyMember?.calendars || [];

          // Get week boundaries
          const { start: weekStart, end: weekEnd } = getWeekBoundaries();

          // Day map for filtering
          const dayMap: Record<string, number> = {
            'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0
          };

          // Determine time range
          let timeMin = weekStart;
          let timeMax = weekEnd;

          if (day) {
            const targetDay = dayMap[day];
            const dayDate = new Date(weekStart);
            const daysToAdd = targetDay === 0 ? 6 : targetDay - 1;
            dayDate.setDate(weekStart.getDate() + daysToAdd);
            timeMin = new Date(dayDate);
            timeMin.setHours(0, 0, 0, 0);
            timeMax = new Date(dayDate);
            timeMax.setHours(23, 59, 59, 999);
          }

          // Fetch events from all connected calendars
          const allEvents: Array<{
            id: string;
            title: string;
            start: string;
            end: string;
            location?: string;
            calendarName: string;
          }> = [];

          for (const calendar of connectedCalendars) {
            try {
              const events = await fetchGoogleCalendarEvents(
                session.user.id,
                calendar.googleCalendarId,
                timeMin,
                timeMax
              );

              for (const event of events) {
                if (event.summary) {
                  allEvents.push({
                    id: event.id,
                    title: event.summary,
                    start: event.start?.dateTime || event.start?.date || '',
                    end: event.end?.dateTime || event.end?.date || '',
                    location: event.location,
                    calendarName: calendar.name,
                  });
                }
              }
            } catch (error) {
              console.error(`Failed to fetch events from calendar ${calendar.name}:`, error);
            }
          }

          // Sort events by start time
          allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

          return {
            message: day
              ? `Here's what's happening on ${day.charAt(0).toUpperCase() + day.slice(1)}`
              : `Here's your week overview`,
            events: allEvents,
            tasks: tasks.map(t => ({ title: t.title, status: t.status, assignedTo: t.assignedTo })),
            eventCount: allEvents.length,
          };
        },
      }),
      notifyPartner: tool({
        description: 'Send a message to your partner. Use this when the user wants to communicate something to their co-parent, like running late or asking for help.',
        inputSchema: notifyPartnerSchema,
      }),
      swapEvents: tool({
        description: 'Propose swapping responsibilities between two days. Use this when the user wants to trade duties with their partner.',
        inputSchema: swapEventsSchema,
      }),
      draftEmail: tool({
        description: 'Draft and send an email on behalf of the user. Use this when the user wants to send an email, such as notifying school of absence, thanking someone, or communicating with teachers/coaches. The user will review and approve before sending.',
        inputSchema: draftEmailSchema,
      }),
      getConflicts: tool({
        description: 'Get schedule conflicts and issues detected by the family assistant. Use this when the user asks about conflicts, scheduling problems, or what needs attention.',
        inputSchema: getConflictsSchema,
        execute: async ({ includeResolved }) => {
          const insights = user?.household?.insights || [];

          // Filter based on includeResolved
          const relevantInsights = includeResolved
            ? insights
            : insights.filter(i => i.status === 'pending' || i.status === 'sent');

          return {
            message: relevantInsights.length > 0
              ? `Found ${relevantInsights.length} scheduling ${relevantInsights.length === 1 ? 'issue' : 'issues'}`
              : 'No scheduling conflicts detected',
            conflicts: relevantInsights.map(i => ({
              id: i.id,
              type: i.type,
              severity: i.severity,
              title: i.title,
              description: i.description,
              status: i.status,
            })),
            conflictCount: relevantInsights.length,
          };
        },
      }),
    };

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: buildChatSystemPrompt(context),
      messages,
      tools,
    });

    // Create a custom response that includes tool call markers and persists the response
    const encoder = new TextEncoder();
    let fullResponse = '';
    const collectedToolCalls: ToolCall[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(chunk));
          }

          // Check for tool calls after streaming completes
          const response = await result;
          const toolCalls = await response.toolCalls;
          if (toolCalls && toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
              // Emit tool call marker
              const marker = `[TOOL:${toolCall.toolName}:${JSON.stringify(toolCall.input)}]`;
              controller.enqueue(encoder.encode(marker));

              // Collect tool calls for persistence
              collectedToolCalls.push({
                name: toolCall.toolName,
                input: toolCall.input as Record<string, unknown>,
                status: 'pending',
              });
            }
          }

          // Persist assistant response to conversation
          if (conversationId && fullResponse.trim()) {
            await addMessage(
              conversationId,
              'assistant',
              fullResponse,
              'chat',
              collectedToolCalls.length > 0 ? { toolCalls: collectedToolCalls } : undefined
            );
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Conversation-Id': conversationId || '',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
