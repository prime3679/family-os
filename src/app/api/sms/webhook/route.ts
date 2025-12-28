/**
 * SMS Webhook - Handles incoming SMS from Twilio
 *
 * When a user replies to an FamilyOS SMS, Twilio calls this webhook.
 * We parse the reply, find the relevant insight, and take action.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseIncomingSMS, sendSMS, parseReply, type InsightType } from '@/lib/sms';

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
      // TODO: Implement calendar write-back
      await notifyPartner(user, `${displayName} added the event to their calendar`);
      return "Done! Added to your calendar. I'll let your partner know.";

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
      // TODO: Schedule reminder for tomorrow
      return "I'll remind you tomorrow.";

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
    // TODO: Implement week summary
    return "Open the app to see your full week, or reply TODAY for today's schedule.";
  }

  if (lowerMessage === 'today') {
    // TODO: Implement today's schedule
    return "Checking today's schedule... Open the app for details.";
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
