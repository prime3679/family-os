/**
 * SMS Message Templates for FamilyOS
 *
 * These templates define the SMS messages sent for different insight types.
 * Each template includes reply options for quick one-tap resolution.
 */

export type InsightType =
  | 'calendar_gap'
  | 'conflict'
  | 'coverage_gap'
  | 'load_imbalance'
  | 'prep_reminder'
  | 'partner_update'
  // Email-based insight types
  | 'school_notice'
  | 'medical_reminder'
  | 'activity_update'
  | 'logistics_alert'
  | 'social_event'
  | 'billing_reminder'
  | 'email_response_needed'
  | 'deadline'
  | 'other';

export interface TemplateData {
  eventName?: string;
  partnerName?: string;
  day?: string;
  time?: string;
  childName?: string;
  count?: number;
  action?: string;
  // Email-related fields
  emailSubject?: string;
  from?: string;
  summary?: string;
  dueDate?: string;
  source?: string;
  deadline?: string;
  description?: string;
  isRecurring?: boolean;
  daysUntil?: number;
}

export interface SMSTemplate {
  type: InsightType;
  generate: (data: TemplateData) => string;
  replyOptions: string[];
  parseReply: (reply: string) => { action: string; valid: boolean };
}

/**
 * Calendar Gap Template
 * When an event is on one parent's calendar but not the other's
 */
export const calendarGapTemplate: SMSTemplate = {
  type: 'calendar_gap',
  generate: (data) =>
    `📅 "${data.eventName}" is on ${data.partnerName}'s calendar but not yours (${data.day}). Add it?\n\nReply YES or NO`,
  replyOptions: ['YES', 'NO'],
  parseReply: (reply) => {
    const normalized = reply.trim().toUpperCase();
    if (normalized === 'YES' || normalized === 'Y') {
      return { action: 'add_to_calendar', valid: true };
    }
    if (normalized === 'NO' || normalized === 'N') {
      return { action: 'dismiss', valid: true };
    }
    return { action: 'unknown', valid: false };
  },
};

/**
 * Conflict Template
 * When both parents have overlapping events
 */
export const conflictTemplate: SMSTemplate = {
  type: 'conflict',
  generate: (data) =>
    `⚠️ You both have events at ${data.time} ${data.day}. Who handles pickup?\n\nReply A (you), B (${data.partnerName}), or HELP`,
  replyOptions: ['A', 'B', 'HELP'],
  parseReply: (reply) => {
    const normalized = reply.trim().toUpperCase();
    if (normalized === 'A' || normalized === 'ME') {
      return { action: 'assign_self', valid: true };
    }
    if (normalized === 'B' || normalized === 'PARTNER') {
      return { action: 'assign_partner', valid: true };
    }
    if (normalized === 'HELP') {
      return { action: 'need_help', valid: true };
    }
    return { action: 'unknown', valid: false };
  },
};

/**
 * Coverage Gap Template
 * When no one is available for a required time slot
 */
export const coverageGapTemplate: SMSTemplate = {
  type: 'coverage_gap',
  generate: (data) =>
    `🚨 No one free for ${data.childName || 'kids'} pickup ${data.time} ${data.day}. Need backup?\n\nReply YES for options or HANDLE (I'll figure it out)`,
  replyOptions: ['YES', 'HANDLE'],
  parseReply: (reply) => {
    const normalized = reply.trim().toUpperCase();
    if (normalized === 'YES' || normalized === 'Y') {
      return { action: 'need_backup', valid: true };
    }
    if (normalized === 'HANDLE' || normalized === 'H' || normalized === 'NO') {
      return { action: 'will_handle', valid: true };
    }
    return { action: 'unknown', valid: false };
  },
};

/**
 * Load Imbalance Template
 * When one parent has significantly more events than the other
 */
export const loadImbalanceTemplate: SMSTemplate = {
  type: 'load_imbalance',
  generate: (data) =>
    `📊 This week: You have ${data.count} events, ${data.partnerName} has ${data.count}. Want to rebalance?\n\nReply HELP to discuss or OK to acknowledge`,
  replyOptions: ['HELP', 'OK'],
  parseReply: (reply) => {
    const normalized = reply.trim().toUpperCase();
    if (normalized === 'HELP' || normalized === 'H') {
      return { action: 'discuss', valid: true };
    }
    if (normalized === 'OK' || normalized === 'K' || normalized === 'FINE') {
      return { action: 'acknowledge', valid: true };
    }
    return { action: 'unknown', valid: false };
  },
};

/**
 * Prep Reminder Template
 * Reminder to prepare for upcoming events
 */
export const prepReminderTemplate: SMSTemplate = {
  type: 'prep_reminder',
  generate: (data) =>
    `⚽ "${data.eventName}" is ${data.day}. ${data.action || 'Gear packed?'}\n\nReply DONE or REMIND (remind me tomorrow)`,
  replyOptions: ['DONE', 'REMIND'],
  parseReply: (reply) => {
    const normalized = reply.trim().toUpperCase();
    if (normalized === 'DONE' || normalized === 'D' || normalized === 'YES') {
      return { action: 'mark_done', valid: true };
    }
    if (normalized === 'REMIND' || normalized === 'R' || normalized === 'LATER') {
      return { action: 'remind_later', valid: true };
    }
    return { action: 'unknown', valid: false };
  },
};

/**
 * Partner Update Template
 * Notification when partner takes an action
 */
export const partnerUpdateTemplate: SMSTemplate = {
  type: 'partner_update',
  generate: (data) =>
    `✓ ${data.partnerName} ${data.action}`,
  replyOptions: [],
  parseReply: () => ({ action: 'none', valid: true }),
};

/**
 * Get template by insight type
 */
export function getTemplate(type: InsightType): SMSTemplate {
  switch (type) {
    case 'calendar_gap':
      return calendarGapTemplate;
    case 'conflict':
      return conflictTemplate;
    case 'coverage_gap':
      return coverageGapTemplate;
    case 'load_imbalance':
      return loadImbalanceTemplate;
    case 'prep_reminder':
      return prepReminderTemplate;
    case 'partner_update':
      return partnerUpdateTemplate;
    default:
      throw new Error(`Unknown template type: ${type}`);
  }
}

/**
 * Generate SMS message from insight type and data
 */
export function generateSMSMessage(type: InsightType, data: TemplateData): string {
  const template = getTemplate(type);
  return template.generate(data);
}

/**
 * Parse a reply for a given insight type
 */
export function parseReply(type: InsightType, reply: string): { action: string; valid: boolean } {
  const template = getTemplate(type);
  return template.parseReply(reply);
}
