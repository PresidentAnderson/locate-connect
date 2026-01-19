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
  params: Promise<{ id: string; mappingId: string }>;
}

/**
 * GET /api/integrations/routes/[id]/mappings/[mappingId]
 * Get a specific mapping
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, mappingId } = await params;
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

    const { data: mapping, error } = await supabase
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
      .eq('id', mappingId)
      .eq('route_id', id)
      .single();

    if (error || !mapping) {
      return apiNotFound('Mapping not found');
    }

    return apiSuccess({
      mapping: {
        id: mapping.id,
        routeId: mapping.route_id,
        integrationId: mapping.integration_id,
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
        totalCalls: mapping.total_calls,
        successfulCalls: mapping.successful_calls,
        failedCalls: mapping.failed_calls,
        avgResponseTimeMs: mapping.avg_response_time_ms,
        lastCalledAt: mapping.last_called_at,
        lastError: mapping.last_error,
        lastErrorAt: mapping.last_error_at,
        createdAt: mapping.created_at,
        updatedAt: mapping.updated_at,
        integration: mapping.integrations,
      },
    });
  } catch (error) {
    console.error('Mapping fetch error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * PATCH /api/integrations/routes/[id]/mappings/[mappingId]
 * Update a specific mapping
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, mappingId } = await params;
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

    // Check mapping exists
    const { data: existing } = await supabase
      .from('route_integration_mappings')
      .select('id')
      .eq('id', mappingId)
      .eq('route_id', id)
      .single();

    if (!existing) {
      return apiNotFound('Mapping not found');
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Map camelCase to snake_case
    if (body.endpointPath !== undefined) updates.endpoint_path = body.endpointPath;
    if (body.endpointMethod !== undefined) updates.endpoint_method = body.endpointMethod;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.isFallback !== undefined) updates.is_fallback = body.isFallback;
    if (body.requestTransform !== undefined) updates.request_transform = body.requestTransform;
    if (body.requestTemplate !== undefined) updates.request_template = body.requestTemplate;
    if (body.requestHeaders !== undefined) updates.request_headers = body.requestHeaders;
    if (body.queryParamsMap !== undefined) updates.query_params_map = body.queryParamsMap;
    if (body.responseTransform !== undefined) updates.response_transform = body.responseTransform;
    if (body.responseTemplate !== undefined) updates.response_template = body.responseTemplate;
    if (body.responseFieldMap !== undefined) updates.response_field_map = body.responseFieldMap;
    if (body.cacheEnabled !== undefined) updates.cache_enabled = body.cacheEnabled;
    if (body.cacheTtlSeconds !== undefined) updates.cache_ttl_seconds = body.cacheTtlSeconds;
    if (body.cacheKeyTemplate !== undefined) updates.cache_key_template = body.cacheKeyTemplate;
    if (body.isEnabled !== undefined) updates.is_enabled = body.isEnabled;

    const { data: mapping, error } = await supabase
      .from('route_integration_mappings')
      .update(updates)
      .eq('id', mappingId)
      .eq('route_id', id)
      .select(`
        *,
        integrations (
          id,
          name,
          category,
          status
        )
      `)
      .single();

    if (error) {
      console.error('Error updating mapping:', error);
      return apiServerError('Failed to update mapping');
    }

    return apiSuccess({
      mapping: {
        id: mapping.id,
        routeId: mapping.route_id,
        integrationId: mapping.integration_id,
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
        integration: mapping.integrations,
      },
    });
  } catch (error) {
    console.error('Mapping update error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * DELETE /api/integrations/routes/[id]/mappings/[mappingId]
 * Delete a mapping from a route
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, mappingId } = await params;
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

    // Check mapping exists and get integration name
    const { data: existing } = await supabase
      .from('route_integration_mappings')
      .select(`
        id,
        integrations (name)
      `)
      .eq('id', mappingId)
      .eq('route_id', id)
      .single();

    if (!existing) {
      return apiNotFound('Mapping not found');
    }

    // Delete the mapping
    const { error } = await supabase
      .from('route_integration_mappings')
      .delete()
      .eq('id', mappingId)
      .eq('route_id', id);

    if (error) {
      console.error('Error deleting mapping:', error);
      return apiServerError('Failed to delete mapping');
    }

    // Handle both array and object cases from Supabase join
    const integrations = existing.integrations;
    const integrationName = Array.isArray(integrations)
      ? (integrations[0] as { name: string } | undefined)?.name
      : (integrations as { name: string } | null)?.name
      ?? 'Unknown';

    return apiSuccess({
      message: `Mapping to "${integrationName}" removed successfully`,
    });
  } catch (error) {
    console.error('Mapping deletion error:', error);
    return apiServerError('Internal server error');
  }
}
