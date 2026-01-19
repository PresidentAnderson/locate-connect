/**
 * Social Media Monitoring Agent
 * Monitors social media accounts for activity related to missing persons
 */

import { BaseAgent } from "./base-agent";
import { createClient } from "@/lib/supabase/server";
import { leadManagementService, type CreateLeadInput } from "@/lib/services/lead-management-service";
import { createCaseNotification } from "@/lib/services/notifications";
import {
  getAdapter,
  type SocialMediaAdapter,
  type PlatformActivity,
} from "./social-media/adapters";
import type { AgentConfig, SocialMediaActivity } from "@/types/agent.types";
import type {
  SocialMediaPlatform,
  SocialActivityType,
  CaseWithMonitoredAccounts,
  MonitoredAccountInfo,
  SocialAlertPriority,
} from "@/types/social-monitoring.types";

// =============================================================================
// TYPES
// =============================================================================

interface SocialMediaAgentSettings {
  platforms: SocialMediaPlatform[];
  checkInterval: number;
  maxAccountsPerRun: number;
  activityTypes: SocialActivityType[];
  useMockData: boolean;
}

interface StoredActivityResult {
  id: string;
  isNew: boolean;
}

// =============================================================================
// ACTIVITY ALERT CONFIGURATION
// =============================================================================

const ACTIVITY_ALERT_CONFIG: Record<SocialActivityType, {
  priority: SocialAlertPriority;
  generateLead: boolean;
  notifyImmediately: boolean;
}> = {
  post: { priority: 'normal', generateLead: true, notifyImmediately: false },
  story: { priority: 'normal', generateLead: true, notifyImmediately: false },
  comment: { priority: 'low', generateLead: false, notifyImmediately: false },
  like: { priority: 'low', generateLead: false, notifyImmediately: false },
  share: { priority: 'low', generateLead: false, notifyImmediately: false },
  login: { priority: 'high', generateLead: true, notifyImmediately: true },
  location_tag: { priority: 'critical', generateLead: true, notifyImmediately: true },
  profile_update: { priority: 'normal', generateLead: true, notifyImmediately: false },
  friend_added: { priority: 'low', generateLead: false, notifyImmediately: false },
  group_joined: { priority: 'low', generateLead: false, notifyImmediately: false },
  event_rsvp: { priority: 'normal', generateLead: true, notifyImmediately: false },
  live_video: { priority: 'critical', generateLead: true, notifyImmediately: true },
  reel: { priority: 'normal', generateLead: true, notifyImmediately: false },
  other: { priority: 'low', generateLead: false, notifyImmediately: false },
};

// =============================================================================
// SOCIAL MEDIA AGENT CLASS
// =============================================================================

export class SocialMediaAgent extends BaseAgent {
  private settings: SocialMediaAgentSettings;
  private adapters: Map<SocialMediaPlatform, SocialMediaAdapter> = new Map();

  constructor(config: AgentConfig) {
    super(config);
    this.settings = (config.settings as unknown) as SocialMediaAgentSettings;
  }

  /**
   * Initialize adapters for configured platforms
   */
  protected async beforeRun(): Promise<void> {
    for (const platform of this.settings.platforms) {
      const adapter = getAdapter(platform);
      if (adapter) {
        try {
          await adapter.authenticate();
          this.adapters.set(platform, adapter);
          console.log(`[SocialMediaAgent] Initialized adapter for ${platform}`);
        } catch (error) {
          console.error(`[SocialMediaAgent] Failed to initialize ${platform} adapter:`, error);
        }
      }
    }
  }

  /**
   * Main execution logic
   */
  protected async execute(): Promise<{
    itemsProcessed: number;
    leadsGenerated: number;
    alertsTriggered: number;
  }> {
    let itemsProcessed = 0;
    let leadsGenerated = 0;
    let alertsTriggered = 0;

    // Get active cases with social media accounts
    const cases = await this.getActiveCasesWithAccounts();
    this.addMetric("cases_checked", cases.length);

    if (cases.length === 0) {
      console.log("[SocialMediaAgent] No active cases with monitored accounts found");
      return { itemsProcessed, leadsGenerated, alertsTriggered };
    }

    // Process each case up to the maximum
    for (const caseData of cases.slice(0, this.settings.maxAccountsPerRun)) {
      try {
        const activities = await this.checkAccountActivity(caseData);
        itemsProcessed += caseData.accounts.length;

        for (const activity of activities) {
          // Store activity
          const stored = await this.storeActivity(activity);

          // Only process new activities
          if (!stored.isNew) continue;

          // Generate lead if significant activity
          if (this.isSignificantActivity(activity)) {
            const leadCreated = await this.generateLead(caseData.caseId, activity, stored.id);
            if (leadCreated) {
              leadsGenerated++;
            }

            // Trigger alert for high-priority activity
            if (this.isHighPriorityActivity(activity)) {
              const alertSent = await this.triggerAlert(caseData, activity, stored.id);
              if (alertSent) {
                alertsTriggered++;
              }
            }
          }
        }

        // Update last activity time for the case's accounts
        await this.updateAccountLastActivity(caseData.accounts);
      } catch (error) {
        console.error(`[SocialMediaAgent] Error checking case ${caseData.caseId}:`, error);
        this.errors.push(this.createError(error));
      }
    }

    return { itemsProcessed, leadsGenerated, alertsTriggered };
  }

  // ===========================================================================
  // DATABASE QUERIES
  // ===========================================================================

  /**
   * Get active cases with their monitored social media accounts
   */
  private async getActiveCasesWithAccounts(): Promise<CaseWithMonitoredAccounts[]> {
    try {
      const supabase = await createClient();

      // Query active cases with monitored social media accounts
      const { data, error } = await supabase
        .from("social_media_monitored_accounts")
        .select(`
          id,
          case_id,
          platform,
          username,
          profile_url,
          last_activity_at,
          case_reports!inner (
            id,
            case_number,
            status
          )
        `)
        .eq("monitoring_status", "active")
        .eq("case_reports.status", "active")
        .order("last_activity_at", { ascending: true, nullsFirst: true });

      if (error) {
        console.error("[SocialMediaAgent] Error fetching cases:", error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Group accounts by case
      const caseMap = new Map<string, CaseWithMonitoredAccounts>();

      for (const row of data) {
        const caseId = row.case_id;
        // Handle both array and single object from Supabase join
        const caseReportData = row.case_reports;
        const caseReport = Array.isArray(caseReportData)
          ? caseReportData[0] as { id: string; case_number: string; status: string }
          : caseReportData as { id: string; case_number: string; status: string };

        if (!caseReport) continue;

        if (!caseMap.has(caseId)) {
          caseMap.set(caseId, {
            caseId,
            caseNumber: caseReport.case_number,
            accounts: [],
          });
        }

        caseMap.get(caseId)!.accounts.push({
          id: row.id,
          platform: row.platform as SocialMediaPlatform,
          username: row.username,
          profileUrl: row.profile_url || undefined,
          lastActivityAt: row.last_activity_at || undefined,
        });
      }

      return Array.from(caseMap.values());
    } catch (error) {
      console.error("[SocialMediaAgent] Error in getActiveCasesWithAccounts:", error);
      return [];
    }
  }

  /**
   * Store activity event in the database
   */
  private async storeActivity(activity: SocialMediaActivity): Promise<StoredActivityResult> {
    try {
      const supabase = await createClient();

      // Check for existing activity (deduplication by platform post ID if available)
      const platformPostId = activity.metadata?.platformPostId as string | undefined;

      if (platformPostId) {
        const { data: existing } = await supabase
          .from("social_media_activity_events")
          .select("id")
          .eq("raw_data->platformPostId", platformPostId)
          .single();

        if (existing) {
          return { id: existing.id, isNew: false };
        }
      }

      // Extract metadata with proper typing
      const metadata = activity.metadata as {
        accountId?: string;
        mediaType?: string;
        mediaUrl?: string;
        location?: { name?: string; latitude?: number; longitude?: number };
        engagement?: { likes?: number; comments?: number; shares?: number; views?: number };
      } | undefined;

      // Insert new activity event
      const { data, error } = await supabase
        .from("social_media_activity_events")
        .insert({
          monitored_account_id: metadata?.accountId || "",
          case_id: activity.caseId,
          activity_type: activity.activityType,
          activity_timestamp: activity.timestamp,
          content_preview: activity.content?.substring(0, 500),
          content_url: activity.url,
          media_type: metadata?.mediaType,
          media_url: metadata?.mediaUrl,
          location_name: metadata?.location?.name,
          location_latitude: metadata?.location?.latitude,
          location_longitude: metadata?.location?.longitude,
          engagement_likes: metadata?.engagement?.likes ?? 0,
          engagement_comments: metadata?.engagement?.comments ?? 0,
          engagement_shares: metadata?.engagement?.shares ?? 0,
          engagement_views: metadata?.engagement?.views ?? 0,
          raw_data: activity.metadata,
          is_processed: false,
          alert_sent: false,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[SocialMediaAgent] Error storing activity:", error);
        throw error;
      }

      console.log(`[SocialMediaAgent] Stored activity: ${activity.activityType} (${data.id})`);
      return { id: data.id, isNew: true };
    } catch (error) {
      console.error("[SocialMediaAgent] Error in storeActivity:", error);
      throw error;
    }
  }

  /**
   * Update last activity timestamp for accounts
   */
  private async updateAccountLastActivity(accounts: MonitoredAccountInfo[]): Promise<void> {
    try {
      const supabase = await createClient();
      const now = new Date().toISOString();

      for (const account of accounts) {
        await supabase
          .from("social_media_monitored_accounts")
          .update({
            last_activity_at: now,
            updated_at: now,
          })
          .eq("id", account.id);
      }
    } catch (error) {
      console.error("[SocialMediaAgent] Error updating account activity:", error);
    }
  }

  // ===========================================================================
  // PLATFORM ACTIVITY CHECKING
  // ===========================================================================

  /**
   * Check activity for all accounts in a case
   */
  private async checkAccountActivity(caseData: CaseWithMonitoredAccounts): Promise<SocialMediaActivity[]> {
    const activities: SocialMediaActivity[] = [];

    for (const account of caseData.accounts) {
      if (!this.settings.platforms.includes(account.platform)) continue;

      try {
        const platformActivities = await this.checkPlatformActivity(
          account.platform,
          account.username,
          caseData.caseId,
          account
        );
        activities.push(...platformActivities);
      } catch (error) {
        console.error(
          `[SocialMediaAgent] Error checking ${account.platform}/${account.username}:`,
          error
        );
        await this.recordAccountError(account.id, error);
      }

      // Rate limiting between account checks
      await this.sleep(1000);
    }

    return activities;
  }

  /**
   * Check platform-specific activity using the appropriate adapter
   */
  private async checkPlatformActivity(
    platform: SocialMediaPlatform,
    username: string,
    caseId: string,
    account: MonitoredAccountInfo
  ): Promise<SocialMediaActivity[]> {
    const adapter = this.adapters.get(platform);

    if (!adapter) {
      console.warn(`[SocialMediaAgent] No adapter available for ${platform}`);
      return [];
    }

    this.addMetric(`${platform}_checks`, 1);

    try {
      // Check activity since last check
      const result = await adapter.checkActivity(username, account.lastActivityAt);

      // Convert platform activities to agent activity format
      return result.activities.map((platformActivity) =>
        this.convertToAgentActivity(platformActivity, caseId, platform, account)
      );
    } catch (error) {
      console.error(`[SocialMediaAgent] Adapter error for ${platform}/${username}:`, error);
      this.addMetric(`${platform}_errors`, 1);
      throw error;
    }
  }

  /**
   * Convert platform activity to agent activity format
   */
  private convertToAgentActivity(
    platformActivity: PlatformActivity,
    caseId: string,
    platform: SocialMediaPlatform,
    account: MonitoredAccountInfo
  ): SocialMediaActivity {
    return {
      id: platformActivity.platformPostId,
      caseId,
      platform,
      activityType: platformActivity.activityType as SocialMediaActivity["activityType"],
      content: platformActivity.contentPreview,
      url: platformActivity.contentUrl,
      timestamp: platformActivity.activityTimestamp,
      detectedAt: new Date().toISOString(),
      metadata: {
        accountId: account.id,
        username: account.username,
        platformPostId: platformActivity.platformPostId,
        mediaType: platformActivity.mediaType,
        mediaUrl: platformActivity.mediaUrl,
        location: platformActivity.location,
        engagement: platformActivity.engagement,
        rawData: platformActivity.rawData,
      },
    };
  }

  /**
   * Record an error for a monitored account
   */
  private async recordAccountError(accountId: string, error: unknown): Promise<void> {
    try {
      const supabase = await createClient();
      const errorMessage = error instanceof Error ? error.message : String(error);

      await supabase
        .from("social_media_monitored_accounts")
        .update({
          last_error_at: new Date().toISOString(),
          last_error_message: errorMessage.substring(0, 500),
          consecutive_errors: supabase.rpc("increment_consecutive_errors", { account_id: accountId }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);
    } catch (err) {
      console.error("[SocialMediaAgent] Error recording account error:", err);
    }
  }

  // ===========================================================================
  // LEAD GENERATION
  // ===========================================================================

  /**
   * Generate a lead from social media activity
   */
  private async generateLead(
    caseId: string,
    activity: SocialMediaActivity,
    activityEventId: string
  ): Promise<boolean> {
    try {
      const alertConfig = ACTIVITY_ALERT_CONFIG[activity.activityType] || ACTIVITY_ALERT_CONFIG.other;

      if (!alertConfig.generateLead) {
        return false;
      }

      const location = activity.metadata?.location as {
        name?: string;
        latitude?: number;
        longitude?: number;
      } | undefined;

      const leadInput: CreateLeadInput = {
        caseId,
        title: `Social Media Activity: ${this.formatActivityType(activity.activityType)}`,
        description: this.buildLeadDescription(activity),
        priority: this.mapAlertPriorityToLeadPriority(alertConfig.priority),
        source: "social_media",
        sourceDetails: `${activity.platform} - @${activity.metadata?.username || "unknown"}`,
        location: location
          ? {
              description: location.name || "Social media location",
              coordinates: location.latitude && location.longitude
                ? { lat: location.latitude, lng: location.longitude }
                : undefined,
            }
          : undefined,
      };

      const lead = await leadManagementService.createLead(leadInput, "system-social-media-agent");

      // Link the lead to the activity event
      await this.linkLeadToActivity(activityEventId, lead.id);

      console.log(`[SocialMediaAgent] Generated lead ${lead.id} for case ${caseId}`);
      return true;
    } catch (error) {
      console.error(`[SocialMediaAgent] Error generating lead for case ${caseId}:`, error);
      return false;
    }
  }

  /**
   * Link a lead to an activity event in the database
   */
  private async linkLeadToActivity(activityEventId: string, leadId: string): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase
        .from("social_media_activity_events")
        .update({
          generated_lead_id: leadId,
          is_processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq("id", activityEventId);
    } catch (error) {
      console.error("[SocialMediaAgent] Error linking lead to activity:", error);
    }
  }

  /**
   * Build a descriptive lead description from activity
   */
  private buildLeadDescription(activity: SocialMediaActivity): string {
    const parts: string[] = [];

    parts.push(
      `Detected ${this.formatActivityType(activity.activityType)} on ${activity.platform}.`
    );

    if (activity.content) {
      parts.push(`\n\nContent preview:\n"${activity.content.substring(0, 300)}${activity.content.length > 300 ? "..." : ""}"`);
    }

    const location = activity.metadata?.location as {
      name?: string;
      latitude?: number;
      longitude?: number;
    } | undefined;

    if (location?.name) {
      parts.push(`\n\nLocation: ${location.name}`);
      if (location.latitude && location.longitude) {
        parts.push(`(${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`);
      }
    }

    if (activity.url) {
      parts.push(`\n\nLink: ${activity.url}`);
    }

    parts.push(`\n\nDetected at: ${new Date(activity.detectedAt).toLocaleString()}`);
    parts.push(`Activity time: ${new Date(activity.timestamp).toLocaleString()}`);

    return parts.join("");
  }

  /**
   * Map alert priority to lead priority
   */
  private mapAlertPriorityToLeadPriority(
    alertPriority: SocialAlertPriority
  ): "critical" | "high" | "medium" | "low" {
    const mapping: Record<SocialAlertPriority, "critical" | "high" | "medium" | "low"> = {
      critical: "critical",
      high: "high",
      normal: "medium",
      low: "low",
    };
    return mapping[alertPriority] || "medium";
  }

  // ===========================================================================
  // ALERT TRIGGERING
  // ===========================================================================

  /**
   * Trigger an alert for high-priority social media activity
   */
  private async triggerAlert(
    caseData: CaseWithMonitoredAccounts,
    activity: SocialMediaActivity,
    activityEventId: string
  ): Promise<boolean> {
    try {
      const alertConfig = ACTIVITY_ALERT_CONFIG[activity.activityType] || ACTIVITY_ALERT_CONFIG.other;

      if (!alertConfig.notifyImmediately) {
        return false;
      }

      const location = activity.metadata?.location as {
        name?: string;
        latitude?: number;
        longitude?: number;
      } | undefined;

      // Create notification for the case
      const result = await createCaseNotification(caseData.caseId, caseData.caseNumber, {
        type: "new_lead_tip",
        title: `Social Media Alert: ${this.formatActivityType(activity.activityType)}`,
        message: this.buildAlertMessage(activity, caseData.caseNumber),
        priority: alertConfig.priority,
        metadata: {
          source: "social_media_agent",
          platform: activity.platform,
          activityType: activity.activityType,
          activityEventId,
          username: activity.metadata?.username,
          hasLocation: !!location,
        },
      });

      if (result.success) {
        // Mark the activity as having sent an alert
        await this.markActivityAlertSent(activityEventId, alertConfig.priority);
        console.log(`[SocialMediaAgent] Alert triggered for case ${caseData.caseId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`[SocialMediaAgent] Error triggering alert for case ${caseData.caseId}:`, error);
      return false;
    }
  }

  /**
   * Build alert message text
   */
  private buildAlertMessage(activity: SocialMediaActivity, caseNumber: string): string {
    const location = activity.metadata?.location as {
      name?: string;
    } | undefined;

    let message = `New ${this.formatActivityType(activity.activityType)} detected on ${activity.platform} for case #${caseNumber}.`;

    if (location?.name) {
      message += ` Location: ${location.name}.`;
    }

    if (activity.content) {
      message += ` Preview: "${activity.content.substring(0, 100)}..."`;
    }

    return message;
  }

  /**
   * Mark activity event as having sent an alert
   */
  private async markActivityAlertSent(activityEventId: string, priority: SocialAlertPriority): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase
        .from("social_media_activity_events")
        .update({
          alert_sent: true,
          alert_sent_at: new Date().toISOString(),
          alert_priority: priority,
        })
        .eq("id", activityEventId);
    } catch (error) {
      console.error("[SocialMediaAgent] Error marking alert sent:", error);
    }
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Format activity type for display
   */
  private formatActivityType(activityType: string): string {
    return activityType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Check if activity is significant enough to generate a lead
   */
  private isSignificantActivity(activity: SocialMediaActivity): boolean {
    const config = ACTIVITY_ALERT_CONFIG[activity.activityType];
    if (!config) return false;

    // Activity is significant if it can generate a lead
    if (config.generateLead) return true;

    // Also significant if it has location data
    if (activity.metadata?.location) return true;

    return false;
  }

  /**
   * Check if activity is high priority and needs immediate alert
   */
  private isHighPriorityActivity(activity: SocialMediaActivity): boolean {
    const config = ACTIVITY_ALERT_CONFIG[activity.activityType];
    if (!config) return false;

    // High priority based on activity type
    if (config.priority === "critical" || config.priority === "high") {
      return true;
    }

    // Also high priority if it has location data
    const location = activity.metadata?.location as {
      latitude?: number;
      longitude?: number;
    } | undefined;

    if (location?.latitude && location?.longitude) {
      return true;
    }

    return false;
  }

  /**
   * Clone agent with new config
   */
  protected clone(config: AgentConfig): BaseAgent {
    return new SocialMediaAgent(config);
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createSocialMediaAgent(
  id: string,
  settings?: Partial<SocialMediaAgentSettings>
): SocialMediaAgent {
  const config: AgentConfig = {
    id,
    type: "social_media_monitor",
    name: "Social Media Monitor",
    enabled: true,
    schedule: "*/15 * * * *", // Every 15 minutes
    timeout: 300000, // 5 minutes
    retryAttempts: 2,
    retryDelay: 30000,
    settings: {
      platforms: ["facebook", "instagram", "twitter", "tiktok"],
      checkInterval: 15,
      maxAccountsPerRun: 100,
      activityTypes: ["post", "comment", "like", "share", "story", "login"],
      useMockData: process.env.NODE_ENV !== "production",
      ...settings,
    },
  };

  return new SocialMediaAgent(config);
}
