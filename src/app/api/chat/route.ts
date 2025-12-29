import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { buildChatSystemPrompt, FamilyContext } from '@/lib/ai/chat-system-prompt';
import { auth } from '@/lib/auth';
import { getWeekKey } from '@/lib/ritual/weekKey';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { getAgentContext } from '@/lib/agent';

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

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages } = await req.json();

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
          },
        },
        familyMember: true,
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
          return {
            message: day
              ? `Here's what's happening on ${day.charAt(0).toUpperCase() + day.slice(1)}`
              : `Here's your week overview`,
            tasks: tasks.map(t => ({ title: t.title, status: t.status, assignedTo: t.assignedTo })),
            eventCount: 0,
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
    };

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: buildChatSystemPrompt(context),
      messages,
      tools,
    });

    // Create a custom response that includes tool call markers
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
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
            }
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
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
