/**
 * Cold Case Reviewers API
 * GET - List reviewers with stats
 * POST - Register a new reviewer
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

interface CreateReviewerRequest {
  reviewerId: string;
  specializations?: string[];
  maxConcurrentReviews?: number;
  preferredCaseTypes?: string[];
  excludedJurisdictions?: string[];
}

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
  const isActive = url.searchParams.get('isActive');
  const available = url.searchParams.get('available');

  let query = supabase
    .from('cold_case_reviewers')
    .select(`
      *,
      reviewer:profiles!cold_case_reviewers_reviewer_id_fkey(
        id,
        first_name,
        last_name,
        email,
        organization,
        role
      )
    `, { count: 'exact' });

  // Apply filters
  if (isActive !== null) {
    query = query.eq('is_active', isActive === 'true');
  }
  if (available === 'true') {
    query = query
      .eq('is_active', true)
      .or(`next_available_date.is.null,next_available_date.lte.${new Date().toISOString().split('T')[0]}`);
  }

  // Sort and paginate
  query = query
    .order('rotation_priority', { ascending: true })
    .order('last_assignment_date', { ascending: true })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching reviewers:', error);
    return apiServerError(error.message);
  }

  // Calculate additional stats
  const reviewersWithStats = data?.map(reviewer => ({
    ...reviewer,
    availableSlots: Math.max(0, (reviewer.max_concurrent_reviews || 5) - (reviewer.current_assignments || 0)),
  }));

  return apiPaginated(reviewersWithStats || [], count || 0, page, pageSize);
}

export async function POST(request: Request) {
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

  const body = await request.json() as CreateReviewerRequest;

  if (!body.reviewerId) {
    return apiBadRequest('Reviewer ID is required', 'missing_reviewer_id');
  }

  // Verify the profile exists and is LE
  const { data: reviewerProfile } = await supabase
    .from('profiles')
    .select('id, role, is_verified')
    .eq('id', body.reviewerId)
    .single();

  if (!reviewerProfile) {
    return apiBadRequest('Reviewer profile not found', 'profile_not_found');
  }

  if (!['law_enforcement', 'admin', 'developer'].includes(reviewerProfile.role)) {
    return apiBadRequest('Reviewer must have law enforcement or admin role', 'invalid_role');
  }

  if (!reviewerProfile.is_verified) {
    return apiBadRequest('Reviewer must be verified', 'not_verified');
  }

  // Check if already a reviewer
  const { data: existingReviewer } = await supabase
    .from('cold_case_reviewers')
    .select('id')
    .eq('reviewer_id', body.reviewerId)
    .single();

  if (existingReviewer) {
    return apiBadRequest('User is already registered as a reviewer', 'already_registered');
  }

  // Create reviewer record
  const { data, error } = await supabase
    .from('cold_case_reviewers')
    .insert({
      reviewer_id: body.reviewerId,
      is_active: true,
      specializations: body.specializations || [],
      max_concurrent_reviews: body.maxConcurrentReviews || 5,
      current_assignments: 0,
      total_reviews_completed: 0,
      total_revivals_achieved: 0,
      rotation_priority: 0,
      preferred_case_types: body.preferredCaseTypes || [],
      excluded_jurisdictions: body.excludedJurisdictions || [],
    })
    .select(`
      *,
      reviewer:profiles!cold_case_reviewers_reviewer_id_fkey(
        id,
        first_name,
        last_name,
        email
      )
    `)
    .single();

  if (error) {
    console.error('Error creating reviewer:', error);
    return apiServerError(error.message);
  }

  return apiCreated(data);
}
