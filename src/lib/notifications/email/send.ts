import { prisma } from '@/lib/db';
import { sendEmail } from './client';
import { WeeklyDigestEmail } from './templates/weekly-digest';
import { PartnerNudgeEmail } from './templates/partner-nudge';
import { PartnerCompleteEmail } from './templates/partner-complete';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send weekly digest email to a user
 */
export async function sendWeeklyDigest({
  userId,
  userName,
  email,
  weekRange,
  aiNarrative,
  stats,
  conflicts,
}: {
  userId: string;
  userName: string;
  email: string;
  weekRange: string;
  aiNarrative: string;
  stats: {
    totalEvents: number;
    conflicts: number;
    handoffs: number;
    heaviestDay: string;
  };
  conflicts?: Array<{
    title: string;
    day: string;
    type: string;
  }>;
}): Promise<SendResult> {
  // Get unsubscribe token
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: { unsubscribeToken: true },
  });

  const ritualUrl = `${APP_URL}/app/ritual`;
  const unsubscribeUrl = prefs
    ? `${APP_URL}/unsubscribe/${prefs.unsubscribeToken}`
    : `${APP_URL}/app/settings/notifications`;

  const result = await sendEmail({
    to: email,
    subject: `Your Week at a Glance - ${weekRange}`,
    react: WeeklyDigestEmail({
      userName,
      weekRange,
      aiNarrative,
      stats,
      conflicts,
      ritualUrl,
      unsubscribeUrl,
    }),
  });

  // Log the notification
  await prisma.notificationLog.create({
    data: {
      userId,
      type: 'email_digest',
      channel: 'email',
      status: result.success ? 'sent' : 'failed',
      metadata: { weekRange },
      error: result.error,
    },
  });

  return result;
}

/**
 * Send partner nudge email
 */
export async function sendPartnerNudgeEmail({
  toUserId,
  toEmail,
  recipientName,
  senderName,
  message,
}: {
  toUserId: string;
  toEmail: string;
  recipientName: string;
  senderName: string;
  message?: string;
}): Promise<SendResult> {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: toUserId },
    select: { unsubscribeToken: true },
  });

  const ritualUrl = `${APP_URL}/app/ritual`;
  const unsubscribeUrl = prefs
    ? `${APP_URL}/unsubscribe/${prefs.unsubscribeToken}`
    : `${APP_URL}/app/settings/notifications`;

  const result = await sendEmail({
    to: toEmail,
    subject: `${senderName} is ready to plan the week with you!`,
    react: PartnerNudgeEmail({
      recipientName,
      senderName,
      message,
      ritualUrl,
      unsubscribeUrl,
    }),
  });

  await prisma.notificationLog.create({
    data: {
      userId: toUserId,
      type: 'email_nudge',
      channel: 'email',
      status: result.success ? 'sent' : 'failed',
      metadata: { senderName },
      error: result.error,
    },
  });

  return result;
}

/**
 * Send partner completion email
 */
export async function sendPartnerCompleteEmail({
  toUserId,
  toEmail,
  recipientName,
  partnerName,
  weekRange,
}: {
  toUserId: string;
  toEmail: string;
  recipientName: string;
  partnerName: string;
  weekRange: string;
}): Promise<SendResult> {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: toUserId },
    select: { unsubscribeToken: true },
  });

  const ritualUrl = `${APP_URL}/app/ritual`;
  const unsubscribeUrl = prefs
    ? `${APP_URL}/unsubscribe/${prefs.unsubscribeToken}`
    : `${APP_URL}/app/settings/notifications`;

  const result = await sendEmail({
    to: toEmail,
    subject: `${partnerName} finished their weekly planning - time to sync!`,
    react: PartnerCompleteEmail({
      recipientName,
      partnerName,
      weekRange,
      ritualUrl,
      unsubscribeUrl,
    }),
  });

  await prisma.notificationLog.create({
    data: {
      userId: toUserId,
      type: 'email_partner_complete',
      channel: 'email',
      status: result.success ? 'sent' : 'failed',
      metadata: { partnerName, weekRange },
      error: result.error,
    },
  });

  return result;
}
