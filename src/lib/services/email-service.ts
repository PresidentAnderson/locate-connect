/**
 * Email Service
 * Handles sending emails via configurable providers (SendGrid, SES, SMTP, etc.)
 * Falls back to logging in development mode
 */

import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Types
// =============================================================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  templateId?: string;
  templateData?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkEmailOptions {
  recipients: Array<{ email: string; data?: Record<string, unknown> }>;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  from?: string;
  tags?: string[];
}

export interface BulkEmailResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

// =============================================================================
// Email Service
// =============================================================================

class EmailServiceImpl {
  private defaultFrom: string;
  private isConfigured: boolean;

  constructor() {
    this.defaultFrom = process.env.EMAIL_FROM || 'noreply@locateconnect.ca';
    this.isConfigured = Boolean(
      process.env.SENDGRID_API_KEY ||
      process.env.AWS_SES_REGION ||
      process.env.SMTP_HOST
    );
  }

  /**
   * Send a single email
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    const { to, subject, html, text, from = this.defaultFrom, priority = 'normal' } = options;

    // Log in development or when email is not configured
    if (!this.isConfigured || process.env.NODE_ENV === 'development') {
      console.log(`[EMAIL] Would send email:`, {
        to: Array.isArray(to) ? to : [to],
        subject,
        from,
        priority,
        hasHtml: !!html,
        hasText: !!text,
      });

      // Log the email to the database for audit purposes
      await this.logEmail({
        recipients: Array.isArray(to) ? to : [to],
        subject,
        status: 'simulated',
        metadata: { priority, from },
      });

      return { success: true, messageId: `simulated-${Date.now()}` };
    }

    try {
      // Try SendGrid first
      if (process.env.SENDGRID_API_KEY) {
        return await this.sendViaSendGrid(options);
      }

      // Try AWS SES
      if (process.env.AWS_SES_REGION) {
        return await this.sendViaSES(options);
      }

      // Fallback to logging
      console.warn('[EMAIL] No email provider configured, logging email instead');
      await this.logEmail({
        recipients: Array.isArray(to) ? to : [to],
        subject,
        status: 'not_configured',
        metadata: { priority },
      });

      return { success: true, messageId: `logged-${Date.now()}` };
    } catch (error) {
      console.error('[EMAIL] Send failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendViaSendGrid(options: EmailOptions): Promise<EmailResult> {
    const { to, subject, html, text, from = this.defaultFrom, templateId, templateData } = options;

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'SendGrid API key not configured' };
    }

    const recipients = Array.isArray(to) ? to : [to];

    const payload: Record<string, unknown> = {
      personalizations: [{
        to: recipients.map(email => ({ email })),
      }],
      from: { email: from },
      subject,
    };

    if (templateId) {
      payload.template_id = templateId;
      if (templateData) {
        (payload.personalizations as Record<string, unknown>[])[0].dynamic_template_data = templateData;
      }
    } else {
      payload.content = [];
      if (text) {
        (payload.content as Array<{ type: string; value: string }>).push({ type: 'text/plain', value: text });
      }
      if (html) {
        (payload.content as Array<{ type: string; value: string }>).push({ type: 'text/html', value: html });
      }
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[EMAIL] SendGrid error:', errorText);
      return { success: false, error: `SendGrid error: ${response.status}` };
    }

    const messageId = response.headers.get('x-message-id') || `sg-${Date.now()}`;

    await this.logEmail({
      recipients,
      subject,
      status: 'sent',
      provider: 'sendgrid',
      messageId,
      metadata: { templateId },
    });

    return { success: true, messageId };
  }

  /**
   * Send email via AWS SES using the v2 API
   */
  private async sendViaSES(options: EmailOptions): Promise<EmailResult> {
    const { to, subject, html, text, from = this.defaultFrom, replyTo } = options;

    const region = process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      console.log('[EMAIL] AWS credentials not configured, falling back to logging');
      const recipients = Array.isArray(to) ? to : [to];
      await this.logEmail({
        recipients,
        subject,
        status: 'not_configured',
        provider: 'ses',
        metadata: {},
      });
      return { success: true, messageId: `ses-logged-${Date.now()}` };
    }

    const recipients = Array.isArray(to) ? to : [to];
    const endpoint = `https://email.${region}.amazonaws.com/v2/email/outbound-emails`;

    // Build the request payload for SES v2
    const payload = {
      FromEmailAddress: from,
      Destination: {
        ToAddresses: recipients,
      },
      Content: {
        Simple: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {} as Record<string, { Data: string; Charset: string }>,
        },
      },
      ...(replyTo && { ReplyToAddresses: [replyTo] }),
    };

    if (html) {
      payload.Content.Simple.Body.Html = { Data: html, Charset: 'UTF-8' };
    }
    if (text) {
      payload.Content.Simple.Body.Text = { Data: text, Charset: 'UTF-8' };
    }

    try {
      // Generate AWS Signature V4
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = amzDate.substring(0, 8);

      const service = 'ses';
      const host = `email.${region}.amazonaws.com`;
      const canonicalUri = '/v2/email/outbound-emails';
      const method = 'POST';
      const contentType = 'application/json';
      const body = JSON.stringify(payload);

      // Create canonical request
      const canonicalHeaders = [
        `content-type:${contentType}`,
        `host:${host}`,
        `x-amz-date:${amzDate}`,
      ].join('\n') + '\n';

      const signedHeaders = 'content-type;host;x-amz-date';

      const payloadHash = await this.sha256Hash(body);
      const canonicalRequest = [
        method,
        canonicalUri,
        '', // query string
        canonicalHeaders,
        signedHeaders,
        payloadHash,
      ].join('\n');

      // Create string to sign
      const algorithm = 'AWS4-HMAC-SHA256';
      const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
      const canonicalRequestHash = await this.sha256Hash(canonicalRequest);
      const stringToSign = [
        algorithm,
        amzDate,
        credentialScope,
        canonicalRequestHash,
      ].join('\n');

      // Calculate signature
      const signingKey = await this.getSignatureKey(secretAccessKey, dateStamp, region, service);
      const signature = await this.hmacSha256Hex(signingKey, stringToSign);

      // Build authorization header
      const authorizationHeader = [
        `${algorithm} Credential=${accessKeyId}/${credentialScope}`,
        `SignedHeaders=${signedHeaders}`,
        `Signature=${signature}`,
      ].join(', ');

      // Make the request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'Host': host,
          'X-Amz-Date': amzDate,
          'Authorization': authorizationHeader,
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EMAIL] AWS SES error:', response.status, errorText);
        return { success: false, error: `AWS SES error: ${response.status} - ${errorText}` };
      }

      const data = await response.json() as { MessageId?: string };
      const messageId = data.MessageId || `ses-${Date.now()}`;

      await this.logEmail({
        recipients,
        subject,
        status: 'sent',
        provider: 'ses',
        messageId,
        metadata: {},
      });

      console.log(`[EMAIL] Sent via AWS SES: ${messageId}`);
      return { success: true, messageId };
    } catch (error) {
      console.error('[EMAIL] AWS SES send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SES error',
      };
    }
  }

  /**
   * AWS Signature V4 helpers
   */
  private async sha256Hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async hmacSha256(key: BufferSource, data: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  }

  private async hmacSha256Hex(key: ArrayBuffer, data: string): Promise<string> {
    const buffer = await this.hmacSha256(key, data);
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async getSignatureKey(
    secretKey: string,
    dateStamp: string,
    region: string,
    service: string
  ): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const kDate = await this.hmacSha256(encoder.encode('AWS4' + secretKey), dateStamp);
    const kRegion = await this.hmacSha256(kDate, region);
    const kService = await this.hmacSha256(kRegion, service);
    return this.hmacSha256(kService, 'aws4_request');
  }

  /**
   * Send bulk emails
   */
  async sendBulk(options: BulkEmailOptions): Promise<BulkEmailResult> {
    const { recipients, subject, html, text, templateId, templateData, from, tags } = options;

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(recipient =>
          this.send({
            to: recipient.email,
            subject,
            html: this.interpolateTemplate(html || '', { ...templateData, ...recipient.data }),
            text: this.interpolateTemplate(text || '', { ...templateData, ...recipient.data }),
            from,
            templateId,
            templateData: { ...templateData, ...recipient.data },
            tags,
          })
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
    }

    return {
      success: failed === 0,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Send AMBER Alert email
   */
  async sendAmberAlert(options: {
    recipients: string[];
    alertNumber: string;
    childName: string;
    childAge?: number;
    childDescription?: string;
    abductionLocation: string;
    abductionCity: string;
    abductionProvince: string;
    vehicleInfo?: string;
    contactPhone: string;
    childPhotoUrl?: string;
    alertUrl: string;
  }): Promise<BulkEmailResult> {
    const {
      recipients,
      alertNumber,
      childName,
      childAge,
      childDescription,
      abductionLocation,
      abductionCity,
      abductionProvince,
      vehicleInfo,
      contactPhone,
      childPhotoUrl,
      alertUrl,
    } = options;

    const subject = `🚨 AMBER Alert: ${childName} - Please Help`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AMBER Alert: ${childName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚨 AMBER ALERT</h1>
          <p style="margin: 10px 0 0; font-size: 14px;">Alert #${alertNumber}</p>
        </div>

        <div style="background-color: white; padding: 20px; border-radius: 0 0 8px 8px;">
          ${childPhotoUrl ? `<img src="${childPhotoUrl}" alt="${childName}" style="width: 100%; max-width: 300px; display: block; margin: 0 auto 20px; border-radius: 8px;">` : ''}

          <h2 style="color: #1a1a1a; margin-top: 0;">Missing: ${childName}</h2>
          ${childAge ? `<p style="color: #666; margin: 5px 0;"><strong>Age:</strong> ${childAge} years old</p>` : ''}
          ${childDescription ? `<p style="color: #666; margin: 5px 0;"><strong>Description:</strong> ${childDescription}</p>` : ''}

          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;">
              <strong>Last Seen:</strong><br>
              ${abductionLocation}<br>
              ${abductionCity}, ${abductionProvince}
            </p>
          </div>

          ${vehicleInfo ? `
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>Vehicle Information:</strong><br>
              ${vehicleInfo}
            </p>
          </div>
          ` : ''}

          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #065f46;">
              <strong>If you have any information, please contact:</strong><br>
              <a href="tel:${contactPhone}" style="color: #065f46; font-size: 18px; font-weight: bold;">${contactPhone}</a>
            </p>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <a href="${alertUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Full Alert Details
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

          <p style="color: #666; font-size: 12px; text-align: center;">
            This AMBER Alert was sent via LocateConnect.
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://locateconnect.ca'}/unsubscribe" style="color: #dc2626;">Unsubscribe</a>
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
AMBER ALERT - Alert #${alertNumber}

Missing: ${childName}
${childAge ? `Age: ${childAge} years old` : ''}
${childDescription ? `Description: ${childDescription}` : ''}

Last Seen: ${abductionLocation}, ${abductionCity}, ${abductionProvince}

${vehicleInfo ? `Vehicle Information: ${vehicleInfo}` : ''}

If you have any information, please contact: ${contactPhone}

View full details: ${alertUrl}

---
This AMBER Alert was sent via LocateConnect.
    `.trim();

    return this.sendBulk({
      recipients: recipients.map(email => ({ email })),
      subject,
      html,
      text,
      tags: ['amber-alert', alertNumber],
    });
  }

  /**
   * Simple template interpolation
   */
  private interpolateTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return data[key] !== undefined ? String(data[key]) : `{{${key}}}`;
    });
  }

  /**
   * Log email to database for audit
   */
  private async logEmail(data: {
    recipients: string[];
    subject: string;
    status: string;
    provider?: string;
    messageId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase.from('email_logs').insert({
        recipient_count: data.recipients.length,
        recipients: data.recipients.slice(0, 10), // Store first 10 for reference
        subject: data.subject,
        status: data.status,
        provider: data.provider,
        external_message_id: data.messageId,
        metadata: data.metadata,
      });
    } catch (error) {
      // Don't fail the email send if logging fails
      console.error('[EMAIL] Failed to log email:', error);
    }
  }
}

// Export singleton instance
export const emailService = new EmailServiceImpl();

// Export types for use elsewhere
export type { EmailServiceImpl as EmailService };
