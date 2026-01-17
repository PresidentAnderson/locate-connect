/**
 * Cold Case Reviews API
 * GET - List reviews with filtering
 * POST - Create a new review (assign reviewer)
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
import type { CreateReviewRequest } from '@/types/cold-case.types';

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

  // Filters
  const status = url.searchParams.get('status');
  const reviewerId = url.searchParams.get('reviewerId');
  const coldCaseProfileId = url.searchParams.get('coldCaseProfileId');
  const overdue = url.searchParams.get('overdue');

  let query = supabase
    .from('cold_case_reviews')
    .select(`
      *,
      cold_case_profile:cold_case_profiles(
        id,
        case_id,
        classification,
        revival_priority_score
      ),
      case:cases(
        id,
        case_number,
        first_name,
        last_name,
        last_seen_date,
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
    `, { count: 'exact' });

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }
  if (reviewerId) {
    query = query.eq('reviewer_id', reviewerId);
  }
  if (coldCaseProfileId) {
    query = query.eq('cold_case_profile_id', coldCaseProfileId);
  }
  if (overdue === 'true') {
    query = query.lt('due_date', new Date().toISOString().split('T')[0]);
    query = query.neq('status', 'completed');
  }

  // Sort and paginate
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';

  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching reviews:', error);
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

  const body = await request.json() as CreateReviewRequest;

  if (!body.coldCaseProfileId) {
    return apiBadRequest('Cold case profile ID is required', 'missing_profile_id');
  }

  // Get the cold case profile
  const { data: coldCaseProfile, error: profileError } = await supabase
    .from('cold_case_profiles')
    .select('id, case_id, current_reviewer_id')
    .eq('id', body.coldCaseProfileId)
    .single();

  if (profileError || !coldCaseProfile) {
    return apiBadRequest('Cold case profile not found', 'profile_not_found');
  }

  // Check if there's already an active review
  if (coldCaseProfile.current_reviewer_id) {
    return apiBadRequest('A review is already in progress for this case', 'review_in_progress');
  }

  // Use the database function to assign a reviewer with rotation
  const { data: reviewId, error: assignError } = await supabase
    .rpc('assign_cold_case_reviewer', {
      profile_id: body.coldCaseProfileId,
      assigned_by_id: user.id,
    });

  if (assignError) {
    console.error('Error assigning reviewer:', assignError);
    // If no reviewers available, create review without rotation
    if (assignError.message.includes('No available reviewers')) {
      return apiBadRequest('No available reviewers. Please try again later or manually assign a reviewer.', 'no_reviewers');
    }
    return apiServerError(assignError.message);
  }

  // Create checklist items from default template
  const { error: checklistError } = await supabase
    .rpc('create_review_checklist', {
      p_review_id: reviewId,
      p_template_id: null, // Use default template
    });

  if (checklistError) {
    console.error('Error creating checklist:', checklistError);
    // Don't fail the request, just log the error
  }

  // Fetch the created review with relations
  const { data: review, error: fetchError } = await supabase
    .from('cold_case_reviews')
    .select(`
      *,
      reviewer:profiles!cold_case_reviews_reviewer_id_fkey(
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('id', reviewId)
    .single();

  if (fetchError) {
    console.error('Error fetching created review:', fetchError);
    return apiServerError(fetchError.message);
  }

  return apiCreated(review);
}
