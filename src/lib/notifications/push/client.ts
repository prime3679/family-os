import webpush from 'web-push';
import { prisma } from '@/lib/db';

// VAPID configuration - lazy initialized to avoid build-time errors
let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@familyos.app';

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      vapidConfigured = true;
      return true;
    } catch (error) {
      console.error('Failed to configure VAPID:', error);
      return false;
    }
  }

  console.warn('VAPID keys not configured - push notifications will be logged but not sent');
  return false;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  // Get user's push subscriptions
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { success: false, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const expiredSubscriptions: string[] = [];

  for (const sub of subscriptions) {
    try {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      if (!ensureVapidConfigured()) {
        console.log('[Push Mock]', { userId, payload });
        sent++;
        continue;
      }

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload)
      );
      sent++;
    } catch (error: unknown) {
      const err = error as { statusCode?: number };
      // Handle expired/invalid subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        expiredSubscriptions.push(sub.id);
      }
      failed++;
      console.error('[Push Error]', error);
    }
  }

  // Clean up expired subscriptions
  if (expiredSubscriptions.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expiredSubscriptions } },
    });
  }

  return {
    success: sent > 0,
    sent,
    failed,
  };
}

/**
 * Check if user is within quiet hours
 */
export async function isInQuietHours(userId: string): Promise<boolean> {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: {
      quietHoursEnabled: true,
      quietHoursStart: true,
      quietHoursEnd: true,
    },
  });

  if (!prefs?.quietHoursEnabled) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinutes;

  const [startHour] = prefs.quietHoursStart.split(':').map(Number);
  const [endHour] = prefs.quietHoursEnd.split(':').map(Number);
  const startTime = startHour * 60;
  const endTime = endHour * 60;

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
}
