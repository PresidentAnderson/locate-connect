/**
 * Community Awareness Campaign Service
 * Manages public awareness campaigns for missing persons cases
 */

import type {
  AwarenessCampaign,
  CampaignChannel,
  CampaignMetrics,
} from "@/types/law-enforcement.types";

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

  // Channel-specific posting methods (stubs)
  private async postToFacebook(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(`[CampaignService] Facebook post: ${campaign.headline}`);
    // Would integrate with Facebook API
  }

  private async postToTwitter(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(`[CampaignService] Twitter post: ${campaign.headline}`);
    // Would integrate with Twitter API
  }

  private async postToInstagram(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(`[CampaignService] Instagram post: ${campaign.headline}`);
    // Would integrate with Instagram API
  }

  private async postToNextdoor(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(`[CampaignService] Nextdoor post: ${campaign.headline}`);
    // Would integrate with Nextdoor API
  }

  private async sendEmailCampaign(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(`[CampaignService] Sending email campaign: ${campaign.headline}`);
    // Would integrate with email service
  }

  private async sendSMSCampaign(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(`[CampaignService] Sending SMS campaign: ${campaign.headline}`);
    // Would integrate with SMS service
  }

  private async postToDigitalBillboard(
    campaign: AwarenessCampaign,
    channel: CampaignChannel
  ): Promise<void> {
    console.log(
      `[CampaignService] Digital billboard campaign: ${campaign.headline}`
    );
    // Would integrate with billboard network API
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
