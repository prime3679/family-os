/**
 * Scout's SMS Message Templates
 *
 * Scout sends warm, helpful messages that acknowledge parenting chaos
 * while keeping things actionable. These templates power the proactive
 * SMS alerts that help families stay coordinated.
 *
 * Tone: Friendly helper, not corporate assistant
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
    `👀 Spotted: "${data.eventName}" is on ${data.partnerName}'s calendar for ${data.day}, but not yours. Want me to add it?\n\nReply YES or NO`,
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
    `🚨 Heads up! You both have things at ${data.time} on ${data.day}. Who's got pickup covered?\n\nReply ME, ${data.partnerName?.toUpperCase()?.split(' ')[0] || 'PARTNER'}, or HELP`,
  replyOptions: ['ME', 'PARTNER', 'HELP'],
  parseReply: (reply) => {
    const normalized = reply.trim().toUpperCase();
    if (normalized === 'ME' || normalized === 'A' || normalized === 'I') {
      return { action: 'assign_self', valid: true };
    }
    if (normalized === 'PARTNER' || normalized === 'B' || normalized.length <= 10) {
      // Accept partner's first name as valid response
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
    `😬 Found a gap: No one's free for ${data.childName ? data.childName + "'s" : 'kids'} pickup at ${data.time} on ${data.day}. Need backup options?\n\nReply YES or GOT IT (I'll handle)`,
  replyOptions: ['YES', 'GOT IT'],
  parseReply: (reply) => {
    const normalized = reply.trim().toUpperCase();
    if (normalized === 'YES' || normalized === 'Y') {
      return { action: 'need_backup', valid: true };
    }
    if (normalized === 'GOT IT' || normalized === 'HANDLE' || normalized === 'H' || normalized === 'NO') {
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
    `📊 Quick check: You've got ${data.count} things this week vs ${data.partnerName}'s ${data.count}. Worth rebalancing?\n\nReply HELP to discuss or OK if it's fine`,
  replyOptions: ['HELP', 'OK'],
  parseReply: (reply) => {
    const normalized = reply.trim().toUpperCase();
    if (normalized === 'HELP' || normalized === 'H') {
      return { action: 'discuss', valid: true };
    }
    if (normalized === 'OK' || normalized === 'K' || normalized === 'FINE' || normalized === 'GOOD') {
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
    `⚽ Quick heads up: "${data.eventName}" is ${data.day}. ${data.action || 'Everything packed and ready?'}\n\nReply DONE or REMIND ME tomorrow`,
  replyOptions: ['DONE', 'REMIND ME'],
  parseReply: (reply) => {
    const normalized = reply.trim().toUpperCase();
    if (normalized === 'DONE' || normalized === 'D' || normalized === 'YES' || normalized === 'YEP') {
      return { action: 'mark_done', valid: true };
    }
    if (normalized === 'REMIND ME' || normalized === 'REMIND' || normalized === 'R' || normalized === 'LATER') {
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
    `✓ FYI: ${data.partnerName} ${data.action}`,
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
