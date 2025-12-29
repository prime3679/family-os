/**
 * Intelligence Cron Job
 *
 * Runs daily to:
 * 1. Analyze all households and send proactive notifications
 * 2. Renew expiring calendar/Gmail watch channels
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/intelligence", "schedule": "0 8 * * *" }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeAllHouseholds } from '@/lib/intelligence';
import { renewExpiringChannels } from '@/lib/calendar/webhook';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Intelligence Cron] Starting...');

  // Track results
  let channelsRenewed = 0;
  let channelErrors: string[] = [];

  // 1. Renew expiring channels first
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

  // 2. Run intelligence analysis
  try {
    console.log('[Intelligence Cron] Starting household analysis...');
    const results = await analyzeAllHouseholds();

    const summary = {
      channelsRenewed,
      channelErrors,
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
