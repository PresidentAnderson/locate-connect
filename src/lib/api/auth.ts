/**
 * API Authentication utilities
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashApiKey, getApiKeyPrefix } from './crypto';
import type { ApiAccessLevel, ApiScope, ACCESS_LEVEL_SCOPES } from '@/types';

export interface ApiAuthResult {
  isAuthenticated: boolean;
  applicationId?: string;
  accessLevel?: ApiAccessLevel;
  scopes?: string[];
  userId?: string;
  error?: string;
  errorCode?: string;
}

export interface ApiKeyInfo {
  id: string;
  application_id: string;
  access_level: ApiAccessLevel;
  scopes: string[];
  status: string;
}

/**
 * Extract API key from request headers
 */
export function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Check if it's an API key (starts with lc_)
    if (token.startsWith('lc_')) {
      return token;
    }
  }

  // Also check X-API-Key header
  const apiKeyHeader = request.headers.get('X-API-Key');
  if (apiKeyHeader?.startsWith('lc_')) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * Extract OAuth bearer token from request
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Make sure it's not an API key
    if (!token.startsWith('lc_')) {
      return token;
    }
  }

  return null;
}

/**
 * Authenticate request using API key
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<ApiAuthResult> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return {
      isAuthenticated: false,
      error: 'API key required',
      errorCode: 'missing_api_key',
    };
  }

  const supabase = await createClient();

  // Get key prefix and hash
  const keyPrefix = getApiKeyPrefix(apiKey);
  const keyHash = hashApiKey(apiKey);

  // Look up the API key
  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select(`
      id,
      application_id,
      access_level,
      scopes,
      status,
      expires_at,
      allowed_ip_addresses,
      api_applications!inner (
        id,
        is_active,
        access_level
      )
    `)
    .eq('key_prefix', keyPrefix)
    .eq('key_hash', keyHash)
    .single();

  if (error || !keyData) {
    return {
      isAuthenticated: false,
      error: 'Invalid API key',
      errorCode: 'invalid_api_key',
    };
  }

  // Check key status
  if (keyData.status !== 'active') {
    return {
      isAuthenticated: false,
      error: `API key is ${keyData.status}`,
      errorCode: 'api_key_inactive',
    };
  }

  // Check expiration
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return {
      isAuthenticated: false,
      error: 'API key has expired',
      errorCode: 'api_key_expired',
    };
  }

  // Check application status
  const app = keyData.api_applications as unknown as { id: string; is_active: boolean; access_level: ApiAccessLevel };
  if (!app.is_active) {
    return {
      isAuthenticated: false,
      error: 'Application is inactive',
      errorCode: 'application_inactive',
    };
  }

  // Check IP address if restrictions are set
  const allowedIPs = keyData.allowed_ip_addresses as string[];
  if (allowedIPs && allowedIPs.length > 0) {
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip');

    if (clientIP && !allowedIPs.includes(clientIP)) {
      return {
        isAuthenticated: false,
        error: 'IP address not allowed',
        errorCode: 'ip_not_allowed',
      };
    }
  }

  // Update last used timestamp
  await supabase
    .from('api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      last_used_ip: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      usage_count: (keyData as unknown as { usage_count: number }).usage_count + 1,
    })
    .eq('id', keyData.id);

  return {
    isAuthenticated: true,
    applicationId: keyData.application_id,
    accessLevel: keyData.access_level as ApiAccessLevel,
    scopes: keyData.scopes as string[],
  };
}

/**
 * Authenticate request using OAuth access token
 */
export async function authenticateOAuthToken(
  request: NextRequest
): Promise<ApiAuthResult> {
  const token = extractBearerToken(request);

  if (!token) {
    return {
      isAuthenticated: false,
      error: 'Bearer token required',
      errorCode: 'missing_token',
    };
  }

  const supabase = await createClient();
  const tokenHash = hashApiKey(token);

  // Look up the access token
  const { data: tokenData, error } = await supabase
    .from('oauth_access_tokens')
    .select(`
      id,
      client_id,
      user_id,
      scopes,
      expires_at,
      revoked_at,
      oauth_clients!inner (
        application_id,
        api_applications!inner (
          id,
          is_active,
          access_level
        )
      )
    `)
    .eq('token_hash', tokenHash)
    .single();

  if (error || !tokenData) {
    return {
      isAuthenticated: false,
      error: 'Invalid access token',
      errorCode: 'invalid_token',
    };
  }

  // Check if revoked
  if (tokenData.revoked_at) {
    return {
      isAuthenticated: false,
      error: 'Access token has been revoked',
      errorCode: 'token_revoked',
    };
  }

  // Check expiration
  if (new Date(tokenData.expires_at) < new Date()) {
    return {
      isAuthenticated: false,
      error: 'Access token has expired',
      errorCode: 'token_expired',
    };
  }

  const client = tokenData.oauth_clients as unknown as {
    application_id: string;
    api_applications: { id: string; is_active: boolean; access_level: ApiAccessLevel };
  };

  // Check application status
  if (!client.api_applications.is_active) {
    return {
      isAuthenticated: false,
      error: 'Application is inactive',
      errorCode: 'application_inactive',
    };
  }

  return {
    isAuthenticated: true,
    applicationId: client.application_id,
    accessLevel: client.api_applications.access_level,
    scopes: tokenData.scopes as string[],
    userId: tokenData.user_id || undefined,
  };
}

/**
 * Authenticate request (tries API key first, then OAuth token)
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<ApiAuthResult> {
  // Try API key authentication first
  const apiKey = extractApiKey(request);
  if (apiKey) {
    return authenticateApiKey(request);
  }

  // Try OAuth authentication
  const bearerToken = extractBearerToken(request);
  if (bearerToken) {
    return authenticateOAuthToken(request);
  }

  return {
    isAuthenticated: false,
    error: 'Authentication required. Provide an API key or OAuth access token.',
    errorCode: 'authentication_required',
  };
}

/**
 * Check if authentication result has required scope
 */
export function hasScope(auth: ApiAuthResult, requiredScope: string): boolean {
  if (!auth.isAuthenticated || !auth.scopes) {
    return false;
  }

  return auth.scopes.includes(requiredScope);
}

/**
 * Check if authentication result has any of the required scopes
 */
export function hasAnyScope(auth: ApiAuthResult, requiredScopes: string[]): boolean {
  if (!auth.isAuthenticated || !auth.scopes) {
    return false;
  }

  return requiredScopes.some(scope => auth.scopes!.includes(scope));
}

/**
 * Check if authentication result has all required scopes
 */
export function hasAllScopes(auth: ApiAuthResult, requiredScopes: string[]): boolean {
  if (!auth.isAuthenticated || !auth.scopes) {
    return false;
  }

  return requiredScopes.every(scope => auth.scopes!.includes(scope));
}

/**
 * Check if access level meets minimum requirement
 */
export function meetsAccessLevel(
  auth: ApiAuthResult,
  minimumLevel: ApiAccessLevel
): boolean {
  if (!auth.isAuthenticated || !auth.accessLevel) {
    return false;
  }

  const levels: ApiAccessLevel[] = ['public', 'partner', 'law_enforcement'];
  const currentIndex = levels.indexOf(auth.accessLevel);
  const requiredIndex = levels.indexOf(minimumLevel);

  return currentIndex >= requiredIndex;
}
