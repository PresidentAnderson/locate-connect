import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiServerError,
  apiNotFound,
} from '@/lib/api/response';

/**
 * GET /api/integrations/[id]/health
 * Get health status and history for an integration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id, name, health_status, last_health_check, avg_response_time_ms, error_rate, uptime_percentage')
      .eq('id', id)
      .single();

    if (integrationError || !integration) {
      return apiNotFound('Integration not found');
    }

    // Get health history
    const { data: healthHistory } = await supabase
      .from('integration_health')
      .select('status, response_time_ms, message, checked_at')
      .eq('integration_id', id)
      .order('checked_at', { ascending: false })
      .limit(50);

    // Get connector metrics
    const { data: connector } = await supabase
      .from('integration_connectors')
      .select('state, circuit_breaker_state, total_requests, successful_requests, failed_requests')
      .eq('integration_id', id)
      .single();

    return apiSuccess({
      current: {
        status: integration.health_status,
        lastCheck: integration.last_health_check,
        avgResponseTimeMs: integration.avg_response_time_ms,
        errorRate: integration.error_rate,
        uptimePercentage: integration.uptime_percentage,
      },
      connector: connector
        ? {
            state: connector.state,
            circuitBreakerState: connector.circuit_breaker_state,
            totalRequests: connector.total_requests,
            successfulRequests: connector.successful_requests,
            failedRequests: connector.failed_requests,
            successRate:
              connector.total_requests > 0
                ? (connector.successful_requests / connector.total_requests) * 100
                : 100,
          }
        : null,
      history: healthHistory || [],
    });
  } catch (error) {
    console.error('Health API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/integrations/[id]/health
 * Trigger a health check for an integration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Get integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id, name, base_url, health_check_url')
      .eq('id', id)
      .single();

    if (integrationError || !integration) {
      return apiNotFound('Integration not found');
    }

    // Perform health check
    const healthCheckUrl = integration.health_check_url || integration.base_url;
    const startTime = Date.now();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
    let message: string | null = null;

    try {
      const response = await fetch(healthCheckUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      });

      const responseTimeMs = Date.now() - startTime;

      if (response.ok) {
        status = responseTimeMs < 500 ? 'healthy' : 'degraded';
      } else if (response.status < 500) {
        status = 'degraded';
        message = `HTTP ${response.status}`;
      } else {
        status = 'unhealthy';
        message = `HTTP ${response.status}`;
      }

      // Record health check
      await supabase.from('integration_health').insert({
        integration_id: id,
        status,
        response_time_ms: responseTimeMs,
        message,
      });

      // Update integration
      await supabase
        .from('integrations')
        .update({
          health_status: status,
          last_health_check: new Date().toISOString(),
        })
        .eq('id', id);

      return apiSuccess({
        status,
        responseTimeMs,
        message,
        checkedAt: new Date().toISOString(),
      });
    } catch (fetchError) {
      const responseTimeMs = Date.now() - startTime;
      message = fetchError instanceof Error ? fetchError.message : 'Connection failed';

      // Record failed health check
      await supabase.from('integration_health').insert({
        integration_id: id,
        status: 'unhealthy',
        response_time_ms: responseTimeMs,
        message,
      });

      // Update integration
      await supabase
        .from('integrations')
        .update({
          health_status: 'unhealthy',
          last_health_check: new Date().toISOString(),
        })
        .eq('id', id);

      return apiSuccess({
        status: 'unhealthy',
        responseTimeMs,
        message,
        checkedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Health check API error:', error);
    return apiServerError('Internal server error');
  }
}
