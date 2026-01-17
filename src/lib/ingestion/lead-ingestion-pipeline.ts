/**
 * Lead Ingestion Pipeline
 * Processes and validates incoming leads from various sources
 */

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
      // In production, lookup case ID from database
      console.log(`[LeadPipeline] Resolving case number: ${lead.caseNumber}`);
      // lead.caseId = await lookupCaseId(lead.caseNumber);

      // Placeholder - would throw if case not found
      lead.caseId = `case_${lead.caseNumber}`;
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
        lead.address.country,
      ]
        .filter(Boolean)
        .join(", ");

      if (addressStr) {
        console.log(`[LeadPipeline] Geocoding address: ${addressStr}`);
        // In production, call geocoding API
        // const coords = await geocodeAddress(addressStr);
        // lead.latitude = coords.lat;
        // lead.longitude = coords.lng;
      }
    }

    // If we have coordinates but no address, reverse geocode
    if (lead.latitude && lead.longitude && !lead.address) {
      console.log(
        `[LeadPipeline] Reverse geocoding: ${lead.latitude}, ${lead.longitude}`
      );
      // In production, call reverse geocoding API
      // lead.address = await reverseGeocode(lead.latitude, lead.longitude);
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

    // Check for similar leads in the same case
    console.log(`[LeadPipeline] Checking for duplicates in case ${lead.caseId}`);

    // In production, query database for similar leads
    // const similar = await findSimilarLeads(lead);
    // if (similar.length > 0) {
    //   data._duplicateOf = similar[0].id;
    // }

    return data as Record<string, unknown> & { _duplicateOf?: string };
  },
};

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
