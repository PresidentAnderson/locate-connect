/**
 * Lead Management Service
 * Handles CRUD operations for leads, notes, and attachments
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  Lead,
  LeadNote,
  LeadAttachment,
  CreateLeadInput,
  UpdateLeadInput,
  CreateLeadNoteInput,
  CreateLeadAttachmentInput,
  LeadFilters,
  LeadWithDetails,
  LeadStatus,
} from "@/types/lead.types";

/**
 * Convert database row to Lead object
 */
function mapLeadFromDb(row: any): Lead {
  return {
    id: row.id,
    caseId: row.case_id,
    title: row.title,
    description: row.description,
    source: row.source,
    sourceReference: row.source_reference,
    leadType: row.lead_type,
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    city: row.city,
    province: row.province,
    status: row.status,
    priorityLevel: row.priority_level,
    credibilityScore: row.credibility_score,
    isVerified: row.is_verified,
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at,
    assignedTo: row.assigned_to,
    reportedAt: row.reported_at,
    sightingDate: row.sighting_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert database row to LeadNote object
 */
function mapLeadNoteFromDb(row: any): LeadNote {
  return {
    id: row.id,
    leadId: row.lead_id,
    authorId: row.author_id,
    content: row.content,
    isInternal: row.is_internal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert database row to LeadAttachment object
 */
function mapLeadAttachmentFromDb(row: any): LeadAttachment {
  return {
    id: row.id,
    leadId: row.lead_id,
    uploadedBy: row.uploaded_by,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    url: row.url,
    description: row.description,
    isEvidence: row.is_evidence,
    createdAt: row.created_at,
  };
}

/**
 * Validate status workflow transitions
 */
export function validateStatusTransition(
  currentStatus: LeadStatus,
  newStatus: LeadStatus
): { valid: boolean; error?: string } {
  // Define allowed transitions
  const allowedTransitions: Record<LeadStatus, LeadStatus[]> = {
    new: ["investigating", "dismissed"],
    investigating: ["verified", "dismissed", "new"],
    verified: ["acted_upon", "dismissed"],
    dismissed: ["new", "investigating"], // Can reopen
    acted_upon: ["dismissed"], // Can dismiss if action didn't pan out
  };

  if (currentStatus === newStatus) {
    return { valid: true };
  }

  if (allowedTransitions[currentStatus]?.includes(newStatus)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
  };
}

/**
 * Create a new lead
 */
export async function createLead(
  supabase: SupabaseClient,
  userId: string,
  input: CreateLeadInput
): Promise<{ data: Lead | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("leads")
      .insert({
        case_id: input.caseId,
        title: input.title,
        description: input.description || null,
        source: input.source || null,
        source_reference: input.sourceReference || null,
        lead_type: input.leadType,
        location: input.location || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        city: input.city || null,
        province: input.province || null,
        priority_level: input.priorityLevel || "p3_low",
        credibility_score: input.credibilityScore ?? 50,
        assigned_to: input.assignedTo || null,
        sighting_date: input.sightingDate || null,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapLeadFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * Get a lead by ID
 */
export async function getLeadById(
  supabase: SupabaseClient,
  leadId: string
): Promise<{ data: Lead | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select()
      .eq("id", leadId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapLeadFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * Get lead with full details (notes, attachments, profiles)
 */
export async function getLeadWithDetails(
  supabase: SupabaseClient,
  leadId: string
): Promise<{ data: LeadWithDetails | null; error: string | null }> {
  try {
    // Get lead
    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .select(
        `
        *,
        assigned_to_profile:profiles!leads_assigned_to_fkey(id, first_name, last_name, email),
        verified_by_profile:profiles!leads_verified_by_fkey(id, first_name, last_name, email)
      `
      )
      .eq("id", leadId)
      .single();

    if (leadError) {
      return { data: null, error: leadError.message };
    }

    // Get notes
    const { data: notesData, error: notesError } = await supabase
      .from("lead_notes")
      .select()
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    // Get attachments
    const { data: attachmentsData, error: attachmentsError } = await supabase
      .from("lead_attachments")
      .select()
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    const lead = mapLeadFromDb(leadData);
    const result: LeadWithDetails = {
      ...lead,
      notes: notesData ? notesData.map(mapLeadNoteFromDb) : [],
      attachments: attachmentsData
        ? attachmentsData.map(mapLeadAttachmentFromDb)
        : [],
    };

    if (leadData.assigned_to_profile) {
      result.assignedToProfile = {
        id: leadData.assigned_to_profile.id,
        firstName: leadData.assigned_to_profile.first_name,
        lastName: leadData.assigned_to_profile.last_name,
        email: leadData.assigned_to_profile.email,
      };
    }

    if (leadData.verified_by_profile) {
      result.verifiedByProfile = {
        id: leadData.verified_by_profile.id,
        firstName: leadData.verified_by_profile.first_name,
        lastName: leadData.verified_by_profile.last_name,
        email: leadData.verified_by_profile.email,
      };
    }

    return { data: result, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * List leads with optional filters
 */
export async function listLeads(
  supabase: SupabaseClient,
  filters?: LeadFilters
): Promise<{ data: Lead[] | null; error: string | null }> {
  try {
    let query = supabase.from("leads").select();

    if (filters?.caseId) {
      query = query.eq("case_id", filters.caseId);
    }

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.leadType) {
      query = query.eq("lead_type", filters.leadType);
    }

    if (filters?.priorityLevel) {
      query = query.eq("priority_level", filters.priorityLevel);
    }

    if (filters?.assignedTo) {
      query = query.eq("assigned_to", filters.assignedTo);
    }

    if (filters?.isVerified !== undefined) {
      query = query.eq("is_verified", filters.isVerified);
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data.map(mapLeadFromDb), error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * Update a lead
 */
export async function updateLead(
  supabase: SupabaseClient,
  leadId: string,
  input: UpdateLeadInput
): Promise<{ data: Lead | null; error: string | null }> {
  try {
    // If status is being updated, validate the transition
    if (input.status) {
      const { data: currentLead } = await getLeadById(supabase, leadId);
      if (currentLead) {
        const validation = validateStatusTransition(
          currentLead.status,
          input.status
        );
        if (!validation.valid) {
          return { data: null, error: validation.error || "Invalid transition" };
        }
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.source !== undefined) updateData.source = input.source;
    if (input.sourceReference !== undefined)
      updateData.source_reference = input.sourceReference;
    if (input.leadType !== undefined) updateData.lead_type = input.leadType;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.latitude !== undefined) updateData.latitude = input.latitude;
    if (input.longitude !== undefined) updateData.longitude = input.longitude;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.province !== undefined) updateData.province = input.province;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priorityLevel !== undefined)
      updateData.priority_level = input.priorityLevel;
    if (input.credibilityScore !== undefined)
      updateData.credibility_score = input.credibilityScore;
    if (input.assignedTo !== undefined)
      updateData.assigned_to = input.assignedTo;
    if (input.sightingDate !== undefined)
      updateData.sighting_date = input.sightingDate;

    const { data, error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", leadId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapLeadFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * Delete a lead
 */
export async function deleteLead(
  supabase: SupabaseClient,
  leadId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("leads").delete().eq("id", leadId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

/**
 * Create a note on a lead
 */
export async function createLeadNote(
  supabase: SupabaseClient,
  userId: string,
  input: CreateLeadNoteInput
): Promise<{ data: LeadNote | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("lead_notes")
      .insert({
        lead_id: input.leadId,
        author_id: userId,
        content: input.content,
        is_internal: input.isInternal ?? false,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapLeadNoteFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * Get notes for a lead
 */
export async function getLeadNotes(
  supabase: SupabaseClient,
  leadId: string
): Promise<{ data: LeadNote[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("lead_notes")
      .select()
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data.map(mapLeadNoteFromDb), error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * Create an attachment on a lead
 */
export async function createLeadAttachment(
  supabase: SupabaseClient,
  userId: string,
  input: CreateLeadAttachmentInput
): Promise<{ data: LeadAttachment | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("lead_attachments")
      .insert({
        lead_id: input.leadId,
        uploaded_by: userId,
        file_name: input.fileName,
        file_type: input.fileType,
        file_size: input.fileSize || null,
        url: input.url,
        description: input.description || null,
        is_evidence: input.isEvidence ?? false,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapLeadAttachmentFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * Get attachments for a lead
 */
export async function getLeadAttachments(
  supabase: SupabaseClient,
  leadId: string
): Promise<{ data: LeadAttachment[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("lead_attachments")
      .select()
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data.map(mapLeadAttachmentFromDb), error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * Assign a lead to a user
 */
export async function assignLead(
  supabase: SupabaseClient,
  leadId: string,
  userId: string
): Promise<{ data: Lead | null; error: string | null }> {
  return updateLead(supabase, leadId, { assignedTo: userId });
}

/**
 * Verify a lead
 */
export async function verifyLead(
  supabase: SupabaseClient,
  leadId: string,
  userId: string
): Promise<{ data: Lead | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("leads")
      .update({
        is_verified: true,
        verified_by: userId,
        verified_at: new Date().toISOString(),
        status: "verified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapLeadFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}
