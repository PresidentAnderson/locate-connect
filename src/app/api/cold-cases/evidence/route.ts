/**
 * Cold Case New Evidence API
 * GET - List new evidence with filtering
 * POST - Flag new evidence for a cold case
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
import type { CreateNewEvidenceRequest } from '@/types/cold-case.types';

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
  const caseId = url.searchParams.get('caseId');
  const processed = url.searchParams.get('processed');
  const significanceLevel = url.searchParams.get('significanceLevel');
  const evidenceType = url.searchParams.get('evidenceType');

  let query = supabase
    .from('cold_case_new_evidence')
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
      discovered_by_user:profiles!cold_case_new_evidence_discovered_by_fkey(
        id,
        first_name,
        last_name
      ),
      verified_by_user:profiles!cold_case_new_evidence_verified_by_fkey(
        id,
        first_name,
        last_name
      )
    `, { count: 'exact' });

  // Apply filters
  if (coldCaseProfileId) {
    query = query.eq('cold_case_profile_id', coldCaseProfileId);
  }
  if (caseId) {
    query = query.eq('case_id', caseId);
  }
  if (processed !== null) {
    query = query.eq('processed', processed === 'true');
  }
  if (significanceLevel) {
    query = query.eq('significance_level', significanceLevel);
  }
  if (evidenceType) {
    query = query.eq('evidence_type', evidenceType);
  }

  // Sort and paginate
  query = query
    .order('significance_level', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching evidence:', error);
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

  const body = await request.json() as CreateNewEvidenceRequest;

  // Validate required fields
  if (!body.coldCaseProfileId || !body.caseId || !body.evidenceType || !body.evidenceSource || !body.evidenceDescription) {
    return apiBadRequest('Missing required fields', 'missing_fields');
  }

  // Verify cold case profile exists
  const { data: coldCaseProfile } = await supabase
    .from('cold_case_profiles')
    .select('id')
    .eq('id', body.coldCaseProfileId)
    .single();

  if (!coldCaseProfile) {
    return apiBadRequest('Cold case profile not found', 'profile_not_found');
  }

  // Create evidence record
  const { data, error } = await supabase
    .from('cold_case_new_evidence')
    .insert({
      cold_case_profile_id: body.coldCaseProfileId,
      case_id: body.caseId,
      evidence_type: body.evidenceType,
      evidence_source: body.evidenceSource,
      evidence_description: body.evidenceDescription,
      discovery_context: body.discoveryContext || null,
      significance_level: body.significanceLevel || 'medium',
      potential_impact: body.potentialImpact || null,
      documentation_urls: body.documentationUrls || [],
      chain_of_custody: body.chainOfCustody || null,
      discovered_by: user.id,
      verification_status: 'unverified',
      processed: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating evidence:', error);
    return apiServerError(error.message);
  }

  // If high/critical significance, update cold case profile revival priority
  if (['high', 'critical'].includes(body.significanceLevel || 'medium')) {
    await supabase.rpc('calculate_revival_priority', {
      profile_id: body.coldCaseProfileId,
    });
  }

  return apiCreated(data);
}
