/**
 * AMBER Alert Distribution Service
 * Handles dispatching alerts to various channels
 */

import { createClient } from '@/lib/supabase/server';
import { emailService } from '@/lib/services/email-service';
import { smsService } from '@/lib/services/sms-service';
import { pushService } from '@/lib/services/push-service';
import { socialService } from '@/lib/services/social-service';
import type {
  AmberAlert,
  AmberDistribution,
  AmberDistributionChannel,
  AmberDistributionInsert,
  AmberDistributionSummary,
  DistributeAmberAlertRequest,
  DistributeAmberAlertResponse,
} from '@/types';

// =============================================================================
// Distribution Service
// =============================================================================

export class AmberDistributionService {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Distribute an AMBER alert to specified channels
   */
  async distributeAlert(
    request: DistributeAmberAlertRequest
  ): Promise<DistributeAmberAlertResponse> {
    const supabase = await this.getSupabase();

    // Get the AMBER alert
    const { data: alert, error: alertError } = await supabase
      .from('amber_alerts')
      .select('*')
      .eq('id', request.amber_alert_id)
      .single();

    if (alertError || !alert) {
      throw new Error('AMBER Alert not found');
    }

    // Get channels to distribute to (use request channels or alert's default)
    const channels = request.channels || (alert as AmberAlert).distribution_channels;
    const targetProvinces = request.target_provinces || (alert as AmberAlert).target_provinces;

    const distributionsCreated: AmberDistribution[] = [];

    // Create distributions for each channel
    for (const channel of channels) {
      const distributions = await this.createChannelDistributions(
        alert as AmberAlert,
        channel,
        targetProvinces,
        request.partner_ids,
        request.media_ids
      );
      distributionsCreated.push(...distributions);
    }

    // Log the distribution event
    await this.logDistributionEvent(
      request.amber_alert_id,
      'distribution_started',
      `Distribution initiated to ${channels.length} channels`
    );

    // Get summary
    const summary = await this.getDistributionSummary(request.amber_alert_id);

    return {
      success: true,
      amber_alert_id: request.amber_alert_id,
      distributions_created: distributionsCreated.length,
      summary,
    };
  }

  /**
   * Create distributions for a specific channel
   */
  private async createChannelDistributions(
    alert: AmberAlert,
    channel: AmberDistributionChannel,
    targetProvinces: string[],
    partnerIds?: string[],
    mediaIds?: string[]
  ): Promise<AmberDistribution[]> {
    const supabase = await this.getSupabase();
    const distributions: AmberDistributionInsert[] = [];

    switch (channel) {
      case 'partner_alert':
        const partnerDistributions = await this.getPartnerDistributions(
          alert,
          targetProvinces,
          partnerIds
        );
        distributions.push(...partnerDistributions);
        break;

      case 'media_outlet':
        const mediaDistributions = await this.getMediaDistributions(
          alert,
          targetProvinces,
          mediaIds
        );
        distributions.push(...mediaDistributions);
        break;

      case 'email':
        // Email distributions to subscribed users
        distributions.push({
          amber_alert_id: alert.id,
          channel: 'email',
          target_name: 'Email Subscribers',
          channel_config: { provinces: targetProvinces },
        });
        break;

      case 'push_notification':
        // Push notifications to mobile app users
        distributions.push({
          amber_alert_id: alert.id,
          channel: 'push_notification',
          target_name: 'Mobile App Users',
          channel_config: { provinces: targetProvinces },
        });
        break;

      case 'social_media':
        const socialDistributions = await this.getSocialMediaDistributions(alert);
        distributions.push(...socialDistributions);
        break;

      case 'sms':
        distributions.push({
          amber_alert_id: alert.id,
          channel: 'sms',
          target_name: 'SMS Subscribers',
          channel_config: { provinces: targetProvinces },
        });
        break;

      case 'wea':
      case 'eas':
      case 'highway_signs':
        // These require special handling and approval
        distributions.push({
          amber_alert_id: alert.id,
          channel,
          target_name: channel === 'wea' ? 'Wireless Emergency Alert System' :
                       channel === 'eas' ? 'Emergency Alert System' : 'Highway Digital Signage',
          channel_config: { provinces: targetProvinces, requires_approval: true },
        });
        break;

      case 'api_webhook':
        const webhookDistributions = await this.getWebhookDistributions(alert);
        distributions.push(...webhookDistributions);
        break;
    }

    // Insert all distributions
    if (distributions.length > 0) {
      const { data, error } = await supabase
        .from('amber_distributions')
        .insert(distributions)
        .select();

      if (error) {
        console.error(`Error creating ${channel} distributions:`, error);
        return [];
      }

      return data as AmberDistribution[];
    }

    return [];
  }

  /**
   * Get partner organizations to notify
   */
  private async getPartnerDistributions(
    alert: AmberAlert,
    targetProvinces: string[],
    specificPartnerIds?: string[]
  ): Promise<AmberDistributionInsert[]> {
    const supabase = await this.getSupabase();

    let query = supabase
      .from('partner_organizations')
      .select('id, name, contact_email, province')
      .eq('status', 'active');

    if (specificPartnerIds && specificPartnerIds.length > 0) {
      query = query.in('id', specificPartnerIds);
    } else if (targetProvinces.length > 0) {
      query = query.in('province', targetProvinces);
    }

    const { data: partners, error } = await query;

    if (error || !partners) {
      return [];
    }

    return partners.map((partner) => ({
      amber_alert_id: alert.id,
      channel: 'partner_alert' as AmberDistributionChannel,
      target_id: partner.id,
      target_name: partner.name,
      target_contact: partner.contact_email,
    }));
  }

  /**
   * Get media outlets to notify
   */
  private async getMediaDistributions(
    alert: AmberAlert,
    targetProvinces: string[],
    specificMediaIds?: string[]
  ): Promise<AmberDistributionInsert[]> {
    const supabase = await this.getSupabase();

    let query = supabase
      .from('media_contacts')
      .select('id, organization_name, contact_email, coverage_area')
      .eq('is_active', true)
      .eq('accepts_amber_alerts', true);

    if (specificMediaIds && specificMediaIds.length > 0) {
      query = query.in('id', specificMediaIds);
    }

    const { data: media, error } = await query;

    if (error || !media) {
      return [];
    }

    // Filter by coverage area if provinces specified
    const filteredMedia = targetProvinces.length > 0
      ? media.filter((m) =>
          m.coverage_area?.some((area: string) => targetProvinces.includes(area))
        )
      : media;

    return filteredMedia.map((outlet) => ({
      amber_alert_id: alert.id,
      channel: 'media_outlet' as AmberDistributionChannel,
      target_id: outlet.id,
      target_name: outlet.organization_name,
      target_contact: outlet.contact_email,
    }));
  }

  /**
   * Get social media accounts for posting
   */
  private async getSocialMediaDistributions(
    alert: AmberAlert
  ): Promise<AmberDistributionInsert[]> {
    const supabase = await this.getSupabase();

    const { data: accounts, error } = await supabase
      .from('social_media_accounts')
      .select('id, platform, account_name')
      .eq('is_active', true)
      .eq('is_connected', true)
      .eq('auto_post_amber', true);

    if (error || !accounts) {
      return [];
    }

    return accounts.map((account) => ({
      amber_alert_id: alert.id,
      channel: 'social_media' as AmberDistributionChannel,
      target_id: account.id,
      target_name: `${account.platform}: ${account.account_name}`,
      channel_config: { platform: account.platform },
    }));
  }

  /**
   * Get webhook endpoints for API distribution
   */
  private async getWebhookDistributions(
    alert: AmberAlert
  ): Promise<AmberDistributionInsert[]> {
    const supabase = await this.getSupabase();

    // Get partner organizations with API access
    const { data: partners, error } = await supabase
      .from('partner_organizations')
      .select('id, name')
      .eq('status', 'active')
      .eq('can_access_api', true);

    if (error || !partners) {
      return [];
    }

    return partners.map((partner) => ({
      amber_alert_id: alert.id,
      channel: 'api_webhook' as AmberDistributionChannel,
      target_id: partner.id,
      target_name: partner.name,
      channel_config: { type: 'partner_webhook' },
    }));
  }

  /**
   * Process pending distributions (called by background worker)
   */
  async processPendingDistributions(limit: number = 50): Promise<number> {
    const supabase = await this.getSupabase();

    // Get pending distributions
    const { data: pending, error } = await supabase
      .from('amber_distributions')
      .select('*, amber_alert:amber_alerts(*)')
      .in('status', ['pending', 'failed'])
      .or('next_retry_at.is.null,next_retry_at.lte.now()')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error || !pending) {
      return 0;
    }

    let processed = 0;

    for (const distribution of pending) {
      try {
        await this.processDistribution(distribution as AmberDistribution & { amber_alert: AmberAlert });
        processed++;
      } catch (err) {
        console.error(`Error processing distribution ${distribution.id}:`, err);
      }
    }

    return processed;
  }

  /**
   * Process a single distribution
   */
  private async processDistribution(
    distribution: AmberDistribution & { amber_alert: AmberAlert }
  ): Promise<void> {
    const supabase = await this.getSupabase();

    // Update status to sending
    await supabase
      .from('amber_distributions')
      .update({ status: 'sending', sent_at: new Date().toISOString() })
      .eq('id', distribution.id);

    try {
      // Route to appropriate handler based on channel
      switch (distribution.channel) {
        case 'partner_alert':
          await this.sendPartnerAlert(distribution);
          break;
        case 'email':
          await this.sendEmailDistribution(distribution);
          break;
        case 'push_notification':
          await this.sendPushNotification(distribution);
          break;
        case 'social_media':
          await this.sendSocialMediaPost(distribution);
          break;
        case 'media_outlet':
          await this.sendMediaAlert(distribution);
          break;
        case 'sms':
          await this.sendSmsDistribution(distribution);
          break;
        case 'api_webhook':
          await this.sendWebhook(distribution);
          break;
        case 'wea':
        case 'eas':
        case 'highway_signs':
          // These require manual approval, mark as queued
          await supabase
            .from('amber_distributions')
            .update({
              status: 'queued',
              status_message: 'Awaiting manual approval',
            })
            .eq('id', distribution.id);
          return;
      }

      // Mark as sent
      await supabase
        .from('amber_distributions')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', distribution.id);
    } catch (err) {
      // Mark as failed
      const retryCount = distribution.retry_count + 1;
      const nextRetry = new Date();
      nextRetry.setMinutes(nextRetry.getMinutes() + Math.pow(2, retryCount));

      await supabase
        .from('amber_distributions')
        .update({
          status: 'failed',
          status_message: err instanceof Error ? err.message : 'Unknown error',
          failed_at: new Date().toISOString(),
          retry_count: retryCount,
          next_retry_at: retryCount < distribution.max_retries ? nextRetry.toISOString() : null,
        })
        .eq('id', distribution.id);
    }
  }

  /**
   * Send partner alert (creates entry in partner_alerts table)
   */
  private async sendPartnerAlert(
    distribution: AmberDistribution & { amber_alert: AmberAlert }
  ): Promise<void> {
    const supabase = await this.getSupabase();

    if (!distribution.target_id) {
      throw new Error('Partner ID not specified');
    }

    const alert = distribution.amber_alert;

    // Create partner_alerts entry
    const { error } = await supabase.from('partner_alerts').insert({
      partner_id: distribution.target_id,
      case_id: alert.case_id,
      alert_type: 'amber_alert',
      title: `AMBER Alert: ${alert.child_name}`,
      message: this.formatAlertMessage(alert),
      priority: 'critical',
      delivery_method: 'in_app',
      delivery_status: 'sent',
    });

    if (error) {
      throw new Error(`Failed to create partner alert: ${error.message}`);
    }
  }

  /**
   * Send email distribution
   */
  private async sendEmailDistribution(
    distribution: AmberDistribution & { amber_alert: AmberAlert }
  ): Promise<void> {
    const supabase = await this.getSupabase();
    const alert = distribution.amber_alert;
    const provinces = (distribution.channel_config as { provinces?: string[] })?.provinces || [];

    console.log(`[EMAIL] Sending AMBER Alert ${alert.alert_number} to email subscribers`);

    // Get email subscribers for the target provinces
    let query = supabase
      .from('amber_email_subscribers')
      .select('email')
      .eq('is_active', true)
      .eq('email_verified', true);

    if (provinces.length > 0) {
      query = query.in('province', provinces);
    }

    const { data: subscribers, error } = await query;

    if (error || !subscribers?.length) {
      console.log(`[EMAIL] No email subscribers found for AMBER Alert ${alert.alert_number}`);
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://locateconnect.ca';
    const alertUrl = `${appUrl}/amber-alerts/${alert.id}`;

    // Build vehicle info string
    const vehicleInfo = alert.vehicle_involved && alert.vehicle_license_plate
      ? `${alert.vehicle_color || ''} ${alert.vehicle_make || ''} ${alert.vehicle_model || ''} - Plate: ${alert.vehicle_license_plate}`.trim()
      : undefined;

    const result = await emailService.sendAmberAlert({
      recipients: subscribers.map(s => s.email),
      alertNumber: alert.alert_number,
      childName: alert.child_name,
      childAge: alert.child_age,
      childDescription: alert.child_description,
      abductionLocation: alert.abduction_location,
      abductionCity: alert.abduction_city,
      abductionProvince: alert.abduction_province,
      vehicleInfo,
      contactPhone: alert.requesting_officer_phone,
      childPhotoUrl: alert.child_photo_url,
      alertUrl,
    });

    if (!result.success) {
      throw new Error(`Email distribution failed: ${result.errors?.join(', ')}`);
    }

    console.log(`[EMAIL] Sent AMBER Alert to ${result.sent} subscribers`);
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    distribution: AmberDistribution & { amber_alert: AmberAlert }
  ): Promise<void> {
    const alert = distribution.amber_alert;
    const provinces = (distribution.channel_config as { provinces?: string[] })?.provinces || [];

    console.log(`[PUSH] Sending AMBER Alert ${alert.alert_number} via push notification`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://locateconnect.ca';
    const alertUrl = `${appUrl}/amber-alerts/${alert.id}`;

    const result = await pushService.sendAmberAlert({
      provinces: provinces.length > 0 ? provinces : alert.target_provinces,
      alertNumber: alert.alert_number,
      childName: alert.child_name,
      childAge: alert.child_age,
      abductionCity: alert.abduction_city,
      abductionProvince: alert.abduction_province,
      childPhotoUrl: alert.child_photo_url,
      alertUrl,
    });

    console.log(`[PUSH] Sent AMBER Alert to ${result.sent} devices, ${result.failed} failed, ${result.expired} expired`);

    if (result.sent === 0 && result.failed > 0) {
      throw new Error(`Push notification distribution failed: ${result.errors?.join(', ')}`);
    }
  }

  /**
   * Send social media post
   */
  private async sendSocialMediaPost(
    distribution: AmberDistribution & { amber_alert: AmberAlert }
  ): Promise<void> {
    const alert = distribution.amber_alert;

    if (!distribution.target_id) {
      throw new Error('Social media account ID not specified');
    }

    console.log(`[SOCIAL] Posting AMBER Alert ${alert.alert_number} to ${distribution.target_name}`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://locateconnect.ca';
    const alertUrl = `${appUrl}/amber-alerts/${alert.id}`;

    // Build the message for social media
    const message = [
      `🚨 AMBER ALERT 🚨`,
      ``,
      `Missing: ${alert.child_name}`,
      alert.child_age ? `Age: ${alert.child_age} years old` : '',
      `Last seen: ${alert.abduction_city}, ${alert.abduction_province}`,
      ``,
      `If you have any information, please contact:`,
      `📞 ${alert.requesting_officer_phone}`,
      ``,
      `More details: ${alertUrl}`,
      ``,
      `Please share to help bring ${alert.child_name.split(' ')[0]} home! 🙏`,
    ].filter(Boolean).join('\n');

    const hashtags = [
      'AMBERAlert',
      'MissingChild',
      'HelpFindThem',
      alert.abduction_province.replace(/\s+/g, ''),
    ];

    const result = await socialService.post({
      accountId: distribution.target_id,
      message,
      imageUrl: alert.child_photo_url,
      link: alertUrl,
      hashtags,
    });

    if (!result.success) {
      throw new Error(`Social media post failed: ${result.error}`);
    }

    console.log(`[SOCIAL] Posted AMBER Alert to ${distribution.target_name}, post ID: ${result.postId}`);
  }

  /**
   * Send media outlet alert
   */
  private async sendMediaAlert(
    distribution: AmberDistribution & { amber_alert: AmberAlert }
  ): Promise<void> {
    const alert = distribution.amber_alert;

    if (!distribution.target_contact) {
      throw new Error('Media contact email not specified');
    }

    console.log(`[MEDIA] Sending AMBER Alert ${alert.alert_number} to ${distribution.target_name}`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://locateconnect.ca';
    const alertUrl = `${appUrl}/amber-alerts/${alert.id}`;

    // Build vehicle info string
    const vehicleInfo = alert.vehicle_involved && alert.vehicle_license_plate
      ? `${alert.vehicle_color || ''} ${alert.vehicle_make || ''} ${alert.vehicle_model || ''} - Plate: ${alert.vehicle_license_plate}`.trim()
      : undefined;

    // Format press release style email for media
    const subject = `[PRESS] AMBER ALERT: ${alert.child_name} - Alert #${alert.alert_number}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>AMBER Alert Press Release</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dc2626; color: white; padding: 15px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">🚨 AMBER ALERT - FOR IMMEDIATE RELEASE</h1>
        </div>

        <div style="padding: 20px; border: 1px solid #e5e5e5; border-top: none;">
          <p style="font-weight: bold; color: #666; margin: 0 0 10px;">Alert Number: ${alert.alert_number}</p>
          <p style="font-weight: bold; color: #666; margin: 0 0 20px;">Issued: ${new Date(alert.issued_at).toLocaleString()}</p>

          <h2 style="color: #1a1a1a; margin: 20px 0 10px;">Missing Child: ${alert.child_name}</h2>
          ${alert.child_age ? `<p style="margin: 5px 0;"><strong>Age:</strong> ${alert.child_age} years old</p>` : ''}
          ${alert.child_description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${alert.child_description}</p>` : ''}

          <h3 style="color: #1a1a1a; margin: 20px 0 10px;">Abduction Details</h3>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${alert.abduction_location}</p>
          <p style="margin: 5px 0;"><strong>City/Province:</strong> ${alert.abduction_city}, ${alert.abduction_province}</p>
          <p style="margin: 5px 0;"><strong>Date/Time:</strong> ${alert.abduction_date}${alert.abduction_time ? ` at ${alert.abduction_time}` : ''}</p>

          ${vehicleInfo ? `
          <h3 style="color: #1a1a1a; margin: 20px 0 10px;">Vehicle Information</h3>
          <p style="margin: 5px 0;">${vehicleInfo}</p>
          ` : ''}

          ${alert.suspect_name || alert.suspect_description ? `
          <h3 style="color: #1a1a1a; margin: 20px 0 10px;">Suspect Information</h3>
          ${alert.suspect_name ? `<p style="margin: 5px 0;"><strong>Name:</strong> ${alert.suspect_name}</p>` : ''}
          ${alert.suspect_description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${alert.suspect_description}</p>` : ''}
          ` : ''}

          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 0;"><strong>Media Contact:</strong></p>
            <p style="margin: 5px 0;">${alert.requesting_officer_name}</p>
            <p style="margin: 5px 0;">Agency: ${alert.requesting_officer_agency}</p>
            <p style="margin: 5px 0;">Phone: ${alert.requesting_officer_phone}</p>
          </div>

          ${alert.child_photo_url ? `
          <h3 style="color: #1a1a1a; margin: 20px 0 10px;">Photo</h3>
          <p style="margin: 5px 0;">High-resolution photo available at: <a href="${alert.child_photo_url}">${alert.child_photo_url}</a></p>
          ` : ''}

          <p style="margin: 20px 0;"><strong>Full details and updates:</strong> <a href="${alertUrl}">${alertUrl}</a></p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This AMBER Alert was distributed via LocateConnect. For media inquiries about our system,
            contact media@locateconnect.ca
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
AMBER ALERT - FOR IMMEDIATE RELEASE

Alert Number: ${alert.alert_number}
Issued: ${new Date(alert.issued_at).toLocaleString()}

MISSING CHILD: ${alert.child_name}
${alert.child_age ? `Age: ${alert.child_age} years old` : ''}
${alert.child_description ? `Description: ${alert.child_description}` : ''}

ABDUCTION DETAILS
Location: ${alert.abduction_location}
City/Province: ${alert.abduction_city}, ${alert.abduction_province}
Date/Time: ${alert.abduction_date}${alert.abduction_time ? ` at ${alert.abduction_time}` : ''}

${vehicleInfo ? `VEHICLE INFORMATION\n${vehicleInfo}\n` : ''}

${alert.suspect_name || alert.suspect_description ? `SUSPECT INFORMATION
${alert.suspect_name ? `Name: ${alert.suspect_name}` : ''}
${alert.suspect_description ? `Description: ${alert.suspect_description}` : ''}
` : ''}

MEDIA CONTACT
${alert.requesting_officer_name}
Agency: ${alert.requesting_officer_agency}
Phone: ${alert.requesting_officer_phone}

Full details: ${alertUrl}

---
This AMBER Alert was distributed via LocateConnect.
    `.trim();

    const result = await emailService.send({
      to: distribution.target_contact,
      subject,
      html,
      text,
      priority: 'high',
      tags: ['amber-alert', 'media', alert.alert_number],
    });

    if (!result.success) {
      throw new Error(`Media alert failed: ${result.error}`);
    }

    console.log(`[MEDIA] Sent AMBER Alert to ${distribution.target_name}`);
  }

  /**
   * Send SMS distribution
   */
  private async sendSmsDistribution(
    distribution: AmberDistribution & { amber_alert: AmberAlert }
  ): Promise<void> {
    const supabase = await this.getSupabase();
    const alert = distribution.amber_alert;
    const provinces = (distribution.channel_config as { provinces?: string[] })?.provinces || [];

    console.log(`[SMS] Sending AMBER Alert ${alert.alert_number} via SMS`);

    // Get SMS subscribers for the target provinces
    let query = supabase
      .from('amber_sms_subscribers')
      .select('phone_number')
      .eq('is_active', true)
      .eq('phone_verified', true);

    if (provinces.length > 0) {
      query = query.in('province', provinces);
    }

    const { data: subscribers, error } = await query;

    if (error || !subscribers?.length) {
      console.log(`[SMS] No SMS subscribers found for AMBER Alert ${alert.alert_number}`);
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://locateconnect.ca';
    const alertUrl = `${appUrl}/amber-alerts/${alert.id}`;

    const result = await smsService.sendAmberAlert({
      recipients: subscribers.map(s => s.phone_number),
      alertNumber: alert.alert_number,
      childName: alert.child_name,
      abductionCity: alert.abduction_city,
      abductionProvince: alert.abduction_province,
      contactPhone: alert.requesting_officer_phone,
      alertUrl,
    });

    console.log(`[SMS] Sent AMBER Alert to ${result.sent} recipients, ${result.failed} failed`);

    if (result.sent === 0 && result.failed > 0) {
      throw new Error(`SMS distribution failed: ${result.errors?.join(', ')}`);
    }
  }

  /**
   * Send webhook to partner API
   */
  private async sendWebhook(
    distribution: AmberDistribution & { amber_alert: AmberAlert }
  ): Promise<void> {
    const supabase = await this.getSupabase();
    const alert = distribution.amber_alert;

    if (!distribution.target_id) {
      throw new Error('Partner ID not specified');
    }

    // Get partner's webhook configuration and API key
    const { data: partner, error: partnerError } = await supabase
      .from('partner_organizations')
      .select('id, name, webhook_url, webhook_secret')
      .eq('id', distribution.target_id)
      .eq('status', 'active')
      .single();

    if (partnerError || !partner) {
      throw new Error('Partner organization not found or inactive');
    }

    if (!partner.webhook_url) {
      throw new Error('Partner does not have a webhook URL configured');
    }

    // Get partner's active API key for authentication
    const { data: apiKeyRecord } = await supabase
      .from('partner_api_keys')
      .select('key_hash, key_prefix')
      .eq('partner_id', distribution.target_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log(`[WEBHOOK] Sending AMBER Alert ${alert.alert_number} to ${distribution.target_name}`);

    // Build the webhook payload
    const payload = {
      event: 'amber_alert',
      timestamp: new Date().toISOString(),
      alert_number: alert.alert_number,
      alert: {
        id: alert.id,
        case_id: alert.case_id,
        alert_number: alert.alert_number,
        alert_status: alert.alert_status,
        child_name: alert.child_name,
        child_age: alert.child_age,
        child_gender: alert.child_gender,
        child_description: alert.child_description,
        child_photo_url: alert.child_photo_url,
        abduction_date: alert.abduction_date,
        abduction_time: alert.abduction_time,
        abduction_location: alert.abduction_location,
        abduction_city: alert.abduction_city,
        abduction_province: alert.abduction_province,
        target_provinces: alert.target_provinces,
        vehicle_involved: alert.vehicle_involved,
        vehicle_make: alert.vehicle_make,
        vehicle_model: alert.vehicle_model,
        vehicle_color: alert.vehicle_color,
        vehicle_year: alert.vehicle_year,
        vehicle_license_plate: alert.vehicle_license_plate,
        suspect_name: alert.suspect_name,
        suspect_description: alert.suspect_description,
        requesting_officer_name: alert.requesting_officer_name,
        requesting_officer_phone: alert.requesting_officer_phone,
        issued_at: alert.issued_at,
      },
    };

    // Create signature for verification (HMAC-SHA256)
    const payloadString = JSON.stringify(payload);
    let signature = '';

    if (partner.webhook_secret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(partner.webhook_secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(payloadString)
      );
      signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    // Make the webhook call
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': 'amber_alert',
      'X-Webhook-Timestamp': new Date().toISOString(),
      'X-Alert-Number': alert.alert_number,
    };

    if (signature) {
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    if (apiKeyRecord?.key_prefix) {
      headers['X-API-Key-Prefix'] = apiKeyRecord.key_prefix;
    }

    try {
      const response = await fetch(partner.webhook_url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Webhook returned ${response.status}: ${errorText.substring(0, 200)}`);
      }

      console.log(`[WEBHOOK] Successfully sent AMBER Alert to ${distribution.target_name}`);

      // Log the webhook delivery
      await supabase.from('webhook_deliveries').insert({
        partner_id: distribution.target_id,
        event_type: 'amber_alert',
        payload: payload,
        status: 'delivered',
        response_code: response.status,
        delivered_at: new Date().toISOString(),
      });
    } catch (err) {
      // Log the failed delivery
      await supabase.from('webhook_deliveries').insert({
        partner_id: distribution.target_id,
        event_type: 'amber_alert',
        payload: payload,
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
      });

      throw err;
    }
  }

  /**
   * Format alert message for text-based channels
   */
  private formatAlertMessage(alert: AmberAlert): string {
    const parts = [
      `AMBER Alert issued for ${alert.child_name}`,
      alert.child_age ? `Age: ${alert.child_age}` : null,
      alert.child_description,
      `Last seen: ${alert.abduction_location}, ${alert.abduction_city}, ${alert.abduction_province}`,
      alert.vehicle_involved && alert.vehicle_license_plate
        ? `Vehicle: ${alert.vehicle_color || ''} ${alert.vehicle_make || ''} ${alert.vehicle_model || ''} - Plate: ${alert.vehicle_license_plate}`
        : null,
      `Contact: ${alert.requesting_officer_phone}`,
    ];

    return parts.filter(Boolean).join('. ');
  }

  /**
   * Get distribution summary for an alert
   */
  async getDistributionSummary(alertId: string): Promise<AmberDistributionSummary> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('amber_distributions')
      .select('status, channel')
      .eq('amber_alert_id', alertId);

    if (error || !data) {
      return {
        total: 0,
        pending: 0,
        queued: 0,
        sending: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        by_channel: {} as Record<AmberDistributionChannel, number>,
      };
    }

    const summary: AmberDistributionSummary = {
      total: data.length,
      pending: data.filter((d) => d.status === 'pending').length,
      queued: data.filter((d) => d.status === 'queued').length,
      sending: data.filter((d) => d.status === 'sending').length,
      sent: data.filter((d) => d.status === 'sent').length,
      delivered: data.filter((d) => d.status === 'delivered').length,
      failed: data.filter((d) => d.status === 'failed').length,
      by_channel: {} as Record<AmberDistributionChannel, number>,
    };

    // Count by channel
    for (const dist of data) {
      const channel = dist.channel as AmberDistributionChannel;
      summary.by_channel[channel] = (summary.by_channel[channel] || 0) + 1;
    }

    return summary;
  }

  /**
   * Log a distribution event
   */
  private async logDistributionEvent(
    alertId: string,
    eventType: string,
    message: string,
    distributionId?: string
  ): Promise<void> {
    const supabase = await this.getSupabase();

    await supabase.from('amber_distribution_log').insert({
      amber_alert_id: alertId,
      distribution_id: distributionId,
      event_type: eventType,
      message,
      actor_type: 'system',
    });
  }

  /**
   * Cancel all pending distributions for an alert
   */
  async cancelDistributions(alertId: string, reason: string): Promise<number> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('amber_distributions')
      .update({
        status: 'cancelled',
        status_message: reason,
      })
      .in('status', ['pending', 'queued'])
      .eq('amber_alert_id', alertId)
      .select();

    if (error) {
      throw new Error(`Failed to cancel distributions: ${error.message}`);
    }

    await this.logDistributionEvent(
      alertId,
      'distributions_cancelled',
      `${data?.length || 0} distributions cancelled: ${reason}`
    );

    return data?.length || 0;
  }
}

// Export singleton instance
export const amberDistributionService = new AmberDistributionService();
