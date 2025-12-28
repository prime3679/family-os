import { prisma } from '@/lib/db';
import { sendWeeklyDigest } from '../email/send';
import { generateDigestNarrative } from './ai-narrative';
import { detectConflicts, generateWeekSummary, getCurrentWeek } from '@/lib/calendar/analyzeWeek';
import type { Event, Conflict, WeekSummary } from '@/data/mock-data';

/**
 * Generate and send weekly digests to all eligible users
 */
export async function generateAndSendDigests(): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  const results = { sent: 0, failed: 0, skipped: 0 };

  // Get all users with email digest enabled for today
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  const eligibleUsers = await prisma.user.findMany({
    where: {
      notificationPreference: {
        emailDigest: true,
        emailDigestDay: today,
      },
    },
    include: {
      notificationPreference: true,
      familyMember: {
        include: {
          calendars: true,
        },
      },
      accounts: {
        where: { provider: 'google' },
        select: { access_token: true, refresh_token: true, expires_at: true },
      },
    },
  });

  const currentWeek = getCurrentWeek();
  const weekRange = currentWeek.range;

  for (const user of eligibleUsers) {
    try {
      // Check if user has connected calendars
      if (!user.familyMember?.calendars?.length || !user.accounts?.length) {
        results.skipped++;
        continue;
      }

      // For now, use an empty events array - in production, fetch from calendar
      const events: Event[] = [];
      const conflicts: Conflict[] = [];

      if (events.length === 0) {
        results.skipped++;
        continue;
      }

      const weekSummary = generateWeekSummary(events, conflicts);

      // Generate AI narrative
      const aiNarrative = await generateDigestNarrative({
        events,
        conflicts,
        weekSummary,
        userName: user.name || 'there',
      });

      // Prepare stats
      const stats = {
        totalEvents: events.length,
        conflicts: conflicts.length,
        handoffs: weekSummary.handoffs,
        heaviestDay: weekSummary.heaviestDay,
      };

      // Format conflicts for email
      const conflictList = conflicts.slice(0, 5).map((c) => ({
        title: c.description,
        day: c.day,
        type: c.type,
      }));

      // Send the digest
      const result = await sendWeeklyDigest({
        userId: user.id,
        userName: user.name || 'there',
        email: user.email,
        weekRange,
        aiNarrative,
        stats,
        conflicts: conflictList,
      });

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
      }
    } catch (error) {
      console.error(`Failed to send digest to ${user.email}:`, error);
      results.failed++;
    }
  }

  return results;
}
