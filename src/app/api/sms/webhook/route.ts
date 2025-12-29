/**
 * SMS Webhook - Handles incoming SMS from Twilio
 *
 * When a user replies to an FamilyOS SMS, Twilio calls this webhook.
 * We parse the reply, find the relevant insight, and take action.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseIncomingSMS, sendSMS, parseReply, type InsightType } from '@/lib/sms';
import { fetchGoogleCalendarEvents, getWeekBoundaries } from '@/lib/calendar/google';
import { createGoogleCalendarEvent } from '@/lib/calendar/write';
import { getWeekKey } from '@/lib/ritual/weekKey';

// Twilio sends form-encoded data
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });

    const incoming = parseIncomingSMS(body);
    console.log('[SMS Webhook] Received from', incoming.from, ':', incoming.body);

    // Find user by phone number
    const user = await prisma.user.findFirst({
      where: { phoneNumber: incoming.from },
      include: {
        household: true,
        familyMember: true,
      },
    });

    if (!user) {
      console.log('[SMS Webhook] Unknown phone number:', incoming.from);
      // Return TwiML with no response (don't reply to unknown numbers)
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Find the most recent pending/sent insight for this household
    const recentInsight = await prisma.insight.findFirst({
      where: {
        householdId: user.householdId!,
        status: { in: ['sent', 'pending'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    let responseMessage: string;

    if (!recentInsight) {
      // No pending insight - treat as general message
      responseMessage = await handleGeneralMessage(incoming.body, user);
    } else {
      // Parse reply based on insight type
      const parsed = parseReply(recentInsight.type as InsightType, incoming.body);

      if (parsed.valid) {
        responseMessage = await handleInsightReply(recentInsight, parsed.action, user);
      } else {
        responseMessage = `I didn't understand "${incoming.body}". Try: ${getHelpText(recentInsight.type as InsightType)}`;
      }
    }

    // Return TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(responseMessage)}</Message>
</Response>`;

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('[SMS Webhook] Error:', error);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
}

/**
 * Handle reply to a specific insight
 */
async function handleInsightReply(
  insight: { id: string; type: string; householdId: string; metadata: unknown },
  action: string,
  user: { id: string; name: string | null; householdId: string | null; familyMember: { displayName: string } | null }
): Promise<string> {
  const displayName = user.familyMember?.displayName || user.name || 'Someone';

  // Update insight as resolved
  await prisma.insight.update({
    where: { id: insight.id },
    data: {
      status: 'resolved',
      resolution: action,
      resolvedById: user.id,
      resolvedAt: new Date(),
    },
  });

  // Handle different actions
  switch (action) {
    case 'add_to_calendar':
      // Calendar write-back: create the event from insight metadata
      try {
        const metadata = insight.metadata as Record<string, unknown> | null;
        if (metadata?.eventName && metadata?.day) {
          const calendarResult = await addEventFromInsight(user.id, metadata);
          if (calendarResult.success) {
            await notifyPartner(user, `${displayName} added "${metadata.eventName}" to their calendar`);
            return `Done! Added "${metadata.eventName}" to your calendar.`;
          }
        }
        await notifyPartner(user, `${displayName} acknowledged the calendar gap`);
        return "Noted! Open the app to add the event manually.";
      } catch {
        return "Couldn't add to calendar. Try from the app instead.";
      }

    case 'dismiss':
      return "Got it, dismissed.";

    case 'assign_self':
      await notifyPartner(user, `${displayName} will handle this one`);
      return "Got it, you're on it! I'll let your partner know.";

    case 'assign_partner':
      await notifyPartner(user, `${displayName} asked if you can handle this`);
      return "Asked your partner. I'll let you know what they say.";

    case 'need_help':
      return "No problem! Open the app for more options, or reply with what you need.";

    case 'need_backup':
      return "Looking for backup options... Check the app for caretaker contacts, or reply with a specific request.";

    case 'will_handle':
      await notifyPartner(user, `${displayName} will handle the coverage gap`);
      return "Got it, you'll figure it out. I'll let your partner know.";

    case 'discuss':
      return "Good idea to discuss. I'll bring this up in your next sync.";

    case 'acknowledge':
      return "Noted. Let me know if you want to rebalance.";

    case 'mark_done':
      return "Great, marked as done! One less thing to worry about.";

    case 'remind_later':
      // Schedule reminder by creating a task for tomorrow
      try {
        const metadata = insight.metadata as Record<string, unknown> | null;
        const reminderTitle = metadata?.eventName
          ? `Reminder: ${metadata.eventName}`
          : `Follow up: ${insight.type}`;

        await prisma.task.create({
          data: {
            householdId: insight.householdId,
            weekKey: getWeekKey(),
            title: String(reminderTitle),
            description: `Reminder from insight: ${insight.type}`,
            type: 'reminder',
            status: 'pending',
            priority: 'normal',
            assignedTo: 'both',
            createdBy: user.id,
          },
        });
        return "I'll remind you tomorrow. Added to your tasks.";
      } catch {
        return "I'll remind you tomorrow.";
      }

    default:
      return "Got it!";
  }
}

/**
 * Handle general messages (not replies to insights)
 */
async function handleGeneralMessage(
  message: string,
  user: { id: string; householdId: string | null }
): Promise<string> {
  const lowerMessage = message.toLowerCase().trim();

  // Simple command handling
  if (lowerMessage === 'help' || lowerMessage === '?') {
    return "FamilyOS commands:\n• WEEK - What's happening this week\n• TODAY - Today's schedule\n• STATUS - Check pending items\n• HELP - Show this message";
  }

  if (lowerMessage === 'week' || lowerMessage === 'schedule') {
    return await getWeekSummary(user);
  }

  if (lowerMessage === 'today') {
    return await getTodaySummary(user);
  }

  if (lowerMessage === 'status') {
    const pendingInsights = await prisma.insight.count({
      where: {
        householdId: user.householdId!,
        status: { in: ['pending', 'sent'] },
      },
    });

    if (pendingInsights === 0) {
      return "All clear! No pending items.";
    }
    return `You have ${pendingInsights} item${pendingInsights > 1 ? 's' : ''} to address. I'll send the next one.`;
  }

  // Default response for unknown messages
  return "I'm not sure what you mean. Reply HELP for available commands, or open the app.";
}

/**
 * Notify partner about an action
 */
async function notifyPartner(
  user: { id: string; householdId: string | null },
  message: string
): Promise<void> {
  if (!user.householdId) return;

  // Find partner
  const partner = await prisma.user.findFirst({
    where: {
      householdId: user.householdId,
      id: { not: user.id },
      phoneNumber: { not: null },
      phoneVerified: true,
    },
  });

  if (partner?.phoneNumber) {
    await sendSMS({
      to: partner.phoneNumber,
      body: `✓ ${message}`,
    });
  }
}

/**
 * Get help text for an insight type
 */
function getHelpText(type: InsightType): string {
  switch (type) {
    case 'calendar_gap':
      return 'YES or NO';
    case 'conflict':
      return 'A, B, or HELP';
    case 'coverage_gap':
      return 'YES or HANDLE';
    case 'load_imbalance':
      return 'HELP or OK';
    case 'prep_reminder':
      return 'DONE or REMIND';
    default:
      return 'YES, NO, or HELP';
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Add event to calendar from insight metadata
 */
async function addEventFromInsight(
  userId: string,
  metadata: Record<string, unknown>
): Promise<{ success: boolean; eventId?: string }> {
  // Get user's primary calendar
  const familyMember = await prisma.familyMember.findUnique({
    where: { userId },
    include: { calendars: { where: { included: true }, take: 1 } },
  });

  if (!familyMember?.calendars[0]) {
    return { success: false };
  }

  // Parse day to actual date
  const dayStr = String(metadata.day).toLowerCase();
  const now = new Date();
  let eventDate = new Date(now);

  // Handle relative days
  if (dayStr === 'today') {
    // Use today
  } else if (dayStr === 'tomorrow') {
    eventDate.setDate(eventDate.getDate() + 1);
  } else {
    // Try to parse weekday name (monday, tuesday, etc.)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDayIndex = dayNames.indexOf(dayStr);
    if (targetDayIndex !== -1) {
      const currentDay = now.getDay();
      let daysUntilTarget = targetDayIndex - currentDay;
      if (daysUntilTarget <= 0) daysUntilTarget += 7;
      eventDate.setDate(now.getDate() + daysUntilTarget);
    }
  }

  // Default to 9 AM if no time specified
  eventDate.setHours(9, 0, 0, 0);

  // Parse time if provided
  if (metadata.time) {
    const timeStr = String(metadata.time);
    const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2] || '0', 10);
      const meridiem = timeMatch[3];
      if (meridiem?.toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (meridiem?.toUpperCase() === 'AM' && hours === 12) hours = 0;
      eventDate.setHours(hours, minutes, 0, 0);
    }
  }

  const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000); // 1 hour default

  const eventId = await createGoogleCalendarEvent(
    userId,
    familyMember.calendars[0].googleCalendarId,
    {
      summary: String(metadata.eventName),
      description: 'Added via FamilyOS SMS',
      start: eventDate,
      end: endDate,
    }
  );

  return { success: true, eventId };
}

/**
 * Get week summary for SMS
 */
async function getWeekSummary(
  user: { id: string; householdId: string | null }
): Promise<string> {
  if (!user.householdId) {
    return "No household set up yet. Open the app to get started.";
  }

  try {
    // Get user's calendars
    const familyMember = await prisma.familyMember.findUnique({
      where: { userId: user.id },
      include: {
        calendars: { where: { included: true } },
      },
    });

    if (!familyMember?.calendars.length) {
      return "No calendars connected. Connect a calendar in the app first.";
    }

    const { start, end } = getWeekBoundaries();
    const allEvents: Array<{ summary: string; start: Date; day: string }> = [];

    // Fetch events from all connected calendars
    for (const calendar of familyMember.calendars) {
      try {
        const events = await fetchGoogleCalendarEvents(
          user.id,
          calendar.googleCalendarId,
          start,
          end
        );

        for (const event of events) {
          if (event.summary && event.start) {
            const eventStart = event.start.dateTime
              ? new Date(event.start.dateTime)
              : event.start.date
                ? new Date(event.start.date)
                : null;

            if (eventStart) {
              allEvents.push({
                summary: event.summary,
                start: eventStart,
                day: eventStart.toLocaleDateString('en-US', { weekday: 'short' }),
              });
            }
          }
        }
      } catch {
        // Skip calendars that fail to fetch
      }
    }

    // Get pending tasks for this week
    const tasks = await prisma.task.findMany({
      where: {
        householdId: user.householdId,
        weekKey: getWeekKey(),
        status: { not: 'completed' },
      },
      take: 5,
    });

    if (allEvents.length === 0 && tasks.length === 0) {
      return "Your week looks clear! No events or tasks scheduled.";
    }

    // Build summary
    let summary = "📅 This week:\n";

    // Group events by day
    const eventsByDay = new Map<string, string[]>();
    allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const event of allEvents.slice(0, 10)) {
      const day = event.day;
      if (!eventsByDay.has(day)) {
        eventsByDay.set(day, []);
      }
      const time = event.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      eventsByDay.get(day)!.push(`${time} ${event.summary}`);
    }

    for (const [day, events] of eventsByDay) {
      summary += `${day}: ${events.join(', ')}\n`;
    }

    if (tasks.length > 0) {
      summary += `\n📋 ${tasks.length} task${tasks.length > 1 ? 's' : ''} pending`;
    }

    return summary.trim();
  } catch (error) {
    console.error('[SMS] Error getting week summary:', error);
    return "Couldn't fetch your schedule. Try again or check the app.";
  }
}

/**
 * Get today's summary for SMS
 */
async function getTodaySummary(
  user: { id: string; householdId: string | null }
): Promise<string> {
  if (!user.householdId) {
    return "No household set up yet. Open the app to get started.";
  }

  try {
    // Get user's calendars
    const familyMember = await prisma.familyMember.findUnique({
      where: { userId: user.id },
      include: {
        calendars: { where: { included: true } },
      },
    });

    if (!familyMember?.calendars.length) {
      return "No calendars connected. Connect a calendar in the app first.";
    }

    // Today's boundaries
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const todayEvents: Array<{ summary: string; time: string }> = [];

    // Fetch events from all connected calendars
    for (const calendar of familyMember.calendars) {
      try {
        const events = await fetchGoogleCalendarEvents(
          user.id,
          calendar.googleCalendarId,
          start,
          end
        );

        for (const event of events) {
          if (event.summary && event.start) {
            const eventStart = event.start.dateTime
              ? new Date(event.start.dateTime)
              : null;

            todayEvents.push({
              summary: event.summary,
              time: eventStart
                ? eventStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                : 'All day',
            });
          }
        }
      } catch {
        // Skip calendars that fail
      }
    }

    // Get today's tasks
    const tasks = await prisma.task.findMany({
      where: {
        householdId: user.householdId,
        weekKey: getWeekKey(),
        status: { not: 'completed' },
      },
      take: 5,
    });

    if (todayEvents.length === 0 && tasks.length === 0) {
      return "Nothing on the calendar for today!";
    }

    let summary = "📅 Today:\n";

    for (const event of todayEvents.slice(0, 5)) {
      summary += `• ${event.time}: ${event.summary}\n`;
    }

    if (tasks.length > 0) {
      summary += "\n📋 Tasks:\n";
      for (const task of tasks.slice(0, 3)) {
        summary += `• ${task.title}\n`;
      }
    }

    return summary.trim();
  } catch (error) {
    console.error('[SMS] Error getting today summary:', error);
    return "Couldn't fetch today's schedule. Try again or check the app.";
  }
}
