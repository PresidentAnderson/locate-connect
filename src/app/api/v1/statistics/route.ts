import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateRequest, hasScope, meetsAccessLevel } from '@/lib/api/auth';
import { checkRateLimit, updateRateLimitCounters } from '@/lib/api/rate-limiter';
import { apiSuccess, apiUnauthorized, apiForbidden, apiRateLimited, apiServerError, withRateLimitHeaders, withCorsHeaders } from '@/lib/api/response';

/**
 * GET /api/v1/statistics
 * Public API endpoint for anonymized case statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.isAuthenticated) {
      return withCorsHeaders(apiUnauthorized(auth.error, auth.errorCode));
    }

    // Check required scope
    if (!hasScope(auth, 'statistics:read')) {
      return withCorsHeaders(apiForbidden('Insufficient permissions. Required scope: statistics:read', 'insufficient_scope'));
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

    // Parse filters
    const province = searchParams.get('province');
    const year = searchParams.get('year');
    const detailed = hasScope(auth, 'statistics:read:detailed') || meetsAccessLevel(auth, 'partner');

    // Build base query for counting
    let baseFilter = supabase
      .from('cases')
      .select('id, status, priority_level, disposition, is_indigenous, is_minor, is_amber_alert, last_seen_province, created_at');

    if (province) {
      baseFilter = baseFilter.eq('last_seen_province', province);
    }

    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      baseFilter = baseFilter.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data: cases, error } = await baseFilter;

    if (error) {
      console.error('Statistics API error:', error);
      return withCorsHeaders(apiServerError('Failed to fetch statistics'));
    }

    // Calculate statistics
    const totalCases = cases?.length || 0;
    const activeCases = cases?.filter(c => c.status === 'active').length || 0;
    const resolvedCases = cases?.filter(c => c.status === 'resolved').length || 0;
    const closedCases = cases?.filter(c => c.status === 'closed').length || 0;
    const coldCases = cases?.filter(c => c.status === 'cold').length || 0;

    // Priority distribution
    const byPriority = {
      p0_critical: cases?.filter(c => c.priority_level === 'p0_critical').length || 0,
      p1_high: cases?.filter(c => c.priority_level === 'p1_high').length || 0,
      p2_medium: cases?.filter(c => c.priority_level === 'p2_medium').length || 0,
      p3_low: cases?.filter(c => c.priority_level === 'p3_low').length || 0,
      p4_routine: cases?.filter(c => c.priority_level === 'p4_routine').length || 0,
    };

    // Basic statistics (public)
    const statistics: Record<string, unknown> = {
      overview: {
        total_cases: totalCases,
        active_cases: activeCases,
        resolved_cases: resolvedCases,
        closed_cases: closedCases,
        cold_cases: coldCases,
        resolution_rate: totalCases > 0 ? Math.round((resolvedCases / totalCases) * 100) : 0,
      },
      by_priority: byPriority,
      amber_alerts: {
        total: cases?.filter(c => c.is_amber_alert).length || 0,
        active: cases?.filter(c => c.is_amber_alert && c.status === 'active').length || 0,
      },
    };

    // Detailed statistics (partner/LE only)
    if (detailed) {
      // Disposition breakdown
      const dispositions = cases?.filter(c => c.disposition);
      const dispositionCounts: Record<string, number> = {};
      dispositions?.forEach(c => {
        if (c.disposition) {
          dispositionCounts[c.disposition] = (dispositionCounts[c.disposition] || 0) + 1;
        }
      });

      // Province distribution
      const provinceCounts: Record<string, number> = {};
      cases?.forEach(c => {
        if (c.last_seen_province) {
          provinceCounts[c.last_seen_province] = (provinceCounts[c.last_seen_province] || 0) + 1;
        }
      });

      // Demographics
      const demographics = {
        minors: cases?.filter(c => c.is_minor).length || 0,
        indigenous: cases?.filter(c => c.is_indigenous).length || 0,
      };

      // Monthly trend (last 12 months)
      const now = new Date();
      const monthlyTrend: { month: string; cases: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = date.toISOString().substring(0, 7); // YYYY-MM
        const count = cases?.filter(c => c.created_at.startsWith(monthStart)).length || 0;
        monthlyTrend.push({
          month: monthStart,
          cases: count,
        });
      }

      statistics.by_disposition = dispositionCounts;
      statistics.by_province = provinceCounts;
      statistics.demographics = demographics;
      statistics.monthly_trend = monthlyTrend;
    }

    // Update rate limit counters
    await updateRateLimitCounters(auth.applicationId!);

    const response = apiSuccess(statistics, {
      generated_at: new Date().toISOString(),
      filters: {
        province: province || 'all',
        year: year || 'all',
      },
      access_level: detailed ? 'detailed' : 'public',
    }, rateLimit.headers);

    return withCorsHeaders(response);
  } catch (error) {
    console.error('Statistics API error:', error);
    return withCorsHeaders(apiServerError('Internal server error'));
  }
}

/**
 * OPTIONS /api/v1/statistics
 * CORS preflight
 */
export async function OPTIONS() {
  return withCorsHeaders(new NextResponse(null, { status: 204 }));
}
