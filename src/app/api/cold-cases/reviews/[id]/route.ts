/**
 * Cold Case Review Detail API
 * GET - Get a specific review with checklist
 * PATCH - Update review (start, progress, complete)
 */

import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
  apiNotFound,
  apiServerError,
} from '@/lib/api/response';
import type { CompleteReviewRequest } from '@/types/cold-case.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  // Check if user has LE/admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role)) {
    return apiForbidden('Access restricted to law enforcement and administrators');
  }

  // Fetch review with related data
  const { data: review, error } = await supabase
    .from('cold_case_reviews')
    .select(`
      *,
      cold_case_profile:cold_case_profiles(
        id,
        case_id,
        classification,
        became_cold_at,
        total_days_missing,
        dna_submission_status,
        dna_samples_available,
        revival_priority_score,
        revival_priority_factors,
        digitization_status,
        digitization_progress
      ),
      case:cases(
        id,
        case_number,
        first_name,
        middle_name,
        last_name,
        date_of_birth,
        age_at_disappearance,
        gender,
        last_seen_date,
        last_seen_location,
        last_seen_city,
        last_seen_province,
        circumstances,
        status,
        priority_level,
        is_minor,
        is_elderly,
        is_indigenous,
        has_dementia,
        has_autism,
        is_suicidal_risk,
        suspected_abduction,
        suspected_foul_play,
        medical_conditions,
        medications,
        is_medication_dependent,
        primary_photo_url
      ),
      reviewer:profiles!cold_case_reviews_reviewer_id_fkey(
        id,
        first_name,
        last_name,
        email
      ),
      assigned_by_user:profiles!cold_case_reviews_assigned_by_fkey(
        id,
        first_name,
        last_name
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return apiNotFound('Review not found');
    }
    console.error('Error fetching review:', error);
    return apiServerError(error.message);
  }

  // Fetch checklist items
  const { data: checklistItems } = await supabase
    .from('cold_case_checklist_items')
    .select('*')
    .eq('review_id', id)
    .order('item_order', { ascending: true });

  // Fetch pattern matches for the case
  const { data: patternMatches } = await supabase
    .from('cold_case_pattern_matches')
    .select(`
      *,
      matched_case:cases!cold_case_pattern_matches_matched_case_id_fkey(
        id,
        case_number,
        first_name,
        last_name,
        last_seen_date,
        last_seen_city,
        last_seen_province,
        status
      )
    `)
    .eq('source_case_id', review.case_id)
    .order('confidence_score', { ascending: false });

  // Fetch recent leads for the case
  const { data: recentLeads } = await supabase
    .from('leads')
    .select('*')
    .eq('case_id', review.case_id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch recent tips for the case
  const { data: recentTips } = await supabase
    .from('tips')
    .select('*')
    .eq('case_id', review.case_id)
    .order('created_at', { ascending: false })
    .limit(10);

  return apiSuccess({
    ...review,
    checklistItems: checklistItems || [],
    patternMatches: patternMatches || [],
    recentLeads: recentLeads || [],
    recentTips: recentTips || [],
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  // Check if user has LE/admin role and is verified
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role)) {
    return apiForbidden('Access restricted to law enforcement and administrators');
  }

  if (!profile.is_verified) {
    return apiForbidden('Account verification required');
  }

  const body = await request.json();
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  // Get current review
  const { data: review, error: reviewError } = await supabase
    .from('cold_case_reviews')
    .select('*, cold_case_profile:cold_case_profiles(id, case_id)')
    .eq('id', id)
    .single();

  if (reviewError || !review) {
    return apiNotFound('Review not found');
  }

  // Handle different actions
  if (action === 'start') {
    // Start the review
    if (review.status !== 'pending') {
      return apiBadRequest('Review has already been started', 'already_started');
    }

    const { data, error } = await supabase
      .from('cold_case_reviews')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error starting review:', error);
      return apiServerError(error.message);
    }

    return apiSuccess(data);
  }

  if (action === 'complete') {
    // Complete the review
    const completeBody = body as CompleteReviewRequest;

    if (review.status === 'completed') {
      return apiBadRequest('Review has already been completed', 'already_completed');
    }

    if (!completeBody.revivalDecision || !completeBody.summary) {
      return apiBadRequest('Revival decision and summary are required', 'missing_fields');
    }

    // Use the database function to complete the review
    const { error: completeError } = await supabase
      .rpc('complete_cold_case_review', {
        p_review_id: id,
        p_revival_recommended: completeBody.revivalRecommended,
        p_revival_decision: completeBody.revivalDecision,
        p_summary: completeBody.summary,
      });

    if (completeError) {
      console.error('Error completing review:', completeError);
      return apiServerError(completeError.message);
    }

    if (completeBody.revivalRecommended && completeBody.revivalDecision === 'revive') {
      await supabase
        .from('cases')
        .update({ lifecycle_status: 'revived' })
        .eq('id', review.case_id);
    }

    // Update additional fields
    const updateData: Record<string, unknown> = {};

    if (completeBody.recommendations !== undefined) {
      updateData.recommendations = completeBody.recommendations;
    }
    if (completeBody.nextSteps !== undefined) {
      updateData.next_steps = completeBody.nextSteps;
    }
    if (completeBody.newLeadsIdentified !== undefined) {
      updateData.new_leads_identified = completeBody.newLeadsIdentified;
    }
    if (completeBody.newEvidenceFound !== undefined) {
      updateData.new_evidence_found = completeBody.newEvidenceFound;
      if (completeBody.newEvidenceDescription) {
        updateData.new_evidence_description = completeBody.newEvidenceDescription;
      }
    }
    if (completeBody.dnaResubmissionRecommended !== undefined) {
      updateData.dna_resubmission_recommended = completeBody.dnaResubmissionRecommended;
    }
    if (completeBody.campaignRecommended !== undefined) {
      updateData.campaign_recommended = completeBody.campaignRecommended;
      if (completeBody.recommendedCampaignType) {
        updateData.recommended_campaign_type = completeBody.recommendedCampaignType;
      }
    }
    if (completeBody.escalationRecommended !== undefined) {
      updateData.escalation_recommended = completeBody.escalationRecommended;
      if (completeBody.escalationReason) {
        updateData.escalation_reason = completeBody.escalationReason;
      }
    }
    if (completeBody.revivalJustification !== undefined) {
      updateData.revival_justification = completeBody.revivalJustification;
    }
    if (completeBody.familyNotified !== undefined) {
      updateData.family_notified = completeBody.familyNotified;
      if (completeBody.familyNotificationMethod) {
        updateData.family_notification_method = completeBody.familyNotificationMethod;
      }
      if (completeBody.familyResponse) {
        updateData.family_response = completeBody.familyResponse;
      }
      if (completeBody.familyNotified) {
        updateData.family_notification_date = new Date().toISOString().split('T')[0];
      }
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('cold_case_reviews')
        .update(updateData)
        .eq('id', id);
    }

    // Fetch updated review
    const { data: updatedReview, error: fetchError } = await supabase
      .from('cold_case_reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated review:', fetchError);
      return apiServerError(fetchError.message);
    }

    return apiSuccess(updatedReview);
  }

  // Regular update (not start or complete)
  const updateData: Record<string, unknown> = {};

  if (body.crossReferencesChecked !== undefined) {
    updateData.cross_references_checked = body.crossReferencesChecked;
  }
  if (body.relatedCasesIdentified !== undefined) {
    updateData.related_cases_identified = body.relatedCasesIdentified;
  }
  if (body.patternMatchesFound !== undefined) {
    updateData.pattern_matches_found = body.patternMatchesFound;
  }
  if (body.patternMatchDetails !== undefined) {
    updateData.pattern_match_details = body.patternMatchDetails;
  }

  if (Object.keys(updateData).length === 0) {
    return apiBadRequest('No valid fields to update', 'no_fields');
  }

  const { data, error } = await supabase
    .from('cold_case_reviews')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating review:', error);
    return apiServerError(error.message);
  }

  return apiSuccess(data);
}
