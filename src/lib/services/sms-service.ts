/**
 * SMS Service
 * Handles sending SMS messages via Twilio or similar providers
 * Falls back to logging in development mode
 */

import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Types
// =============================================================================

export interface SmsOptions {
  to: string;
  message: string;
  from?: string;
  mediaUrl?: string[];
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkSmsOptions {
  recipients: string[];
  message: string;
  from?: string;
  mediaUrl?: string[];
}

export interface BulkSmsResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

// =============================================================================
// SMS Service
// =============================================================================

class SmsServiceImpl {
  private defaultFrom: string;
  private isConfigured: boolean;

  constructor() {
    this.defaultFrom = process.env.TWILIO_PHONE_NUMBER || '';
    this.isConfigured = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );
  }

  /**
   * Send a single SMS
   */
  async send(options: SmsOptions): Promise<SmsResult> {
    const { to, message, from = this.defaultFrom, mediaUrl } = options;

    // Validate phone number format (basic validation)
    const cleanedNumber = this.cleanPhoneNumber(to);
    if (!cleanedNumber) {
      return { success: false, error: 'Invalid phone number format' };
    }

    // Log in development or when SMS is not configured
    if (!this.isConfigured || process.env.NODE_ENV === 'development') {
      console.log(`[SMS] Would send SMS:`, {
        to: cleanedNumber,
        from,
        messageLength: message.length,
        hasMedia: !!mediaUrl?.length,
      });

      await this.logSms({
        recipient: cleanedNumber,
        message,
        status: 'simulated',
        metadata: { from, hasMedia: !!mediaUrl?.length },
      });

      return { success: true, messageId: `simulated-${Date.now()}` };
    }

    try {
      return await this.sendViaTwilio({ to: cleanedNumber, message, from, mediaUrl });
    } catch (error) {
      console.error('[SMS] Send failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendViaTwilio(options: SmsOptions): Promise<SmsResult> {
    const { to, message, from, mediaUrl } = options;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return { success: false, error: 'Twilio credentials not configured' };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const body = new URLSearchParams({
      To: to,
      From: from || this.defaultFrom,
      Body: message,
    });

    if (mediaUrl?.length) {
      mediaUrl.forEach(url => body.append('MediaUrl', url));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[SMS] Twilio error:', data);
      return { success: false, error: data.message || `Twilio error: ${response.status}` };
    }

    await this.logSms({
      recipient: to,
      message,
      status: 'sent',
      provider: 'twilio',
      messageId: data.sid,
      metadata: { from, segments: data.num_segments },
    });

    return { success: true, messageId: data.sid };
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulk(options: BulkSmsOptions): Promise<BulkSmsResult> {
    const { recipients, message, from, mediaUrl } = options;

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches of 50 to avoid rate limiting
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(recipient =>
          this.send({ to: recipient, message, from, mediaUrl })
        )
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          sent++;
        } else {
          failed++;
          const error = result.status === 'rejected'
            ? String(result.reason)
            : result.value.error || 'Unknown error';
          if (errors.length < 10) {
            errors.push(error);
          }
        }
      }

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: failed === 0,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Send AMBER Alert SMS
   */
  async sendAmberAlert(options: {
    recipients: string[];
    alertNumber: string;
    childName: string;
    abductionCity: string;
    abductionProvince: string;
    contactPhone: string;
    alertUrl: string;
  }): Promise<BulkSmsResult> {
    const { recipients, alertNumber, childName, abductionCity, abductionProvince, contactPhone, alertUrl } = options;

    // SMS must be concise (160 characters for single segment)
    const message = `🚨 AMBER ALERT: ${childName} missing from ${abductionCity}, ${abductionProvince}. Info? Call ${contactPhone}. Details: ${alertUrl}`;

    return this.sendBulk({
      recipients,
      message,
    });
  }

  /**
   * Clean and validate phone number
   */
  private cleanPhoneNumber(phone: string): string | null {
    // Remove all non-digit characters except leading +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If it starts with 1 and is 11 digits, assume it's US/Canada without +
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = '+' + cleaned;
    }
    // If it's 10 digits, assume US/Canada
    else if (cleaned.length === 10) {
      cleaned = '+1' + cleaned;
    }
    // If it doesn't start with +, add it
    else if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    // Basic validation: must be at least 10 digits (after +)
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      return null;
    }

    return cleaned;
  }

  /**
   * Log SMS to database for audit
   */
  private async logSms(data: {
    recipient: string;
    message: string;
    status: string;
    provider?: string;
    messageId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase.from('sms_logs').insert({
        recipient: data.recipient,
        message_preview: data.message.substring(0, 100),
        status: data.status,
        provider: data.provider,
        external_message_id: data.messageId,
        metadata: data.metadata,
      });
    } catch (error) {
      // Don't fail the SMS send if logging fails
      console.error('[SMS] Failed to log SMS:', error);
    }
  }
}

// Export singleton instance
export const smsService = new SmsServiceImpl();
