import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiUnauthorized,
  apiBadRequest,
  apiServerError,
  apiPaginated,
} from '@/lib/api/response';
import type {
  ActivityQueryParams,
  SocialMediaPlatform,
  SocialActivityType,
} from '@/types/social-monitoring.types';

const VALID_PLATFORMS: SocialMediaPlatform[] = [
  'facebook',
  'instagram',
  'twitter',
  'tiktok',
  'linkedin',
  'other',
];

const VALID_ACTIVITY_TYPES: SocialActivityType[] = [
  'post',
  'story',
  'comment',
  'like',
  'share',
  'login',
  'location_tag',
  'profile_update',
  'friend_added',
  'group_joined',
  'event_rsvp',
  'live_video',
  'reel',
  'other',
];

/**
 * GET /api/social-monitoring/activity
 * Get activity feed for monitored accounts.
 * Returns activity events with associated account information.
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
    const params: ActivityQueryParams = {
      case_id: searchParams.get('case_id') || undefined,
      account_id: searchParams.get('account_id') || undefined,
      platform: (searchParams.get('platform') as SocialMediaPlatform) || undefined,
      activity_type: (searchParams.get('activity_type') as SocialActivityType) || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      has_location: searchParams.get('has_location') === 'true' ? true : undefined,
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

    // Validate activity_type if provided
    if (params.activity_type && !VALID_ACTIVITY_TYPES.includes(params.activity_type)) {
      return apiBadRequest('Invalid activity type', 'invalid_activity_type');
    }

    // Build query with account join - RLS will handle access control
    let query = supabase
      .from('social_media_activity_events')
      .select(
        `
        *,
        account:social_media_monitored_accounts!monitored_account_id (
          platform,
          username,
          display_name,
          profile_url
        )
      `,
        { count: 'exact' }
      )
      .order('activity_timestamp', { ascending: false });

    // Apply filters
    if (params.case_id) {
      query = query.eq('case_id', params.case_id);
    }
    if (params.account_id) {
      query = query.eq('monitored_account_id', params.account_id);
    }
    if (params.activity_type) {
      query = query.eq('activity_type', params.activity_type);
    }
    if (params.start_date) {
      query = query.gte('activity_timestamp', params.start_date);
    }
    if (params.end_date) {
      query = query.lte('activity_timestamp', params.end_date);
    }
    if (params.has_location === true) {
      query = query.not('location_latitude', 'is', null);
    }

    // Filter by platform requires join
    if (params.platform) {
      // Get account IDs for this platform first
      const { data: accounts } = await supabase
        .from('social_media_monitored_accounts')
        .select('id')
        .eq('platform', params.platform);

      if (accounts && accounts.length > 0) {
        const accountIds = accounts.map((a) => a.id);
        query = query.in('monitored_account_id', accountIds);
      } else {
        // No accounts for this platform, return empty result
        return apiPaginated([], 0, params.page!, params.page_size!);
      }
    }

    // Apply pagination
    const offset = (params.page! - 1) * params.page_size!;
    query = query.range(offset, offset + params.page_size! - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch activity events:', error);
      return apiServerError('Failed to fetch activity events');
    }

    return apiPaginated(data || [], count || 0, params.page!, params.page_size!);
  } catch (error) {
    console.error('Social monitoring activity API error:', error);
    return apiServerError('Internal server error');
  }
}
