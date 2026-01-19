/**
 * Route Executor
 * Executes route bindings with multi-integration support,
 * transformers, and response aggregation
 */

import { createClient } from '@/lib/supabase/server';
import { executeTransform } from './transform-executor';
import type {
  AggregationStrategy,
  ResolvedRouteConfig,
  ResolvedRouteMapping,
  IntegrationCallResult,
} from '@/types';

export interface RouteExecutionRequest {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface RouteExecutionResult {
  success: boolean;
  status: 'success' | 'partial' | 'failure';
  data?: unknown;
  errors?: string[];
  metadata: {
    routeId: string;
    routeName: string;
    durationMs: number;
    integrationCalls: IntegrationCallResult[];
    aggregationStrategy: AggregationStrategy;
  };
}

/**
 * Execute a route binding
 */
export async function executeRoute(
  routePath: string,
  routeMethod: string,
  request: RouteExecutionRequest
): Promise<RouteExecutionResult> {
  const startTime = Date.now();
  const supabase = await createClient();

  // Get route configuration
  const { data: routeConfig } = await supabase
    .rpc('get_route_config', { p_route_path: routePath, p_method: routeMethod });

  if (!routeConfig) {
    return {
      success: false,
      status: 'failure',
      errors: ['Route not found or not enabled'],
      metadata: {
        routeId: '',
        routeName: '',
        durationMs: Date.now() - startTime,
        integrationCalls: [],
        aggregationStrategy: 'priority_order',
      },
    };
  }

  const config = routeConfig as ResolvedRouteConfig;
  const integrationCalls: IntegrationCallResult[] = [];

  try {
    // Execute based on aggregation strategy
    const result = await executeWithStrategy(
      config,
      request,
      integrationCalls,
      supabase
    );

    const durationMs = Date.now() - startTime;

    // Log execution
    await logExecution(supabase, config.routeId, request, integrationCalls, result, durationMs);

    return {
      success: result.success,
      status: result.status,
      data: result.data,
      errors: result.errors,
      metadata: {
        routeId: config.routeId,
        routeName: config.name,
        durationMs,
        integrationCalls,
        aggregationStrategy: config.aggregationStrategy,
      },
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      status: 'failure',
      errors: [errorMessage],
      metadata: {
        routeId: config.routeId,
        routeName: config.name,
        durationMs,
        integrationCalls,
        aggregationStrategy: config.aggregationStrategy,
      },
    };
  }
}

interface ExecutionResult {
  success: boolean;
  status: 'success' | 'partial' | 'failure';
  data?: unknown;
  errors?: string[];
}

/**
 * Execute with the specified aggregation strategy
 */
async function executeWithStrategy(
  config: ResolvedRouteConfig,
  request: RouteExecutionRequest,
  integrationCalls: IntegrationCallResult[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ExecutionResult> {
  switch (config.aggregationStrategy) {
    case 'first_success':
      return executeFirstSuccess(config, request, integrationCalls, supabase);

    case 'priority_order':
      return executePriorityOrder(config, request, integrationCalls, supabase);

    case 'merge_results':
      return executeMergeResults(config, request, integrationCalls, supabase);

    case 'all_parallel':
      return executeAllParallel(config, request, integrationCalls, supabase);

    case 'chain':
      return executeChain(config, request, integrationCalls, supabase);

    default:
      return executePriorityOrder(config, request, integrationCalls, supabase);
  }
}

/**
 * First Success: Return immediately when first integration succeeds
 */
async function executeFirstSuccess(
  config: ResolvedRouteConfig,
  request: RouteExecutionRequest,
  integrationCalls: IntegrationCallResult[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ExecutionResult> {
  const errors: string[] = [];

  for (const mapping of config.mappings) {
    const result = await executeMapping(mapping, request, supabase);
    integrationCalls.push(result);

    // Update metrics
    await updateMappingMetrics(supabase, mapping.mappingId, result);

    if (result.status === 'success') {
      return {
        success: true,
        status: 'success',
        data: result.data,
      };
    }

    if (result.error) {
      errors.push(`${mapping.integrationName}: ${result.error}`);
    }
  }

  return {
    success: false,
    status: 'failure',
    errors,
  };
}

/**
 * Priority Order: Try in order, use first successful, fallback on failure
 */
async function executePriorityOrder(
  config: ResolvedRouteConfig,
  request: RouteExecutionRequest,
  integrationCalls: IntegrationCallResult[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ExecutionResult> {
  const errors: string[] = [];
  let lastSuccessData: unknown = null;

  // Separate primary and fallback mappings
  const primaryMappings = config.mappings.filter(m => !m.isFallback);
  const fallbackMappings = config.mappings.filter(m => m.isFallback);

  // Try primary mappings first
  for (const mapping of primaryMappings) {
    const result = await executeMapping(mapping, request, supabase);
    integrationCalls.push(result);
    await updateMappingMetrics(supabase, mapping.mappingId, result);

    if (result.status === 'success') {
      lastSuccessData = result.data;
      break;
    }

    if (result.error) {
      errors.push(`${mapping.integrationName}: ${result.error}`);
    }
  }

  // If no primary succeeded, try fallbacks
  if (!lastSuccessData && fallbackMappings.length > 0) {
    for (const mapping of fallbackMappings) {
      const result = await executeMapping(mapping, request, supabase);
      integrationCalls.push(result);
      await updateMappingMetrics(supabase, mapping.mappingId, result);

      if (result.status === 'success') {
        lastSuccessData = result.data;
        break;
      }

      if (result.error) {
        errors.push(`${mapping.integrationName}: ${result.error}`);
      }
    }
  }

  if (lastSuccessData) {
    return {
      success: true,
      status: errors.length > 0 ? 'partial' : 'success',
      data: lastSuccessData,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  return {
    success: false,
    status: 'failure',
    errors,
  };
}

/**
 * Merge Results: Combine results from all integrations
 */
async function executeMergeResults(
  config: ResolvedRouteConfig,
  request: RouteExecutionRequest,
  integrationCalls: IntegrationCallResult[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ExecutionResult> {
  const results: unknown[] = [];
  const errors: string[] = [];
  let anySuccess = false;

  // Execute all in parallel
  const executions = config.mappings.map(async (mapping) => {
    const result = await executeMapping(mapping, request, supabase);
    integrationCalls.push(result);
    await updateMappingMetrics(supabase, mapping.mappingId, result);
    return { mapping, result };
  });

  const allResults = await Promise.all(executions);

  for (const { mapping, result } of allResults) {
    if (result.status === 'success' && result.data) {
      anySuccess = true;
      results.push({
        _source: mapping.integrationName,
        ...((result.data as object) || {}),
      });
    } else if (result.error) {
      errors.push(`${mapping.integrationName}: ${result.error}`);
    }
  }

  if (config.failOnAnyError && errors.length > 0) {
    return {
      success: false,
      status: 'failure',
      errors,
    };
  }

  // Merge results
  const mergedData = mergeResultData(results);

  return {
    success: anySuccess,
    status: anySuccess ? (errors.length > 0 ? 'partial' : 'success') : 'failure',
    data: mergedData,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * All Parallel: Execute all integrations in parallel, aggregate responses
 */
async function executeAllParallel(
  config: ResolvedRouteConfig,
  request: RouteExecutionRequest,
  integrationCalls: IntegrationCallResult[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ExecutionResult> {
  // Same as merge results but with different aggregation
  return executeMergeResults(config, request, integrationCalls, supabase);
}

/**
 * Chain: Pass output of one integration as input to the next
 */
async function executeChain(
  config: ResolvedRouteConfig,
  request: RouteExecutionRequest,
  integrationCalls: IntegrationCallResult[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ExecutionResult> {
  let currentInput = request.body;
  const errors: string[] = [];

  for (const mapping of config.mappings) {
    const chainedRequest = {
      ...request,
      body: currentInput,
    };

    const result = await executeMapping(mapping, chainedRequest, supabase);
    integrationCalls.push(result);
    await updateMappingMetrics(supabase, mapping.mappingId, result);

    if (result.status !== 'success') {
      if (result.error) {
        errors.push(`${mapping.integrationName}: ${result.error}`);
      }
      return {
        success: false,
        status: 'failure',
        errors,
      };
    }

    // Use this result as input for next integration
    currentInput = result.data;
  }

  return {
    success: true,
    status: 'success',
    data: currentInput,
  };
}

interface MappingExecutionResult extends Omit<IntegrationCallResult, 'mappingId' | 'priority'> {
  data?: unknown;
}

/**
 * Execute a single mapping
 */
async function executeMapping(
  mapping: ResolvedRouteMapping,
  request: RouteExecutionRequest,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<IntegrationCallResult & { data?: unknown }> {
  const startTime = Date.now();

  try {
    // Check cache if enabled
    if (mapping.cacheEnabled) {
      const cachedResult = await checkCache(mapping, request);
      if (cachedResult) {
        return {
          integrationId: mapping.integrationId,
          integrationName: mapping.integrationName,
          mappingId: mapping.mappingId,
          priority: mapping.priority,
          status: 'success',
          statusCode: 200,
          durationMs: Date.now() - startTime,
          fromCache: true,
          data: cachedResult,
        };
      }
    }

    // Transform request if configured
    const transformedRequest = mapping.requestTransform
      ? (await applyTransform(mapping.requestTransform, request, 'request')) as RouteExecutionRequest
      : request;

    // Build the URL
    const url = new URL(mapping.endpointPath, mapping.baseUrl);

    // Add query params
    if (transformedRequest.query) {
      Object.entries(transformedRequest.query).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    // Execute the request
    const response = await fetch(url.toString(), {
      method: mapping.endpointMethod,
      headers: {
        'Content-Type': 'application/json',
        ...(transformedRequest.headers || {}),
      },
      body: transformedRequest.body ? JSON.stringify(transformedRequest.body) : undefined,
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        integrationId: mapping.integrationId,
        integrationName: mapping.integrationName,
        mappingId: mapping.mappingId,
        priority: mapping.priority,
        status: 'failure',
        statusCode: response.status,
        durationMs,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    let data = await response.json();

    // Transform response if configured
    if (mapping.responseTransform) {
      data = await applyTransform(mapping.responseTransform, data, 'response');
    }

    // Cache the result if enabled
    if (mapping.cacheEnabled) {
      await cacheResult(mapping, request, data);
    }

    return {
      integrationId: mapping.integrationId,
      integrationName: mapping.integrationName,
      mappingId: mapping.mappingId,
      priority: mapping.priority,
      status: 'success',
      statusCode: response.status,
      durationMs,
      data,
    };
  } catch (error) {
    return {
      integrationId: mapping.integrationId,
      integrationName: mapping.integrationName,
      mappingId: mapping.mappingId,
      priority: mapping.priority,
      status: 'failure',
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Merge result data from multiple integrations
 */
function mergeResultData(results: unknown[]): unknown {
  if (results.length === 0) {
    return { results: [] };
  }

  // Try to merge arrays
  const mergedResults: unknown[] = [];
  const sources: string[] = [];

  for (const result of results) {
    if (typeof result === 'object' && result !== null) {
      const obj = result as Record<string, unknown>;
      sources.push(obj._source as string || 'unknown');

      // Extract results/data array if present
      if (Array.isArray(obj.results)) {
        mergedResults.push(...obj.results);
      } else if (Array.isArray(obj.data)) {
        mergedResults.push(...obj.data);
      } else {
        mergedResults.push(result);
      }
    }
  }

  return {
    results: mergedResults,
    sources,
    count: mergedResults.length,
  };
}

/**
 * Apply a transformer to data
 */
async function applyTransform(
  transformName: string,
  data: unknown,
  type: 'request' | 'response'
): Promise<unknown> {
  return executeTransform(transformName, data, type);
}

/**
 * Check cache for a result
 */
async function checkCache(
  mapping: ResolvedRouteMapping,
  request: RouteExecutionRequest
): Promise<unknown | null> {
  // Simple in-memory cache placeholder
  // In production, use Redis or similar
  return null;
}

/**
 * Cache a result
 */
async function cacheResult(
  mapping: ResolvedRouteMapping,
  request: RouteExecutionRequest,
  data: unknown
): Promise<void> {
  // Simple in-memory cache placeholder
  // In production, use Redis or similar
}

/**
 * Update mapping metrics
 */
async function updateMappingMetrics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mappingId: string,
  result: IntegrationCallResult
): Promise<void> {
  try {
    await supabase.rpc('update_route_mapping_metrics', {
      p_mapping_id: mappingId,
      p_success: result.status === 'success',
      p_response_time_ms: result.durationMs,
      p_error: result.error || null,
    });
  } catch (error) {
    console.error('Failed to update mapping metrics:', error);
  }
}

/**
 * Log route execution
 */
async function logExecution(
  supabase: Awaited<ReturnType<typeof createClient>>,
  routeId: string,
  request: RouteExecutionRequest,
  integrationCalls: IntegrationCallResult[],
  result: ExecutionResult,
  durationMs: number
): Promise<void> {
  try {
    const successCode = result.success ? 200 : integrationCalls.find(c => c.statusCode)?.statusCode || 500;

    await supabase.from('route_execution_logs').insert({
      route_id: routeId,
      request_method: request.method,
      request_path: request.path,
      request_query: request.query || {},
      started_at: new Date(Date.now() - durationMs).toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      integration_calls: integrationCalls,
      status: result.status,
      response_status_code: successCode,
      error_message: result.errors?.join('; ') || null,
    });
  } catch (error) {
    console.error('Failed to log route execution:', error);
  }
}
