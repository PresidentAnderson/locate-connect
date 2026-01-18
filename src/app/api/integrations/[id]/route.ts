import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiUnauthorized,
  apiServerError,
  apiForbidden,
  apiNotFound,
  apiNoContent,
} from '@/lib/api/response';

interface UpdateIntegrationInput {
  name?: string;
  description?: string;
  baseUrl?: string;
  status?: string;
  config?: Record<string, unknown>;
  rateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
  syncSchedule?: string;
}

/**
 * GET /api/integrations/[id]
 * Get integration details
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

    // Get integration with connector info
    const { data: integration, error } = await supabase
      .from('integrations')
      .select(`
        *,
        integration_connectors (
          state,
          circuit_breaker_state,
          connected_at,
          total_requests,
          successful_requests,
          failed_requests,
          avg_response_time_ms
        ),
        integration_endpoints (
          id,
          name,
          path,
          method,
          description
        )
      `)
      .eq('id', id)
      .single();

    if (error || !integration) {
      return apiNotFound('Integration not found');
    }

    return apiSuccess(integration);
  } catch (error) {
    console.error('Integration API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * PUT /api/integrations/[id]
 * Update integration
 */
export async function PUT(
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

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return apiForbidden('Admin role required');
    }

    // Check integration exists
    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return apiNotFound('Integration not found');
    }

    const body: UpdateIntegrationInput = await request.json();

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (body.name.trim().length < 3) {
        return apiBadRequest('Name must be at least 3 characters', 'invalid_name');
      }
      updateData.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim();
    }

    if (body.baseUrl !== undefined) {
      if (!body.baseUrl.match(/^https?:\/\//)) {
        return apiBadRequest('Valid base URL required', 'invalid_base_url');
      }
      updateData.base_url = body.baseUrl.trim();
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (body.config !== undefined) {
      updateData.config = body.config;
    }

    if (body.rateLimit !== undefined) {
      if (body.rateLimit.requestsPerMinute !== undefined) {
        updateData.rate_limit_per_minute = body.rateLimit.requestsPerMinute;
      }
      if (body.rateLimit.requestsPerHour !== undefined) {
        updateData.rate_limit_per_hour = body.rateLimit.requestsPerHour;
      }
      if (body.rateLimit.requestsPerDay !== undefined) {
        updateData.rate_limit_per_day = body.rateLimit.requestsPerDay;
      }
    }

    if (body.syncSchedule !== undefined) {
      updateData.sync_schedule = body.syncSchedule;
    }

    const { data, error } = await supabase
      .from('integrations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Integration update error:', error);
      return apiServerError('Failed to update integration');
    }

    return apiSuccess(data);
  } catch (error) {
    console.error('Integration API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * DELETE /api/integrations/[id]
 * Delete integration
 */
export async function DELETE(
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

    // Check super_admin role for deletion
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      return apiForbidden('Super admin role required for deletion');
    }

    // Check integration exists
    const { data: existing } = await supabase
      .from('integrations')
      .select('id, status')
      .eq('id', id)
      .single();

    if (!existing) {
      return apiNotFound('Integration not found');
    }

    // Prevent deletion of active integrations
    if (existing.status === 'active') {
      return apiBadRequest(
        'Cannot delete active integration. Deactivate it first.',
        'integration_active'
      );
    }

    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Integration deletion error:', error);
      return apiServerError('Failed to delete integration');
    }

    return apiNoContent();
  } catch (error) {
    console.error('Integration API error:', error);
    return apiServerError('Internal server error');
  }
}
