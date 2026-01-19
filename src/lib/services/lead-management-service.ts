/**
 * Lead Management Service
 * Handles CRUD operations and workflows for case leads
 */

import { createClient } from "@/lib/supabase/server";
import type {
  Lead,
  LeadStatus,
  LeadPriority,
  LeadSource,
  LeadActivity,
  LeadAttachment,
} from "@/types/law-enforcement.types";

export interface CreateLeadInput {
  caseId: string;
  title: string;
  description: string;
  priority?: LeadPriority;
  source: LeadSource;
  sourceDetails?: string;
  submitter?: {
    name?: string;
    email?: string;
    phone?: string;
    isAnonymous?: boolean;
    relationship?: string;
  };
  location?: {
    description: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    coordinates?: { lat: number; lng: number };
  };
  sighting?: {
    date: string;
    time?: string;
    description: string;
    personDescription?: string;
    vehicleDescription?: string;
  };
}

export interface UpdateLeadInput {
  title?: string;
  description?: string;
  priority?: LeadPriority;
  status?: LeadStatus;
  assignedTo?: string;
  verificationNotes?: string;
}

export interface LeadFilters {
  caseId?: string;
  status?: LeadStatus | LeadStatus[];
  priority?: LeadPriority | LeadPriority[];
  source?: LeadSource | LeadSource[];
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface LeadListResult {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class LeadManagementService {
  private leads: Map<string, Lead> = new Map();

  /**
   * Create a new lead
   */
  async createLead(input: CreateLeadInput, userId: string): Promise<Lead> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Calculate initial confidence score
    const confidenceScore = this.calculateConfidenceScore(input);

    const lead: Lead = {
      id,
      caseId: input.caseId,
      caseNumber: "", // Would be fetched from case
      title: input.title,
      description: input.description,
      status: "new",
      priority: input.priority || "medium",
      source: input.source,
      sourceDetails: input.sourceDetails,
      submitter: {
        name: input.submitter?.name || null,
        email: input.submitter?.email || null,
        phone: input.submitter?.phone || null,
        isAnonymous: input.submitter?.isAnonymous || false,
        relationship: input.submitter?.relationship,
      },
      location: input.location,
      sighting: input.sighting
        ? {
            date: input.sighting.date,
            time: input.sighting.time,
            description: input.sighting.description,
            personDescription: input.sighting.personDescription,
            vehicleDescription: input.sighting.vehicleDescription,
          }
        : undefined,
      attachments: [],
      confidenceScore,
      createdAt: now,
      updatedAt: now,
      activityLog: [
        {
          id: crypto.randomUUID(),
          type: "created",
          description: "Lead created",
          userId,
          userName: "", // Would be fetched
          timestamp: now,
        },
      ],
    };

    this.leads.set(id, lead);

    // Check for duplicates
    await this.checkForDuplicates(lead);

    // Auto-escalate high priority leads
    if (lead.priority === "critical") {
      await this.escalateLead(lead);
    }

    console.log(`[LeadService] Created lead ${id} for case ${input.caseId}`);
    return lead;
  }

  /**
   * Get lead by ID
   */
  async getLead(leadId: string): Promise<Lead | null> {
    return this.leads.get(leadId) || null;
  }

  /**
   * Update lead
   */
  async updateLead(
    leadId: string,
    input: UpdateLeadInput,
    userId: string
  ): Promise<Lead | null> {
    const lead = this.leads.get(leadId);
    if (!lead) return null;

    const now = new Date().toISOString();
    const activities: LeadActivity[] = [];

    // Track status changes
    if (input.status && input.status !== lead.status) {
      activities.push({
        id: crypto.randomUUID(),
        type: "status_changed",
        description: `Status changed from ${lead.status} to ${input.status}`,
        userId,
        userName: "",
        timestamp: now,
        metadata: { oldStatus: lead.status, newStatus: input.status },
      });

      lead.status = input.status;

      // Handle verification
      if (input.status === "verified") {
        lead.verifiedBy = userId;
        lead.verifiedAt = now;
      }

      // Handle closure
      if (input.status === "closed" || input.status === "false_lead") {
        lead.closedAt = now;
      }
    }

    // Track assignment changes
    if (input.assignedTo && input.assignedTo !== lead.assignedTo) {
      activities.push({
        id: crypto.randomUUID(),
        type: "assigned",
        description: `Lead assigned to user`,
        userId,
        userName: "",
        timestamp: now,
        metadata: { assignedTo: input.assignedTo },
      });

      lead.assignedTo = input.assignedTo;
      lead.assignedAt = now;

      // Auto-update status
      if (lead.status === "new") {
        lead.status = "assigned";
      }
    }

    // Update other fields
    if (input.title) lead.title = input.title;
    if (input.description) lead.description = input.description;
    if (input.priority) lead.priority = input.priority;
    if (input.verificationNotes) lead.verificationNotes = input.verificationNotes;

    lead.updatedAt = now;
    lead.activityLog.push(...activities);

    this.leads.set(leadId, lead);
    return lead;
  }

  /**
   * List leads with filters
   */
  async listLeads(
    filters: LeadFilters,
    page = 1,
    pageSize = 20
  ): Promise<LeadListResult> {
    let leads = Array.from(this.leads.values());

    // Apply filters
    if (filters.caseId) {
      leads = leads.filter((l) => l.caseId === filters.caseId);
    }

    if (filters.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      leads = leads.filter((l) => statuses.includes(l.status));
    }

    if (filters.priority) {
      const priorities = Array.isArray(filters.priority)
        ? filters.priority
        : [filters.priority];
      leads = leads.filter((l) => priorities.includes(l.priority));
    }

    if (filters.source) {
      const sources = Array.isArray(filters.source)
        ? filters.source
        : [filters.source];
      leads = leads.filter((l) => sources.includes(l.source));
    }

    if (filters.assignedTo) {
      leads = leads.filter((l) => l.assignedTo === filters.assignedTo);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      leads = leads.filter(
        (l) =>
          l.title.toLowerCase().includes(search) ||
          l.description.toLowerCase().includes(search)
      );
    }

    // Sort by priority and date
    leads.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = leads.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedLeads = leads.slice(start, start + pageSize);

    return {
      leads: paginatedLeads,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Add attachment to lead
   */
  async addAttachment(
    leadId: string,
    attachment: Omit<LeadAttachment, "id" | "uploadedAt">,
    userId: string
  ): Promise<LeadAttachment | null> {
    const lead = this.leads.get(leadId);
    if (!lead) return null;

    const now = new Date().toISOString();
    const newAttachment: LeadAttachment = {
      ...attachment,
      id: crypto.randomUUID(),
      uploadedAt: now,
      uploadedBy: userId,
    };

    lead.attachments.push(newAttachment);
    lead.updatedAt = now;
    lead.activityLog.push({
      id: crypto.randomUUID(),
      type: "attachment_added",
      description: `Attachment added: ${attachment.filename}`,
      userId,
      userName: "",
      timestamp: now,
    });

    this.leads.set(leadId, lead);
    return newAttachment;
  }

  /**
   * Add note to lead
   */
  async addNote(leadId: string, note: string, userId: string): Promise<boolean> {
    const lead = this.leads.get(leadId);
    if (!lead) return false;

    const now = new Date().toISOString();
    lead.activityLog.push({
      id: crypto.randomUUID(),
      type: "note_added",
      description: note,
      userId,
      userName: "",
      timestamp: now,
    });

    lead.updatedAt = now;
    this.leads.set(leadId, lead);
    return true;
  }

  /**
   * Calculate confidence score for a lead
   */
  private calculateConfidenceScore(input: CreateLeadInput): number {
    let score = 10; // Base score

    // Contact info scoring
    if (!input.submitter?.isAnonymous) {
      if (input.submitter?.name) score += 10;
      if (input.submitter?.email) score += 10;
      if (input.submitter?.phone) score += 15;
    }

    // Location scoring
    if (input.location) {
      if (input.location.coordinates) score += 15;
      if (input.location.address) score += 10;
      if (input.location.city) score += 5;
    }

    // Sighting scoring
    if (input.sighting) {
      score += 10;
      if (input.sighting.personDescription) score += 10;
      if (input.sighting.vehicleDescription) score += 5;
    }

    // Description quality
    if (input.description.length > 100) score += 5;
    if (input.description.length > 250) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Check for duplicate leads
   */
  private async checkForDuplicates(lead: Lead): Promise<void> {
    const caseLeads = Array.from(this.leads.values()).filter(
      (l) => l.caseId === lead.caseId && l.id !== lead.id
    );

    for (const existing of caseLeads) {
      const similarity = this.calculateSimilarity(lead, existing);
      if (similarity > 0.8) {
        lead.duplicateOf = existing.id;
        console.log(
          `[LeadService] Potential duplicate: ${lead.id} -> ${existing.id}`
        );
        break;
      }
    }
  }

  /**
   * Calculate similarity between two leads
   */
  private calculateSimilarity(a: Lead, b: Lead): number {
    let score = 0;
    let factors = 0;

    // Location similarity
    if (a.location?.coordinates && b.location?.coordinates) {
      const distance = this.haversineDistance(
        a.location.coordinates,
        b.location.coordinates
      );
      if (distance < 0.5) score += 1; // Within 500m
      else if (distance < 2) score += 0.5;
      factors++;
    }

    // Date similarity
    if (a.sighting?.date && b.sighting?.date) {
      const daysDiff = Math.abs(
        new Date(a.sighting.date).getTime() -
          new Date(b.sighting.date).getTime()
      ) / (1000 * 60 * 60 * 24);
      if (daysDiff < 1) score += 1;
      else if (daysDiff < 3) score += 0.5;
      factors++;
    }

    // Description similarity (simple word overlap)
    const aWords = new Set(a.description.toLowerCase().split(/\s+/));
    const bWords = new Set(b.description.toLowerCase().split(/\s+/));
    const overlap = [...aWords].filter((w) => bWords.has(w)).length;
    const total = Math.max(aWords.size, bWords.size);
    score += overlap / total;
    factors++;

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate distance between two coordinates in km
   */
  private haversineDistance(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;

    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

    return R * c;
  }

  /**
   * Escalate a lead - send notifications to investigators and supervisors
   */
  private async escalateLead(lead: Lead): Promise<void> {
    console.log(`[LeadService] Escalating critical lead ${lead.id}`);

    const supabase = await createClient();

    try {
      // Get case details including assigned investigators
      const { data: caseData, error: caseError } = await supabase
        .from("case_reports")
        .select("case_number, assigned_to, missing_person_name")
        .eq("id", lead.caseId)
        .single();

      if (caseError || !caseData) {
        console.error("[LeadService] Failed to fetch case for escalation:", caseError);
        return;
      }

      // Get supervisors and investigators to notify
      const { data: usersToNotify, error: usersError } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .or("role.eq.supervisor,role.eq.admin,id.eq." + (caseData.assigned_to || ""));

      if (usersError || !usersToNotify?.length) {
        console.error("[LeadService] No users to notify for escalation");
        return;
      }

      const now = new Date().toISOString();
      const notificationTitle = `🚨 Critical Lead: ${lead.title}`;
      const notificationMessage = `A critical priority lead has been submitted for case ${caseData.case_number} (${caseData.missing_person_name || "Unknown"}). ${lead.description.substring(0, 150)}...`;

      // Create notifications for each user
      const notifications = usersToNotify.map((user) => ({
        user_id: user.id,
        type: "lead_escalation",
        title: notificationTitle,
        message: notificationMessage,
        priority: "high" as const,
        data: {
          lead_id: lead.id,
          case_id: lead.caseId,
          case_number: caseData.case_number,
          lead_priority: lead.priority,
          lead_source: lead.source,
          confidence_score: lead.confidenceScore,
        },
        created_at: now,
      }));

      const { error: notifyError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifyError) {
        console.error("[LeadService] Failed to create escalation notifications:", notifyError);
      } else {
        console.log(`[LeadService] Sent escalation notifications to ${notifications.length} users`);
      }

      // Log the escalation to case activity
      await supabase.from("case_activity").insert({
        case_id: lead.caseId,
        activity_type: "lead_escalated",
        description: `Critical lead "${lead.title}" has been escalated for immediate review`,
        metadata: {
          lead_id: lead.id,
          lead_priority: lead.priority,
          lead_source: lead.source,
          confidence_score: lead.confidenceScore,
          notified_users: usersToNotify.map((u) => u.id),
        },
        created_at: now,
      });

      // If location data exists, check for proximity to other sightings
      if (lead.location?.coordinates) {
        await this.checkProximityAlerts(lead, caseData.case_number);
      }
    } catch (error) {
      console.error("[LeadService] Escalation error:", error);
    }
  }

  /**
   * Check if the lead's location is near other recent sightings
   */
  private async checkProximityAlerts(
    lead: Lead,
    caseNumber: string
  ): Promise<void> {
    if (!lead.location?.coordinates) return;

    const supabase = await createClient();

    // Get recent leads with locations for the same case
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentLeads, error } = await supabase
      .from("leads")
      .select("id, title, location, sighting")
      .eq("case_id", lead.caseId)
      .neq("id", lead.id)
      .gte("created_at", twentyFourHoursAgo)
      .not("location", "is", null);

    if (error || !recentLeads?.length) return;

    interface LeadLocation {
      coordinates?: { lat: number; lng: number };
    }

    // Check proximity to each recent lead
    for (const recentLead of recentLeads) {
      const recentLocation = recentLead.location as LeadLocation | null;
      if (!recentLocation?.coordinates) continue;

      const distance = this.haversineDistance(
        lead.location.coordinates,
        recentLocation.coordinates
      );

      // If within 5km, create a pattern alert
      if (distance < 5) {
        console.log(`[LeadService] Proximity alert: Lead ${lead.id} is ${distance.toFixed(2)}km from lead ${recentLead.id}`);

        // Get supervisors to notify about the pattern
        const { data: supervisors } = await supabase
          .from("profiles")
          .select("id")
          .in("role", ["supervisor", "admin"]);

        if (supervisors?.length) {
          await supabase.from("notifications").insert(
            supervisors.map((s) => ({
              user_id: s.id,
              type: "pattern_detected",
              title: "📍 Pattern Alert: Clustered Sightings",
              message: `Multiple sighting reports within ${distance.toFixed(1)}km for case ${caseNumber}. Recent lead: "${lead.title}" is near a previous sighting: "${recentLead.title}".`,
              priority: "high" as const,
              data: {
                lead_id: lead.id,
                related_lead_id: recentLead.id,
                case_id: lead.caseId,
                distance_km: distance,
                pattern_type: "proximity_cluster",
              },
            }))
          );
        }

        break; // Only alert once per lead
      }
    }
  }

  /**
   * Get lead statistics for a case
   */
  async getLeadStats(caseId: string): Promise<{
    total: number;
    byStatus: Record<LeadStatus, number>;
    byPriority: Record<LeadPriority, number>;
    avgConfidenceScore: number;
  }> {
    const leads = Array.from(this.leads.values()).filter(
      (l) => l.caseId === caseId
    );

    const byStatus: Record<LeadStatus, number> = {
      new: 0,
      assigned: 0,
      in_progress: 0,
      pending_verification: 0,
      verified: 0,
      false_lead: 0,
      closed: 0,
    };

    const byPriority: Record<LeadPriority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    let totalConfidence = 0;

    for (const lead of leads) {
      byStatus[lead.status]++;
      byPriority[lead.priority]++;
      totalConfidence += lead.confidenceScore;
    }

    return {
      total: leads.length,
      byStatus,
      byPriority,
      avgConfidenceScore: leads.length > 0 ? totalConfidence / leads.length : 0,
    };
  }
}

export const leadManagementService = new LeadManagementService();
