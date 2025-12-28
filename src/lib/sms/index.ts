/**
 * SMS Module - FamilyOS
 *
 * SMS-first proactive notifications via Twilio.
 */

export {
  sendSMS,
  sendVerificationCode,
  isValidPhoneNumber,
  formatPhoneNumber,
  parseIncomingSMS,
  type SMSMessage,
  type SMSResult,
  type IncomingSMS,
} from './client';

export {
  generateSMSMessage,
  parseReply,
  getTemplate,
  type InsightType,
  type TemplateData,
  type SMSTemplate,
} from './templates';
