/**
 * Cold Case Campaigns API
 * GET - List campaigns with filtering
 * POST - Create a new campaign
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
import type { CreateCampaignRequest } from '@/types/cold-case.types';

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
  const campaignType = url.searchParams.get('campaignType');
  const coldCaseProfileId = url.searchParams.get('coldCaseProfileId');
  const isAnniversary = url.searchParams.get('isAnniversaryCampaign');

  let query = supabase
    .from('cold_case_campaigns')
    .select(`
      *,
      cold_case_profile:cold_case_profiles(
        id,
        case_id,
        anniversary_date
      ),
      case:cases(
        id,
        case_number,
        first_name,
        last_name,
        primary_photo_url
      ),
      created_by_user:profiles!cold_case_campaigns_created_by_fkey(
        id,
        first_name,
        last_name
      ),
      approved_by_user:profiles!cold_case_campaigns_approved_by_fkey(
        id,
        first_name,
        last_name
      )
    `, { count: 'exact' });

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }
  if (campaignType) {
    query = query.eq('campaign_type', campaignType);
  }
  if (coldCaseProfileId) {
    query = query.eq('cold_case_profile_id', coldCaseProfileId);
  }
  if (isAnniversary !== null) {
    query = query.eq('is_anniversary_campaign', isAnniversary === 'true');
  }

  // Sort and paginate
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';

  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching campaigns:', error);
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

  const body = await request.json() as CreateCampaignRequest;

  // Validate required fields
  if (!body.coldCaseProfileId || !body.caseId || !body.campaignType || !body.campaignName) {
    return apiBadRequest('Missing required fields: coldCaseProfileId, caseId, campaignType, campaignName', 'missing_fields');
  }

  // Verify cold case profile exists
  const { data: coldCaseProfile } = await supabase
    .from('cold_case_profiles')
    .select('id, anniversary_date')
    .eq('id', body.coldCaseProfileId)
    .single();

  if (!coldCaseProfile) {
    return apiBadRequest('Cold case profile not found', 'profile_not_found');
  }

  // Calculate years since disappearance for anniversary campaigns
  let yearsSinceDisappearance: number | null = null;
  if (body.isAnniversaryCampaign && coldCaseProfile.anniversary_date) {
    const anniversaryDate = new Date(coldCaseProfile.anniversary_date);
    const now = new Date();
    yearsSinceDisappearance = now.getFullYear() - anniversaryDate.getFullYear();
  }

  // Create campaign
  const { data, error } = await supabase
    .from('cold_case_campaigns')
    .insert({
      cold_case_profile_id: body.coldCaseProfileId,
      case_id: body.caseId,
      campaign_type: body.campaignType,
      campaign_name: body.campaignName,
      campaign_description: body.campaignDescription || null,
      scheduled_start: body.scheduledStart || null,
      scheduled_end: body.scheduledEnd || null,
      is_anniversary_campaign: body.isAnniversaryCampaign || false,
      anniversary_year: body.isAnniversaryCampaign ? new Date().getFullYear() : null,
      years_since_disappearance: yearsSinceDisappearance,
      target_reach: body.targetReach || null,
      target_tips: body.targetTips || null,
      target_shares: body.targetShares || null,
      platforms: body.platforms || [],
      content_headline: body.contentHeadline || null,
      content_body: body.contentBody || null,
      content_media_urls: body.contentMediaUrls || [],
      content_hashtags: body.contentHashtags || [],
      budget_allocated: body.budgetAllocated || null,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating campaign:', error);
    return apiServerError(error.message);
  }

  return apiCreated(data);
}
