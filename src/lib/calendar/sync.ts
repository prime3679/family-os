/**
 * Calendar Sync - Incremental sync handling
 *
 * Processes calendar changes received via webhooks and triggers
 * intelligence analysis when relevant events are detected.
 */

import { prisma } from '@/lib/db';
import { fetchEventsIncremental, type GoogleCalendarEvent } from './google';
import { findChannelByGoogleId, updateChannelSyncToken } from './webhook';
import { analyzeHousehold } from '@/lib/intelligence/analyzer';

export interface SyncResult {
  success: boolean;
  eventsProcessed: number;
  changedEvents: number;
  deletedEvents: number;
  analysisTriggered: boolean;
  error?: string;
}

export interface ChangedEvent {
  id: string;
  summary?: string;
  start?: Date;
  end?: Date;
  isDeleted: boolean;
  isNew: boolean;
}

/**
 * Process a webhook notification for a calendar
 * Fetches changed events and triggers analysis if needed
 */
export async function processCalendarWebhook(
  channelId: string,
  resourceState: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    eventsProcessed: 0,
    changedEvents: 0,
    deletedEvents: 0,
    analysisTriggered: false,
  };

  try {
    // Handle sync notification (sent when channel is first registered)
    if (resourceState === 'sync') {
      console.log(`Received sync confirmation for channel ${channelId}`);
      result.success = true;
      return result;
    }

    // Only process 'exists' notifications (calendar was modified)
    if (resourceState !== 'exists') {
      console.log(`Ignoring resource state: ${resourceState}`);
      result.success = true;
      return result;
    }

    // Look up the channel
    const channel = await findChannelByGoogleId(channelId);

    if (!channel) {
      console.error(`Channel not found: ${channelId}`);
      result.error = 'Channel not found';
      return result;
    }

    if (channel.status !== 'active') {
      console.log(`Channel ${channelId} is not active, skipping`);
      result.success = true;
      return result;
    }

    const userId = channel.connectedCalendar.familyMember.userId;
    const calendarId = channel.connectedCalendar.googleCalendarId;
    const householdId = channel.connectedCalendar.familyMember.householdId;

    // Fetch changed events using incremental sync
    const syncResult = await fetchEventsIncremental(
      userId,
      calendarId,
      channel.syncToken
    );

    result.eventsProcessed = syncResult.events.length;

    // Process the changes
    const changes = categorizeChanges(syncResult.events);
    result.changedEvents = changes.changed.length + changes.new.length;
    result.deletedEvents = changes.deleted.length;

    // Update the sync token for next time
    await updateChannelSyncToken(channelId, syncResult.nextSyncToken);

    // Update last synced timestamp on connected calendar
    await prisma.connectedCalendar.update({
      where: { id: channel.connectedCalendarId },
      data: { lastSyncedAt: new Date() },
    });

    // Log the changes for debugging
    if (changes.new.length > 0) {
      console.log(`New events: ${changes.new.map(e => e.summary).join(', ')}`);
    }
    if (changes.changed.length > 0) {
      console.log(`Changed events: ${changes.changed.map(e => e.summary).join(', ')}`);
    }
    if (changes.deleted.length > 0) {
      console.log(`Deleted events: ${changes.deleted.length}`);
    }

    // Trigger intelligence analysis if there were meaningful changes
    // Skip for minor changes (e.g., just deleted events in the past)
    const hasRelevantChanges = changes.new.length > 0 ||
      changes.changed.some(e => isRelevantChange(e));

    if (hasRelevantChanges) {
      console.log(`Triggering analysis for household ${householdId}`);

      // Run analysis asynchronously (don't block webhook response)
      // Using setTimeout to avoid blocking the response
      setImmediate(async () => {
        try {
          const analysisResult = await analyzeHousehold(householdId);
          console.log(`Analysis complete: ${analysisResult.insightsGenerated} insights generated`);
        } catch (error) {
          console.error('Analysis failed:', error);
        }
      });

      result.analysisTriggered = true;
    }

    result.success = true;
    return result;
  } catch (error) {
    console.error('Failed to process calendar webhook:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

interface CategorizedChanges {
  new: Array<GoogleCalendarEvent & { status?: string }>;
  changed: Array<GoogleCalendarEvent & { status?: string }>;
  deleted: Array<GoogleCalendarEvent & { status?: string }>;
}

/**
 * Categorize events into new, changed, and deleted
 */
function categorizeChanges(
  events: Array<GoogleCalendarEvent & { status?: string }>
): CategorizedChanges {
  const result: CategorizedChanges = {
    new: [],
    changed: [],
    deleted: [],
  };

  for (const event of events) {
    // Deleted events have status: 'cancelled'
    if (event.status === 'cancelled') {
      result.deleted.push(event);
    } else {
      // For now, we can't distinguish new from changed without
      // maintaining our own event cache, so we treat all as "changed"
      // The intelligence analyzer will deduplicate anyway
      result.changed.push(event);
    }
  }

  return result;
}

/**
 * Determine if a change is relevant enough to trigger analysis
 * Filter out events in the past, all-day events that haven't really changed, etc.
 */
function isRelevantChange(event: GoogleCalendarEvent & { status?: string }): boolean {
  // Check if event is in the future (relevant for conflict detection)
  const eventStart = event.start?.dateTime
    ? new Date(event.start.dateTime)
    : event.start?.date
    ? new Date(event.start.date)
    : null;

  if (!eventStart) {
    return false;
  }

  // Ignore events more than a week in the past
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  if (eventStart < oneWeekAgo) {
    return false;
  }

  return true;
}

/**
 * Force a full sync for a calendar (useful for troubleshooting)
 */
export async function forceFullSync(connectedCalendarId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    eventsProcessed: 0,
    changedEvents: 0,
    deletedEvents: 0,
    analysisTriggered: false,
  };

  try {
    const calendar = await prisma.connectedCalendar.findUnique({
      where: { id: connectedCalendarId },
      include: {
        familyMember: {
          include: { household: true },
        },
        webhookChannels: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!calendar) {
      result.error = 'Calendar not found';
      return result;
    }

    const userId = calendar.familyMember.userId;
    const calendarId = calendar.googleCalendarId;
    const householdId = calendar.familyMember.householdId;

    // Fetch all events (no sync token = full sync)
    const syncResult = await fetchEventsIncremental(userId, calendarId, null);

    result.eventsProcessed = syncResult.events.length;
    result.changedEvents = syncResult.events.length;

    // Update sync token on the active channel
    if (calendar.webhookChannels.length > 0) {
      await updateChannelSyncToken(
        calendar.webhookChannels[0].channelId,
        syncResult.nextSyncToken
      );
    }

    // Update last synced
    await prisma.connectedCalendar.update({
      where: { id: connectedCalendarId },
      data: { lastSyncedAt: new Date() },
    });

    // Trigger analysis
    console.log(`Triggering analysis for household ${householdId}`);
    await analyzeHousehold(householdId);
    result.analysisTriggered = true;

    result.success = true;
    return result;
  } catch (error) {
    console.error('Force sync failed:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}
