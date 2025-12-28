import { NextRequest, NextResponse } from 'next/server';
import { generateAndSendDigests } from '@/lib/notifications/digest/generate';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Weekly digest cron endpoint
 * Called by Vercel Cron on Monday mornings
 *
 * vercel.json config:
 * {
 *   "crons": [{
 *     "path": "/api/cron/weekly-digest",
 *     "schedule": "0 7 * * 1"
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
    console.log('[Weekly Digest] Starting digest generation...');

    const results = await generateAndSendDigests();

    console.log('[Weekly Digest] Complete:', results);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Weekly Digest] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate digests',
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
