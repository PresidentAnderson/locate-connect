/**
 * Email Tracking Agent
 * Monitors email tracking pixels and generates leads from opens
 */

import { BaseAgent } from "./base-agent";
import { createClient } from "@/lib/supabase/server";
import type { AgentConfig, EmailOpenEvent, EmailTrackingPixel } from "@/types/agent.types";

interface EmailTrackingAgentSettings {
  processBatchSize: number;
  deduplicationWindow: number; // hours
  minTimeBetweenAlerts: number; // minutes
  ipInfoApiKey?: string;
}

export class EmailTrackingAgent extends BaseAgent {
  private settings: EmailTrackingAgentSettings;

  constructor(config: AgentConfig) {
    super(config);
    this.settings = (config.settings as unknown) as EmailTrackingAgentSettings;
  }

  protected async execute(): Promise<{
    itemsProcessed: number;
    leadsGenerated: number;
    alertsTriggered: number;
  }> {
    let itemsProcessed = 0;
    let leadsGenerated = 0;
    let alertsTriggered = 0;

    // Get unprocessed pixel events
    const events = await this.getUnprocessedEvents();
    this.addMetric("events_found", events.length);

    for (const event of events.slice(0, this.settings.processBatchSize)) {
      try {
        // Mark as processing
        await this.markEventProcessing(event.id);

        // Enrich with geolocation
        const enrichedEvent = await this.enrichEvent(event);
        itemsProcessed++;

        // Check for duplicates
        if (await this.isDuplicate(enrichedEvent)) {
          this.addMetric("duplicates_skipped", 1);
          await this.markEventProcessed(event.id, false);
          continue;
        }

        // Get pixel info and case
        const pixel = await this.getPixelInfo(event.pixelId);
        if (!pixel) {
          console.log(`[EmailTrackingAgent] No pixel found for ID ${event.pixelId}`);
          await this.markEventProcessed(event.id, false);
          continue;
        }

        // Generate lead
        await this.generateLead(pixel.caseId, enrichedEvent, pixel);
        leadsGenerated++;

        // Check if should trigger alert
        if (await this.shouldTriggerAlert(pixel.caseId, enrichedEvent)) {
          await this.triggerAlert(pixel.caseId, enrichedEvent, pixel);
          alertsTriggered++;
        }

        // Update pixel stats
        await this.updatePixelStats(pixel.id);

        // Mark as processed
        await this.markEventProcessed(event.id, true);
      } catch (error) {
        console.error(`[EmailTrackingAgent] Error processing event ${event.id}:`, error);
        this.errors.push(this.createError(error));
      }
    }

    return { itemsProcessed, leadsGenerated, alertsTriggered };
  }

  private async getUnprocessedEvents(): Promise<EmailOpenEvent[]> {
    const supabase = await createClient();

    // Query database for unprocessed events
    const { data: events, error } = await supabase
      .from("email_open_events")
      .select("*")
      .eq("processed", false)
      .order("timestamp", { ascending: true })
      .limit(this.settings.processBatchSize * 2); // Get extra in case of duplicates

    if (error) {
      console.error("[EmailTrackingAgent] Error fetching events:", error);
      return [];
    }

    if (!events) return [];

    return events.map((e) => ({
      id: e.id,
      pixelId: e.pixel_id,
      caseId: e.case_id || "",
      ipAddress: e.ip_address,
      userAgent: e.user_agent,
      geolocation: e.geolocation,
      timestamp: e.timestamp,
    }));
  }

  private async markEventProcessing(eventId: string): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from("email_open_events")
      .update({
        processing: true,
        processing_started_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    console.log(`[EmailTrackingAgent] Processing event ${eventId}`);
  }

  private async markEventProcessed(eventId: string, success: boolean): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from("email_open_events")
      .update({
        processed: true,
        processing: false,
        processed_at: new Date().toISOString(),
        processing_success: success,
      })
      .eq("id", eventId);

    console.log(`[EmailTrackingAgent] Event ${eventId} processed: ${success}`);
  }

  private async enrichEvent(event: EmailOpenEvent): Promise<EmailOpenEvent> {
    // Skip if already has geolocation
    if (event.geolocation?.city && event.geolocation.city !== "Unknown") {
      return event;
    }

    // Enrich with geolocation from IP
    const geolocation = await this.lookupIPGeolocation(event.ipAddress);

    // Store enriched data
    const supabase = await createClient();
    await supabase
      .from("email_open_events")
      .update({ geolocation })
      .eq("id", event.id);

    return {
      ...event,
      geolocation,
    };
  }

  private async lookupIPGeolocation(ipAddress: string): Promise<{
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }> {
    this.addMetric("geolocation_lookups", 1);

    // Skip private/localhost IPs
    if (
      ipAddress === "127.0.0.1" ||
      ipAddress === "::1" ||
      ipAddress.startsWith("192.168.") ||
      ipAddress.startsWith("10.") ||
      ipAddress.startsWith("172.16.")
    ) {
      return {
        city: "Local Network",
        country: "Local",
      };
    }

    // Try ipinfo.io (free tier: 50k/month)
    const ipInfoToken = this.settings.ipInfoApiKey || process.env.IPINFO_API_KEY;

    if (ipInfoToken) {
      try {
        const response = await fetch(`https://ipinfo.io/${ipAddress}/json?token=${ipInfoToken}`, {
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json() as {
            city?: string;
            region?: string;
            country?: string;
            loc?: string; // "lat,lng"
          };

          let latitude: number | undefined;
          let longitude: number | undefined;

          if (data.loc) {
            const [lat, lng] = data.loc.split(",").map(Number);
            latitude = lat;
            longitude = lng;
          }

          return {
            city: data.city,
            region: data.region,
            country: data.country,
            latitude,
            longitude,
          };
        }
      } catch (error) {
        console.error("[EmailTrackingAgent] IPInfo lookup error:", error);
      }
    }

    // Fallback to ip-api.com (free, no key required)
    try {
      const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=city,regionName,country,lat,lon`, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json() as {
          city?: string;
          regionName?: string;
          country?: string;
          lat?: number;
          lon?: number;
        };

        return {
          city: data.city,
          region: data.regionName,
          country: data.country,
          latitude: data.lat,
          longitude: data.lon,
        };
      }
    } catch (error) {
      console.error("[EmailTrackingAgent] IP-API lookup error:", error);
    }

    return {
      city: "Unknown",
      country: "Unknown",
    };
  }

  private async isDuplicate(event: EmailOpenEvent): Promise<boolean> {
    const supabase = await createClient();

    // Check if we've seen this IP + pixel combo recently
    const windowMs = this.settings.deduplicationWindow * 60 * 60 * 1000;
    const windowStart = new Date(Date.now() - windowMs).toISOString();

    const { data: existing } = await supabase
      .from("email_open_events")
      .select("id")
      .eq("pixel_id", event.pixelId)
      .eq("ip_address", event.ipAddress)
      .eq("processed", true)
      .eq("processing_success", true)
      .gte("timestamp", windowStart)
      .neq("id", event.id)
      .limit(1)
      .single();

    return !!existing;
  }

  private async getPixelInfo(pixelId: string): Promise<EmailTrackingPixel | null> {
    const supabase = await createClient();

    const { data: pixel, error } = await supabase
      .from("email_tracking_pixels")
      .select("*")
      .eq("id", pixelId)
      .single();

    if (error || !pixel) {
      return null;
    }

    return {
      id: pixel.id,
      caseId: pixel.case_id,
      recipientEmail: pixel.recipient_email,
      pixelUrl: pixel.pixel_url,
      createdAt: pixel.created_at,
      openedAt: pixel.opened_at,
      openCount: pixel.open_count || 0,
    };
  }

  private async generateLead(
    caseId: string,
    event: EmailOpenEvent,
    pixel: EmailTrackingPixel
  ): Promise<void> {
    const supabase = await createClient();

    console.log(`[EmailTrackingAgent] Generating lead for case ${caseId}`);

    const locationStr = [
      event.geolocation?.city,
      event.geolocation?.region,
      event.geolocation?.country,
    ]
      .filter(Boolean)
      .join(", ") || "Unknown location";

    await supabase.from("leads").insert({
      case_id: caseId,
      source_type: "email_tracking",
      title: `Email Opened: ${pixel.recipientEmail}`,
      description: `Email tracking pixel opened from ${locationStr}. IP: ${event.ipAddress}. This may indicate the recipient or someone with access to their email is in this location.`,
      priority: event.geolocation?.country && event.geolocation.country !== "Unknown" ? "medium" : "low",
      status: "new",
      submitted_by: "system",
      metadata: {
        pixel_id: pixel.id,
        event_id: event.id,
        recipient_email: pixel.recipientEmail,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        geolocation: event.geolocation,
        timestamp: event.timestamp,
      },
    });

    // If we have coordinates, add to case location history
    if (event.geolocation?.latitude && event.geolocation?.longitude) {
      await supabase.from("case_location_history").insert({
        case_id: caseId,
        source: "email_tracking",
        latitude: event.geolocation.latitude,
        longitude: event.geolocation.longitude,
        accuracy: 50000, // City-level accuracy (50km)
        timestamp: event.timestamp,
        metadata: {
          pixel_id: pixel.id,
          recipient_email: pixel.recipientEmail,
          ip_address: event.ipAddress,
        },
      });
    }
  }

  private async shouldTriggerAlert(caseId: string, event: EmailOpenEvent): Promise<boolean> {
    // Don't alert for unknown locations
    if (!event.geolocation?.country || event.geolocation.country === "Unknown") {
      return false;
    }

    // Don't alert for local IPs
    if (event.geolocation.country === "Local") {
      return false;
    }

    const supabase = await createClient();

    // Check if enough time has passed since last alert
    const minAlertInterval = this.settings.minTimeBetweenAlerts * 60 * 1000;
    const alertWindowStart = new Date(Date.now() - minAlertInterval).toISOString();

    const { data: recentAlerts } = await supabase
      .from("notifications")
      .select("id")
      .eq("type", "email_tracking_alert")
      .contains("data", { case_id: caseId })
      .gte("created_at", alertWindowStart)
      .limit(1);

    if (recentAlerts && recentAlerts.length > 0) {
      return false;
    }

    // Alert if we have good geolocation data
    return true;
  }

  private async triggerAlert(
    caseId: string,
    event: EmailOpenEvent,
    pixel: EmailTrackingPixel
  ): Promise<void> {
    const supabase = await createClient();

    console.log(`[EmailTrackingAgent] Triggering alert for case ${caseId}`);

    // Get case details
    const { data: caseData } = await supabase
      .from("case_reports")
      .select("case_number, assigned_to")
      .eq("id", caseId)
      .single();

    if (!caseData) return;

    const locationStr = [
      event.geolocation?.city,
      event.geolocation?.region,
      event.geolocation?.country,
    ]
      .filter(Boolean)
      .join(", ");

    // Create notification
    if (caseData.assigned_to) {
      await supabase.from("notifications").insert({
        user_id: caseData.assigned_to,
        type: "email_tracking_alert",
        title: "Email Tracking: Location Detected",
        message: `An email sent for case ${caseData.case_number} was opened from ${locationStr}. Recipient: ${pixel.recipientEmail}`,
        data: {
          case_id: caseId,
          case_number: caseData.case_number,
          pixel_id: pixel.id,
          recipient_email: pixel.recipientEmail,
          ip_address: event.ipAddress,
          geolocation: event.geolocation,
        },
        priority: "medium",
      });
    }

    // Log to case activity
    await supabase.from("case_activity").insert({
      case_id: caseId,
      activity_type: "email_tracked",
      description: `Email to ${pixel.recipientEmail} opened from ${locationStr}`,
      metadata: {
        pixel_id: pixel.id,
        ip_address: event.ipAddress,
        geolocation: event.geolocation,
        user_agent: event.userAgent,
      },
    });
  }

  private async updatePixelStats(pixelId: string): Promise<void> {
    const supabase = await createClient();

    // Get current stats
    const { data: pixel } = await supabase
      .from("email_tracking_pixels")
      .select("open_count, opened_at")
      .eq("id", pixelId)
      .single();

    const now = new Date().toISOString();
    const newCount = (pixel?.open_count || 0) + 1;

    // Update pixel with new stats
    await supabase
      .from("email_tracking_pixels")
      .update({
        open_count: newCount,
        opened_at: pixel?.opened_at || now, // Keep first open time
        last_opened_at: now,
        updated_at: now,
      })
      .eq("id", pixelId);

    console.log(`[EmailTrackingAgent] Updated stats for pixel ${pixelId}: ${newCount} opens`);
  }

  protected clone(config: AgentConfig): BaseAgent {
    return new EmailTrackingAgent(config);
  }
}

export function createEmailTrackingAgent(
  id: string,
  settings?: Partial<EmailTrackingAgentSettings>
): EmailTrackingAgent {
  const config: AgentConfig = {
    id,
    type: "email_tracker",
    name: "Email Tracking Agent",
    enabled: true,
    schedule: "* * * * *", // Every minute
    timeout: 60000, // 1 minute
    retryAttempts: 3,
    retryDelay: 5000,
    settings: {
      processBatchSize: 100,
      deduplicationWindow: 24, // hours
      minTimeBetweenAlerts: 30, // minutes
      ...settings,
    },
  };

  return new EmailTrackingAgent(config);
}

/**
 * Generate a unique tracking pixel URL for a case
 */
export function generateTrackingPixel(caseId: string, recipientEmail: string): {
  pixelId: string;
  pixelUrl: string;
} {
  const pixelId = crypto.randomUUID();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://locateconnect.app";

  return {
    pixelId,
    pixelUrl: `${baseUrl}/api/tracking/pixel/${pixelId}.gif`,
  };
}

/**
 * Create and store a new tracking pixel in the database
 */
export async function createTrackingPixel(
  caseId: string,
  recipientEmail: string
): Promise<{ pixelId: string; pixelUrl: string } | null> {
  const supabase = await createClient();

  const { pixelId, pixelUrl } = generateTrackingPixel(caseId, recipientEmail);

  const { error } = await supabase.from("email_tracking_pixels").insert({
    id: pixelId,
    case_id: caseId,
    recipient_email: recipientEmail,
    pixel_url: pixelUrl,
    open_count: 0,
  });

  if (error) {
    console.error("[EmailTracking] Error creating pixel:", error);
    return null;
  }

  return { pixelId, pixelUrl };
}

/**
 * Record a pixel open event
 */
export async function recordPixelOpen(
  pixelId: string,
  ipAddress: string,
  userAgent?: string
): Promise<void> {
  const supabase = await createClient();

  // Get case ID from pixel
  const { data: pixel } = await supabase
    .from("email_tracking_pixels")
    .select("case_id")
    .eq("id", pixelId)
    .single();

  await supabase.from("email_open_events").insert({
    pixel_id: pixelId,
    case_id: pixel?.case_id,
    ip_address: ipAddress,
    user_agent: userAgent,
    processed: false,
    timestamp: new Date().toISOString(),
  });
}
