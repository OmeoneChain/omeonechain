/**
 * SMS Service with Twilio Integration
 * File: code/poc/core/src/services/sms-service.ts
 */

import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Check if Twilio is configured
const isTwilioConfigured = !!(accountSid && authToken && twilioPhoneNumber);

let twilioClient: twilio.Twilio | null = null;

if (isTwilioConfigured) {
  twilioClient = twilio(accountSid, authToken);
  console.log('✅ Twilio SMS service initialized');
} else {
  console.warn('⚠️ Twilio not configured - SMS will be logged to console only');
  console.warn('   Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER');
}

export interface SMSOptions {
  to: string;          // Full phone number with country code (e.g., +5511999999999)
  message: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an SMS message
 */
export async function sendSMS({ to, message }: SMSOptions): Promise<SMSResult> {
  // Clean the phone number (ensure it has + prefix)
  const cleanedTo = to.startsWith('+') ? to : `+${to}`;
  
  console.log(`📱 SMS Request: to=${cleanedTo}, message="${message.substring(0, 50)}..."`);
  
  // If Twilio is not configured, log and return success (for development)
  if (!twilioClient || !isTwilioConfigured) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 [DEV MODE] SMS would be sent:');
    console.log(`   To: ${cleanedTo}`);
    console.log(`   Message: ${message}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return {
      success: true,
      messageId: `dev-${Date.now()}`
    };
  }
  
  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: cleanedTo
    });
    
    console.log(`✅ SMS sent successfully: ${result.sid}`);
    
    return {
      success: true,
      messageId: result.sid
    };
  } catch (error: any) {
    console.error('❌ SMS send error:', error.message);
    
    // Handle specific Twilio errors
    if (error.code === 21211) {
      return { success: false, error: 'Invalid phone number format' };
    }
    if (error.code === 21608) {
      return { success: false, error: 'Phone number not verified (trial account limitation)' };
    }
    if (error.code === 21610) {
      return { success: false, error: 'Phone number is blocked or unsubscribed' };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    };
  }
}

/**
 * Send verification code via SMS
 */
export async function sendVerificationCode(
  phoneNumber: string,
  code: string
): Promise<SMSResult> {
  const message = `Your BocaBoca verification code is: ${code}. Valid for 10 minutes.`;
  
  return sendSMS({
    to: phoneNumber,
    message
  });
}

/**
 * Format phone number for storage/comparison
 * Removes all non-numeric characters except leading +
 */
export function formatPhoneNumber(phone: string, countryCode?: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Add country code if provided and not already present
  if (countryCode) {
    const cleanedCountryCode = countryCode.replace(/\D/g, '');
    if (!cleaned.startsWith(cleanedCountryCode)) {
      cleaned = cleanedCountryCode + cleaned;
    }
  }
  
  // Ensure + prefix
  return `+${cleaned}`;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Remove non-numeric except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Must start with + and have 10-15 digits
  if (!cleaned.startsWith('+')) {
    return /^\d{10,15}$/.test(cleaned);
  }
  
  return /^\+\d{10,15}$/.test(cleaned);
}

/**
 * Get country code from phone number
 */
export function extractCountryCode(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '');
  
  // Common country codes (add more as needed)
  const countryCodes = [
    { code: '55', country: 'BR' },   // Brazil
    { code: '1', country: 'US' },    // US/Canada
    { code: '52', country: 'MX' },   // Mexico
    { code: '54', country: 'AR' },   // Argentina
    { code: '56', country: 'CL' },   // Chile
    { code: '57', country: 'CO' },   // Colombia
    { code: '51', country: 'PE' },   // Peru
  ];
  
  for (const { code } of countryCodes) {
    if (cleaned.startsWith(code)) {
      return code;
    }
  }
  
  return null;
}

export default {
  sendSMS,
  sendVerificationCode,
  formatPhoneNumber,
  isValidPhoneNumber,
  extractCountryCode
};