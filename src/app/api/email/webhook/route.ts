/**
 * Email Webhook - Gmail Push Notification Receiver
 *
 * Receives push notifications from Google Cloud Pub/Sub when Gmail
 * changes occur. This endpoint is called by the Pub/Sub subscription.
 *
 * Flow:
 * 1. User's Gmail receives new email
 * 2. Gmail API sends notification to Pub/Sub topic
 * 3. Pub/Sub pushes to this webhook
 * 4. We fetch new emails and classify them
 * 5. Relevant emails become insights
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMessage, getHistory, getProfile } from '@/lib/gmail/client';
import { classifyEmail, quickRelevanceCheck } from '@/lib/gmail/classifier';
import { processEmailsToInsights } from '@/lib/intelligence/email-patterns';

// Pub/Sub notification payload
interface PubSubNotification {
  message: {
    data: string; // Base64 encoded
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

// Decoded Gmail notification
interface GmailNotification {
  emailAddress: string;
  historyId: string;
}

export async function POST(req: Request) {
  try {
    // Parse Pub/Sub notification
    const body = await req.json() as PubSubNotification;

    if (!body.message?.data) {
      console.error('Invalid Pub/Sub notification: missing message data');
      return NextResponse.json({ error: 'Invalid notification' }, { status: 400 });
    }

    // Decode the Gmail notification
    const notificationData = Buffer.from(body.message.data, 'base64').toString('utf-8');
    const notification: GmailNotification = JSON.parse(notificationData);

    console.log('Gmail notification received:', {
      email: notification.emailAddress,
      historyId: notification.historyId,
      messageId: body.message.messageId,
    });

    // Find the GmailWatch for this email
    const watch = await prisma.gmailWatch.findFirst({
      where: {
        email: notification.emailAddress,
        status: 'active',
      },
      include: {
        user: {
          include: {
            household: true,
          },
        },
      },
    });

    if (!watch) {
      console.log('No active watch found for email:', notification.emailAddress);
      // Acknowledge the message to prevent redelivery
      return NextResponse.json({ status: 'no_watch' });
    }

    // Get the user's household
    const householdId = watch.user.householdId;
    if (!householdId) {
      console.log('User has no household:', watch.userId);
      return NextResponse.json({ status: 'no_household' });
    }

    // Process the history changes
    const result = await processHistoryChanges(
      watch.userId,
      householdId,
      watch.historyId || notification.historyId,
      notification.historyId
    );

    // Update the watch with new history ID
    await prisma.gmailWatch.update({
      where: { id: watch.id },
      data: {
        historyId: notification.historyId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      status: 'processed',
      ...result,
    });
  } catch (error) {
    console.error('Email webhook error:', error);
    // Return 200 to acknowledge even on error to prevent redelivery loop
    // Pub/Sub will retry on 4xx/5xx errors
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Process Gmail history changes since last sync
 */
async function processHistoryChanges(
  userId: string,
  householdId: string,
  startHistoryId: string,
  endHistoryId: string
): Promise<{
  newMessages: number;
  classifiedEmails: number;
  insightsCreated: number;
}> {
  let newMessages = 0;
  let classifiedEmails = 0;
  let insightsCreated = 0;

  try {
    // Get history of changes
    const history = await getHistory(userId, startHistoryId);

    // Collect new message IDs
    const newMessageIds = new Set<string>();
    for (const entry of history.history) {
      if (entry.messagesAdded) {
        for (const added of entry.messagesAdded) {
          newMessageIds.add(added.message.id);
        }
      }
    }

    newMessages = newMessageIds.size;

    if (newMessages === 0) {
      return { newMessages, classifiedEmails, insightsCreated };
    }

    // Fetch full messages
    const messages = [];
    for (const messageId of newMessageIds) {
      try {
        const message = await getMessage(userId, messageId);
        messages.push(message);
      } catch (error) {
        console.error(`Failed to fetch message ${messageId}:`, error);
      }
    }

    // Get household context for classification
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: { children: true },
    });

    const childrenNames = household?.children.map(c => c.name) || [];

    // Quick filter and classify relevant emails
    const relevantMessages = messages.filter(quickRelevanceCheck);
    const classifications = new Map();

    for (const message of relevantMessages) {
      try {
        const classification = await classifyEmail(message, { childrenNames });
        classifications.set(message.id, classification);
        classifiedEmails++;
      } catch (error) {
        console.error(`Failed to classify message ${message.id}:`, error);
      }
    }

    // Process into insights
    if (classifications.size > 0) {
      insightsCreated = await processEmailsToInsights(
        householdId,
        userId,
        relevantMessages,
        classifications
      );
    }

    return { newMessages, classifiedEmails, insightsCreated };
  } catch (error) {
    console.error('Failed to process history changes:', error);
    return { newMessages, classifiedEmails, insightsCreated };
  }
}

/**
 * Health check / verification endpoint
 * Google verifies webhook endpoints with GET requests
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'FamilyOS Email Webhook',
    timestamp: new Date().toISOString(),
  });
}
