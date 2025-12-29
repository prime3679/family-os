/**
 * Google Calendar Webhook Receiver
 *
 * Receives push notifications from Google Calendar when events change.
 * Google sends POST requests with headers containing channel info.
 *
 * Headers from Google:
 * - X-Goog-Channel-ID: The channel ID we provided when registering
 * - X-Goog-Resource-ID: The resource being watched
 * - X-Goog-Resource-State: "sync" (initial), "exists" (changed), or "not_exists"
 * - X-Goog-Message-Number: Incrementing message counter
 */

import { NextResponse } from 'next/server';
import { processCalendarWebhook } from '@/lib/calendar/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Google requires 2xx response within 10 seconds
export const maxDuration = 10;

export async function POST(request: Request) {
  try {
    // Extract Google webhook headers
    const channelId = request.headers.get('X-Goog-Channel-ID');
    const resourceId = request.headers.get('X-Goog-Resource-ID');
    const resourceState = request.headers.get('X-Goog-Resource-State');
    const messageNumber = request.headers.get('X-Goog-Message-Number');

    // Log the notification
    console.log('Calendar webhook received:', {
      channelId,
      resourceId,
      resourceState,
      messageNumber,
    });

    // Validate required headers
    if (!channelId || !resourceState) {
      console.error('Missing required webhook headers');
      // Still return 200 to prevent Google from retrying
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 200 }
      );
    }

    // Process the webhook notification
    // Important: Return 200 quickly, processing happens async
    const result = await processCalendarWebhook(channelId, resourceState);

    if (!result.success) {
      console.error('Webhook processing failed:', result.error);
      // Still return 200 - we handled it, even if there was an error
    } else {
      console.log('Webhook processed successfully:', {
        eventsProcessed: result.eventsProcessed,
        changedEvents: result.changedEvents,
        deletedEvents: result.deletedEvents,
        analysisTriggered: result.analysisTriggered,
      });
    }

    // Always return 200 to acknowledge receipt
    // Google will retry with 5xx errors (exponential backoff)
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    // Return 200 even on errors to prevent Google from hammering us
    return NextResponse.json({ ok: true });
  }
}

// Handle verification requests (GET)
// Google may send a verification request when setting up
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Calendar webhook endpoint ready',
    timestamp: new Date().toISOString(),
  });
}
