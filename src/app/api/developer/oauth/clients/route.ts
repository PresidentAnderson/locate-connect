import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiBadRequest, apiUnauthorized, apiServerError, apiCreated, apiForbidden } from '@/lib/api/response';
import { generateClientId, generateClientSecret, hashApiKey } from '@/lib/api/crypto';
import type { CreateOAuthClientInput, OAuthClientWithSecret } from '@/types';

/**
 * GET /api/developer/oauth/clients
 * List OAuth clients for an application
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

    // Get OAuth clients (without secret hash)
    const { data, error } = await supabase
      .from('oauth_clients')
      .select('id, application_id, client_id, grant_types, redirect_uris, scopes, access_token_ttl_seconds, refresh_token_ttl_seconds, is_confidential, is_active, created_at, updated_at')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('OAuth clients fetch error:', error);
      return apiServerError('Failed to fetch OAuth clients');
    }

    return apiSuccess(data);
  } catch (error) {
    console.error('OAuth clients API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/developer/oauth/clients
 * Create a new OAuth client
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    const body: CreateOAuthClientInput = await request.json();

    if (!body.application_id) {
      return apiBadRequest('application_id is required', 'missing_application_id');
    }

    if (!body.redirect_uris || body.redirect_uris.length === 0) {
      return apiBadRequest('At least one redirect_uri is required', 'missing_redirect_uris');
    }

    // Validate redirect URIs
    for (const uri of body.redirect_uris) {
      try {
        const parsed = new URL(uri);
        // Allow localhost for development, require HTTPS for production
        if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1' && parsed.protocol !== 'https:') {
          return apiBadRequest('Production redirect URIs must use HTTPS', 'invalid_redirect_uri');
        }
      } catch {
        return apiBadRequest(`Invalid redirect URI: ${uri}`, 'invalid_redirect_uri');
      }
    }

    // Verify ownership of the application
    const { data: app, error: appError } = await supabase
      .from('api_applications')
      .select('owner_id')
      .eq('id', body.application_id)
      .single();

    if (appError || !app) {
      return apiBadRequest('Application not found', 'application_not_found');
    }

    if (app.owner_id !== user.id) {
      return apiForbidden('Access denied');
    }

    // Generate client credentials
    const clientId = generateClientId();
    const clientSecret = generateClientSecret();
    const clientSecretHash = hashApiKey(clientSecret);

    // Create the OAuth client
    const { data, error } = await supabase
      .from('oauth_clients')
      .insert({
        application_id: body.application_id,
        client_id: clientId,
        client_secret_hash: clientSecretHash,
        grant_types: body.grant_types || ['authorization_code'],
        redirect_uris: body.redirect_uris,
        scopes: body.scopes || [],
        access_token_ttl_seconds: body.access_token_ttl_seconds || 3600,
        refresh_token_ttl_seconds: body.refresh_token_ttl_seconds || 2592000,
        is_confidential: body.is_confidential ?? true,
        is_active: true,
      })
      .select('id, application_id, client_id, grant_types, redirect_uris, scopes, access_token_ttl_seconds, refresh_token_ttl_seconds, is_confidential, is_active, created_at, updated_at')
      .single();

    if (error) {
      console.error('OAuth client creation error:', error);
      return apiServerError('Failed to create OAuth client');
    }

    // Return with secret (only shown once)
    const response: OAuthClientWithSecret = {
      ...data,
      client_secret: clientSecret,
    };

    return apiCreated(response);
  } catch (error) {
    console.error('OAuth clients API error:', error);
    return apiServerError('Internal server error');
  }
}
