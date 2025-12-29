/**
 * Calendar Webhook Channel Management
 *
 * Manages the lifecycle of Google Calendar push notification channels:
 * - Register new channels when calendars connect
 * - Renew channels before they expire
 * - Unregister channels when calendars disconnect
 */

import { prisma } from '@/lib/db';
import {
  registerWebhookChannel,
  unregisterWebhookChannel,
} from './google';

export interface ChannelRegistrationResult {
  success: boolean;
  channelId?: string;
  error?: string;
}

/**
 * Create a webhook channel for a connected calendar
 * Stores channel info in database for tracking and renewal
 */
export async function createWebhookChannel(
  connectedCalendarId: string
): Promise<ChannelRegistrationResult> {
  try {
    // Get the connected calendar with its family member (for userId)
    const connectedCalendar = await prisma.connectedCalendar.findUnique({
      where: { id: connectedCalendarId },
      include: {
        familyMember: true,
        webhookChannels: {
          where: { status: 'active' },
        },
      },
    });

    if (!connectedCalendar) {
      return { success: false, error: 'Connected calendar not found' };
    }

    // If there's already an active channel, skip
    if (connectedCalendar.webhookChannels.length > 0) {
      console.log(`Active channel already exists for calendar ${connectedCalendarId}`);
      return {
        success: true,
        channelId: connectedCalendar.webhookChannels[0].channelId,
      };
    }

    const userId = connectedCalendar.familyMember.userId;
    const calendarId = connectedCalendar.googleCalendarId;

    // Register with Google
    const result = await registerWebhookChannel(userId, calendarId);

    // Store in database
    await prisma.calendarWebhookChannel.create({
      data: {
        connectedCalendarId,
        channelId: result.channelId,
        resourceId: result.resourceId,
        expiration: result.expiration,
        status: 'active',
      },
    });

    console.log(`Created webhook channel ${result.channelId} for calendar ${calendarId}`);

    return {
      success: true,
      channelId: result.channelId,
    };
  } catch (error) {
    console.error('Failed to create webhook channel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Remove a webhook channel (when calendar is disconnected)
 */
export async function removeWebhookChannel(
  connectedCalendarId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get all active channels for this calendar
    const channels = await prisma.calendarWebhookChannel.findMany({
      where: {
        connectedCalendarId,
        status: 'active',
      },
      include: {
        connectedCalendar: {
          include: {
            familyMember: true,
          },
        },
      },
    });

    for (const channel of channels) {
      const userId = channel.connectedCalendar.familyMember.userId;

      try {
        // Stop the channel with Google
        await unregisterWebhookChannel(userId, channel.channelId, channel.resourceId);
      } catch (error) {
        // Log but continue - channel might already be stopped
        console.warn(`Failed to stop channel ${channel.channelId} with Google:`, error);
      }

      // Mark as expired in database
      await prisma.calendarWebhookChannel.update({
        where: { id: channel.id },
        data: { status: 'expired' },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to remove webhook channel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Renew a webhook channel before it expires
 * Creates a new channel and marks the old one as expired
 */
export async function renewWebhookChannel(
  channelId: string
): Promise<ChannelRegistrationResult> {
  try {
    const oldChannel = await prisma.calendarWebhookChannel.findUnique({
      where: { channelId },
      include: {
        connectedCalendar: {
          include: {
            familyMember: true,
          },
        },
      },
    });

    if (!oldChannel) {
      return { success: false, error: 'Channel not found' };
    }

    const userId = oldChannel.connectedCalendar.familyMember.userId;
    const calendarId = oldChannel.connectedCalendar.googleCalendarId;

    // Register a new channel with Google
    const result = await registerWebhookChannel(userId, calendarId);

    // Create new channel record (preserving syncToken from old channel)
    await prisma.calendarWebhookChannel.create({
      data: {
        connectedCalendarId: oldChannel.connectedCalendarId,
        channelId: result.channelId,
        resourceId: result.resourceId,
        expiration: result.expiration,
        syncToken: oldChannel.syncToken, // Preserve sync token!
        status: 'active',
      },
    });

    // Mark old channel as expired
    await prisma.calendarWebhookChannel.update({
      where: { id: oldChannel.id },
      data: { status: 'expired' },
    });

    // Try to stop old channel with Google (best effort)
    try {
      await unregisterWebhookChannel(userId, oldChannel.channelId, oldChannel.resourceId);
    } catch {
      // Ignore errors - old channel will expire naturally
    }

    console.log(`Renewed webhook channel: ${oldChannel.channelId} -> ${result.channelId}`);

    return {
      success: true,
      channelId: result.channelId,
    };
  } catch (error) {
    console.error('Failed to renew webhook channel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all channels that are expiring soon (within 2 days)
 */
export async function getExpiringChannels(): Promise<
  {
    id: string;
    channelId: string;
    expiration: Date;
    connectedCalendarId: string;
  }[]
> {
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

  return prisma.calendarWebhookChannel.findMany({
    where: {
      status: 'active',
      expiration: {
        lte: twoDaysFromNow,
      },
    },
    select: {
      id: true,
      channelId: true,
      expiration: true,
      connectedCalendarId: true,
    },
  });
}

/**
 * Find a channel by its Google channel ID (used in webhook handler)
 */
export async function findChannelByGoogleId(channelId: string) {
  return prisma.calendarWebhookChannel.findUnique({
    where: { channelId },
    include: {
      connectedCalendar: {
        include: {
          familyMember: {
            include: {
              user: true,
              household: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Update sync token for a channel after processing changes
 */
export async function updateChannelSyncToken(
  channelId: string,
  syncToken: string
): Promise<void> {
  await prisma.calendarWebhookChannel.update({
    where: { channelId },
    data: {
      syncToken,
      lastNotificationAt: new Date(),
    },
  });
}

/**
 * Register webhook channels for all calendars that don't have one
 * (Useful for initial setup or recovery)
 */
export async function registerAllMissingChannels(): Promise<{
  registered: number;
  failed: number;
  errors: string[];
}> {
  const result = { registered: 0, failed: 0, errors: [] as string[] };

  // Find all connected calendars without active webhook channels
  const calendarsWithoutChannels = await prisma.connectedCalendar.findMany({
    where: {
      included: true,
      webhookChannels: {
        none: {
          status: 'active',
        },
      },
    },
  });

  for (const calendar of calendarsWithoutChannels) {
    const createResult = await createWebhookChannel(calendar.id);
    if (createResult.success) {
      result.registered++;
    } else {
      result.failed++;
      result.errors.push(`Calendar ${calendar.id}: ${createResult.error}`);
    }
  }

  return result;
}
