/**
 * Cold Case Profiles API
 * GET - List cold case profiles with filtering
 * POST - Create a new cold case profile (manually classify)
 */

import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiPaginated,
  apiCreated,
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
  apiServerError,
} from '@/lib/api/response';
import type {
  ColdCaseSearchFilters,
  CreateColdCaseProfileRequest,
} from '@/types/cold-case.types';

export async function GET(request: Request) {
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

  // Parse query parameters
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20'), 100);
  const offset = (page - 1) * pageSize;

  // Build filters
  const filters: ColdCaseSearchFilters = {};

  const classification = url.searchParams.get('classification');
  if (classification) {
    filters.classification = classification.split(',') as ColdCaseSearchFilters['classification'];
  }

  const dnaStatus = url.searchParams.get('dnaSubmissionStatus');
  if (dnaStatus) {
    filters.dnaSubmissionStatus = dnaStatus.split(',') as ColdCaseSearchFilters['dnaSubmissionStatus'];
  }

  const hasOverdueReview = url.searchParams.get('hasOverdueReview');
  if (hasOverdueReview) {
    filters.hasOverdueReview = hasOverdueReview === 'true';
  }

  const hasUpcomingAnniversary = url.searchParams.get('hasUpcomingAnniversary');
  if (hasUpcomingAnniversary) {
    filters.hasUpcomingAnniversary = hasUpcomingAnniversary === 'true';
  }

  const minPriority = url.searchParams.get('minRevivalPriorityScore');
  if (minPriority) {
    filters.minRevivalPriorityScore = parseInt(minPriority);
  }

  const jurisdictionId = url.searchParams.get('jurisdictionId');
  if (jurisdictionId) {
    filters.jurisdictionId = jurisdictionId;
  }

  // Build query
  let query = supabase
    .from('cold_case_profiles')
    .select(`
      *,
      case:cases(
        id,
        case_number,
        first_name,
        last_name,
        last_seen_date,
        last_seen_location,
        status,
        priority_level,
        is_minor,
        is_indigenous,
        jurisdiction_id,
        primary_photo_url
      ),
      current_reviewer:profiles!cold_case_profiles_current_reviewer_id_fkey(
        id,
        first_name,
        last_name,
        email
      )
    `, { count: 'exact' });

  // Apply filters
  if (filters.classification?.length) {
    query = query.in('classification', filters.classification);
  }

  if (filters.dnaSubmissionStatus?.length) {
    query = query.in('dna_submission_status', filters.dnaSubmissionStatus);
  }

  if (filters.hasOverdueReview) {
    query = query.lt('next_review_date', new Date().toISOString().split('T')[0]);
  }

  if (filters.hasUpcomingAnniversary) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    query = query
      .gte('anniversary_date', new Date().toISOString().split('T')[0])
      .lte('anniversary_date', thirtyDaysFromNow.toISOString().split('T')[0]);
  }

  if (filters.minRevivalPriorityScore) {
    query = query.gte('revival_priority_score', filters.minRevivalPriorityScore);
  }

  // Sort and paginate
  const sortBy = url.searchParams.get('sortBy') || 'revival_priority_score';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';

  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching cold case profiles:', error);
    return apiServerError(error.message);
  }

  return apiPaginated(data || [], count || 0, page, pageSize);
}

export async function POST(request: Request) {
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

  const body = await request.json() as CreateColdCaseProfileRequest;

  if (!body.caseId) {
    return apiBadRequest('Case ID is required', 'missing_case_id');
  }

  // Check if case exists and is active
  const { data: caseData } = await supabase
    .from('cases')
    .select('id, last_seen_date, status')
    .eq('id', body.caseId)
    .single();

  if (!caseData) {
    return apiBadRequest('Case not found', 'case_not_found');
  }

  // Check if cold case profile already exists
  const { data: existingProfile } = await supabase
    .from('cold_case_profiles')
    .select('id')
    .eq('case_id', body.caseId)
    .single();

  if (existingProfile) {
    return apiBadRequest('Cold case profile already exists for this case', 'profile_exists');
  }

  // Calculate total days missing
  const lastSeenDate = new Date(caseData.last_seen_date);
  const totalDaysMissing = Math.floor((Date.now() - lastSeenDate.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate next review date based on frequency
  const reviewFrequency = body.reviewFrequency || 'annual';
  const nextReviewDate = new Date();
  switch (reviewFrequency) {
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

  // Create cold case profile
  const { data, error } = await supabase
    .from('cold_case_profiles')
    .insert({
      case_id: body.caseId,
      classification: body.classification || 'manually_classified',
      classified_by: user.id,
      classification_reason: body.classificationReason || 'Manually classified as cold case',
      became_cold_at: new Date().toISOString(),
      total_days_missing: totalDaysMissing,
      criteria_manually_marked: true,
      review_frequency: reviewFrequency,
      next_review_date: nextReviewDate.toISOString().split('T')[0],
      anniversary_date: caseData.last_seen_date,
      family_notified_of_cold_status: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating cold case profile:', error);
    return apiServerError(error.message);
  }

  // Update case status to cold
  await supabase
    .from('cases')
    .update({ status: 'cold', lifecycle_status: 'cold' })
    .eq('id', body.caseId);

  return apiCreated(data);
}
