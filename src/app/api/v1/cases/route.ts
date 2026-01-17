import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateRequest, hasScope, meetsAccessLevel } from '@/lib/api/auth';
import { checkRateLimit, updateRateLimitCounters } from '@/lib/api/rate-limiter';
import { apiPaginated, apiUnauthorized, apiForbidden, apiRateLimited, apiServerError, withRateLimitHeaders, withCorsHeaders } from '@/lib/api/response';
import type { PublicCase } from '@/types';

/**
 * GET /api/v1/cases
 * Public API endpoint to list cases
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.isAuthenticated) {
      return withCorsHeaders(apiUnauthorized(auth.error, auth.errorCode));
    }

    // Check required scope
    if (!hasScope(auth, 'cases:read')) {
      return withCorsHeaders(apiForbidden('Insufficient permissions. Required scope: cases:read', 'insufficient_scope'));
    }

    // Check rate limits
    const rateLimit = await checkRateLimit(auth.applicationId!);
    if (!rateLimit.allowed) {
      return withCorsHeaders(withRateLimitHeaders(
        apiRateLimited(rateLimit.info.retry_after_seconds),
        rateLimit.headers
      ));
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('page_size') || '20'), 100);
    const status = searchParams.get('status');
    const province = searchParams.get('province');
    const priority = searchParams.get('priority');
    const isAmberAlert = searchParams.get('is_amber_alert');
    const since = searchParams.get('since'); // ISO date string
    const search = searchParams.get('search');

    // Determine what fields to select based on access level
    const isDetailedAccess = hasScope(auth, 'cases:read:detailed') || meetsAccessLevel(auth, 'partner');

    // Build base query
    let baseSelect = `
      id, case_number, first_name, last_name, age_at_disappearance, gender,
      last_seen_date, last_seen_city, last_seen_province, status, priority_level,
      is_amber_alert, primary_photo_url, created_at, updated_at
    `;

    if (isDetailedAccess) {
      baseSelect += `, height_cm, weight_kg, eye_color, hair_color, distinguishing_features,
        clothing_last_seen, circumstances, jurisdictions!inner (name)`;
    }

    let query = supabase
      .from('cases')
      .select(baseSelect, { count: 'exact' })
      .eq('is_public', true); // Only public cases for API

    // Apply filters based on access level
    if (!meetsAccessLevel(auth, 'law_enforcement')) {
      // Non-LE users can only see active cases
      query = query.eq('status', 'active');
    } else if (status) {
      query = query.eq('status', status);
    }

    if (province) {
      query = query.eq('last_seen_province', province);
    }

    if (priority) {
      query = query.eq('priority_level', priority);
    }

    if (isAmberAlert === 'true') {
      query = query.eq('is_amber_alert', true);
    }

    if (since) {
      query = query.gte('updated_at', since);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,case_number.ilike.%${search}%`);
    }

    // Pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    // Order by most recent
    query = query.order('updated_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Cases API error:', error);
      return withCorsHeaders(apiServerError('Failed to fetch cases'));
    }

    // Update rate limit counters
    await updateRateLimitCounters(auth.applicationId!);

    // Transform to public format (cast through unknown since Supabase has dynamic types)
    const records = (data || []) as unknown as Record<string, unknown>[];
    const cases: PublicCase[] = records.map(c => ({
      id: c.id as string,
      case_number: c.case_number as string,
      first_name: c.first_name as string,
      last_name: c.last_name as string,
      age_at_disappearance: c.age_at_disappearance as number | undefined,
      gender: c.gender as string | undefined,
      last_seen_date: c.last_seen_date as string,
      last_seen_city: c.last_seen_city as string | undefined,
      last_seen_province: c.last_seen_province as string | undefined,
      status: c.status as string,
      priority_level: c.priority_level as string,
      is_amber_alert: c.is_amber_alert as boolean,
      primary_photo_url: c.primary_photo_url as string | undefined,
      created_at: c.created_at as string,
      updated_at: c.updated_at as string,
    }));

    const response = apiPaginated(cases, count || 0, page, pageSize, rateLimit.headers);
    return withCorsHeaders(response);
  } catch (error) {
    console.error('Cases API error:', error);
    return withCorsHeaders(apiServerError('Internal server error'));
  }
}

/**
 * OPTIONS /api/v1/cases
 * CORS preflight
 */
export async function OPTIONS() {
  return withCorsHeaders(new NextResponse(null, { status: 204 }));
}
