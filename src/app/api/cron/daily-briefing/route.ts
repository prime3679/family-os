/**
 * Daily Briefing Cron Job
 *
 * Runs every morning (7am) to send personalized daily briefings to each parent.
 * Each briefing includes:
 * - Today's events
 * - Partner's schedule summary
 * - Any active insights/conflicts
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/daily-briefing", "schedule": "0 7 * * *" }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAllBriefings } from '@/lib/intelligence';
import { sendSMS } from '@/lib/sms';
import { sendDailyBriefingPush } from '@/lib/notifications/push/send';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Daily Briefing Cron] Starting...');

  const results = {
    householdsProcessed: 0,
    briefingsGenerated: 0,
    smsSent: 0,
    pushSent: 0,
    errors: [] as string[],
  };

  try {
    // Generate all briefings
    console.log('[Daily Briefing Cron] Generating briefings...');
    const briefingResults = await generateAllBriefings();

    results.householdsProcessed = briefingResults.householdsProcessed;
    results.briefingsGenerated = briefingResults.briefingsGenerated;
    results.errors.push(...briefingResults.errors);

    console.log(
      `[Daily Briefing Cron] Generated ${results.briefingsGenerated} briefings for ${results.householdsProcessed} households`
    );

    // Now send them - need to get the actual briefing content
    // Re-run to get briefing details for sending
    const { prisma } = await import('@/lib/db');
    const { generateHouseholdBriefings } = await import('@/lib/intelligence');

    const households = await prisma.household.findMany({
      where: {
        members: {
          some: {
            user: {
              phoneVerified: true,
              phoneNumber: { not: null },
            },
          },
        },
      },
      select: { id: true },
    });

    for (const household of households) {
      const householdBriefings = await generateHouseholdBriefings(household.id);

      for (const briefing of householdBriefings.briefings) {
        // Send SMS
        try {
          const smsResult = await sendSMS({
            to: briefing.phoneNumber,
            body: briefing.message,
          });

          if (smsResult.success) {
            results.smsSent++;
            console.log(`[Daily Briefing Cron] SMS sent to ${briefing.displayName}`);
          } else {
            results.errors.push(
              `SMS to ${briefing.displayName} failed: ${smsResult.error}`
            );
          }
        } catch (error) {
          results.errors.push(
            `SMS to ${briefing.displayName} error: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }

        // Also send push notification
        try {
          const pushResult = await sendDailyBriefingPush({
            toUserId: briefing.userId,
            eventCount: briefing.eventCount,
          });

          if (pushResult.success) {
            results.pushSent++;
          }
        } catch {
          // Push failures are less critical, don't add to errors
        }
      }
    }

    console.log('[Daily Briefing Cron] Complete:', results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('[Daily Briefing Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        ...results,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
