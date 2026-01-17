/**
 * Cold Case Pattern Matches API
 * GET - List pattern matches with filtering
 * POST - Review a pattern match
 */

import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiPaginated,
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
  apiNotFound,
  apiServerError,
} from '@/lib/api/response';
import type { ReviewPatternMatchRequest } from '@/types/cold-case.types';

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
  const sourceCaseId = url.searchParams.get('sourceCaseId');
  const matchedCaseId = url.searchParams.get('matchedCaseId');
  const confidenceLevel = url.searchParams.get('confidenceLevel');
  const reviewed = url.searchParams.get('reviewed');
  const matchType = url.searchParams.get('matchType');

  let query = supabase
    .from('cold_case_pattern_matches')
    .select(`
      *,
      source_case:cases!cold_case_pattern_matches_source_case_id_fkey(
        id,
        case_number,
        first_name,
        last_name,
        last_seen_date,
        last_seen_city,
        last_seen_province,
        status,
        is_minor,
        is_indigenous,
        primary_photo_url
      ),
      matched_case:cases!cold_case_pattern_matches_matched_case_id_fkey(
        id,
        case_number,
        first_name,
        last_name,
        last_seen_date,
        last_seen_city,
        last_seen_province,
        status,
        is_minor,
        is_indigenous,
        primary_photo_url
      ),
      reviewed_by_user:profiles!cold_case_pattern_matches_reviewed_by_fkey(
        id,
        first_name,
        last_name
      )
    `, { count: 'exact' });

  // Apply filters
  if (sourceCaseId) {
    query = query.eq('source_case_id', sourceCaseId);
  }
  if (matchedCaseId) {
    query = query.eq('matched_case_id', matchedCaseId);
  }
  if (confidenceLevel) {
    query = query.eq('confidence_level', confidenceLevel);
  }
  if (reviewed !== null) {
    query = query.eq('reviewed', reviewed === 'true');
  }
  if (matchType) {
    query = query.eq('match_type', matchType);
  }

  // Sort and paginate
  query = query
    .order('confidence_score', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching pattern matches:', error);
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

  const body = await request.json() as ReviewPatternMatchRequest;

  // Validate required fields
  if (!body.patternMatchId || !body.determination) {
    return apiBadRequest('Missing required fields: patternMatchId, determination', 'missing_fields');
  }

  if (!['confirmed', 'possible', 'rejected'].includes(body.determination)) {
    return apiBadRequest('Invalid determination. Must be: confirmed, possible, or rejected', 'invalid_determination');
  }

  // Get the pattern match
  const { data: patternMatch, error: matchError } = await supabase
    .from('cold_case_pattern_matches')
    .select('id, source_case_id, reviewed')
    .eq('id', body.patternMatchId)
    .single();

  if (matchError || !patternMatch) {
    return apiNotFound('Pattern match not found');
  }

  if (patternMatch.reviewed) {
    return apiBadRequest('Pattern match has already been reviewed', 'already_reviewed');
  }

  // Update the pattern match
  const updateData: Record<string, unknown> = {
    reviewed: true,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    review_determination: body.determination,
    review_notes: body.notes || null,
    investigation_opened: body.openInvestigation || false,
    investigation_notes: body.investigationNotes || null,
  };

  const { data, error } = await supabase
    .from('cold_case_pattern_matches')
    .update(updateData)
    .eq('id', body.patternMatchId)
    .select()
    .single();

  if (error) {
    console.error('Error updating pattern match:', error);
    return apiServerError(error.message);
  }

  // If confirmed or possible, update cold case profile linked cases
  if (['confirmed', 'possible'].includes(body.determination)) {
    const { data: coldCaseProfile } = await supabase
      .from('cold_case_profiles')
      .select('id, potentially_linked_cases')
      .eq('case_id', patternMatch.source_case_id)
      .single();

    if (coldCaseProfile) {
      const linkedCases = coldCaseProfile.potentially_linked_cases || [];
      const matchedCaseId = data.matched_case_id;

      if (!linkedCases.includes(matchedCaseId)) {
        await supabase
          .from('cold_case_profiles')
          .update({
            potentially_linked_cases: [...linkedCases, matchedCaseId],
          })
          .eq('id', coldCaseProfile.id);
      }
    }
  }

  return apiSuccess(data);
}
