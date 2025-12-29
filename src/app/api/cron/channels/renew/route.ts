/**
 * Webhook Channel Renewal Cron
 *
 * Runs daily to renew Google Calendar webhook channels before they expire.
 * Google Calendar channels have a max lifetime of 7 days, so we renew
 * any channel expiring within 2 days.
 *
 * Also registers webhook channels for any calendars that don't have one
 * (e.g., calendars connected before webhooks were implemented).
 */

import { NextResponse } from 'next/server';
import {
  getExpiringChannels,
  renewWebhookChannel,
  registerAllMissingChannels,
} from '@/lib/calendar/webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max for cron

export async function GET(request: Request) {
  try {
    // Verify cron secret (Vercel sends this header)
    const authHeader = request.headers.get('authorization');
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      // In development, allow without secret
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('Starting webhook channel renewal cron...');

    const results = {
      renewed: 0,
      renewFailed: 0,
      newlyRegistered: 0,
      registrationFailed: 0,
      errors: [] as string[],
    };

    // 1. Renew expiring channels
    const expiringChannels = await getExpiringChannels();
    console.log(`Found ${expiringChannels.length} channels expiring within 2 days`);

    for (const channel of expiringChannels) {
      const renewResult = await renewWebhookChannel(channel.channelId);

      if (renewResult.success) {
        results.renewed++;
        console.log(`Renewed channel ${channel.channelId}`);
      } else {
        results.renewFailed++;
        results.errors.push(`Renew ${channel.channelId}: ${renewResult.error}`);
        console.error(`Failed to renew channel ${channel.channelId}:`, renewResult.error);
      }
    }

    // 2. Register channels for calendars without one
    const registerResult = await registerAllMissingChannels();
    results.newlyRegistered = registerResult.registered;
    results.registrationFailed = registerResult.failed;
    results.errors.push(...registerResult.errors);

    if (registerResult.registered > 0) {
      console.log(`Registered ${registerResult.registered} new webhook channels`);
    }
    if (registerResult.failed > 0) {
      console.error(`Failed to register ${registerResult.failed} channels`);
    }

    console.log('Webhook channel renewal complete:', results);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Channel renewal cron failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
