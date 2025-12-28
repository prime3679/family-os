/**
 * Intelligence Cron Job
 *
 * Runs hourly to analyze all households and send proactive notifications.
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/intelligence", "schedule": "0 * * * *" }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeAllHouseholds } from '@/lib/intelligence';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Intelligence Cron] Starting analysis...');

  try {
    const results = await analyzeAllHouseholds();

    const summary = {
      householdsAnalyzed: results.length,
      totalInsightsGenerated: results.reduce((sum, r) => sum + r.insightsGenerated, 0),
      totalInsightsSent: results.reduce((sum, r) => sum + r.insightsSent, 0),
      errors: results.flatMap(r => r.errors),
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
