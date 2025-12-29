/**
 * Email Intelligence Patterns - FamilyOS
 *
 * Pattern detection for emails to generate family insights.
 * Converts email classifications into actionable insights.
 */

import { prisma } from '@/lib/db';
import type { GmailMessage } from '@/lib/gmail/client';
import type { EmailClassification, EmailCategory } from '@/lib/gmail/classifier';
import type { InsightType, TemplateData } from '@/lib/sms';

export interface EmailInsightData {
  type: InsightType;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  templateData: TemplateData;
  emailId: string;
  targetUserId: string;
}

/**
 * Convert an email classification into insights
 */
export function classificationToInsights(
  email: GmailMessage,
  classification: EmailClassification,
  targetUserId: string
): EmailInsightData[] {
  const insights: EmailInsightData[] = [];

  // High relevance emails with action items
  if (classification.relevanceScore >= 0.7 && classification.actionItems.length > 0) {
    for (const actionItem of classification.actionItems) {
      insights.push({
        type: mapCategoryToInsightType(classification.category),
        severity: classification.urgency,
        title: actionItem.description,
        description: `From: ${email.from}\nSubject: ${email.subject}`,
        templateData: {
          action: actionItem.description,
          dueDate: actionItem.dueDate,
          source: 'email',
          emailSubject: email.subject,
        },
        emailId: email.id,
        targetUserId,
      });
    }
  }

  // Emails requiring response
  if (classification.requiresResponse && classification.urgency !== 'low') {
    insights.push({
      type: 'email_response_needed',
      severity: classification.urgency,
      title: `Reply needed: ${email.subject}`,
      description: classification.summary,
      templateData: {
        emailSubject: email.subject,
        from: email.from,
        summary: classification.summary,
      },
      emailId: email.id,
      targetUserId,
    });
  }

  // Upcoming deadlines
  for (const deadline of classification.deadlines) {
    const daysUntil = getDaysUntilDeadline(deadline.date);
    if (daysUntil !== null && daysUntil <= 7) {
      insights.push({
        type: 'deadline',
        severity: daysUntil <= 2 ? 'high' : 'medium',
        title: deadline.description,
        description: `Due: ${deadline.date}${deadline.isRecurring ? ' (recurring)' : ''}`,
        templateData: {
          deadline: deadline.date,
          description: deadline.description,
          isRecurring: deadline.isRecurring,
          daysUntil,
        },
        emailId: email.id,
        targetUserId,
      });
    }
  }

  return insights;
}

/**
 * Process a batch of emails and store insights
 */
export async function processEmailsToInsights(
  householdId: string,
  userId: string,
  emails: GmailMessage[],
  classifications: Map<string, EmailClassification>
): Promise<number> {
  let insightCount = 0;

  for (const email of emails) {
    const classification = classifications.get(email.id);
    if (!classification) continue;

    // Store the email insight record
    await prisma.emailInsight.upsert({
      where: { gmailMessageId: email.id },
      update: {
        category: classification.category,
        relevanceScore: classification.relevanceScore,
        summary: classification.summary,
        actionItems: classification.actionItems as unknown as object,
        status: 'unread',
      },
      create: {
        householdId,
        gmailMessageId: email.id,
        threadId: email.threadId,
        from: email.from,
        subject: email.subject,
        snippet: email.snippet,
        receivedAt: email.date,
        category: classification.category,
        relevanceScore: classification.relevanceScore,
        summary: classification.summary,
        actionItems: classification.actionItems as unknown as object,
        status: 'unread',
      },
    });

    // Only create insights for relevant emails
    if (classification.relevanceScore >= 0.5 && classification.category !== 'spam') {
      const insights = classificationToInsights(email, classification, userId);

      for (const insight of insights) {
        await createInsightFromEmail(householdId, insight);
        insightCount++;
      }
    }
  }

  return insightCount;
}

/**
 * Create an insight from an email
 */
async function createInsightFromEmail(
  householdId: string,
  data: EmailInsightData
): Promise<void> {
  // Check for duplicate insights (same email, same action)
  const existing = await prisma.insight.findFirst({
    where: {
      householdId,
      metadata: {
        path: ['emailId'],
        equals: data.emailId,
      },
    },
  });

  // Generate SMS message for the insight
  const smsMessage = `${data.title} - ${data.description.slice(0, 100)}`;

  if (existing) {
    // Update existing insight
    await prisma.insight.update({
      where: { id: existing.id },
      data: {
        severity: data.severity,
        description: data.description,
        smsMessage,
        updatedAt: new Date(),
      },
    });
  } else {
    // Create new insight
    await prisma.insight.create({
      data: {
        householdId,
        type: data.type,
        severity: data.severity,
        title: data.title,
        description: data.description,
        smsMessage,
        metadata: {
          ...data.templateData,
          emailId: data.emailId,
          source: 'email',
          targetUserId: data.targetUserId,
        },
        status: 'pending',
        eventIds: [],
      },
    });
  }
}

/**
 * Map email category to insight type
 */
function mapCategoryToInsightType(category: EmailCategory): InsightType {
  const mapping: Record<EmailCategory, InsightType> = {
    school: 'school_notice',
    medical: 'medical_reminder',
    activities: 'activity_update',
    logistics: 'logistics_alert',
    social: 'social_event',
    financial: 'billing_reminder',
    spam: 'other',
    other: 'other',
  };

  return mapping[category] || 'other';
}

/**
 * Calculate days until a deadline
 */
function getDaysUntilDeadline(dateString: string): number | null {
  try {
    const deadline = new Date(dateString);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return null;
  }
}

/**
 * Get unprocessed emails for a household
 */
export async function getUnprocessedEmails(
  householdId: string
): Promise<{ gmailMessageId: string }[]> {
  return prisma.emailInsight.findMany({
    where: {
      householdId,
      status: 'unread',
    },
    select: {
      gmailMessageId: true,
    },
  });
}

/**
 * Mark emails as processed
 */
export async function markEmailsProcessed(
  emailIds: string[]
): Promise<void> {
  await prisma.emailInsight.updateMany({
    where: {
      gmailMessageId: { in: emailIds },
    },
    data: {
      status: 'read',
    },
  });
}

/**
 * Get email insights by category
 */
export async function getEmailInsightsByCategory(
  householdId: string,
  category: EmailCategory,
  options: {
    limit?: number;
    status?: 'unread' | 'read' | 'actioned' | 'archived';
  } = {}
): Promise<Array<{
  id: string;
  subject: string;
  from: string;
  summary: string | null;
  receivedAt: Date;
  relevanceScore: number;
}>> {
  return prisma.emailInsight.findMany({
    where: {
      householdId,
      category,
      status: options.status,
    },
    select: {
      id: true,
      subject: true,
      from: true,
      summary: true,
      receivedAt: true,
      relevanceScore: true,
    },
    orderBy: { receivedAt: 'desc' },
    take: options.limit || 20,
  });
}

/**
 * Get high-priority email insights
 */
export async function getHighPriorityEmailInsights(
  householdId: string,
  limit: number = 10
): Promise<Array<{
  id: string;
  category: string;
  subject: string;
  summary: string | null;
  relevanceScore: number;
  receivedAt: Date;
}>> {
  return prisma.emailInsight.findMany({
    where: {
      householdId,
      status: 'unread',
      relevanceScore: { gte: 0.7 },
    },
    select: {
      id: true,
      category: true,
      subject: true,
      summary: true,
      relevanceScore: true,
      receivedAt: true,
    },
    orderBy: [
      { relevanceScore: 'desc' },
      { receivedAt: 'desc' },
    ],
    take: limit,
  });
}
