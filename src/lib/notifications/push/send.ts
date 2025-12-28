import { prisma } from '@/lib/db';
import { sendPushToUser, isInQuietHours, type PushPayload } from './client';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  skipped?: boolean;
  reason?: string;
}

/**
 * Send push notification with preference and quiet hours check
 */
async function sendWithChecks(
  userId: string,
  preferenceKey: string,
  payload: PushPayload,
  logType: string
): Promise<SendResult> {
  // Check if push is enabled for this type
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: {
      pushEnabled: true,
      [preferenceKey]: true,
    },
  });

  if (!prefs?.pushEnabled || !prefs[preferenceKey]) {
    return { success: false, sent: 0, failed: 0, skipped: true, reason: 'disabled' };
  }

  // Check quiet hours
  if (await isInQuietHours(userId)) {
    return { success: false, sent: 0, failed: 0, skipped: true, reason: 'quiet_hours' };
  }

  const result = await sendPushToUser(userId, payload);

  // Log the notification
  await prisma.notificationLog.create({
    data: {
      userId,
      type: logType,
      channel: 'push',
      status: result.success ? 'sent' : 'failed',
      metadata: { sent: result.sent, failed: result.failed },
    },
  });

  return result;
}

/**
 * Send "partner finished" push notification
 */
export async function sendPartnerCompletePush({
  toUserId,
  partnerName,
}: {
  toUserId: string;
  partnerName: string;
}): Promise<SendResult> {
  const payload: PushPayload = {
    title: 'Time to sync up!',
    body: `${partnerName} finished their weekly planning - your turn!`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'partner-complete',
    data: {
      url: `${APP_URL}/app/ritual`,
      type: 'partner_complete',
    },
    actions: [
      { action: 'open', title: 'Start ritual' },
      { action: 'dismiss', title: 'Later' },
    ],
  };

  return sendWithChecks(toUserId, 'pushPartnerComplete', payload, 'push_partner_complete');
}

/**
 * Send "partner waiting" push notification
 */
export async function sendPartnerWaitingPush({
  toUserId,
  partnerName,
}: {
  toUserId: string;
  partnerName: string;
}): Promise<SendResult> {
  const payload: PushPayload = {
    title: `${partnerName} is waiting`,
    body: "They've been ready to sync for a while - finish your ritual?",
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'partner-waiting',
    data: {
      url: `${APP_URL}/app/ritual`,
      type: 'partner_waiting',
    },
    actions: [
      { action: 'open', title: 'Plan now' },
      { action: 'dismiss', title: 'Later' },
    ],
  };

  return sendWithChecks(toUserId, 'pushPartnerWaiting', payload, 'push_partner_waiting');
}

/**
 * Send prep reminder push notification
 */
export async function sendPrepReminderPush({
  toUserId,
  eventTitle,
  eventDay,
}: {
  toUserId: string;
  eventTitle: string;
  eventDay: string;
}): Promise<SendResult> {
  const payload: PushPayload = {
    title: 'Prep reminder',
    body: `Tomorrow: ${eventTitle} - all set?`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `prep-${eventDay}`,
    data: {
      url: `${APP_URL}/app/week`,
      type: 'prep_reminder',
    },
    actions: [
      { action: 'open', title: 'Check prep' },
      { action: 'dismiss', title: 'I\m ready' },
    ],
  };

  return sendWithChecks(toUserId, 'pushPrepReminder', payload, 'push_prep_reminder');
}

/**
 * Send partner nudge push notification
 */
export async function sendNudgePush({
  toUserId,
  senderName,
  message,
}: {
  toUserId: string;
  senderName: string;
  message?: string;
}): Promise<SendResult> {
  const payload: PushPayload = {
    title: `${senderName} nudged you`,
    body: message || 'Ready to plan the week together?',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'nudge',
    data: {
      url: `${APP_URL}/app/ritual`,
      type: 'nudge',
    },
    actions: [
      { action: 'open', title: 'Start ritual' },
      { action: 'dismiss', title: 'Later' },
    ],
  };

  return sendWithChecks(toUserId, 'pushNudge', payload, 'push_nudge');
}
