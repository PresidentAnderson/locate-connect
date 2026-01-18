/**
 * AMBER Alert Distribution Service
 * Handles dispatching alerts to various channels
 */

import { createClient } from '@/lib/supabase/server';
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
    // In a real implementation, this would use SendGrid, AWS SES, etc.
    // For now, we just log and mark as sent
    console.log(`[EMAIL] Sending AMBER Alert ${distribution.amber_alert.alert_number} to email subscribers`);

    // TODO: Integrate with email service
    // await emailService.sendBulkEmail({
    //   template: 'amber_alert',
    //   data: distribution.amber_alert,
    //   provinces: distribution.channel_config?.provinces,
    // });
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    distribution: AmberDistribution & { amber_alert: AmberAlert }
  ): Promise<void> {
    console.log(`[PUSH] Sending AMBER Alert ${distribution.amber_alert.alert_number} via push notification`);

    // TODO: Integrate with push notification service
    // await pushService.sendBulkNotification({
    //   title: `AMBER Alert: ${distribution.amber_alert.child_name}`,
    //   body: this.formatAlertMessage(distribution.amber_alert),
    //   data: { type: 'amber_alert', id: distribution.amber_alert.id },
    // });
  }

  /**
   * Send social media post
   */
  private async sendSocialMediaPost(
    distribution: AmberDistribution & { amber_alert: AmberAlert }
  ): Promise<void> {
    console.log(`[SOCIAL] Posting AMBER Alert ${distribution.amber_alert.alert_number} to ${distribution.target_name}`);

    // TODO: Integrate with social media APIs
    // await socialService.post({
    //   accountId: distribution.target_id,
    //   message: this.formatSocialPost(distribution.amber_alert),
    //   image: distribution.amber_alert.child_photo_url,
    // });
  }

  /**
   * Send media outlet alert
   */
  private async sendMediaAlert(
    distribution: AmberDistribution & { amber_alert: AmberAlert }
  ): Promise<void> {
    console.log(`[MEDIA] Sending AMBER Alert ${distribution.amber_alert.alert_number} to ${distribution.target_name}`);

    // TODO: Send email to media contact
    // await emailService.send({
    //   to: distribution.target_contact,
    //   subject: `AMBER Alert: ${distribution.amber_alert.child_name}`,
    //   template: 'amber_alert_media',
    //   data: distribution.amber_alert,
    // });
  }

  /**
   * Send SMS distribution
   */
  private async sendSmsDistribution(
    distribution: AmberDistribution & { amber_alert: AmberAlert }
  ): Promise<void> {
    console.log(`[SMS] Sending AMBER Alert ${distribution.amber_alert.alert_number} via SMS`);

    // TODO: Integrate with Twilio or similar
    // await smsService.sendBulk({
    //   message: this.formatSmsMessage(distribution.amber_alert),
    //   provinces: distribution.channel_config?.provinces,
    // });
  }

  /**
   * Send webhook to partner API
   */
  private async sendWebhook(
    distribution: AmberDistribution & { amber_alert: AmberAlert }
  ): Promise<void> {
    const supabase = await this.getSupabase();

    if (!distribution.target_id) {
      throw new Error('Partner ID not specified');
    }

    // Get partner's API endpoint
    const { data: apiKey } = await supabase
      .from('partner_api_keys')
      .select('id')
      .eq('partner_id', distribution.target_id)
      .eq('is_active', true)
      .single();

    if (!apiKey) {
      throw new Error('Partner has no active API key');
    }

    console.log(`[WEBHOOK] Sending AMBER Alert ${distribution.amber_alert.alert_number} to ${distribution.target_name}`);

    // TODO: Make actual webhook call
    // const response = await fetch(partner.webhook_url, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    //   body: JSON.stringify({
    //     event: 'amber_alert',
    //     alert: distribution.amber_alert,
    //   }),
    // });
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
