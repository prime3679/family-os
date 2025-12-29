/**
 * Gmail API Client
 *
 * Provides wrapper functions for Gmail API operations:
 * - List messages
 * - Get message content
 * - Search emails
 * - Get threads
 */

import { google, gmail_v1 } from 'googleapis';
import { prisma } from '../db';

// Types for Gmail responses
export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  date: Date;
  body?: string;
  labels: string[];
}

export interface GmailThread {
  id: string;
  messages: GmailMessage[];
  snippet: string;
}

export interface GmailSearchResult {
  messages: GmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate: number;
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
 * Get Gmail API client for a user
 */
async function getGmailClient(userId: string): Promise<gmail_v1.Gmail> {
  const auth = await getOAuth2Client(userId);
  return google.gmail({ version: 'v1', auth });
}

/**
 * Parse email headers to extract common fields
 */
function parseHeaders(headers: gmail_v1.Schema$MessagePartHeader[] | undefined): {
  from: string;
  to: string;
  subject: string;
  date: Date;
} {
  const headerMap: Record<string, string> = {};
  for (const header of headers || []) {
    if (header.name && header.value) {
      headerMap[header.name.toLowerCase()] = header.value;
    }
  }

  return {
    from: headerMap['from'] || '',
    to: headerMap['to'] || '',
    subject: headerMap['subject'] || '',
    date: headerMap['date'] ? new Date(headerMap['date']) : new Date(),
  };
}

/**
 * Extract plain text body from message payload
 */
function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';

  // If the payload has a body with data, decode it
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  // Check for multipart messages
  if (payload.parts) {
    // Prefer plain text
    const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }

    // Fall back to HTML
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      // Strip HTML tags for plain text
      const html = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
      return html.replace(/<[^>]*>/g, '').trim();
    }

    // Recursively check nested parts
    for (const part of payload.parts) {
      const body = extractBody(part);
      if (body) return body;
    }
  }

  return '';
}

/**
 * Convert Gmail API message to our format
 */
function parseMessage(message: gmail_v1.Schema$Message): GmailMessage {
  const headers = parseHeaders(message.payload?.headers);

  return {
    id: message.id || '',
    threadId: message.threadId || '',
    from: headers.from,
    to: headers.to,
    subject: headers.subject,
    snippet: message.snippet || '',
    date: headers.date,
    body: extractBody(message.payload),
    labels: message.labelIds || [],
  };
}

/**
 * List recent messages from inbox
 */
export async function listMessages(
  userId: string,
  options: {
    maxResults?: number;
    pageToken?: string;
    labelIds?: string[];
    query?: string;
  } = {}
): Promise<GmailSearchResult> {
  const gmail = await getGmailClient(userId);

  const { maxResults = 20, pageToken, labelIds = ['INBOX'], query } = options;

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    pageToken,
    labelIds,
    q: query,
  });

  const messages: GmailMessage[] = [];

  // Fetch full message details for each result
  for (const msg of response.data.messages || []) {
    if (msg.id) {
      try {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });
        messages.push(parseMessage(fullMessage.data));
      } catch (error) {
        console.error(`Failed to fetch message ${msg.id}:`, error);
      }
    }
  }

  return {
    messages,
    nextPageToken: response.data.nextPageToken || undefined,
    resultSizeEstimate: response.data.resultSizeEstimate || 0,
  };
}

/**
 * Get a single message by ID
 */
export async function getMessage(
  userId: string,
  messageId: string
): Promise<GmailMessage> {
  const gmail = await getGmailClient(userId);

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  return parseMessage(response.data);
}

/**
 * Get a thread with all its messages
 */
export async function getThread(
  userId: string,
  threadId: string
): Promise<GmailThread> {
  const gmail = await getGmailClient(userId);

  const response = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  });

  const messages: GmailMessage[] = (response.data.messages || []).map(parseMessage);

  return {
    id: response.data.id || '',
    messages,
    snippet: response.data.snippet || '',
  };
}

/**
 * Search emails with Gmail query syntax
 */
export async function searchEmails(
  userId: string,
  query: string,
  options: {
    maxResults?: number;
    pageToken?: string;
  } = {}
): Promise<GmailSearchResult> {
  return listMessages(userId, {
    ...options,
    query,
    labelIds: undefined, // Don't filter by label when searching
  });
}

/**
 * Get user's Gmail profile (email address)
 */
export async function getProfile(userId: string): Promise<{
  email: string;
  historyId: string;
}> {
  const gmail = await getGmailClient(userId);

  const response = await gmail.users.getProfile({
    userId: 'me',
  });

  return {
    email: response.data.emailAddress || '',
    historyId: response.data.historyId || '',
  };
}

/**
 * Get history (changes since a given historyId)
 * Used for incremental sync after receiving push notifications
 */
export async function getHistory(
  userId: string,
  startHistoryId: string,
  options: {
    maxResults?: number;
    pageToken?: string;
  } = {}
): Promise<{
  history: Array<{
    id: string;
    messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
    messagesDeleted?: Array<{ message: { id: string; threadId: string } }>;
    labelsAdded?: Array<{ message: { id: string; threadId: string }; labelIds: string[] }>;
    labelsRemoved?: Array<{ message: { id: string; threadId: string }; labelIds: string[] }>;
  }>;
  historyId: string;
  nextPageToken?: string;
}> {
  const gmail = await getGmailClient(userId);

  const response = await gmail.users.history.list({
    userId: 'me',
    startHistoryId,
    maxResults: options.maxResults || 100,
    pageToken: options.pageToken,
    historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
  });

  return {
    history: (response.data.history || []).map(h => ({
      id: h.id || '',
      messagesAdded: h.messagesAdded?.map(m => ({
        message: { id: m.message?.id || '', threadId: m.message?.threadId || '' },
      })),
      messagesDeleted: h.messagesDeleted?.map(m => ({
        message: { id: m.message?.id || '', threadId: m.message?.threadId || '' },
      })),
      labelsAdded: h.labelsAdded?.map(l => ({
        message: { id: l.message?.id || '', threadId: l.message?.threadId || '' },
        labelIds: l.labelIds || [],
      })),
      labelsRemoved: h.labelsRemoved?.map(l => ({
        message: { id: l.message?.id || '', threadId: l.message?.threadId || '' },
        labelIds: l.labelIds || [],
      })),
    })),
    historyId: response.data.historyId || startHistoryId,
    nextPageToken: response.data.nextPageToken || undefined,
  };
}

/**
 * Common family-related email queries
 */
export const FAMILY_EMAIL_QUERIES = {
  school: 'from:(school OR edu OR teacher OR principal) OR subject:(school OR class OR homework OR grade)',
  medical: 'from:(doctor OR clinic OR hospital OR pediatrician OR pharmacy) OR subject:(appointment OR prescription)',
  activities: 'from:(sports OR league OR coach OR team) OR subject:(practice OR game OR tournament)',
  logistics: 'subject:(pickup OR dropoff OR carpool OR schedule)',
};

/**
 * Search for family-relevant emails
 */
export async function searchFamilyEmails(
  userId: string,
  category: keyof typeof FAMILY_EMAIL_QUERIES,
  options: {
    maxResults?: number;
    newerThan?: string; // e.g., '7d' for 7 days
  } = {}
): Promise<GmailSearchResult> {
  let query = FAMILY_EMAIL_QUERIES[category];

  if (options.newerThan) {
    query = `(${query}) newer_than:${options.newerThan}`;
  }

  return searchEmails(userId, query, { maxResults: options.maxResults });
}
