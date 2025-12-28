import { google } from 'googleapis';
import { prisma } from '../db';

/**
 * Input types for calendar write operations
 */
export interface CreateEventInput {
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  attendees?: string[]; // email addresses
}

export interface UpdateEventInput {
  summary?: string;
  description?: string;
  location?: string;
  start?: Date;
  end?: Date;
}

/**
 * Get OAuth2 client with tokens for a user
 * (Reused from google.ts pattern)
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
 * Create a new event on Google Calendar
 */
export async function createGoogleCalendarEvent(
  userId: string,
  calendarId: string,
  event: CreateEventInput
): Promise<string> {
  const auth = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  const requestBody: {
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime: string };
    end: { dateTime: string };
    attendees?: { email: string }[];
  } = {
    summary: event.summary,
    start: { dateTime: event.start.toISOString() },
    end: { dateTime: event.end.toISOString() },
  };

  if (event.description) {
    requestBody.description = event.description;
  }

  if (event.location) {
    requestBody.location = event.location;
  }

  if (event.attendees && event.attendees.length > 0) {
    requestBody.attendees = event.attendees.map(email => ({ email }));
  }

  try {
    const response = await calendar.events.insert({
      calendarId,
      requestBody,
    });

    if (!response.data.id) {
      throw new Error('Failed to create event - no event ID returned');
    }

    return response.data.id;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw new Error('Failed to create calendar event');
  }
}

/**
 * Update an existing event on Google Calendar
 */
export async function updateGoogleCalendarEvent(
  userId: string,
  calendarId: string,
  eventId: string,
  updates: UpdateEventInput
): Promise<void> {
  const auth = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  const requestBody: {
    summary?: string;
    description?: string;
    location?: string;
    start?: { dateTime: string };
    end?: { dateTime: string };
  } = {};

  if (updates.summary !== undefined) {
    requestBody.summary = updates.summary;
  }

  if (updates.description !== undefined) {
    requestBody.description = updates.description;
  }

  if (updates.location !== undefined) {
    requestBody.location = updates.location;
  }

  if (updates.start !== undefined) {
    requestBody.start = { dateTime: updates.start.toISOString() };
  }

  if (updates.end !== undefined) {
    requestBody.end = { dateTime: updates.end.toISOString() };
  }

  try {
    await calendar.events.update({
      calendarId,
      eventId,
      requestBody,
    });
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    throw new Error('Failed to update calendar event');
  }
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  userId: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const auth = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    throw new Error('Failed to delete calendar event');
  }
}
