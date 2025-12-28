import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendPrepReminderPush } from '@/lib/notifications/push/send';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Prep reminders cron endpoint
 * Called by Vercel Cron daily at 6pm
 * Sends reminders for uncompleted prep items coming up soon
 *
 * vercel.json config:
 * {
 *   "crons": [{
 *     "path": "/api/cron/prep-reminders",
 *     "schedule": "0 18 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Verify cron secret in production
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  try {
    console.log('[Prep Reminders] Starting prep reminder notifications...');

    // Get current ISO week (e.g., "2025-W01")
    const now = new Date();
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
    const currentWeekKey = `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;

    console.log('[Prep Reminders] Current week:', currentWeekKey);

    // Find all ritual sessions for current week with incomplete prep items
    const sessions = await prisma.ritualSession.findMany({
      where: {
        weekKey: currentWeekKey,
        completedAt: null, // Only active sessions
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            householdId: true,
          },
        },
        prepItems: {
          where: {
            done: false, // Only uncompleted items
          },
          select: {
            itemKey: true,
            done: true,
          },
        },
      },
    });

    console.log('[Prep Reminders] Found', sessions.length, 'active sessions');

    let totalSent = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    // Process each session with uncompleted prep items
    for (const session of sessions) {
      if (session.prepItems.length === 0) {
        // No uncompleted prep items
        continue;
      }

      // For each user with incomplete prep, send a reminder
      // We'll send one notification per user summarizing their prep items
      const result = await sendPrepReminderPush({
        toUserId: session.user.id,
        eventTitle: 'upcoming events',
        eventDay: 'this week',
      });

      if (result.success) {
        totalSent += result.sent;
        console.log('[Prep Reminders] Sent to user:', session.user.name);
      } else if (result.skipped) {
        totalSkipped++;
        console.log('[Prep Reminders] Skipped user:', session.user.name, 'Reason:', result.reason);
      } else {
        totalFailed++;
        console.log('[Prep Reminders] Failed to send to user:', session.user.name);
      }
    }

    console.log('[Prep Reminders] Complete:', {
      sent: totalSent,
      skipped: totalSkipped,
      failed: totalFailed,
    });

    return NextResponse.json({
      success: true,
      sent: totalSent,
      skipped: totalSkipped,
      failed: totalFailed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Prep Reminders] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send prep reminders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
