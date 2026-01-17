import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiBadRequest, apiUnauthorized, apiServerError, apiCreated, apiForbidden } from '@/lib/api/response';
import { generateApiKey, hashApiKey, getApiKeyPrefix } from '@/lib/api/crypto';
import type { CreateApiKeyInput, ApiKeyWithSecret } from '@/types';

/**
 * GET /api/developer/keys
 * List all API keys for a specific application
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('application_id');

    if (!applicationId) {
      return apiBadRequest('application_id is required', 'missing_application_id');
    }

    // Verify ownership of the application
    const { data: app, error: appError } = await supabase
      .from('api_applications')
      .select('owner_id')
      .eq('id', applicationId)
      .single();

    if (appError || !app) {
      return apiBadRequest('Application not found', 'application_not_found');
    }

    if (app.owner_id !== user.id) {
      return apiForbidden('Access denied');
    }

    // Get keys (without the hash)
    const { data, error, count } = await supabase
      .from('api_keys')
      .select('id, application_id, key_prefix, name, description, status, access_level, scopes, allowed_ip_addresses, last_used_at, last_used_ip, usage_count, expires_at, created_at, revoked_at, revoke_reason', { count: 'exact' })
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Keys fetch error:', error);
      return apiServerError('Failed to fetch API keys');
    }

    return apiSuccess(data, { total: count || 0 });
  } catch (error) {
    console.error('Keys API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/developer/keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    const body: CreateApiKeyInput = await request.json();

    if (!body.application_id) {
      return apiBadRequest('application_id is required', 'missing_application_id');
    }

    // Verify ownership and get application access level
    const { data: app, error: appError } = await supabase
      .from('api_applications')
      .select('owner_id, access_level')
      .eq('id', body.application_id)
      .single();

    if (appError || !app) {
      return apiBadRequest('Application not found', 'application_not_found');
    }

    if (app.owner_id !== user.id) {
      return apiForbidden('Access denied');
    }

    // Generate the API key based on access level
    const accessLevelPrefix = app.access_level === 'public' ? 'pub' :
                              app.access_level === 'partner' ? 'ptn' : 'le';
    const apiKey = generateApiKey(accessLevelPrefix);
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = getApiKeyPrefix(apiKey);

    // Create the key record
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        application_id: body.application_id,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        name: body.name?.trim() || null,
        description: body.description?.trim() || null,
        access_level: app.access_level,
        scopes: body.scopes || [],
        allowed_ip_addresses: body.allowed_ip_addresses || [],
        expires_at: body.expires_at || null,
        status: 'active',
      })
      .select('id, application_id, key_prefix, name, description, status, access_level, scopes, allowed_ip_addresses, expires_at, created_at')
      .single();

    if (error) {
      console.error('Key creation error:', error);
      return apiServerError('Failed to create API key');
    }

    // Return the full key only on creation
    const response: ApiKeyWithSecret = {
      ...data,
      last_used_at: undefined,
      last_used_ip: undefined,
      usage_count: 0,
      revoked_at: undefined,
      revoked_by: undefined,
      revoke_reason: undefined,
      key: apiKey,
    };

    return apiCreated(response);
  } catch (error) {
    console.error('Keys API error:', error);
    return apiServerError('Internal server error');
  }
}
