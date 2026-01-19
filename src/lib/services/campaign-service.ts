/**
 * Community Awareness Campaign Service
 * Manages public awareness campaigns for missing persons cases
 */

import type {
  AwarenessCampaign,
  CampaignChannel,
  CampaignMetrics,
} from "@/types/law-enforcement.types";
import { socialService } from "@/lib/services/social-service";
import { emailService } from "@/lib/services/email-service";
import { smsService } from "@/lib/services/sms-service";
import { createClient } from "@/lib/supabase/server";

export interface CreateCampaignInput {
  caseId: string;
  name: string;
  type: "missing_person" | "amber_alert" | "endangered" | "general";
  headline: string;
  description: string;
  imageUrls?: string[];
  channels: Array<{
    type: CampaignChannel["type"];
    config?: Record<string, unknown>;
  }>;
  targetArea: {
    type: "radius" | "region" | "national";
    center?: { lat: number; lng: number };
    radiusMiles?: number;
    states?: string[];
    cities?: string[];
  };
  startDate?: string;
  endDate?: string;
}

export interface UpdateCampaignInput {
  name?: string;
  headline?: string;
  description?: string;
  imageUrls?: string[];
  status?: AwarenessCampaign["status"];
  endDate?: string;
}

class CampaignService {
  private campaigns: Map<string, AwarenessCampaign> = new Map();

  /**
   * Create a new awareness campaign
   */
  async createCampaign(
    input: CreateCampaignInput,
    userId: string
  ): Promise<AwarenessCampaign> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const channels: CampaignChannel[] = input.channels.map((ch) => ({
      type: ch.type,
      enabled: true,
      config: ch.config || {},
      status: "pending",
    }));

    const campaign: AwarenessCampaign = {
      id,
      caseId: input.caseId,
      name: input.name,
      type: input.type,
      status: "draft",
      headline: input.headline,
      description: input.description,
      imageUrls: input.imageUrls || [],
      channels,
      targetArea: input.targetArea,
      startDate: input.startDate || now,
      endDate: input.endDate,
      metrics: {
        impressions: 0,
        clicks: 0,
        shares: 0,
        tipsGenerated: 0,
        lastUpdated: now,
      },
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    this.campaigns.set(id, campaign);
    console.log(`[CampaignService] Created campaign ${id} for case ${input.caseId}`);
    return campaign;
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string): Promise<AwarenessCampaign | null> {
    return this.campaigns.get(campaignId) || null;
  }

  /**
   * List campaigns for a case
   */
  async listCampaigns(caseId: string): Promise<AwarenessCampaign[]> {
    return Array.from(this.campaigns.values())
      .filter((c) => c.caseId === caseId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    campaignId: string,
    input: UpdateCampaignInput
  ): Promise<AwarenessCampaign | null> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    if (input.name) campaign.name = input.name;
    if (input.headline) campaign.headline = input.headline;
    if (input.description) campaign.description = input.description;
    if (input.imageUrls) campaign.imageUrls = input.imageUrls;
    if (input.status) campaign.status = input.status;
    if (input.endDate) campaign.endDate = input.endDate;

    campaign.updatedAt = new Date().toISOString();
    this.campaigns.set(campaignId, campaign);
    return campaign;
  }

  /**
   * Launch campaign
   */
  async launchCampaign(campaignId: string): Promise<AwarenessCampaign | null> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    if (campaign.status !== "draft" && campaign.status !== "paused") {
      throw new Error(`Cannot launch campaign in ${campaign.status} status`);
    }

    campaign.status = "active";
    campaign.updatedAt = new Date().toISOString();

    // Start posting to channels
    await this.postToChannels(campaign);

    this.campaigns.set(campaignId, campaign);
    console.log(`[CampaignService] Launched campaign ${campaignId}`);
    return campaign;
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string): Promise<AwarenessCampaign | null> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    if (campaign.status !== "active") {
      throw new Error("Can only pause active campaigns");
    }

    campaign.status = "paused";
    campaign.updatedAt = new Date().toISOString();
    this.campaigns.set(campaignId, campaign);
    return campaign;
  }

  /**
   * Complete campaign
   */
  async completeCampaign(campaignId: string): Promise<AwarenessCampaign | null> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    campaign.status = "completed";
    campaign.endDate = new Date().toISOString();
    campaign.updatedAt = new Date().toISOString();
    this.campaigns.set(campaignId, campaign);
    return campaign;
  }

  /**
   * Cancel campaign
   */
  async cancelCampaign(campaignId: string): Promise<AwarenessCampaign | null> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    campaign.status = "cancelled";
    campaign.updatedAt = new Date().toISOString();
    this.campaigns.set(campaignId, campaign);
    return campaign;
  }

  /**
   * Update channel status
   */
  async updateChannelStatus(
    campaignId: string,
    channelType: CampaignChannel["type"],
    status: CampaignChannel["status"]
  ): Promise<boolean> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;

    const channel = campaign.channels.find((c) => c.type === channelType);
    if (!channel) return false;

    channel.status = status;
    if (status === "active" || status === "completed") {
      channel.lastPostedAt = new Date().toISOString();
    }

    this.campaigns.set(campaignId, campaign);
    return true;
  }

  /**
   * Toggle channel enabled status
   */
  async toggleChannel(
    campaignId: string,
    channelType: CampaignChannel["type"],
    enabled: boolean
  ): Promise<boolean> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;

    const channel = campaign.channels.find((c) => c.type === channelType);
    if (!channel) return false;

    channel.enabled = enabled;
    this.campaigns.set(campaignId, campaign);
    return true;
  }

  /**
   * Update campaign metrics
   */
  async updateMetrics(
    campaignId: string,
    metrics: Partial<Omit<CampaignMetrics, "lastUpdated">>
  ): Promise<boolean> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;

    if (metrics.impressions !== undefined) {
      campaign.metrics.impressions += metrics.impressions;
    }
    if (metrics.clicks !== undefined) {
      campaign.metrics.clicks += metrics.clicks;
    }
    if (metrics.shares !== undefined) {
      campaign.metrics.shares += metrics.shares;
    }
    if (metrics.tipsGenerated !== undefined) {
      campaign.metrics.tipsGenerated += metrics.tipsGenerated;
    }

    campaign.metrics.lastUpdated = new Date().toISOString();
    this.campaigns.set(campaignId, campaign);
    return true;
  }

  /**
   * Get campaign performance metrics
   */
  async getCampaignMetrics(campaignId: string): Promise<{
    metrics: CampaignMetrics;
    ctr: number;
    shareRate: number;
    conversionRate: number;
  } | null> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    const { metrics } = campaign;
    const ctr =
      metrics.impressions > 0
        ? (metrics.clicks / metrics.impressions) * 100
        : 0;
    const shareRate =
      metrics.impressions > 0
        ? (metrics.shares / metrics.impressions) * 100
        : 0;
    const conversionRate =
      metrics.clicks > 0
        ? (metrics.tipsGenerated / metrics.clicks) * 100
        : 0;

    return {
      metrics,
      ctr: Math.round(ctr * 100) / 100,
      shareRate: Math.round(shareRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  /**
   * Post to campaign channels
   */
  private async postToChannels(campaign: AwarenessCampaign): Promise<void> {
    for (const channel of campaign.channels) {
      if (!channel.enabled) continue;

      try {
        await this.postToChannel(campaign, channel);
        channel.status = "active";
        channel.lastPostedAt = new Date().toISOString();
      } catch (error) {
        console.error(
          `[CampaignService] Failed to post to ${channel.type}:`,
          error
        );
        channel.status = "failed";
      }
    }

    this.campaigns.set(campaign.id, campaign);
  }

  /**
   * Post to a specific channel
   */
  private async postToChannel(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(`[CampaignService] Posting to ${channel.type}`);

    switch (channel.type) {
      case "facebook":
        await this.postToFacebook(campaign, channel);
        break;
      case "twitter":
        await this.postToTwitter(campaign, channel);
        break;
      case "instagram":
        await this.postToInstagram(campaign, channel);
        break;
      case "nextdoor":
        await this.postToNextdoor(campaign, channel);
        break;
      case "email":
        await this.sendEmailCampaign(campaign, channel);
        break;
      case "sms":
        await this.sendSMSCampaign(campaign, channel);
        break;
      case "digital_billboard":
        await this.postToDigitalBillboard(campaign, channel);
        break;
    }
  }

  /**
   * Post to Facebook
   */
  private async postToFacebook(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(`[CampaignService] Facebook post: ${campaign.headline}`);

    const supabase = await createClient();

    // Get Facebook accounts configured for campaigns
    const { data: accounts } = await supabase
      .from("social_media_accounts")
      .select("id")
      .eq("platform", "facebook")
      .eq("is_active", true)
      .eq("is_connected", true);

    if (!accounts?.length) {
      console.log("[CampaignService] No Facebook accounts configured");
      return;
    }

    const message = this.formatCampaignMessage(campaign);
    const hashtags = this.getCampaignHashtags(campaign);

    for (const account of accounts) {
      const result = await socialService.post({
        accountId: account.id,
        message,
        imageUrl: campaign.imageUrls?.[0],
        hashtags,
      });

      if (result.success) {
        console.log(`[CampaignService] Posted to Facebook: ${result.postId}`);
      } else {
        console.error(`[CampaignService] Facebook post failed: ${result.error}`);
      }
    }
  }

  /**
   * Post to Twitter
   */
  private async postToTwitter(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(`[CampaignService] Twitter post: ${campaign.headline}`);

    const supabase = await createClient();

    // Get Twitter accounts configured for campaigns
    const { data: accounts } = await supabase
      .from("social_media_accounts")
      .select("id")
      .eq("platform", "twitter")
      .eq("is_active", true)
      .eq("is_connected", true);

    if (!accounts?.length) {
      console.log("[CampaignService] No Twitter accounts configured");
      return;
    }

    // Twitter has a 280 character limit, so truncate if needed
    const message = this.formatTwitterMessage(campaign);
    const hashtags = this.getCampaignHashtags(campaign).slice(0, 3); // Limit hashtags

    for (const account of accounts) {
      const result = await socialService.post({
        accountId: account.id,
        message,
        imageUrl: campaign.imageUrls?.[0],
        hashtags,
      });

      if (result.success) {
        console.log(`[CampaignService] Posted to Twitter: ${result.postId}`);
      } else {
        console.error(`[CampaignService] Twitter post failed: ${result.error}`);
      }
    }
  }

  /**
   * Post to Instagram
   */
  private async postToInstagram(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(`[CampaignService] Instagram post: ${campaign.headline}`);

    // Instagram requires an image
    if (!campaign.imageUrls?.length) {
      console.log("[CampaignService] Instagram requires an image, skipping");
      return;
    }

    const supabase = await createClient();

    // Get Instagram accounts configured for campaigns
    const { data: accounts } = await supabase
      .from("social_media_accounts")
      .select("id")
      .eq("platform", "instagram")
      .eq("is_active", true)
      .eq("is_connected", true);

    if (!accounts?.length) {
      console.log("[CampaignService] No Instagram accounts configured");
      return;
    }

    const message = this.formatCampaignMessage(campaign);
    const hashtags = this.getCampaignHashtags(campaign);

    for (const account of accounts) {
      const result = await socialService.post({
        accountId: account.id,
        message,
        imageUrl: campaign.imageUrls[0],
        hashtags,
      });

      if (result.success) {
        console.log(`[CampaignService] Posted to Instagram: ${result.postId}`);
      } else {
        console.error(`[CampaignService] Instagram post failed: ${result.error}`);
      }
    }
  }

  /**
   * Post to Nextdoor
   */
  private async postToNextdoor(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(`[CampaignService] Nextdoor post: ${campaign.headline}`);

    // Nextdoor integration would require their Agency API
    // For now, log the intent
    console.log("[CampaignService] Nextdoor posting not yet implemented");
    console.log("[CampaignService] Would post:", {
      headline: campaign.headline,
      description: campaign.description,
      targetArea: campaign.targetArea,
    });
  }

  /**
   * Send email campaign
   */
  private async sendEmailCampaign(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(`[CampaignService] Sending email campaign: ${campaign.headline}`);

    const supabase = await createClient();

    // Get subscribers based on target area
    let query = supabase
      .from("campaign_email_subscribers")
      .select("email")
      .eq("is_active", true)
      .eq("email_verified", true);

    // Filter by target area if specified
    if (campaign.targetArea.type === "region" && campaign.targetArea.states?.length) {
      query = query.in("province", campaign.targetArea.states);
    }

    const { data: subscribers, error } = await query;

    if (error || !subscribers?.length) {
      console.log("[CampaignService] No email subscribers found");
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://locateconnect.ca";
    const campaignUrl = `${appUrl}/campaigns/${campaign.id}`;

    const html = this.generateCampaignEmailHtml(campaign, campaignUrl);
    const text = this.generateCampaignEmailText(campaign, campaignUrl);

    const result = await emailService.sendBulk({
      recipients: subscribers.map((s) => ({ email: s.email })),
      subject: `🚨 ${campaign.headline}`,
      html,
      text,
      tags: ["campaign", campaign.type, campaign.id],
    });

    console.log(
      `[CampaignService] Email campaign sent: ${result.sent} delivered, ${result.failed} failed`
    );
  }

  /**
   * Send SMS campaign
   */
  private async sendSMSCampaign(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(`[CampaignService] Sending SMS campaign: ${campaign.headline}`);

    const supabase = await createClient();

    // Get SMS subscribers based on target area
    let query = supabase
      .from("campaign_sms_subscribers")
      .select("phone_number")
      .eq("is_active", true)
      .eq("phone_verified", true);

    // Filter by target area if specified
    if (campaign.targetArea.type === "region" && campaign.targetArea.states?.length) {
      query = query.in("province", campaign.targetArea.states);
    }

    const { data: subscribers, error } = await query;

    if (error || !subscribers?.length) {
      console.log("[CampaignService] No SMS subscribers found");
      return;
    }

    // SMS is limited to 160 characters
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://locateconnect.ca";
    const shortUrl = `${appUrl}/c/${campaign.id.slice(0, 8)}`;
    const message = `🚨 ${campaign.headline}\n${campaign.description.slice(0, 80)}...\nDetails: ${shortUrl}`;

    const result = await smsService.sendBulk({
      recipients: subscribers.map((s) => s.phone_number),
      message,
    });

    console.log(
      `[CampaignService] SMS campaign sent: ${result.sent} delivered, ${result.failed} failed`
    );
  }

  /**
   * Post to digital billboard
   */
  private async postToDigitalBillboard(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(
      `[CampaignService] Digital billboard campaign: ${campaign.headline}`
    );

    // Digital billboard integration would require partnership with billboard networks
    // (e.g., Clear Channel, Lamar, Outfront Media)
    console.log("[CampaignService] Digital billboard posting not yet implemented");
    console.log("[CampaignService] Would submit:", {
      headline: campaign.headline,
      imageUrl: campaign.imageUrls?.[0],
      targetArea: campaign.targetArea,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    });
  }

  /**
   * Format campaign message for social media
   */
  private formatCampaignMessage(campaign: AwarenessCampaign): string {
    const lines = [
      `🚨 ${campaign.headline}`,
      "",
      campaign.description,
      "",
      "If you have any information, please contact local authorities.",
      "",
      `#${campaign.type.replace(/_/g, "")}`,
    ];

    return lines.join("\n");
  }

  /**
   * Format Twitter message (280 char limit)
   */
  private formatTwitterMessage(campaign: AwarenessCampaign): string {
    const prefix = `🚨 ${campaign.headline}\n\n`;
    const maxDesc = 280 - prefix.length - 50; // Leave room for hashtags
    const description =
      campaign.description.length > maxDesc
        ? campaign.description.slice(0, maxDesc - 3) + "..."
        : campaign.description;

    return `${prefix}${description}`;
  }

  /**
   * Get campaign hashtags
   */
  private getCampaignHashtags(campaign: AwarenessCampaign): string[] {
    const hashtags = ["MissingPerson", "HelpFind"];

    switch (campaign.type) {
      case "amber_alert":
        hashtags.push("AMBERAlert", "MissingChild");
        break;
      case "endangered":
        hashtags.push("Endangered", "PleaseShare");
        break;
      default:
        hashtags.push("CommunityAlert");
    }

    return hashtags;
  }

  /**
   * Generate campaign email HTML
   */
  private generateCampaignEmailHtml(
    campaign: AwarenessCampaign,
    campaignUrl: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${campaign.headline}</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🚨 ${campaign.headline}</h1>
        </div>

        <div style="padding: 20px; border: 1px solid #e5e5e5; border-top: none;">
          ${campaign.imageUrls?.[0] ? `<img src="${campaign.imageUrls[0]}" alt="Campaign Image" style="width: 100%; max-width: 400px; display: block; margin: 0 auto 20px;">` : ""}

          <p style="font-size: 16px; line-height: 1.6;">${campaign.description}</p>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${campaignUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Full Details
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            If you have any information, please contact local authorities immediately.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;">

          <p style="color: #999; font-size: 12px; text-align: center;">
            This alert was sent by LocateConnect.
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://locateconnect.ca"}/unsubscribe">Unsubscribe</a>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate campaign email text
   */
  private generateCampaignEmailText(
    campaign: AwarenessCampaign,
    campaignUrl: string
  ): string {
    return `
🚨 ${campaign.headline}

${campaign.description}

View full details: ${campaignUrl}

If you have any information, please contact local authorities immediately.

---
This alert was sent by LocateConnect.
    `.trim();
  }

  /**
   * Generate campaign flyer
   */
  async generateFlyer(
    campaignId: string
  ): Promise<{ flyerUrl: string } | null> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    // Would generate PDF flyer with case details
    const flyerUrl = `/api/campaigns/${campaignId}/flyer.pdf`;
    campaign.flyerUrl = flyerUrl;
    this.campaigns.set(campaignId, campaign);

    console.log(`[CampaignService] Generated flyer for campaign ${campaignId}`);
    return { flyerUrl };
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(): Promise<AwarenessCampaign[]> {
    return Array.from(this.campaigns.values()).filter(
      (c) => c.status === "active"
    );
  }
}

export const campaignService = new CampaignService();
