import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiUnauthorized,
  apiForbidden,
  apiServerError,
} from '@/lib/api/response';
import type { EmailTrackingAnalytics, EmailTrackingQueryParams } from '@/types/email-tracking.types';

/**
 * GET /api/email/tracking
 * Returns email tracking analytics for a case.
 * Requires: case owner or LE role.
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
    const params: EmailTrackingQueryParams = {
      case_id: searchParams.get('case_id') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      page_size: parseInt(searchParams.get('page_size') || '20', 10),
    };

    // Validate pagination
    if (params.page! < 1) params.page = 1;
    if (params.page_size! < 1 || params.page_size! > 100) params.page_size = 20;

    // case_id is required
    if (!params.case_id) {
      return apiBadRequest('case_id is required', 'missing_case_id');
    }

    // Get user profile for role check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_verified')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return apiServerError('Failed to fetch user profile');
    }

    const isLE =
      ['law_enforcement', 'admin', 'developer'].includes(profile.role) &&
      profile.is_verified;

    // Verify case exists and user has access
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, reporter_id')
      .eq('id', params.case_id)
      .single();

    if (caseError || !caseData) {
      return apiBadRequest('Case not found', 'case_not_found');
    }

    // Check authorization: must be case owner or LE
    const isCaseOwner = caseData.reporter_id === user.id;
    if (!isCaseOwner && !isLE) {
      return apiForbidden('You do not have permission to view tracking data for this case');
    }

    // Build query
    let query = supabase
      .from('email_tracking')
      .select('*', { count: 'exact' })
      .eq('case_id', params.case_id)
      .order('sent_at', { ascending: false });

    // Apply date filters
    if (params.start_date) {
      query = query.gte('sent_at', params.start_date);
    }
    if (params.end_date) {
      query = query.lte('sent_at', params.end_date);
    }

    // Apply pagination
    const offset = (params.page! - 1) * params.page_size!;
    query = query.range(offset, offset + params.page_size! - 1);

    const { data: records, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Failed to fetch email tracking records:', fetchError);
      return apiServerError('Failed to fetch email tracking records');
    }

    // Calculate analytics
    const totalSent = count || 0;
    const totalOpened = records?.filter((r) => r.opened_at !== null).length || 0;
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;

    const analytics: EmailTrackingAnalytics = {
      total_sent: totalSent,
      total_opened: totalOpened,
      open_rate: Math.round(openRate * 100) / 100, // Round to 2 decimal places
      records: records || [],
    };

    return apiSuccess(analytics, {
      total: count || 0,
      page: params.page,
      page_size: params.page_size,
      total_pages: Math.ceil((count || 0) / params.page_size!),
    });
  } catch (error) {
    console.error('Email tracking API error:', error);
    return apiServerError('Internal server error');
  }
}
