import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiServerError,
  apiForbidden,
} from '@/lib/api/response';
import { getConnectorFactory } from '@/lib/integrations/connector-framework';
import { getRateLimiterRegistry } from '@/lib/integrations/connector-framework/rate-limiter';
import { getCacheRegistry } from '@/lib/integrations/connector-framework/response-cache';

/**
 * GET /api/integrations/connectors/metrics
 * Get aggregated metrics for all connectors
 */
export async function GET(request: NextRequest) {
  try {
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

    const factory = getConnectorFactory();
    const factoryStats = factory.getStats();
    const healthResultsMap = await factory.checkAllHealth();
    // Convert Map to array format for easier lookup
    const healthResults = Array.from(healthResultsMap.entries()).map(([id, result]) => ({
      id,
      result,
    }));

    const rateLimiterRegistry = getRateLimiterRegistry();
    const rateLimiterMetrics = rateLimiterRegistry.getAllMetrics();

    const cacheRegistry = getCacheRegistry();
    const cacheStats = cacheRegistry.getAllStats();

    // Get integrations from database for mapping
    const { data: integrations } = await supabase
      .from('integrations')
      .select('id, name, status, category')
      .order('name');

    // Build per-connector metrics
    const connectorMetrics: Record<
      string,
      {
        name: string;
        category: string;
        status: string;
        state: string;
        healthy: boolean;
        metrics: {
          totalRequests: number;
          successfulRequests: number;
          failedRequests: number;
          averageResponseTimeMs: number;
          uptime: number;
        } | null;
        rateLimiter: {
          totalRequests: number;
          allowedRequests: number;
          throttledRequests: number;
          currentConcurrent: number;
          currentQueueSize: number;
        } | null;
        cache: {
          hits: number;
          misses: number;
          hitRate: number;
          entries: number;
        } | null;
      }
    > = {};

    for (const integration of integrations || []) {
      const connector = factory.get(integration.id);
      const health = healthResults.find((h) => h.id === integration.id);
      const rlMetrics = rateLimiterMetrics[integration.id];
      const cStats = cacheStats[integration.id];

      connectorMetrics[integration.id] = {
        name: integration.name,
        category: integration.category,
        status: integration.status,
        state: connector?.getState() || 'not_initialized',
        healthy: health?.result?.healthy ?? false,
        metrics: connector
          ? {
              totalRequests: connector.getMetrics().totalRequests,
              successfulRequests: connector.getMetrics().successfulRequests,
              failedRequests: connector.getMetrics().failedRequests,
              averageResponseTimeMs: connector.getMetrics().averageResponseTimeMs,
              uptime: connector.getMetrics().uptime,
            }
          : null,
        rateLimiter: rlMetrics
          ? {
              totalRequests: rlMetrics.totalRequests,
              allowedRequests: rlMetrics.allowedRequests,
              throttledRequests: rlMetrics.throttledRequests,
              currentConcurrent: rlMetrics.currentConcurrent,
              currentQueueSize: rlMetrics.currentQueueSize,
            }
          : null,
        cache: cStats
          ? {
              hits: cStats.hits,
              misses: cStats.misses,
              hitRate: cStats.hitRate,
              entries: cStats.entries,
            }
          : null,
      };
    }

    // Calculate aggregates
    const totalConnectors = Object.keys(connectorMetrics).length;
    const activeConnectors = Object.values(connectorMetrics).filter(
      (c) => c.state === 'connected'
    ).length;
    const healthyConnectors = Object.values(connectorMetrics).filter(
      (c) => c.healthy
    ).length;

    let totalRequests = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalThrottled = 0;
    let totalCacheHits = 0;
    let totalCacheMisses = 0;

    for (const cm of Object.values(connectorMetrics)) {
      if (cm.metrics) {
        totalRequests += cm.metrics.totalRequests;
        totalSuccessful += cm.metrics.successfulRequests;
        totalFailed += cm.metrics.failedRequests;
      }
      if (cm.rateLimiter) {
        totalThrottled += cm.rateLimiter.throttledRequests;
      }
      if (cm.cache) {
        totalCacheHits += cm.cache.hits;
        totalCacheMisses += cm.cache.misses;
      }
    }

    return apiSuccess({
      summary: {
        totalConnectors,
        activeConnectors,
        healthyConnectors,
        unhealthyConnectors: totalConnectors - healthyConnectors,
        totalRequests,
        totalSuccessful,
        totalFailed,
        totalThrottled,
        successRate:
          totalRequests > 0
            ? ((totalSuccessful / totalRequests) * 100).toFixed(2)
            : '100.00',
        cacheHitRate:
          totalCacheHits + totalCacheMisses > 0
            ? (
                (totalCacheHits / (totalCacheHits + totalCacheMisses)) *
                100
              ).toFixed(2)
            : '0.00',
      },
      byState: factoryStats.byState,
      byCategory: factoryStats.byCategory,
      connectors: connectorMetrics,
    });
  } catch (error) {
    console.error('Connector metrics error:', error);
    return apiServerError('Internal server error');
  }
}
