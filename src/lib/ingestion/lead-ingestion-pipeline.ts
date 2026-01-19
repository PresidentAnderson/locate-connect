/**
 * Lead Ingestion Pipeline
 * Processes and validates incoming leads from various sources
 */

import { createClient } from "@/lib/supabase/server";
import type {
  DataSource,
  DataSchema,
  PipelineStep,
  IngestionRecord,
} from "./data-ingestion-engine";
import { ingestionEngine } from "./data-ingestion-engine";

// Lead source types
export type LeadSourceType =
  | "tip_submission"
  | "agent_generated"
  | "api_import"
  | "bulk_upload"
  | "partner_feed"
  | "public_submission";

// Lead priority levels
export type LeadPriority = "critical" | "high" | "medium" | "low";

// Incoming lead data structure
export interface IncomingLead {
  // Source information
  sourceType: LeadSourceType;
  sourceId?: string;
  sourceName?: string;

  // Lead details
  caseId?: string;
  caseNumber?: string;
  title?: string;
  description: string;
  priority?: LeadPriority;

  // Contact information
  submitterName?: string;
  submitterEmail?: string;
  submitterPhone?: string;
  isAnonymous?: boolean;

  // Location data
  locationDescription?: string;
  latitude?: number;
  longitude?: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };

  // Sighting information
  sightingDate?: string;
  sightingTime?: string;
  personDescription?: string;
  vehicleDescription?: string;
  companionDescription?: string;

  // Media
  attachments?: Array<{
    type: "image" | "video" | "document";
    url?: string;
    data?: string; // Base64 for uploads
    filename?: string;
  }>;

  // Metadata
  metadata?: Record<string, unknown>;
}

// Normalized lead structure
export interface NormalizedLead {
  id: string;
  caseId: string;
  sourceType: LeadSourceType;
  sourceId: string;

  title: string;
  description: string;
  priority: LeadPriority;
  status: "new" | "pending_review" | "verified" | "rejected";

  submitter: {
    name: string | null;
    email: string | null;
    phone: string | null;
    isAnonymous: boolean;
  };

  location: {
    description: string | null;
    coordinates: { lat: number; lng: number } | null;
    address: {
      street: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
      country: string | null;
    } | null;
  };

  sighting: {
    date: string | null;
    time: string | null;
    personDescription: string | null;
    vehicleDescription: string | null;
    companionDescription: string | null;
  };

  attachmentCount: number;
  attachmentIds: string[];

  confidenceScore: number;
  duplicateOf: string | null;

  createdAt: string;
  updatedAt: string;
  processedAt: string;
}

// Pipeline steps

/**
 * Step 1: Validate incoming lead data
 */
const validateLeadStep: PipelineStep<Record<string, unknown>, Record<string, unknown>> = {
  name: "validate_lead",
  async execute(data) {
    const lead = data as unknown as IncomingLead;

    // Basic validation
    if (!lead.description || lead.description.trim().length < 10) {
      throw new Error("Lead description must be at least 10 characters");
    }

    // Must have either caseId or caseNumber
    if (!lead.caseId && !lead.caseNumber) {
      throw new Error("Lead must be associated with a case");
    }

    // Validate email format if provided
    if (lead.submitterEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(lead.submitterEmail)) {
        throw new Error("Invalid submitter email format");
      }
    }

    // Validate coordinates if provided
    if (lead.latitude !== undefined || lead.longitude !== undefined) {
      if (lead.latitude === undefined || lead.longitude === undefined) {
        throw new Error("Both latitude and longitude must be provided");
      }
      if (lead.latitude < -90 || lead.latitude > 90) {
        throw new Error("Invalid latitude");
      }
      if (lead.longitude < -180 || lead.longitude > 180) {
        throw new Error("Invalid longitude");
      }
    }

    return data;
  },
};

/**
 * Step 2: Resolve case ID from case number if needed
 */
const resolveCaseStep: PipelineStep<Record<string, unknown>, Record<string, unknown>> = {
  name: "resolve_case",
  async execute(data) {
    const lead = data as unknown as IncomingLead;

    if (!lead.caseId && lead.caseNumber) {
      console.log(`[LeadPipeline] Resolving case number: ${lead.caseNumber}`);

      const supabase = await createClient();

      // Look up case ID from case number
      const { data: caseData, error } = await supabase
        .from("case_reports")
        .select("id")
        .eq("case_number", lead.caseNumber)
        .single();

      if (error || !caseData) {
        console.error(`[LeadPipeline] Case not found: ${lead.caseNumber}`);
        throw new Error(`Case not found: ${lead.caseNumber}`);
      }

      lead.caseId = caseData.id;
      console.log(`[LeadPipeline] Resolved case ${lead.caseNumber} to ID ${lead.caseId}`);
    }

    return data;
  },
};

/**
 * Step 3: Enrich lead with geolocation data
 */
const enrichLocationStep: PipelineStep<Record<string, unknown>, Record<string, unknown>> = {
  name: "enrich_location",
  async execute(data) {
    const lead = data as unknown as IncomingLead;

    // If we have an address but no coordinates, geocode
    if (lead.address && !lead.latitude) {
      const addressStr = [
        lead.address.street,
        lead.address.city,
        lead.address.state,
        lead.address.zip,
        lead.address.country || "Canada", // Default to Canada
      ]
        .filter(Boolean)
        .join(", ");

      if (addressStr) {
        console.log(`[LeadPipeline] Geocoding address: ${addressStr}`);

        try {
          // Use Nominatim (OpenStreetMap) geocoding API
          const encodedAddress = encodeURIComponent(addressStr);
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
            {
              headers: {
                "User-Agent": "LocateConnect/1.0 (Missing Persons Assistance)",
              },
              signal: AbortSignal.timeout(10000),
            }
          );

          if (response.ok) {
            const results = (await response.json()) as Array<{ lat: string; lon: string }>;
            if (results.length > 0) {
              lead.latitude = parseFloat(results[0].lat);
              lead.longitude = parseFloat(results[0].lon);
              console.log(
                `[LeadPipeline] Geocoded to: ${lead.latitude}, ${lead.longitude}`
              );
            }
          }
        } catch (error) {
          console.warn(`[LeadPipeline] Geocoding failed:`, error);
          // Continue without coordinates - not a fatal error
        }
      }
    }

    // If we have coordinates but no address, reverse geocode
    if (lead.latitude && lead.longitude && !lead.address) {
      console.log(
        `[LeadPipeline] Reverse geocoding: ${lead.latitude}, ${lead.longitude}`
      );

      try {
        // Use Nominatim reverse geocoding
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lead.latitude}&lon=${lead.longitude}`,
          {
            headers: {
              "User-Agent": "LocateConnect/1.0 (Missing Persons Assistance)",
            },
            signal: AbortSignal.timeout(10000),
          }
        );

        if (response.ok) {
          const result = (await response.json()) as {
            address?: {
              house_number?: string;
              road?: string;
              city?: string;
              town?: string;
              village?: string;
              state?: string;
              province?: string;
              postcode?: string;
              country?: string;
            };
          };

          if (result.address) {
            lead.address = {
              street: [result.address.house_number, result.address.road]
                .filter(Boolean)
                .join(" "),
              city:
                result.address.city ||
                result.address.town ||
                result.address.village,
              state: result.address.state || result.address.province,
              zip: result.address.postcode,
              country: result.address.country,
            };
            console.log(
              `[LeadPipeline] Reverse geocoded to: ${lead.address.city}, ${lead.address.state}`
            );
          }
        }
      } catch (error) {
        console.warn(`[LeadPipeline] Reverse geocoding failed:`, error);
        // Continue without address - not a fatal error
      }
    }

    return data;
  },
};

/**
 * Step 4: Check for duplicate leads
 */
const deduplicationStep: PipelineStep<Record<string, unknown>, Record<string, unknown> & { _duplicateOf?: string }> = {
  name: "deduplication",
  async execute(data) {
    const lead = data as unknown as IncomingLead;

    if (!lead.caseId) {
      return data as Record<string, unknown> & { _duplicateOf?: string };
    }

    console.log(`[LeadPipeline] Checking for duplicates in case ${lead.caseId}`);

    const supabase = await createClient();

    // Look for similar leads in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Build query to find potential duplicates
    let query = supabase
      .from("leads")
      .select("id, title, description, submitted_at, location")
      .eq("case_id", lead.caseId)
      .gte("submitted_at", sevenDaysAgo);

    // If we have submitter contact info, check for exact matches
    if (lead.submitterEmail && !lead.isAnonymous) {
      const { data: exactMatches } = await supabase
        .from("leads")
        .select("id")
        .eq("case_id", lead.caseId)
        .eq("submitter_email", lead.submitterEmail)
        .gte("submitted_at", sevenDaysAgo)
        .limit(1);

      if (exactMatches && exactMatches.length > 0) {
        console.log(`[LeadPipeline] Found duplicate by email: ${exactMatches[0].id}`);
        (data as Record<string, unknown> & { _duplicateOf?: string })._duplicateOf = exactMatches[0].id;
        return data as Record<string, unknown> & { _duplicateOf?: string };
      }
    }

    // Check for similar descriptions using text search
    const { data: recentLeads } = await query.limit(50);

    if (recentLeads && recentLeads.length > 0) {
      // Calculate similarity with each recent lead
      const leadDescription = lead.description.toLowerCase();
      const leadWords = new Set(leadDescription.split(/\s+/).filter((w) => w.length > 3));

      for (const existing of recentLeads) {
        const existingDescription = (existing.description || "").toLowerCase();
        const existingWords = new Set(existingDescription.split(/\s+/).filter((w: string) => w.length > 3));

        // Calculate Jaccard similarity
        const intersection = [...leadWords].filter((w) => existingWords.has(w)).length;
        const union = new Set([...leadWords, ...existingWords]).size;
        const similarity = union > 0 ? intersection / union : 0;

        // If similarity > 70%, consider it a potential duplicate
        if (similarity > 0.7) {
          console.log(`[LeadPipeline] Found similar lead (${(similarity * 100).toFixed(0)}% match): ${existing.id}`);
          (data as Record<string, unknown> & { _duplicateOf?: string })._duplicateOf = existing.id;
          break;
        }

        // Also check location proximity if coordinates available
        if (lead.latitude && lead.longitude && existing.location) {
          const existingLocation = existing.location as { latitude?: number; longitude?: number };
          if (existingLocation.latitude && existingLocation.longitude) {
            const distance = calculateDistance(
              lead.latitude,
              lead.longitude,
              existingLocation.latitude,
              existingLocation.longitude
            );

            // If within 100 meters and similar time frame, likely duplicate
            if (distance < 0.1 && similarity > 0.3) {
              console.log(
                `[LeadPipeline] Found nearby lead (${distance.toFixed(2)}km, ${(similarity * 100).toFixed(0)}% text match): ${existing.id}`
              );
              (data as Record<string, unknown> & { _duplicateOf?: string })._duplicateOf = existing.id;
              break;
            }
          }
        }
      }
    }

    return data as Record<string, unknown> & { _duplicateOf?: string };
  },
};

/**
 * Calculate distance between two points in km (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Step 5: Calculate confidence score
 */
const scoreLeadStep: PipelineStep<Record<string, unknown>, Record<string, unknown> & { _confidenceScore: number }> = {
  name: "score_lead",
  async execute(data) {
    const lead = data as unknown as IncomingLead;
    let score = 0;

    // Base score for having description
    score += 10;

    // Points for contact information (not anonymous)
    if (!lead.isAnonymous) {
      if (lead.submitterName) score += 10;
      if (lead.submitterEmail) score += 10;
      if (lead.submitterPhone) score += 15;
    }

    // Points for location data
    if (lead.latitude && lead.longitude) score += 15;
    if (lead.locationDescription) score += 5;
    if (lead.address?.city) score += 5;

    // Points for sighting details
    if (lead.sightingDate) score += 10;
    if (lead.personDescription) score += 10;
    if (lead.vehicleDescription) score += 5;

    // Points for attachments
    if (lead.attachments && lead.attachments.length > 0) {
      score += Math.min(lead.attachments.length * 5, 20);
    }

    // Points for detailed description
    if (lead.description.length > 100) score += 5;
    if (lead.description.length > 250) score += 5;

    return { ...data, _confidenceScore: Math.min(score, 100) };
  },
};

/**
 * Step 6: Process attachments
 */
const processAttachmentsStep: PipelineStep<Record<string, unknown>, Record<string, unknown> & { _attachmentIds: string[] }> = {
  name: "process_attachments",
  async execute(data) {
    const lead = data as unknown as IncomingLead;
    const attachmentIds: string[] = [];

    if (lead.attachments && lead.attachments.length > 0) {
      for (const attachment of lead.attachments) {
        console.log(
          `[LeadPipeline] Processing ${attachment.type} attachment: ${attachment.filename || "unnamed"}`
        );

        // In production, upload to storage and get ID
        // const id = await uploadAttachment(attachment);
        const id = crypto.randomUUID();
        attachmentIds.push(id);
      }
    }

    return { ...data, _attachmentIds: attachmentIds };
  },
};

/**
 * Step 7: Normalize and store lead
 */
const normalizeAndStoreStep: PipelineStep<Record<string, unknown>, NormalizedLead> = {
  name: "normalize_and_store",
  async execute(data) {
    const lead = data as unknown as IncomingLead & {
      _confidenceScore: number;
      _duplicateOf?: string;
      _attachmentIds: string[];
    };

    const now = new Date().toISOString();

    const normalizedLead: NormalizedLead = {
      id: crypto.randomUUID(),
      caseId: lead.caseId!,
      sourceType: lead.sourceType,
      sourceId: lead.sourceId || crypto.randomUUID(),

      title: lead.title || `Lead from ${lead.sourceType}`,
      description: lead.description,
      priority: lead.priority || "medium",
      status: "new",

      submitter: {
        name: lead.isAnonymous ? null : lead.submitterName || null,
        email: lead.isAnonymous ? null : lead.submitterEmail || null,
        phone: lead.isAnonymous ? null : lead.submitterPhone || null,
        isAnonymous: lead.isAnonymous || false,
      },

      location: {
        description: lead.locationDescription || null,
        coordinates:
          lead.latitude && lead.longitude
            ? { lat: lead.latitude, lng: lead.longitude }
            : null,
        address: lead.address
          ? {
              street: lead.address.street || null,
              city: lead.address.city || null,
              state: lead.address.state || null,
              zip: lead.address.zip || null,
              country: lead.address.country || null,
            }
          : null,
      },

      sighting: {
        date: lead.sightingDate || null,
        time: lead.sightingTime || null,
        personDescription: lead.personDescription || null,
        vehicleDescription: lead.vehicleDescription || null,
        companionDescription: lead.companionDescription || null,
      },

      attachmentCount: lead._attachmentIds.length,
      attachmentIds: lead._attachmentIds,

      confidenceScore: lead._confidenceScore,
      duplicateOf: lead._duplicateOf || null,

      createdAt: now,
      updatedAt: now,
      processedAt: now,
    };

    // In production, store to database
    console.log(`[LeadPipeline] Storing lead ${normalizedLead.id}`);

    return normalizedLead;
  },
  async rollback(data) {
    // Remove stored lead on failure
    console.log(`[LeadPipeline] Rolling back lead storage`);
  },
};

// Lead data source schema
const leadSchema: DataSchema = {
  fields: [
    { name: "sourceType", type: "string", nullable: false },
    { name: "description", type: "string", nullable: false, validation: { minLength: 10 } },
    { name: "caseId", type: "string", nullable: true },
    { name: "caseNumber", type: "string", nullable: true },
    { name: "title", type: "string", nullable: true },
    { name: "priority", type: "string", nullable: true, validation: { allowedValues: ["critical", "high", "medium", "low"] } },
    { name: "submitterName", type: "string", nullable: true },
    { name: "submitterEmail", type: "string", nullable: true },
    { name: "submitterPhone", type: "string", nullable: true },
    { name: "isAnonymous", type: "boolean", nullable: true },
    { name: "locationDescription", type: "string", nullable: true },
    { name: "latitude", type: "number", nullable: true },
    { name: "longitude", type: "number", nullable: true },
    { name: "address", type: "object", nullable: true },
    { name: "sightingDate", type: "string", nullable: true },
    { name: "sightingTime", type: "string", nullable: true },
    { name: "personDescription", type: "string", nullable: true },
    { name: "vehicleDescription", type: "string", nullable: true },
    { name: "companionDescription", type: "string", nullable: true },
    { name: "attachments", type: "array", nullable: true },
    { name: "metadata", type: "object", nullable: true },
  ],
  requiredFields: ["sourceType", "description"],
  transformations: [
    { field: "submitterEmail", type: "normalize", config: {} },
    { field: "submitterPhone", type: "format", config: { format: "phone" } },
  ],
};

// Register lead data sources
export function registerLeadSources(): void {
  // Tip submission source
  const tipSubmissionSource: DataSource = {
    id: "tip_submission",
    type: "webhook",
    name: "Public Tip Submission",
    config: {
      endpoint: "/api/tips",
      authRequired: false,
    },
    schema: leadSchema,
    enabled: true,
  };

  // Agent-generated leads source
  const agentSource: DataSource = {
    id: "agent_generated",
    type: "agent",
    name: "Agent-Generated Leads",
    config: {},
    schema: leadSchema,
    enabled: true,
  };

  // Partner feed source
  const partnerFeedSource: DataSource = {
    id: "partner_feed",
    type: "api",
    name: "Partner Data Feed",
    config: {
      apiUrl: "",
      authType: "api_key",
    },
    schema: leadSchema,
    enabled: false,
  };

  // Bulk upload source
  const bulkUploadSource: DataSource = {
    id: "bulk_upload",
    type: "file_upload",
    name: "Bulk Lead Upload",
    config: {
      formats: ["csv", "json", "xlsx"],
      maxSize: 10 * 1024 * 1024, // 10MB
    },
    schema: leadSchema,
    enabled: true,
  };

  // Register sources
  ingestionEngine.registerSource(tipSubmissionSource);
  ingestionEngine.registerSource(agentSource);
  ingestionEngine.registerSource(partnerFeedSource);
  ingestionEngine.registerSource(bulkUploadSource);

  // Register pipeline for webhook type
  ingestionEngine.registerPipeline("webhook", [
    validateLeadStep,
    resolveCaseStep,
    enrichLocationStep,
    deduplicationStep,
    scoreLeadStep,
    processAttachmentsStep,
    normalizeAndStoreStep,
  ]);

  // Register same pipeline for other types
  ingestionEngine.registerPipeline("agent", [
    validateLeadStep,
    resolveCaseStep,
    enrichLocationStep,
    deduplicationStep,
    scoreLeadStep,
    processAttachmentsStep,
    normalizeAndStoreStep,
  ]);

  ingestionEngine.registerPipeline("file_upload", [
    validateLeadStep,
    resolveCaseStep,
    enrichLocationStep,
    deduplicationStep,
    scoreLeadStep,
    processAttachmentsStep,
    normalizeAndStoreStep,
  ]);

  console.log("[LeadPipeline] Lead ingestion sources and pipeline registered");
}

// Convenience function to ingest a single lead
export async function ingestLead(
  lead: IncomingLead,
  userId: string
): Promise<string> {
  const sourceId = lead.sourceType === "tip_submission"
    ? "tip_submission"
    : lead.sourceType === "agent_generated"
    ? "agent_generated"
    : "bulk_upload";

  const job = await ingestionEngine.startIngestion(sourceId, [lead], userId);
  return job.id;
}

// Convenience function to ingest multiple leads
export async function ingestLeads(
  leads: IncomingLead[],
  sourceId: string,
  userId: string
): Promise<string> {
  const job = await ingestionEngine.startIngestion(sourceId, leads, userId);
  return job.id;
}
