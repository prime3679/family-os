import { google, calendar_v3 } from 'googleapis';
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
