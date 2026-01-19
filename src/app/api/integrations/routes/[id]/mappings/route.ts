import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiCreated,
  apiUnauthorized,
  apiServerError,
  apiForbidden,
  apiNotFound,
  apiBadRequest,
} from '@/lib/api/response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/integrations/routes/[id]/mappings
 * List all mappings for a route
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

    // Check route exists
    const { data: route } = await supabase
      .from('integration_routes')
      .select('id, name')
      .eq('id', id)
      .single();

    if (!route) {
      return apiNotFound('Route not found');
    }

    const { data: mappings, error } = await supabase
      .from('route_integration_mappings')
      .select(`
        *,
        integrations (
          id,
          name,
          category,
          status,
          base_url,
          health_status
        )
      `)
      .eq('route_id', id)
      .order('priority');

    if (error) {
      console.error('Error fetching mappings:', error);
      return apiServerError('Failed to fetch mappings');
    }

    const transformedMappings = mappings?.map(m => ({
      id: m.id,
      routeId: m.route_id,
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
    }));

    return apiSuccess({
      routeId: id,
      routeName: route.name,
      mappings: transformedMappings,
    });
  } catch (error) {
    console.error('Mapping listing error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/integrations/routes/[id]/mappings
 * Add a new integration mapping to a route
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

    // Check route exists
    const { data: route } = await supabase
      .from('integration_routes')
      .select('id')
      .eq('id', id)
      .single();

    if (!route) {
      return apiNotFound('Route not found');
    }

    const body = await request.json();
    const {
      integrationId,
      endpointPath,
      endpointMethod = 'GET',
      priority,
      isFallback = false,
      requestTransform,
      requestTemplate,
      requestHeaders,
      queryParamsMap,
      responseTransform,
      responseTemplate,
      responseFieldMap,
      cacheEnabled = false,
      cacheTtlSeconds = 300,
      cacheKeyTemplate,
    } = body;

    // Validation
    if (!integrationId || !endpointPath) {
      return apiBadRequest('integrationId and endpointPath are required');
    }

    // Check integration exists
    const { data: integration } = await supabase
      .from('integrations')
      .select('id, name')
      .eq('id', integrationId)
      .single();

    if (!integration) {
      return apiBadRequest('Integration not found');
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('route_integration_mappings')
      .select('id')
      .eq('route_id', id)
      .eq('integration_id', integrationId)
      .single();

    if (existing) {
      return apiBadRequest('This integration is already mapped to this route');
    }

    // Get next priority if not specified
    let mappingPriority = priority;
    if (mappingPriority === undefined) {
      const { data: maxPriority } = await supabase
        .from('route_integration_mappings')
        .select('priority')
        .eq('route_id', id)
        .order('priority', { ascending: false })
        .limit(1)
        .single();

      mappingPriority = (maxPriority?.priority || 0) + 1;
    }

    // Create the mapping
    const { data: mapping, error } = await supabase
      .from('route_integration_mappings')
      .insert({
        route_id: id,
        integration_id: integrationId,
        endpoint_path: endpointPath,
        endpoint_method: endpointMethod,
        priority: mappingPriority,
        is_fallback: isFallback,
        request_transform: requestTransform,
        request_template: requestTemplate,
        request_headers: requestHeaders || {},
        query_params_map: queryParamsMap || {},
        response_transform: responseTransform,
        response_template: responseTemplate,
        response_field_map: responseFieldMap || {},
        cache_enabled: cacheEnabled,
        cache_ttl_seconds: cacheTtlSeconds,
        cache_key_template: cacheKeyTemplate,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating mapping:', error);
      return apiServerError('Failed to create mapping');
    }

    return apiCreated({
      mapping: {
        id: mapping.id,
        routeId: mapping.route_id,
        integrationId: mapping.integration_id,
        integrationName: integration.name,
        endpointPath: mapping.endpoint_path,
        endpointMethod: mapping.endpoint_method,
        priority: mapping.priority,
        isFallback: mapping.is_fallback,
        requestTransform: mapping.request_transform,
        requestTemplate: mapping.request_template,
        requestHeaders: mapping.request_headers,
        queryParamsMap: mapping.query_params_map,
        responseTransform: mapping.response_transform,
        responseTemplate: mapping.response_template,
        responseFieldMap: mapping.response_field_map,
        cacheEnabled: mapping.cache_enabled,
        cacheTtlSeconds: mapping.cache_ttl_seconds,
        cacheKeyTemplate: mapping.cache_key_template,
        isEnabled: mapping.is_enabled,
        createdAt: mapping.created_at,
        updatedAt: mapping.updated_at,
      },
    });
  } catch (error) {
    console.error('Mapping creation error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * PUT /api/integrations/routes/[id]/mappings
 * Reorder mappings (update priorities)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const { data: route } = await supabase
      .from('integration_routes')
      .select('id')
      .eq('id', id)
      .single();

    if (!route) {
      return apiNotFound('Route not found');
    }

    const body = await request.json();
    const { order } = body; // Array of { mappingId, priority }

    if (!Array.isArray(order)) {
      return apiBadRequest('order must be an array of { mappingId, priority }');
    }

    // Update priorities in a transaction-like manner
    for (const item of order) {
      if (!item.mappingId || typeof item.priority !== 'number') {
        continue;
      }

      await supabase
        .from('route_integration_mappings')
        .update({ priority: item.priority })
        .eq('id', item.mappingId)
        .eq('route_id', id);
    }

    // Fetch updated mappings
    const { data: mappings } = await supabase
      .from('route_integration_mappings')
      .select(`
        id,
        priority,
        integrations (name)
      `)
      .eq('route_id', id)
      .order('priority');

    return apiSuccess({
      message: 'Mapping order updated',
      mappings: mappings?.map(m => {
        const integrations = m.integrations;
        const integrationName = Array.isArray(integrations)
          ? (integrations[0] as { name: string } | undefined)?.name
          : (integrations as { name: string } | null)?.name;
        return {
          id: m.id,
          priority: m.priority,
          integrationName,
        };
      }),
    });
  } catch (error) {
    console.error('Mapping reorder error:', error);
    return apiServerError('Internal server error');
  }
}
