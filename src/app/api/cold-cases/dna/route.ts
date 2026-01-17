/**
 * Cold Case DNA Submissions API
 * GET - List DNA submissions with filtering
 * POST - Create a new DNA submission
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
import type { CreateDNASubmissionRequest } from '@/types/cold-case.types';

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
  const coldCaseProfileId = url.searchParams.get('coldCaseProfileId');
  const status = url.searchParams.get('status');
  const databaseName = url.searchParams.get('databaseName');
  const matchFound = url.searchParams.get('matchFound');

  let query = supabase
    .from('cold_case_dna_submissions')
    .select(`
      *,
      cold_case_profile:cold_case_profiles(
        id,
        case_id
      ),
      case:cases(
        id,
        case_number,
        first_name,
        last_name
      ),
      submitted_by_user:profiles!cold_case_dna_submissions_submitted_by_fkey(
        id,
        first_name,
        last_name
      )
    `, { count: 'exact' });

  // Apply filters
  if (coldCaseProfileId) {
    query = query.eq('cold_case_profile_id', coldCaseProfileId);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (databaseName) {
    query = query.eq('database_name', databaseName);
  }
  if (matchFound !== null) {
    query = query.eq('match_found', matchFound === 'true');
  }

  // Sort and paginate
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching DNA submissions:', error);
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

  const body = await request.json() as CreateDNASubmissionRequest;

  // Validate required fields
  if (!body.coldCaseProfileId || !body.caseId || !body.databaseName || !body.submissionType) {
    return apiBadRequest('Missing required fields', 'missing_fields');
  }

  // Verify cold case profile exists
  const { data: coldCaseProfile } = await supabase
    .from('cold_case_profiles')
    .select('id, dna_database_checked')
    .eq('id', body.coldCaseProfileId)
    .single();

  if (!coldCaseProfile) {
    return apiBadRequest('Cold case profile not found', 'profile_not_found');
  }

  // Create DNA submission
  const { data, error } = await supabase
    .from('cold_case_dna_submissions')
    .insert({
      cold_case_profile_id: body.coldCaseProfileId,
      case_id: body.caseId,
      database_name: body.databaseName,
      submission_type: body.submissionType,
      sample_type: body.sampleType || null,
      sample_quality: body.sampleQuality || null,
      sample_location: body.sampleLocation || null,
      status: 'pending_submission',
      match_found: false,
      follow_up_required: false,
      chain_of_custody_verified: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating DNA submission:', error);
    return apiServerError(error.message);
  }

  // Update cold case profile DNA status
  const updatedDatabases = [...(coldCaseProfile.dna_database_checked || [])];
  if (!updatedDatabases.includes(body.databaseName)) {
    updatedDatabases.push(body.databaseName);
  }

  await supabase
    .from('cold_case_profiles')
    .update({
      dna_submission_status: 'pending_submission',
      dna_database_checked: updatedDatabases,
    })
    .eq('id', body.coldCaseProfileId);

  return apiCreated(data);
}
