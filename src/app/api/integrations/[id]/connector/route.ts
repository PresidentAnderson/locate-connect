import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiUnauthorized,
  apiServerError,
  apiForbidden,
  apiNotFound,
} from '@/lib/api/response';
import { getConnectorFactory } from '@/lib/integrations/connector-framework';
import { getRateLimiterRegistry } from '@/lib/integrations/connector-framework/rate-limiter';
import { getCacheRegistry } from '@/lib/integrations/connector-framework/response-cache';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/integrations/[id]/connector
 * Get connector status and metrics
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      !['coordinator', 'investigator', 'admin', 'super_admin'].includes(profile.role)
    ) {
      return apiForbidden('Insufficient permissions');
    }

    // Get integration
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('id, name, status')
      .eq('id', id)
      .single();

    if (error || !integration) {
      return apiNotFound('Integration not found');
    }

    // Get connector from factory
    const factory = getConnectorFactory();
    const connector = factory.get(id);

    // Get rate limiter metrics
    const rateLimiterRegistry = getRateLimiterRegistry();
    const rateLimiter = rateLimiterRegistry.get(id);
    const rateLimitMetrics = rateLimiter?.getMetrics();

    // Get cache stats
    const cacheRegistry = getCacheRegistry();
    const cache = cacheRegistry.get(id);
    const cacheStats = cache?.getStats();

    if (!connector) {
      return apiSuccess({
        integrationId: id,
        integrationName: integration.name,
        state: 'not_initialized',
        message: 'Connector has not been initialized',
        rateLimiter: rateLimitMetrics || null,
        cache: cacheStats || null,
      });
    }

    const state = connector.getState();
    const metrics = connector.getMetrics();
    const config = connector.getConfig();

    return apiSuccess({
      integrationId: id,
      integrationName: integration.name,
      state,
      metrics: {
        totalRequests: metrics.totalRequests,
        successfulRequests: metrics.successfulRequests,
        failedRequests: metrics.failedRequests,
        averageResponseTimeMs: metrics.averageResponseTimeMs,
        circuitBreakerTrips: metrics.circuitBreakerTrips,
        uptime: metrics.uptime,
        lastRequestAt: metrics.lastRequestAt,
      },
      config: {
        baseUrl: config.baseUrl,
        timeout: config.timeout,
        circuitBreaker: config.circuitBreaker,
        retryPolicy: config.retryPolicy,
        rateLimit: config.rateLimit,
      },
      rateLimiter: rateLimitMetrics || null,
      cache: cacheStats || null,
    });
  } catch (error) {
    console.error('Connector status error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/integrations/[id]/connector
 * Control connector lifecycle (connect/disconnect/reset)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Admin role required');
    }

    // Get integration
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !integration) {
      return apiNotFound('Integration not found');
    }

    const body = await request.json();
    const action = body.action as 'connect' | 'disconnect' | 'reset' | 'clear_cache';

    if (!action || !['connect', 'disconnect', 'reset', 'clear_cache'].includes(action)) {
      return apiBadRequest(
        'Valid action required: connect, disconnect, reset, or clear_cache',
        'invalid_action'
      );
    }

    const factory = getConnectorFactory();
    const rateLimiterRegistry = getRateLimiterRegistry();
    const cacheRegistry = getCacheRegistry();

    let result: { success: boolean; message: string; state?: string };

    switch (action) {
      case 'connect': {
        let connector = factory.get(id);

        if (!connector) {
          // Connector doesn't exist - would need to create it
          // For now, return error - connector creation should happen through initialization
          return apiBadRequest(
            'Connector not initialized. Initialize it first.',
            'connector_not_initialized'
          );
        }

        await connector.connect();

        // Update database state
        await supabase
          .from('integration_connectors')
          .update({
            state: 'connected',
            connected_at: new Date().toISOString(),
          })
          .eq('integration_id', id);

        result = {
          success: true,
          message: 'Connector connected successfully',
          state: connector.getState(),
        };
        break;
      }

      case 'disconnect': {
        const connector = factory.get(id);
        if (!connector) {
          return apiBadRequest('Connector not found', 'connector_not_found');
        }

        await connector.disconnect();

        // Update database state
        await supabase
          .from('integration_connectors')
          .update({
            state: 'disconnected',
            disconnected_at: new Date().toISOString(),
          })
          .eq('integration_id', id);

        result = {
          success: true,
          message: 'Connector disconnected successfully',
          state: connector.getState(),
        };
        break;
      }

      case 'reset': {
        // Reset rate limiter
        const rateLimiter = rateLimiterRegistry.get(id);
        if (rateLimiter) {
          rateLimiter.reset();
        }

        // Clear cache
        const cache = cacheRegistry.get(id);
        if (cache) {
          cache.clear();
        }

        // Remove connector from factory
        factory.remove(id);

        // Update database
        await supabase
          .from('integration_connectors')
          .update({
            state: 'disconnected',
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            avg_response_time_ms: 0,
            circuit_breaker_state: 'closed',
          })
          .eq('integration_id', id);

        result = {
          success: true,
          message: 'Connector reset successfully',
          state: 'disconnected',
        };
        break;
      }

      case 'clear_cache': {
        const cache = cacheRegistry.get(id);
        if (cache) {
          cache.clear();
        }

        result = {
          success: true,
          message: 'Cache cleared successfully',
        };
        break;
      }

      default:
        return apiBadRequest('Invalid action', 'invalid_action');
    }

    return apiSuccess(result);
  } catch (error) {
    console.error('Connector control error:', error);
    return apiServerError('Internal server error');
  }
}
