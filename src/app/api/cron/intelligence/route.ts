/**
 * Intelligence Cron Job (Morning Routine)
 *
 * Runs daily at 7am to:
 * 1. Send daily briefing SMS to each parent
 * 2. Renew expiring calendar/Gmail watch channels
 * 3. Analyze all households and send proactive notifications
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/intelligence", "schedule": "0 7 * * *" }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeAllHouseholds, generateHouseholdBriefings } from '@/lib/intelligence';
import { renewExpiringChannels } from '@/lib/calendar/webhook';
import { prisma } from '@/lib/db';
import { sendSMS } from '@/lib/sms';
import { sendDailyBriefingPush } from '@/lib/notifications/push/send';
import { listMessages } from '@/lib/gmail/client';
import { classifyEmails, quickRelevanceCheck } from '@/lib/gmail/classifier';
import { processEmailsToInsights } from '@/lib/intelligence/email-patterns';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Intelligence Cron] Starting morning routine...');

  // Track results
  let briefingsSent = 0;
  let briefingPushSent = 0;
  let briefingErrors: string[] = [];
  let emailsProcessed = 0;
  let emailInsightsCreated = 0;
  let emailErrors: string[] = [];
  let channelsRenewed = 0;
  let channelErrors: string[] = [];

  // 1. Send daily briefings first (most important for morning routine)
  try {
    console.log('[Intelligence Cron] Sending daily briefings...');

    // Find all households with verified phones
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
            briefingsSent++;
            console.log(`[Intelligence Cron] Briefing SMS sent to ${briefing.displayName}`);
          } else {
            briefingErrors.push(`SMS to ${briefing.displayName} failed: ${smsResult.error}`);
          }
        } catch (error) {
          briefingErrors.push(
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
            briefingPushSent++;
          }
        } catch {
          // Push failures are less critical
        }
      }
    }

    console.log(`[Intelligence Cron] Sent ${briefingsSent} briefing SMS, ${briefingPushSent} push`);
  } catch (error) {
    console.error('[Intelligence Cron] Daily briefing error:', error);
    briefingErrors.push(error instanceof Error ? error.message : 'Daily briefing failed');
  }

  // 2. Process emails for intelligence
  try {
    console.log('[Intelligence Cron] Processing emails...');

    // Find users with Google accounts connected (Gmail access)
    const usersWithGmail = await prisma.account.findMany({
      where: {
        provider: 'google',
        access_token: { not: null },
      },
      include: {
        user: {
          include: {
            familyMember: {
              include: {
                household: {
                  include: {
                    children: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const account of usersWithGmail) {
      if (!account.user.familyMember?.household) continue;

      const userId = account.userId;
      const householdId = account.user.familyMember.householdId;
      const childrenNames = account.user.familyMember.household.children.map(c => c.name);

      try {
        // Fetch emails from last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const result = await listMessages(userId, {
          maxResults: 50,
          query: `after:${Math.floor(yesterday.getTime() / 1000)}`,
        });

        // Quick filter for relevance
        const relevantEmails = result.messages.filter(quickRelevanceCheck);

        if (relevantEmails.length === 0) {
          console.log(`[Intelligence Cron] No relevant emails for user ${userId}`);
          continue;
        }

        console.log(`[Intelligence Cron] Classifying ${relevantEmails.length} emails for user ${userId}`);

        // Classify emails with AI
        const classifications = await classifyEmails(relevantEmails, {
          childrenNames,
        });

        // Process and store insights
        const insightCount = await processEmailsToInsights(
          householdId,
          userId,
          relevantEmails,
          classifications
        );

        emailsProcessed += relevantEmails.length;
        emailInsightsCreated += insightCount;

        console.log(`[Intelligence Cron] Created ${insightCount} email insights for user ${userId}`);
      } catch (error) {
        console.error(`[Intelligence Cron] Email processing error for user ${userId}:`, error);
        emailErrors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`[Intelligence Cron] Processed ${emailsProcessed} emails, created ${emailInsightsCreated} insights`);
  } catch (error) {
    console.error('[Intelligence Cron] Email processing error:', error);
    emailErrors.push(error instanceof Error ? error.message : 'Email processing failed');
  }

  // 3. Renew expiring channels
  try {
    console.log('[Intelligence Cron] Renewing expiring channels...');
    const channelResults = await renewExpiringChannels();
    channelsRenewed = channelResults.renewed;
    channelErrors = channelResults.errors;
    console.log(`[Intelligence Cron] Renewed ${channelsRenewed} channels`);
  } catch (error) {
    console.error('[Intelligence Cron] Channel renewal error:', error);
    channelErrors.push(error instanceof Error ? error.message : 'Channel renewal failed');
  }

  // 3. Run intelligence analysis
  try {
    console.log('[Intelligence Cron] Starting household analysis...');
    const results = await analyzeAllHouseholds();

    const summary = {
      // Daily briefings
      briefingsSent,
      briefingPushSent,
      briefingErrors,
      // Email processing
      emailsProcessed,
      emailInsightsCreated,
      emailErrors,
      // Channel renewals
      channelsRenewed,
      channelErrors,
      // Intelligence analysis
      householdsAnalyzed: results.length,
      totalInsightsGenerated: results.reduce((sum, r) => sum + r.insightsGenerated, 0),
      totalInsightsSent: results.reduce((sum, r) => sum + r.insightsSent, 0),
      analysisErrors: results.flatMap(r => r.errors),
    };

    console.log('[Intelligence Cron] Complete:', summary);

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error('[Intelligence Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        briefingsSent,
        briefingErrors,
        emailsProcessed,
        emailInsightsCreated,
        emailErrors,
        channelsRenewed,
        channelErrors,
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
