/**
 * Email Classifier
 *
 * Uses Claude to categorize and analyze emails for family relevance.
 * Extracts action items and determines priority.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { GmailMessage } from './client';

// Email categories
export type EmailCategory =
  | 'school'       // School-related (teachers, principal, newsletters)
  | 'medical'      // Medical appointments, prescriptions, health
  | 'activities'   // Sports, clubs, extracurriculars
  | 'logistics'    // Pickup, dropoff, carpool coordination
  | 'social'       // Invitations, playdates, events
  | 'financial'    // Bills, payments related to kids
  | 'spam'         // Marketing, not family-relevant
  | 'other';       // Doesn't fit other categories

export interface EmailClassification {
  category: EmailCategory;
  relevanceScore: number;      // 0-1 how relevant to family
  summary: string;             // 1-2 sentence summary
  actionItems: ActionItem[];   // Extracted action items
  deadlines: Deadline[];       // Extracted dates/deadlines
  requiresResponse: boolean;   // Does email need a reply
  urgency: 'low' | 'medium' | 'high';
}

export interface ActionItem {
  description: string;
  dueDate?: string;
  assignedTo?: 'parent_a' | 'parent_b' | 'both';
}

export interface Deadline {
  description: string;
  date: string;
  isRecurring: boolean;
}

const anthropic = new Anthropic();

/**
 * Classify a single email
 */
export async function classifyEmail(
  email: GmailMessage,
  householdContext?: {
    childrenNames?: string[];
    schoolDomains?: string[];
  }
): Promise<EmailClassification> {
  const prompt = buildClassificationPrompt(email, householdContext);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Parse the response
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseClassificationResponse(text);
}

/**
 * Classify multiple emails in batch
 */
export async function classifyEmails(
  emails: GmailMessage[],
  householdContext?: {
    childrenNames?: string[];
    schoolDomains?: string[];
  }
): Promise<Map<string, EmailClassification>> {
  const results = new Map<string, EmailClassification>();

  // Process in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const promises = batch.map(email =>
      classifyEmail(email, householdContext).then(classification => ({
        id: email.id,
        classification,
      }))
    );

    const batchResults = await Promise.all(promises);
    for (const result of batchResults) {
      results.set(result.id, result.classification);
    }
  }

  return results;
}

/**
 * Build the classification prompt
 */
function buildClassificationPrompt(
  email: GmailMessage,
  context?: {
    childrenNames?: string[];
    schoolDomains?: string[];
  }
): string {
  const contextInfo = context
    ? `
Family Context:
- Children's names: ${context.childrenNames?.join(', ') || 'Not specified'}
- Known school domains: ${context.schoolDomains?.join(', ') || 'Not specified'}
`
    : '';

  return `Analyze this email for a busy family and classify it.

${contextInfo}

Email Details:
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date.toISOString()}
Snippet: ${email.snippet}
${email.body ? `Body (truncated):\n${email.body.slice(0, 2000)}` : ''}

Classify this email and respond in the following JSON format:
{
  "category": "school" | "medical" | "activities" | "logistics" | "social" | "financial" | "spam" | "other",
  "relevanceScore": 0.0-1.0 (how relevant to family life),
  "summary": "1-2 sentence summary of the email",
  "actionItems": [
    {
      "description": "what needs to be done",
      "dueDate": "YYYY-MM-DD or null",
      "assignedTo": "parent_a" | "parent_b" | "both" | null
    }
  ],
  "deadlines": [
    {
      "description": "deadline description",
      "date": "YYYY-MM-DD",
      "isRecurring": true/false
    }
  ],
  "requiresResponse": true/false,
  "urgency": "low" | "medium" | "high"
}

Classification guidelines:
- school: newsletters, teacher communications, homework reminders, school events
- medical: doctor appointments, prescriptions, health updates, insurance
- activities: sports schedules, practice notices, game times, club updates
- logistics: pickup/dropoff coordination, carpool, schedule changes
- social: party invitations, playdates, family gatherings
- financial: bills, payments, subscriptions related to family
- spam: marketing, promotions, newsletters unrelated to family
- other: doesn't fit above categories

Relevance score guide:
- 0.9-1.0: Requires immediate attention or action
- 0.7-0.8: Important information for the week
- 0.5-0.6: Good to know but not urgent
- 0.3-0.4: Marginally relevant
- 0.0-0.2: Not relevant to family

Only output the JSON, no other text.`;
}

/**
 * Parse the classification response from Claude
 */
function parseClassificationResponse(text: string): EmailClassification {
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(text.trim());

    return {
      category: validateCategory(parsed.category),
      relevanceScore: Math.max(0, Math.min(1, parseFloat(parsed.relevanceScore) || 0)),
      summary: String(parsed.summary || ''),
      actionItems: (parsed.actionItems || []).map((item: {
        description?: string;
        dueDate?: string;
        assignedTo?: string;
      }) => ({
        description: String(item.description || ''),
        dueDate: item.dueDate || undefined,
        assignedTo: validateAssignment(item.assignedTo),
      })),
      deadlines: (parsed.deadlines || []).map((d: {
        description?: string;
        date?: string;
        isRecurring?: boolean;
      }) => ({
        description: String(d.description || ''),
        date: String(d.date || ''),
        isRecurring: Boolean(d.isRecurring),
      })),
      requiresResponse: Boolean(parsed.requiresResponse),
      urgency: validateUrgency(parsed.urgency),
    };
  } catch (error) {
    console.error('Failed to parse classification response:', error);
    // Return default classification
    return {
      category: 'other',
      relevanceScore: 0.5,
      summary: 'Failed to classify email',
      actionItems: [],
      deadlines: [],
      requiresResponse: false,
      urgency: 'low',
    };
  }
}

function validateCategory(category: string): EmailCategory {
  const valid: EmailCategory[] = ['school', 'medical', 'activities', 'logistics', 'social', 'financial', 'spam', 'other'];
  return valid.includes(category as EmailCategory) ? (category as EmailCategory) : 'other';
}

function validateUrgency(urgency: string): 'low' | 'medium' | 'high' {
  const valid = ['low', 'medium', 'high'];
  return valid.includes(urgency) ? (urgency as 'low' | 'medium' | 'high') : 'low';
}

function validateAssignment(assignment: string | undefined): 'parent_a' | 'parent_b' | 'both' | undefined {
  if (!assignment) return undefined;
  const valid = ['parent_a', 'parent_b', 'both'];
  return valid.includes(assignment) ? (assignment as 'parent_a' | 'parent_b' | 'both') : undefined;
}

/**
 * Quick relevance check without full classification
 * Used for filtering before detailed analysis
 */
export function quickRelevanceCheck(email: GmailMessage): boolean {
  const fromLower = email.from.toLowerCase();
  const subjectLower = email.subject.toLowerCase();

  // Quick checks for likely relevant emails
  const relevantIndicators = [
    'school', 'edu', 'teacher', 'principal',
    'doctor', 'clinic', 'appointment', 'prescription',
    'practice', 'game', 'coach', 'tournament',
    'pickup', 'dropoff', 'carpool',
    'party', 'birthday', 'invitation',
  ];

  const spamIndicators = [
    'unsubscribe', 'marketing', 'promotion', 'sale',
    'newsletter', 'deal', 'offer', 'discount',
  ];

  const hasRelevant = relevantIndicators.some(
    ind => fromLower.includes(ind) || subjectLower.includes(ind)
  );

  const hasSpam = spamIndicators.some(
    ind => fromLower.includes(ind) || subjectLower.includes(ind)
  );

  return hasRelevant && !hasSpam;
}
