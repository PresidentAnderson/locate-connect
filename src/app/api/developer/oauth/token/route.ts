import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashApiKey, generateAccessToken, generateRefreshToken, verifyCodeChallenge } from '@/lib/api/crypto';
import type { OAuthTokenResponse, OAuthErrorResponse } from '@/types';

/**
 * POST /api/developer/oauth/token
 * OAuth 2.0 Token endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse request body (supports both form-urlencoded and JSON)
    let body: Record<string, string>;
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries()) as Record<string, string>;
    } else {
      body = await request.json();
    }

    const grantType = body.grant_type;
    const clientId = body.client_id;
    const clientSecret = body.client_secret;

    // Validate grant type
    if (!grantType) {
      return oauthError('invalid_request', 'grant_type is required');
    }

    if (!clientId) {
      return oauthError('invalid_request', 'client_id is required');
    }

    // Validate client
    const { data: client, error: clientError } = await supabase
      .from('oauth_clients')
      .select('id, client_secret_hash, grant_types, access_token_ttl_seconds, refresh_token_ttl_seconds, is_confidential, is_active, application_id')
      .eq('client_id', clientId)
      .single();

    if (clientError || !client) {
      return oauthError('invalid_client', 'Invalid client_id');
    }

    if (!client.is_active) {
      return oauthError('invalid_client', 'Client is inactive');
    }

    // Verify client secret for confidential clients
    if (client.is_confidential) {
      if (!clientSecret) {
        return oauthError('invalid_client', 'client_secret is required');
      }
      const secretHash = hashApiKey(clientSecret);
      if (secretHash !== client.client_secret_hash) {
        return oauthError('invalid_client', 'Invalid client credentials');
      }
    }

    // Check if grant type is allowed
    if (!client.grant_types.includes(grantType)) {
      return oauthError('unsupported_grant_type', `Grant type '${grantType}' is not allowed for this client`);
    }

    // Handle different grant types
    switch (grantType) {
      case 'authorization_code':
        return handleAuthorizationCodeGrant(supabase, client, body);
      case 'refresh_token':
        return handleRefreshTokenGrant(supabase, client, body);
      case 'client_credentials':
        return handleClientCredentialsGrant(supabase, client);
      default:
        return oauthError('unsupported_grant_type', `Unsupported grant type: ${grantType}`);
    }
  } catch (error) {
    console.error('OAuth token error:', error);
    return oauthError('server_error', 'Internal server error');
  }
}

async function handleAuthorizationCodeGrant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  client: {
    id: string;
    access_token_ttl_seconds: number;
    refresh_token_ttl_seconds: number;
    application_id: string;
  },
  body: Record<string, string>
): Promise<NextResponse> {
  const code = body.code;
  const redirectUri = body.redirect_uri;
  const codeVerifier = body.code_verifier;

  if (!code) {
    return oauthError('invalid_request', 'code is required');
  }

  if (!redirectUri) {
    return oauthError('invalid_request', 'redirect_uri is required');
  }

  // Find and validate authorization code
  const codeHash = hashApiKey(code);
  const { data: authCode, error: codeError } = await supabase
    .from('oauth_authorization_codes')
    .select('*')
    .eq('client_id', client.id)
    .eq('code_hash', codeHash)
    .single();

  if (codeError || !authCode) {
    return oauthError('invalid_grant', 'Invalid authorization code');
  }

  // Check if code was already used
  if (authCode.used_at) {
    return oauthError('invalid_grant', 'Authorization code has already been used');
  }

  // Check expiration
  if (new Date(authCode.expires_at) < new Date()) {
    return oauthError('invalid_grant', 'Authorization code has expired');
  }

  // Validate redirect URI
  if (authCode.redirect_uri !== redirectUri) {
    return oauthError('invalid_grant', 'redirect_uri does not match');
  }

  // Validate PKCE if code challenge was provided
  if (authCode.code_challenge) {
    if (!codeVerifier) {
      return oauthError('invalid_request', 'code_verifier is required');
    }

    const method = (authCode.code_challenge_method || 'S256') as 'S256' | 'plain';
    if (!verifyCodeChallenge(codeVerifier, authCode.code_challenge, method)) {
      return oauthError('invalid_grant', 'Invalid code_verifier');
    }
  }

  // Mark code as used
  await supabase
    .from('oauth_authorization_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', authCode.id);

  // Generate tokens
  const accessToken = generateAccessToken();
  const refreshToken = generateRefreshToken();
  const accessTokenHash = hashApiKey(accessToken);
  const refreshTokenHash = hashApiKey(refreshToken);

  const accessTokenExpiresAt = new Date(Date.now() + client.access_token_ttl_seconds * 1000);
  const refreshTokenExpiresAt = new Date(Date.now() + client.refresh_token_ttl_seconds * 1000);

  // Store access token
  const { data: tokenData, error: tokenError } = await supabase
    .from('oauth_access_tokens')
    .insert({
      client_id: client.id,
      user_id: authCode.user_id,
      token_hash: accessTokenHash,
      scopes: authCode.scopes,
      expires_at: accessTokenExpiresAt.toISOString(),
    })
    .select('id')
    .single();

  if (tokenError) {
    console.error('Token insert error:', tokenError);
    return oauthError('server_error', 'Failed to create access token');
  }

  // Store refresh token
  const { error: refreshError } = await supabase
    .from('oauth_refresh_tokens')
    .insert({
      access_token_id: tokenData.id,
      token_hash: refreshTokenHash,
      expires_at: refreshTokenExpiresAt.toISOString(),
    });

  if (refreshError) {
    console.error('Refresh token insert error:', refreshError);
    return oauthError('server_error', 'Failed to create refresh token');
  }

  const response: OAuthTokenResponse = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: client.access_token_ttl_seconds,
    refresh_token: refreshToken,
    scope: authCode.scopes.join(' '),
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
    },
  });
}

async function handleRefreshTokenGrant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  client: {
    id: string;
    access_token_ttl_seconds: number;
    refresh_token_ttl_seconds: number;
    application_id: string;
  },
  body: Record<string, string>
): Promise<NextResponse> {
  const refreshToken = body.refresh_token;

  if (!refreshToken) {
    return oauthError('invalid_request', 'refresh_token is required');
  }

  // Find and validate refresh token
  const refreshTokenHash = hashApiKey(refreshToken);
  const { data: tokenData, error: tokenError } = await supabase
    .from('oauth_refresh_tokens')
    .select(`
      id,
      expires_at,
      revoked_at,
      oauth_access_tokens!inner (
        id,
        client_id,
        user_id,
        scopes,
        revoked_at
      )
    `)
    .eq('token_hash', refreshTokenHash)
    .single();

  if (tokenError || !tokenData) {
    return oauthError('invalid_grant', 'Invalid refresh token');
  }

  // Check if revoked
  if (tokenData.revoked_at) {
    return oauthError('invalid_grant', 'Refresh token has been revoked');
  }

  // Check expiration
  if (new Date(tokenData.expires_at) < new Date()) {
    return oauthError('invalid_grant', 'Refresh token has expired');
  }

  const accessToken = tokenData.oauth_access_tokens as unknown as {
    id: string;
    client_id: string;
    user_id: string;
    scopes: string[];
    revoked_at: string | null;
  };

  // Verify client
  if (accessToken.client_id !== client.id) {
    return oauthError('invalid_grant', 'Token was not issued to this client');
  }

  // Revoke old tokens
  await supabase
    .from('oauth_access_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', accessToken.id);

  await supabase
    .from('oauth_refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenData.id);

  // Generate new tokens
  const newAccessToken = generateAccessToken();
  const newRefreshToken = generateRefreshToken();
  const accessTokenHash = hashApiKey(newAccessToken);
  const newRefreshTokenHash = hashApiKey(newRefreshToken);

  const accessTokenExpiresAt = new Date(Date.now() + client.access_token_ttl_seconds * 1000);
  const refreshTokenExpiresAt = new Date(Date.now() + client.refresh_token_ttl_seconds * 1000);

  // Store new access token
  const { data: newTokenData, error: newTokenError } = await supabase
    .from('oauth_access_tokens')
    .insert({
      client_id: client.id,
      user_id: accessToken.user_id,
      token_hash: accessTokenHash,
      scopes: accessToken.scopes,
      expires_at: accessTokenExpiresAt.toISOString(),
    })
    .select('id')
    .single();

  if (newTokenError) {
    console.error('Token insert error:', newTokenError);
    return oauthError('server_error', 'Failed to create access token');
  }

  // Store new refresh token
  const { error: refreshError } = await supabase
    .from('oauth_refresh_tokens')
    .insert({
      access_token_id: newTokenData.id,
      token_hash: newRefreshTokenHash,
      expires_at: refreshTokenExpiresAt.toISOString(),
    });

  if (refreshError) {
    console.error('Refresh token insert error:', refreshError);
    return oauthError('server_error', 'Failed to create refresh token');
  }

  const response: OAuthTokenResponse = {
    access_token: newAccessToken,
    token_type: 'Bearer',
    expires_in: client.access_token_ttl_seconds,
    refresh_token: newRefreshToken,
    scope: accessToken.scopes.join(' '),
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
    },
  });
}

async function handleClientCredentialsGrant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  client: {
    id: string;
    access_token_ttl_seconds: number;
    application_id: string;
  }
): Promise<NextResponse> {
  // For client credentials, we don't have a user
  // Generate access token only (no refresh token for this grant type)
  const accessToken = generateAccessToken();
  const accessTokenHash = hashApiKey(accessToken);
  const accessTokenExpiresAt = new Date(Date.now() + client.access_token_ttl_seconds * 1000);

  // Get application scopes
  const { data: app } = await supabase
    .from('api_applications')
    .select('access_level')
    .eq('id', client.application_id)
    .single();

  // Default scopes based on access level
  const defaultScopes = ['cases:read', 'statistics:read', 'alerts:read'];

  // Store access token
  const { error: tokenError } = await supabase
    .from('oauth_access_tokens')
    .insert({
      client_id: client.id,
      user_id: null, // No user for client credentials
      token_hash: accessTokenHash,
      scopes: defaultScopes,
      expires_at: accessTokenExpiresAt.toISOString(),
    });

  if (tokenError) {
    console.error('Token insert error:', tokenError);
    return oauthError('server_error', 'Failed to create access token');
  }

  const response: OAuthTokenResponse = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: client.access_token_ttl_seconds,
    scope: defaultScopes.join(' '),
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
    },
  });
}

function oauthError(error: string, description?: string): NextResponse {
  const response: OAuthErrorResponse = {
    error,
    error_description: description,
  };

  const status = error === 'invalid_client' ? 401 :
                 error === 'server_error' ? 500 : 400;

  return NextResponse.json(response, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
    },
  });
}
