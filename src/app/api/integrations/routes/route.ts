import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiCreated,
  apiUnauthorized,
  apiServerError,
  apiForbidden,
  apiBadRequest,
} from '@/lib/api/response';

/**
 * GET /api/integrations/routes
 * List all integration routes with their mappings
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

    // Check coordinator+ role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['coordinator', 'investigator', 'admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Coordinator role or higher required');
    }

    const searchParams = request.nextUrl.searchParams;
    const enabled = searchParams.get('enabled');
    const method = searchParams.get('method');

    let query = supabase
      .from('integration_routes')
      .select(`
        *,
        route_integration_mappings (
          id,
          integration_id,
          endpoint_path,
          endpoint_method,
          priority,
          is_fallback,
          is_enabled,
          total_calls,
          successful_calls,
          failed_calls,
          avg_response_time_ms,
          last_called_at,
          integrations (
            id,
            name,
            category,
            status,
            base_url
          )
        )
      `)
      .order('route_path');

    if (enabled !== null) {
      query = query.eq('is_enabled', enabled === 'true');
    }

    if (method) {
      query = query.or(`route_method.eq.${method},route_method.eq.ANY`);
    }

    const { data: routes, error } = await query;

    if (error) {
      console.error('Error fetching routes:', error);
      return apiServerError('Failed to fetch routes');
    }

    // Transform to camelCase
    const transformedRoutes = routes?.map(route => ({
      id: route.id,
      routePath: route.route_path,
      routeMethod: route.route_method,
      name: route.name,
      description: route.description,
      aggregationStrategy: route.aggregation_strategy,
      timeoutMs: route.timeout_ms,
      failOnAnyError: route.fail_on_any_error,
      isEnabled: route.is_enabled,
      createdAt: route.created_at,
      updatedAt: route.updated_at,
      createdBy: route.created_by,
      mappings: route.route_integration_mappings?.map((m: Record<string, unknown>) => ({
        id: m.id,
        integrationId: m.integration_id,
        endpointPath: m.endpoint_path,
        endpointMethod: m.endpoint_method,
        priority: m.priority,
        isFallback: m.is_fallback,
        isEnabled: m.is_enabled,
        totalCalls: m.total_calls,
        successfulCalls: m.successful_calls,
        failedCalls: m.failed_calls,
        avgResponseTimeMs: m.avg_response_time_ms,
        lastCalledAt: m.last_called_at,
        integration: m.integrations,
      })).sort((a: { priority: number }, b: { priority: number }) => a.priority - b.priority) || [],
    }));

    return apiSuccess({
      routes: transformedRoutes,
      total: routes?.length || 0,
    });
  } catch (error) {
    console.error('Route listing error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/integrations/routes
 * Create a new integration route
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      routePath,
      routeMethod = 'GET',
      name,
      description,
      aggregationStrategy = 'priority_order',
      timeoutMs = 30000,
      failOnAnyError = false,
    } = body;

    // Validation
    if (!routePath || !name) {
      return apiBadRequest('routePath and name are required');
    }

    if (!routePath.startsWith('/')) {
      return apiBadRequest('routePath must start with /');
    }

    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ANY'];
    if (!validMethods.includes(routeMethod)) {
      return apiBadRequest(`routeMethod must be one of: ${validMethods.join(', ')}`);
    }

    const validStrategies = ['first_success', 'merge_results', 'priority_order', 'all_parallel', 'chain'];
    if (!validStrategies.includes(aggregationStrategy)) {
      return apiBadRequest(`aggregationStrategy must be one of: ${validStrategies.join(', ')}`);
    }

    // Check for duplicate route
    const { data: existing } = await supabase
      .from('integration_routes')
      .select('id')
      .eq('route_path', routePath)
      .eq('route_method', routeMethod)
      .single();

    if (existing) {
      return apiBadRequest('A route with this path and method already exists');
    }

    // Create the route
    const { data: route, error } = await supabase
      .from('integration_routes')
      .insert({
        route_path: routePath,
        route_method: routeMethod,
        name,
        description,
        aggregation_strategy: aggregationStrategy,
        timeout_ms: timeoutMs,
        fail_on_any_error: failOnAnyError,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating route:', error);
      return apiServerError('Failed to create route');
    }

    return apiCreated({
      route: {
        id: route.id,
        routePath: route.route_path,
        routeMethod: route.route_method,
        name: route.name,
        description: route.description,
        aggregationStrategy: route.aggregation_strategy,
        timeoutMs: route.timeout_ms,
        failOnAnyError: route.fail_on_any_error,
        isEnabled: route.is_enabled,
        createdAt: route.created_at,
        updatedAt: route.updated_at,
        createdBy: route.created_by,
        mappings: [],
      },
    });
  } catch (error) {
    console.error('Route creation error:', error);
    return apiServerError('Internal server error');
  }
}
