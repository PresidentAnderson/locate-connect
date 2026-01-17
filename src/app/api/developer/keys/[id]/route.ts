import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiBadRequest, apiUnauthorized, apiNotFound, apiServerError, apiForbidden, apiNoContent } from '@/lib/api/response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/developer/keys/[id]
 * Get a specific API key
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Get the key with application ownership check
    const { data, error } = await supabase
      .from('api_keys')
      .select(`
        id, application_id, key_prefix, name, description, status, access_level,
        scopes, allowed_ip_addresses, last_used_at, last_used_ip, usage_count,
        expires_at, created_at, revoked_at, revoke_reason,
        api_applications!inner (owner_id)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return apiNotFound('API key not found');
      }
      console.error('Key fetch error:', error);
      return apiServerError('Failed to fetch API key');
    }

    // Check ownership (cast through unknown since Supabase types this as array but single() returns object)
    const app = data.api_applications as unknown as { owner_id: string };
    if (app.owner_id !== user.id) {
      return apiForbidden('Access denied');
    }

    // Remove the api_applications from response
    const { api_applications, ...keyData } = data;

    return apiSuccess(keyData);
  } catch (error) {
    console.error('Key API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * PATCH /api/developer/keys/[id]
 * Update an API key
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Verify ownership
    const { data: existingKey, error: fetchError } = await supabase
      .from('api_keys')
      .select(`
        id, status,
        api_applications!inner (owner_id)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return apiNotFound('API key not found');
      }
      return apiServerError('Failed to fetch API key');
    }

    const app = existingKey.api_applications as unknown as { owner_id: string };
    if (app.owner_id !== user.id) {
      return apiForbidden('Access denied');
    }

    const body = await request.json();

    // Build update object (limited fields can be updated)
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name?.trim() || null;
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.allowed_ip_addresses !== undefined) updates.allowed_ip_addresses = body.allowed_ip_addresses;
    if (body.scopes !== undefined) updates.scopes = body.scopes;

    if (Object.keys(updates).length === 0) {
      return apiBadRequest('No updates provided', 'no_updates');
    }

    // Update the key
    const { data, error } = await supabase
      .from('api_keys')
      .update(updates)
      .eq('id', id)
      .select('id, application_id, key_prefix, name, description, status, access_level, scopes, allowed_ip_addresses, last_used_at, last_used_ip, usage_count, expires_at, created_at, revoked_at, revoke_reason')
      .single();

    if (error) {
      console.error('Key update error:', error);
      return apiServerError('Failed to update API key');
    }

    return apiSuccess(data);
  } catch (error) {
    console.error('Key API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * DELETE /api/developer/keys/[id]
 * Revoke an API key
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Verify ownership
    const { data: existingKey, error: fetchError } = await supabase
      .from('api_keys')
      .select(`
        id, status,
        api_applications!inner (owner_id)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return apiNotFound('API key not found');
      }
      return apiServerError('Failed to fetch API key');
    }

    const app = existingKey.api_applications as unknown as { owner_id: string };
    if (app.owner_id !== user.id) {
      return apiForbidden('Access denied');
    }

    if (existingKey.status === 'revoked') {
      return apiBadRequest('API key is already revoked', 'already_revoked');
    }

    // Parse reason from body if provided
    let revokeReason = 'Revoked by user';
    try {
      const body = await request.json();
      if (body.reason) {
        revokeReason = body.reason;
      }
    } catch {
      // No body provided, use default reason
    }

    // Revoke the key (don't delete, keep for audit trail)
    const { error } = await supabase
      .from('api_keys')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
        revoke_reason: revokeReason,
      })
      .eq('id', id);

    if (error) {
      console.error('Key revoke error:', error);
      return apiServerError('Failed to revoke API key');
    }

    return apiNoContent();
  } catch (error) {
    console.error('Key API error:', error);
    return apiServerError('Internal server error');
  }
}
