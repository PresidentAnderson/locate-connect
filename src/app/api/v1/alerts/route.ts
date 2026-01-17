import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateRequest, hasScope } from '@/lib/api/auth';
import { checkRateLimit, updateRateLimitCounters } from '@/lib/api/rate-limiter';
import { apiPaginated, apiUnauthorized, apiForbidden, apiRateLimited, apiServerError, withRateLimitHeaders, withCorsHeaders } from '@/lib/api/response';

/**
 * GET /api/v1/alerts
 * Public API endpoint to list active alerts (AMBER, Silver, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.isAuthenticated) {
      return withCorsHeaders(apiUnauthorized(auth.error, auth.errorCode));
    }

    // Check required scope
    if (!hasScope(auth, 'alerts:read')) {
      return withCorsHeaders(apiForbidden('Insufficient permissions. Required scope: alerts:read', 'insufficient_scope'));
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
    const alertType = searchParams.get('type'); // 'amber', 'silver', etc.
    const province = searchParams.get('province');
    const active = searchParams.get('active') !== 'false';

    // Query active alert cases
    let query = supabase
      .from('cases')
      .select(`
        id, case_number, first_name, last_name, age_at_disappearance, gender,
        last_seen_date, last_seen_city, last_seen_province, priority_level,
        is_amber_alert, primary_photo_url, circumstances, created_at, updated_at
      `, { count: 'exact' })
      .eq('is_public', true)
      .eq('is_amber_alert', true); // For now, using is_amber_alert for all alert types

    if (active) {
      query = query.eq('status', 'active');
    }

    if (province) {
      query = query.eq('last_seen_province', province);
    }

    // Pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    // Order by most recent (alerts should be time-sensitive)
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Alerts API error:', error);
      return withCorsHeaders(apiServerError('Failed to fetch alerts'));
    }

    // Update rate limit counters
    await updateRateLimitCounters(auth.applicationId!);

    // Transform to alert format
    const alerts = (data || []).map(c => ({
      id: c.id,
      case_number: c.case_number,
      alert_type: c.is_amber_alert ? 'amber' : 'standard', // Extend for silver, etc.
      person: {
        first_name: c.first_name,
        last_name: c.last_name,
        age: c.age_at_disappearance,
        gender: c.gender,
        photo_url: c.primary_photo_url,
      },
      last_seen: {
        date: c.last_seen_date,
        city: c.last_seen_city,
        province: c.last_seen_province,
      },
      circumstances: c.circumstances,
      priority: c.priority_level,
      issued_at: c.created_at,
      updated_at: c.updated_at,
    }));

    const response = apiPaginated(alerts, count || 0, page, pageSize, rateLimit.headers);
    return withCorsHeaders(response);
  } catch (error) {
    console.error('Alerts API error:', error);
    return withCorsHeaders(apiServerError('Internal server error'));
  }
}

/**
 * OPTIONS /api/v1/alerts
 * CORS preflight
 */
export async function OPTIONS() {
  return withCorsHeaders(new NextResponse(null, { status: 204 }));
}
