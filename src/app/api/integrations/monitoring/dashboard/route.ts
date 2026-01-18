import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiServerError,
  apiForbidden,
} from '@/lib/api/response';

/**
 * GET /api/integrations/monitoring/dashboard
 * Get integration monitoring dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['coordinator', 'investigator', 'admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Insufficient permissions');
    }

    // Get integration counts by status
    const { data: integrations } = await supabase
      .from('integrations')
      .select('id, status, health_status, category');

    const totalIntegrations = integrations?.length || 0;
    const activeIntegrations = integrations?.filter(i => i.status === 'active').length || 0;
    const healthyIntegrations = integrations?.filter(i => i.health_status === 'healthy').length || 0;
    const degradedIntegrations = integrations?.filter(i => i.health_status === 'degraded').length || 0;
    const unhealthyIntegrations = integrations?.filter(i => i.health_status === 'unhealthy').length || 0;

    // Get today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayMetrics } = await supabase
      .from('integration_metrics')
      .select('total_requests, successful_requests, failed_requests, avg_response_time_ms')
      .gte('period_start', today.toISOString());

    let totalRequestsToday = 0;
    let successfulRequestsToday = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    if (todayMetrics) {
      for (const metric of todayMetrics) {
        totalRequestsToday += metric.total_requests || 0;
        successfulRequestsToday += metric.successful_requests || 0;
        if (metric.avg_response_time_ms) {
          totalResponseTime += metric.avg_response_time_ms;
          responseTimeCount++;
        }
      }
    }

    const successRateToday = totalRequestsToday > 0
      ? (successfulRequestsToday / totalRequestsToday) * 100
      : 100;
    const avgResponseTimeMs = responseTimeCount > 0
      ? Math.round(totalResponseTime / responseTimeCount)
      : 0;

    // Get active alerts
    const { data: alerts, count: alertCount } = await supabase
      .from('integration_alerts')
      .select('id, severity', { count: 'exact' })
      .eq('status', 'active');

    const activeAlerts = alertCount || 0;
    const criticalAlerts = alerts?.filter(a => a.severity === 'critical').length || 0;

    // Get integration status cards
    const { data: statusCards } = await supabase
      .from('integrations')
      .select(`
        id,
        name,
        category,
        status,
        health_status,
        avg_response_time_ms,
        last_sync_at,
        integration_connectors (
          total_requests,
          successful_requests
        )
      `)
      .eq('status', 'active')
      .order('name')
      .limit(10);

    const integrationCards = statusCards?.map(int => {
      const connector = int.integration_connectors?.[0];
      const totalReqs = connector?.total_requests || 0;
      const successReqs = connector?.successful_requests || 0;
      const successRate = totalReqs > 0 ? (successReqs / totalReqs) * 100 : 100;

      return {
        integrationId: int.id,
        name: int.name,
        category: int.category,
        status: int.status,
        health: {
          status: int.health_status || 'unknown',
          avgResponseTime: int.avg_response_time_ms || 0,
        },
        requestsLast24h: totalReqs,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTimeMs: int.avg_response_time_ms || 0,
        lastSync: int.last_sync_at,
      };
    }) || [];

    // Get recent alerts
    const { data: recentAlerts } = await supabase
      .from('integration_alerts')
      .select(`
        id,
        integration_id,
        type,
        severity,
        title,
        message,
        status,
        created_at,
        integrations (name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get category breakdown
    const categoryBreakdown: Record<string, number> = {};
    if (integrations) {
      for (const int of integrations) {
        categoryBreakdown[int.category] = (categoryBreakdown[int.category] || 0) + 1;
      }
    }

    return apiSuccess({
      summary: {
        totalIntegrations,
        activeIntegrations,
        healthyIntegrations,
        degradedIntegrations,
        unhealthyIntegrations,
        totalRequestsToday,
        successRateToday: Math.round(successRateToday * 100) / 100,
        avgResponseTimeMs,
        activeAlerts,
        criticalAlerts,
        lastUpdated: new Date().toISOString(),
      },
      integrations: integrationCards,
      recentAlerts: recentAlerts?.map(a => ({
        id: a.id,
        integrationId: a.integration_id,
        integrationName: (a.integrations as any)?.name,
        type: a.type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        status: a.status,
        createdAt: a.created_at,
      })) || [],
      categoryBreakdown,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return apiServerError('Internal server error');
  }
}
