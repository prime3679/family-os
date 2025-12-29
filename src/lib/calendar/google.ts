import { google } from 'googleapis';
import { randomUUID } from 'crypto';
import { prisma } from '../db';

// Types for Google Calendar responses
export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  colorId?: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
}

/**
 * Get OAuth2 client with tokens for a user
 */
async function getOAuth2Client(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
  });

  if (!account?.access_token) {
    throw new Error('No Google account connected');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  // Check if token needs refresh
  if (account.expires_at && account.expires_at * 1000 < Date.now()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update tokens in database
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: credentials.access_token,
          expires_at: credentials.expiry_date
            ? Math.floor(credentials.expiry_date / 1000)
            : undefined,
        },
      });

      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw new Error('Failed to refresh Google token');
    }
  }

  return oauth2Client;
}

/**
 * Fetch list of calendars from Google Calendar
 */
export async function fetchGoogleCalendars(userId: string): Promise<GoogleCalendar[]> {
  const auth = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.calendarList.list();
  const items = response.data.items || [];

  return items.map((cal) => ({
    id: cal.id || '',
    summary: cal.summary || 'Untitled Calendar',
    description: cal.description || undefined,
    backgroundColor: cal.backgroundColor || undefined,
    foregroundColor: cal.foregroundColor || undefined,
    primary: cal.primary || false,
  }));
}

/**
 * Fetch events from a specific Google Calendar
 */
export async function fetchGoogleCalendarEvents(
  userId: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<GoogleCalendarEvent[]> {
  const auth = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  });

  const items = response.data.items || [];

  return items.map((event) => ({
    id: event.id || '',
    summary: event.summary || undefined,
    description: event.description || undefined,
    location: event.location || undefined,
    start: event.start ? {
      dateTime: event.start.dateTime || undefined,
      date: event.start.date || undefined,
      timeZone: event.start.timeZone || undefined,
    } : undefined,
    end: event.end ? {
      dateTime: event.end.dateTime || undefined,
      date: event.end.date || undefined,
      timeZone: event.end.timeZone || undefined,
    } : undefined,
    colorId: event.colorId || undefined,
  }));
}

/**
 * Get week boundaries (Monday to Sunday)
 */
export function getWeekBoundaries(date: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday

  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(0, 0, 0, 0);

  return { start, end };
}

// ============================================================================
// Webhook / Push Notifications API
// ============================================================================

export interface WatchChannelResult {
  channelId: string;
  resourceId: string;
  expiration: Date;
}

/**
 * Register a webhook channel for a Google Calendar
 * Google will send push notifications to our webhook endpoint when events change
 * Channels expire after max 7 days (Google's limit)
 */
export async function registerWebhookChannel(
  userId: string,
  calendarId: string
): Promise<WatchChannelResult> {
  const auth = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  // Generate unique channel ID
  const channelId = randomUUID();

  // Webhook URL - must be HTTPS and publicly accessible
  const webhookUrl = `${process.env.NEXTAUTH_URL}/api/calendar/webhook`;

  // Max expiration is 7 days from now (Google's limit)
  const expirationMs = Date.now() + 7 * 24 * 60 * 60 * 1000;

  const response = await calendar.events.watch({
    calendarId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      expiration: String(expirationMs),
    },
  });

  if (!response.data.resourceId || !response.data.expiration) {
    throw new Error('Failed to register webhook channel: missing response data');
  }

  return {
    channelId,
    resourceId: response.data.resourceId,
    expiration: new Date(parseInt(response.data.expiration)),
  };
}

/**
 * Stop/unregister a webhook channel
 * Call this when calendar is disconnected or channel needs to be replaced
 */
export async function unregisterWebhookChannel(
  userId: string,
  channelId: string,
  resourceId: string
): Promise<void> {
  const auth = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  await calendar.channels.stop({
    requestBody: {
      id: channelId,
      resourceId: resourceId,
    },
  });
}

export interface IncrementalSyncResult {
  events: GoogleCalendarEvent[];
  nextSyncToken: string;
  isFullSync: boolean;
}

/**
 * Fetch events using incremental sync
 * Uses syncToken to only get events that changed since last sync
 * If syncToken is invalid/expired, falls back to full sync
 */
export async function fetchEventsIncremental(
  userId: string,
  calendarId: string,
  syncToken?: string | null
): Promise<IncrementalSyncResult> {
  const auth = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  let isFullSync = false;
  let allEvents: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  try {
    // Try incremental sync with syncToken
    if (syncToken) {
      const response = await calendar.events.list({
        calendarId,
        syncToken,
        showDeleted: true, // Include deleted events to track removals
      });

      const items = response.data.items || [];
      allEvents = items.map(mapGoogleEventToInternal);
      nextSyncToken = response.data.nextSyncToken || undefined;

      // Handle pagination for large changes
      pageToken = response.data.nextPageToken || undefined;
      while (pageToken) {
        const pageResponse = await calendar.events.list({
          calendarId,
          syncToken,
          pageToken,
          showDeleted: true,
        });
        allEvents.push(...(pageResponse.data.items || []).map(mapGoogleEventToInternal));
        pageToken = pageResponse.data.nextPageToken || undefined;
        nextSyncToken = pageResponse.data.nextSyncToken || nextSyncToken;
      }
    }
  } catch (error: unknown) {
    // SyncToken expired or invalid - fall back to full sync
    const googleError = error as { code?: number };
    if (googleError.code === 410) {
      console.log('Sync token expired, performing full sync');
      syncToken = null; // Force full sync below
    } else {
      throw error;
    }
  }

  // Full sync if no syncToken or it was invalid
  if (!syncToken) {
    isFullSync = true;

    // Get events from 30 days ago to 90 days ahead
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30);
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 90);

    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
    });

    allEvents = (response.data.items || []).map(mapGoogleEventToInternal);
    nextSyncToken = response.data.nextSyncToken || undefined;

    // Handle pagination
    pageToken = response.data.nextPageToken || undefined;
    while (pageToken) {
      const pageResponse = await calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        pageToken,
      });
      allEvents.push(...(pageResponse.data.items || []).map(mapGoogleEventToInternal));
      pageToken = pageResponse.data.nextPageToken || undefined;
      nextSyncToken = pageResponse.data.nextSyncToken || nextSyncToken;
    }
  }

  if (!nextSyncToken) {
    throw new Error('No sync token returned from Google Calendar API');
  }

  return {
    events: allEvents,
    nextSyncToken,
    isFullSync,
  };
}

/**
 * Map Google Calendar API event to our internal format
 */
function mapGoogleEventToInternal(event: {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: { dateTime?: string | null; date?: string | null; timeZone?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null; timeZone?: string | null } | null;
  colorId?: string | null;
  status?: string | null;
}): GoogleCalendarEvent & { status?: string } {
  return {
    id: event.id || '',
    summary: event.summary || undefined,
    description: event.description || undefined,
    location: event.location || undefined,
    start: event.start
      ? {
          dateTime: event.start.dateTime || undefined,
          date: event.start.date || undefined,
          timeZone: event.start.timeZone || undefined,
        }
      : undefined,
    end: event.end
      ? {
          dateTime: event.end.dateTime || undefined,
          date: event.end.date || undefined,
          timeZone: event.end.timeZone || undefined,
        }
      : undefined,
    colorId: event.colorId || undefined,
    status: event.status || undefined,
  };
}
