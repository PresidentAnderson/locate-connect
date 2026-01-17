/**
 * Cold Case Profile Detail API
 * GET - Get a specific cold case profile
 * PATCH - Update a cold case profile
 * DELETE - Remove cold case classification (revert to active)
 */

import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
  apiNotFound,
  apiServerError,
  apiNoContent,
} from '@/lib/api/response';
import type { UpdateColdCaseProfileRequest } from '@/types/cold-case.types';

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

  // Fetch cold case profile with related data
  const { data, error } = await supabase
    .from('cold_case_profiles')
    .select(`
      *,
      case:cases(
        id,
        case_number,
        first_name,
        middle_name,
        last_name,
        nickname,
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
        mental_health_conditions,
        is_medication_dependent,
        jurisdiction_id,
        primary_photo_url,
        created_at
      ),
      current_reviewer:profiles!cold_case_profiles_current_reviewer_id_fkey(
        id,
        first_name,
        last_name,
        email
      ),
      classified_by_user:profiles!cold_case_profiles_classified_by_fkey(
        id,
        first_name,
        last_name
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return apiNotFound('Cold case profile not found');
    }
    console.error('Error fetching cold case profile:', error);
    return apiServerError(error.message);
  }

  // Also fetch recent reviews
  const { data: reviews } = await supabase
    .from('cold_case_reviews')
    .select(`
      id,
      review_number,
      review_type,
      status,
      started_at,
      completed_at,
      revival_recommended,
      revival_decision,
      summary,
      reviewer:profiles!cold_case_reviews_reviewer_id_fkey(
        id,
        first_name,
        last_name
      )
    `)
    .eq('cold_case_profile_id', id)
    .order('review_number', { ascending: false })
    .limit(5);

  // Fetch recent campaigns
  const { data: campaigns } = await supabase
    .from('cold_case_campaigns')
    .select('id, campaign_type, campaign_name, status, scheduled_start, actual_reach, actual_tips_generated')
    .eq('cold_case_profile_id', id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch unprocessed evidence
  const { data: newEvidence } = await supabase
    .from('cold_case_new_evidence')
    .select('*')
    .eq('cold_case_profile_id', id)
    .eq('processed', false)
    .order('significance_level', { ascending: false })
    .limit(10);

  // Fetch DNA submissions
  const { data: dnaSubmissions } = await supabase
    .from('cold_case_dna_submissions')
    .select('*')
    .eq('cold_case_profile_id', id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch pattern matches
  const { data: patternMatches } = await supabase
    .from('cold_case_pattern_matches')
    .select(`
      *,
      matched_case:cases!cold_case_pattern_matches_matched_case_id_fkey(
        id,
        case_number,
        first_name,
        last_name,
        status
      )
    `)
    .eq('source_case_id', data.case_id)
    .eq('reviewed', false)
    .order('confidence_score', { ascending: false })
    .limit(10);

  return apiSuccess({
    ...data,
    recentReviews: reviews || [],
    recentCampaigns: campaigns || [],
    unprocessedEvidence: newEvidence || [],
    dnaSubmissions: dnaSubmissions || [],
    unreviewedPatternMatches: patternMatches || [],
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

  const body = await request.json() as UpdateColdCaseProfileRequest;

  // Build update object with snake_case keys
  const updateData: Record<string, unknown> = {};

  if (body.classification !== undefined) {
    updateData.classification = body.classification;
  }
  if (body.classificationReason !== undefined) {
    updateData.classification_reason = body.classificationReason;
  }
  if (body.reviewFrequency !== undefined) {
    updateData.review_frequency = body.reviewFrequency;
    // Recalculate next review date
    const nextReviewDate = new Date();
    switch (body.reviewFrequency) {
      case 'monthly':
        nextReviewDate.setMonth(nextReviewDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextReviewDate.setMonth(nextReviewDate.getMonth() + 3);
        break;
      case 'semi_annual':
        nextReviewDate.setMonth(nextReviewDate.getMonth() + 6);
        break;
      case 'annual':
        nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1);
        break;
      case 'biennial':
        nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 2);
        break;
    }
    updateData.next_review_date = nextReviewDate.toISOString().split('T')[0];
  }
  if (body.dnaSubmissionStatus !== undefined) {
    updateData.dna_submission_status = body.dnaSubmissionStatus;
  }
  if (body.dnaSamplesAvailable !== undefined) {
    updateData.dna_samples_available = body.dnaSamplesAvailable;
  }
  if (body.patternMatchEnabled !== undefined) {
    updateData.pattern_match_enabled = body.patternMatchEnabled;
  }
  if (body.digitizationStatus !== undefined) {
    updateData.digitization_status = body.digitizationStatus;
  }
  if (body.digitizationProgress !== undefined) {
    updateData.digitization_progress = body.digitizationProgress;
  }
  if (body.physicalFilesLocation !== undefined) {
    updateData.physical_files_location = body.physicalFilesLocation;
  }
  if (body.familyContactPreference !== undefined) {
    updateData.family_contact_preference = body.familyContactPreference;
  }
  if (body.familyOptedOutNotifications !== undefined) {
    updateData.family_opted_out_notifications = body.familyOptedOutNotifications;
  }
  if (body.revivalNotes !== undefined) {
    updateData.revival_notes = body.revivalNotes;
  }
  if (body.specialCircumstances !== undefined) {
    updateData.special_circumstances = body.specialCircumstances;
  }

  if (Object.keys(updateData).length === 0) {
    return apiBadRequest('No valid fields to update', 'no_fields');
  }

  const { data, error } = await supabase
    .from('cold_case_profiles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return apiNotFound('Cold case profile not found');
    }
    console.error('Error updating cold case profile:', error);
    return apiServerError(error.message);
  }

  return apiSuccess(data);
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return apiForbidden('Access restricted to administrators');
  }

  // Get the cold case profile to find the case ID
  const { data: coldCaseProfile } = await supabase
    .from('cold_case_profiles')
    .select('case_id')
    .eq('id', id)
    .single();

  if (!coldCaseProfile) {
    return apiNotFound('Cold case profile not found');
  }

  // Update case status back to active
  await supabase
    .from('cases')
    .update({ status: 'active', lifecycle_status: 'revived' })
    .eq('id', coldCaseProfile.case_id);

  // Delete the cold case profile
  const { error } = await supabase
    .from('cold_case_profiles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting cold case profile:', error);
    return apiServerError(error.message);
  }

  return apiNoContent();
}
