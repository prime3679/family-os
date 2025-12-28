/**
 * SMS Client - Twilio integration for FamilyOS
 *
 * Handles sending and receiving SMS messages for proactive notifications.
 */

import twilio from 'twilio';

// Lazy initialization to avoid build-time errors
let twilioClient: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio | null {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  console.log('[Twilio] Account SID present:', !!accountSid, accountSid?.substring(0, 6) + '...');
  console.log('[Twilio] Auth Token present:', !!authToken);

  if (!accountSid || !authToken) {
    console.warn('[Twilio] Credentials not configured - SMS will be logged but not sent');
    return null;
  }

  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('[Twilio] Client initialized successfully');
    return twilioClient;
  } catch (error) {
    console.error('[Twilio] Failed to initialize client:', error);
    return null;
  }
}

export interface SMSMessage {
  to: string;
  body: string;
  statusCallback?: string; // Webhook URL for delivery status
}

export interface SMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

/**
 * Send an SMS message via Twilio
 */
export async function sendSMS(message: SMSMessage): Promise<SMSResult> {
  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  console.log('[SMS] Attempting to send to:', message.to);
  console.log('[SMS] From number:', fromNumber);
  console.log('[SMS] Client available:', !!client);

  if (!client || !fromNumber) {
    // Log the message in development
    console.log('[SMS] DEV MODE - Would send:', message.body);
    return { success: true, messageSid: 'dev-' + Date.now() };
  }

  try {
    const result = await client.messages.create({
      to: message.to,
      from: fromNumber,
      body: message.body,
      statusCallback: message.statusCallback,
    });

    console.log('[SMS] Sent to', message.to, 'SID:', result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error: unknown) {
    console.error('[SMS] Failed to send:', error);

    // Check for trial account restrictions
    const twilioError = error as { code?: number; message?: string };
    if (twilioError.code === 21608) {
      return {
        success: false,
        error: 'Trial account: This phone number is not verified. Please verify it in Twilio Console first, or upgrade your Twilio account.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send verification code to a phone number
 */
export async function sendVerificationCode(
  phoneNumber: string,
  code: string
): Promise<SMSResult> {
  return sendSMS({
    to: phoneNumber,
    body: `Your FamilyOS verification code is: ${code}\n\nThis code expires in 10 minutes.`,
  });
}

/**
 * Validate E.164 phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // E.164 format: +[country code][number]
  // Examples: +14155551234, +447911123456
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Format phone number to E.164
 * This is a simple implementation - production should use libphonenumber
 */
export function formatPhoneNumber(phone: string, defaultCountry: string = 'US'): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If already in E.164 format, return as-is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If US number without country code
  if (defaultCountry === 'US' && cleaned.length === 10) {
    return '+1' + cleaned;
  }

  // If US number with 1 prefix
  if (defaultCountry === 'US' && cleaned.length === 11 && cleaned.startsWith('1')) {
    return '+' + cleaned;
  }

  // Default: assume it needs a + prefix
  return '+' + cleaned;
}

/**
 * Parse incoming SMS webhook from Twilio
 */
export interface IncomingSMS {
  messageSid: string;
  from: string;
  to: string;
  body: string;
  numMedia: number;
  timestamp: Date;
}

export function parseIncomingSMS(body: Record<string, string>): IncomingSMS {
  return {
    messageSid: body.MessageSid || body.SmsSid || '',
    from: body.From || '',
    to: body.To || '',
    body: body.Body || '',
    numMedia: parseInt(body.NumMedia || '0', 10),
    timestamp: new Date(),
  };
}
