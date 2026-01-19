import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiServerError,
  apiForbidden,
  apiNotFound,
} from '@/lib/api/response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/integrations/routes/[id]
 * Get a specific integration route with its mappings
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

    // Check coordinator+ role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['coordinator', 'investigator', 'admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Coordinator role or higher required');
    }

    const { data: route, error } = await supabase
      .from('integration_routes')
      .select(`
        *,
        route_integration_mappings (
          *,
          integrations (
            id,
            name,
            category,
            status,
            base_url,
            health_status
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !route) {
      return apiNotFound('Route not found');
    }

    // Transform to camelCase
    const transformedRoute = {
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
        requestTransform: m.request_transform,
        requestTemplate: m.request_template,
        requestHeaders: m.request_headers,
        queryParamsMap: m.query_params_map,
        responseTransform: m.response_transform,
        responseTemplate: m.response_template,
        responseFieldMap: m.response_field_map,
        cacheEnabled: m.cache_enabled,
        cacheTtlSeconds: m.cache_ttl_seconds,
        cacheKeyTemplate: m.cache_key_template,
        isEnabled: m.is_enabled,
        totalCalls: m.total_calls,
        successfulCalls: m.successful_calls,
        failedCalls: m.failed_calls,
        avgResponseTimeMs: m.avg_response_time_ms,
        lastCalledAt: m.last_called_at,
        lastError: m.last_error,
        lastErrorAt: m.last_error_at,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        integration: m.integrations,
      })).sort((a: { priority: number }, b: { priority: number }) => a.priority - b.priority) || [],
    };

    return apiSuccess({ route: transformedRoute });
  } catch (error) {
    console.error('Route fetch error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * PATCH /api/integrations/routes/[id]
 * Update an integration route
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Check route exists
    const { data: existing } = await supabase
      .from('integration_routes')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return apiNotFound('Route not found');
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Map camelCase to snake_case
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.aggregationStrategy !== undefined) updates.aggregation_strategy = body.aggregationStrategy;
    if (body.timeoutMs !== undefined) updates.timeout_ms = body.timeoutMs;
    if (body.failOnAnyError !== undefined) updates.fail_on_any_error = body.failOnAnyError;
    if (body.isEnabled !== undefined) updates.is_enabled = body.isEnabled;

    const { data: route, error } = await supabase
      .from('integration_routes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating route:', error);
      return apiServerError('Failed to update route');
    }

    return apiSuccess({
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
      },
    });
  } catch (error) {
    console.error('Route update error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * DELETE /api/integrations/routes/[id]
 * Delete an integration route and its mappings
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check route exists
    const { data: existing } = await supabase
      .from('integration_routes')
      .select('id, name')
      .eq('id', id)
      .single();

    if (!existing) {
      return apiNotFound('Route not found');
    }

    // Delete the route (cascades to mappings)
    const { error } = await supabase
      .from('integration_routes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting route:', error);
      return apiServerError('Failed to delete route');
    }

    return apiSuccess({ message: `Route "${existing.name}" deleted successfully` });
  } catch (error) {
    console.error('Route deletion error:', error);
    return apiServerError('Internal server error');
  }
}
