import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiCreated,
  apiBadRequest,
  apiUnauthorized,
  apiForbidden,
  apiServerError,
  apiPaginated,
  apiConflict,
} from '@/lib/api/response';
import { validateProfileUrl } from '@/lib/services/social-monitoring-service';
import type {
  CreateMonitoredAccountInput,
  MonitoredAccountQueryParams,
  SocialMediaPlatform,
  MonitoringStatus,
} from '@/types/social-monitoring.types';

const VALID_PLATFORMS: SocialMediaPlatform[] = [
  'facebook',
  'instagram',
  'twitter',
  'tiktok',
  'linkedin',
  'other',
];

const VALID_STATUSES: MonitoringStatus[] = ['active', 'paused', 'stopped', 'error'];

/**
 * Helper to check if user is verified LE
 */
async function isVerifiedLE(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', userId)
    .single();

  return !!(
    profile &&
    ['law_enforcement', 'admin', 'developer'].includes(profile.role) &&
    profile.is_verified === true
  );
}

/**
 * GET /api/social-monitoring/accounts
 * List monitored social media accounts.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const params: MonitoredAccountQueryParams = {
      case_id: searchParams.get('case_id') || undefined,
      platform: (searchParams.get('platform') as SocialMediaPlatform) || undefined,
      status: (searchParams.get('status') as MonitoringStatus) || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      page_size: parseInt(searchParams.get('page_size') || '20', 10),
    };

    // Validate pagination
    if (params.page! < 1) params.page = 1;
    if (params.page_size! < 1 || params.page_size! > 100) params.page_size = 20;

    // Validate platform if provided
    if (params.platform && !VALID_PLATFORMS.includes(params.platform)) {
      return apiBadRequest('Invalid platform', 'invalid_platform');
    }

    // Validate status if provided
    if (params.status && !VALID_STATUSES.includes(params.status)) {
      return apiBadRequest('Invalid status', 'invalid_status');
    }

    // Build query - RLS will handle access control
    let query = supabase
      .from('social_media_monitored_accounts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (params.case_id) {
      query = query.eq('case_id', params.case_id);
    }
    if (params.platform) {
      query = query.eq('platform', params.platform);
    }
    if (params.status) {
      query = query.eq('monitoring_status', params.status);
    }

    // Apply pagination
    const offset = (params.page! - 1) * params.page_size!;
    query = query.range(offset, offset + params.page_size! - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch monitored accounts:', error);
      return apiServerError('Failed to fetch monitored accounts');
    }

    return apiPaginated(data || [], count || 0, params.page!, params.page_size!);
  } catch (error) {
    console.error('Social monitoring accounts API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/social-monitoring/accounts
 * Start monitoring a social media account.
 * Requires: verified LE role.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Verify LE role
    if (!(await isVerifiedLE(supabase, user.id))) {
      return apiForbidden('Verified law enforcement role required');
    }

    // Parse request body
    const body: CreateMonitoredAccountInput = await request.json();

    // Validate required fields
    if (!body.case_id) {
      return apiBadRequest('case_id is required', 'missing_case_id');
    }

    if (!body.platform) {
      return apiBadRequest('platform is required', 'missing_platform');
    }

    if (!VALID_PLATFORMS.includes(body.platform)) {
      return apiBadRequest('Invalid platform', 'invalid_platform');
    }

    if (!body.username || body.username.trim().length === 0) {
      return apiBadRequest('username is required', 'missing_username');
    }

    // Validate profile URL if provided
    if (body.profile_url) {
      const urlValidation = validateProfileUrl(body.platform, body.profile_url);
      if (!urlValidation.valid) {
        return apiBadRequest(urlValidation.error || 'Invalid profile URL', 'invalid_profile_url');
      }
    }

    // Verify case exists
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', body.case_id)
      .single();

    if (caseError || !caseData) {
      return apiBadRequest('Case not found', 'case_not_found');
    }

    // Check if already monitoring this account for this case
    const { data: existing } = await supabase
      .from('social_media_monitored_accounts')
      .select('id, monitoring_status')
      .eq('case_id', body.case_id)
      .eq('platform', body.platform)
      .eq('username', body.username.trim())
      .single();

    if (existing) {
      if (existing.monitoring_status === 'active') {
        return apiConflict('This account is already being monitored for this case');
      }

      // Reactivate stopped monitoring
      const { data: reactivated, error: reactivateError } = await supabase
        .from('social_media_monitored_accounts')
        .update({
          monitoring_status: 'active',
          monitoring_stopped_at: null,
          stopped_by: null,
          last_error_at: null,
          last_error_message: null,
          consecutive_errors: 0,
          notes: body.notes || null,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (reactivateError) {
        console.error('Failed to reactivate monitoring:', reactivateError);
        return apiServerError('Failed to reactivate monitoring');
      }

      return apiSuccess(reactivated, { reactivated: true });
    }

    // Create new monitoring record
    const { data: record, error: createError } = await supabase
      .from('social_media_monitored_accounts')
      .insert({
        case_id: body.case_id,
        platform: body.platform,
        username: body.username.trim(),
        profile_url: body.profile_url || null,
        display_name: body.display_name || null,
        notes: body.notes || null,
        monitoring_status: 'active',
        monitoring_started_at: new Date().toISOString(),
        started_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create monitoring record:', createError);
      return apiServerError('Failed to start monitoring');
    }

    return apiCreated(record);
  } catch (error) {
    console.error('Social monitoring accounts API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * DELETE /api/social-monitoring/accounts?account_id=...
 * Stop monitoring a social media account.
 * Requires: verified LE role.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Verify LE role
    if (!(await isVerifiedLE(supabase, user.id))) {
      return apiForbidden('Verified law enforcement role required');
    }

    // Get account_id from query params
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');

    if (!accountId) {
      return apiBadRequest('account_id is required', 'missing_account_id');
    }

    // Verify account exists and get current status
    const { data: account, error: fetchError } = await supabase
      .from('social_media_monitored_accounts')
      .select('id, monitoring_status')
      .eq('id', accountId)
      .single();

    if (fetchError || !account) {
      return apiBadRequest('Monitored account not found', 'account_not_found');
    }

    if (account.monitoring_status === 'stopped') {
      return apiBadRequest('Monitoring is already stopped', 'already_stopped');
    }

    // Update to stopped
    const { data: updated, error: updateError } = await supabase
      .from('social_media_monitored_accounts')
      .update({
        monitoring_status: 'stopped',
        monitoring_stopped_at: new Date().toISOString(),
        stopped_by: user.id,
        webhook_active: false,
      })
      .eq('id', accountId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to stop monitoring:', updateError);
      return apiServerError('Failed to stop monitoring');
    }

    return apiSuccess(updated, { message: 'Monitoring stopped' });
  } catch (error) {
    console.error('Social monitoring accounts API error:', error);
    return apiServerError('Internal server error');
  }
}
