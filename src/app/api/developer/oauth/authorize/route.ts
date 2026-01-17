import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiBadRequest, apiUnauthorized, apiServerError } from '@/lib/api/response';
import { generateAuthorizationCode, hashApiKey } from '@/lib/api/crypto';

/**
 * GET /api/developer/oauth/authorize
 * OAuth 2.0 Authorization endpoint
 * This renders an authorization page where the user can approve the request
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Extract OAuth parameters
    const clientId = searchParams.get('client_id');
    const redirectUri = searchParams.get('redirect_uri');
    const responseType = searchParams.get('response_type');
    const scope = searchParams.get('scope');
    const state = searchParams.get('state');
    const codeChallenge = searchParams.get('code_challenge');
    const codeChallengeMethod = searchParams.get('code_challenge_method');

    // Validate required parameters
    if (!clientId) {
      return apiBadRequest('client_id is required', 'invalid_request');
    }

    if (responseType !== 'code') {
      return apiBadRequest('response_type must be "code"', 'unsupported_response_type');
    }

    if (!redirectUri) {
      return apiBadRequest('redirect_uri is required', 'invalid_request');
    }

    // Validate client
    const { data: client, error: clientError } = await supabase
      .from('oauth_clients')
      .select(`
        id, client_id, redirect_uris, scopes, is_active,
        api_applications!inner (name, logo_url)
      `)
      .eq('client_id', clientId)
      .single();

    if (clientError || !client) {
      return apiBadRequest('Invalid client_id', 'invalid_client');
    }

    if (!client.is_active) {
      return apiBadRequest('Client is inactive', 'invalid_client');
    }

    // Validate redirect URI
    if (!client.redirect_uris.includes(redirectUri)) {
      return apiBadRequest('Invalid redirect_uri', 'invalid_redirect_uri');
    }

    // Validate code challenge method if provided
    if (codeChallengeMethod && !['S256', 'plain'].includes(codeChallengeMethod)) {
      return apiBadRequest('Invalid code_challenge_method', 'invalid_request');
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // Redirect to login with return URL
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('return_to', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // For now, render a simple HTML authorization page
    // In production, this would redirect to a proper React page
    const app = client.api_applications as unknown as { name: string; logo_url?: string };
    const requestedScopes = scope?.split(' ').filter(Boolean) || [];

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Authorize ${app.name} - LocateConnect</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f3f4f6; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: white; border-radius: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 400px; width: 100%; padding: 2rem; }
    .logo { width: 64px; height: 64px; border-radius: 0.5rem; margin: 0 auto 1rem; display: block; background: #e5e7eb; object-fit: cover; }
    h1 { font-size: 1.25rem; text-align: center; margin-bottom: 0.5rem; }
    .subtitle { color: #6b7280; text-align: center; margin-bottom: 1.5rem; }
    .scopes { background: #f9fafb; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem; }
    .scopes h2 { font-size: 0.875rem; color: #374151; margin-bottom: 0.5rem; }
    .scope { display: flex; align-items: center; padding: 0.5rem 0; color: #4b5563; font-size: 0.875rem; }
    .scope::before { content: ""; width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-right: 0.75rem; }
    .buttons { display: flex; gap: 1rem; }
    button { flex: 1; padding: 0.75rem 1rem; border-radius: 0.5rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
    .deny { background: white; border: 1px solid #d1d5db; color: #374151; }
    .deny:hover { background: #f9fafb; }
    .allow { background: #0891b2; border: none; color: white; }
    .allow:hover { background: #0e7490; }
  </style>
</head>
<body>
  <div class="card">
    ${app.logo_url ? `<img src="${app.logo_url}" alt="${app.name}" class="logo">` : '<div class="logo"></div>'}
    <h1>Authorize ${app.name}</h1>
    <p class="subtitle">${app.name} wants to access your LocateConnect account</p>

    ${requestedScopes.length > 0 ? `
    <div class="scopes">
      <h2>This application will be able to:</h2>
      ${requestedScopes.map(s => `<div class="scope">${getScopeDescription(s)}</div>`).join('')}
    </div>
    ` : ''}

    <form method="POST" action="/api/developer/oauth/authorize">
      <input type="hidden" name="client_id" value="${clientId}">
      <input type="hidden" name="redirect_uri" value="${redirectUri}">
      <input type="hidden" name="scope" value="${scope || ''}">
      <input type="hidden" name="state" value="${state || ''}">
      <input type="hidden" name="code_challenge" value="${codeChallenge || ''}">
      <input type="hidden" name="code_challenge_method" value="${codeChallengeMethod || ''}">

      <div class="buttons">
        <button type="submit" name="action" value="deny" class="deny">Deny</button>
        <button type="submit" name="action" value="allow" class="allow">Allow</button>
      </div>
    </form>
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('OAuth authorize error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/developer/oauth/authorize
 * Handle the authorization decision
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    const formData = await request.formData();
    const action = formData.get('action');
    const clientId = formData.get('client_id') as string;
    const redirectUri = formData.get('redirect_uri') as string;
    const scope = formData.get('scope') as string;
    const state = formData.get('state') as string;
    const codeChallenge = formData.get('code_challenge') as string;
    const codeChallengeMethod = formData.get('code_challenge_method') as string;

    // Build redirect URL
    const redirectUrl = new URL(redirectUri);

    // If denied, redirect with error
    if (action === 'deny') {
      redirectUrl.searchParams.set('error', 'access_denied');
      redirectUrl.searchParams.set('error_description', 'User denied the request');
      if (state) redirectUrl.searchParams.set('state', state);
      return NextResponse.redirect(redirectUrl);
    }

    // Validate client again
    const { data: client, error: clientError } = await supabase
      .from('oauth_clients')
      .select('id, redirect_uris, is_active')
      .eq('client_id', clientId)
      .single();

    if (clientError || !client || !client.is_active) {
      redirectUrl.searchParams.set('error', 'invalid_client');
      if (state) redirectUrl.searchParams.set('state', state);
      return NextResponse.redirect(redirectUrl);
    }

    if (!client.redirect_uris.includes(redirectUri)) {
      redirectUrl.searchParams.set('error', 'invalid_redirect_uri');
      if (state) redirectUrl.searchParams.set('state', state);
      return NextResponse.redirect(redirectUrl);
    }

    // Generate authorization code
    const code = generateAuthorizationCode();
    const codeHash = hashApiKey(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store authorization code
    const { error: insertError } = await supabase
      .from('oauth_authorization_codes')
      .insert({
        client_id: client.id,
        user_id: user.id,
        code_hash: codeHash,
        redirect_uri: redirectUri,
        scopes: scope?.split(' ').filter(Boolean) || [],
        code_challenge: codeChallenge || null,
        code_challenge_method: codeChallengeMethod || null,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Authorization code insert error:', insertError);
      redirectUrl.searchParams.set('error', 'server_error');
      if (state) redirectUrl.searchParams.set('state', state);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect with authorization code
    redirectUrl.searchParams.set('code', code);
    if (state) redirectUrl.searchParams.set('state', state);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth authorize POST error:', error);
    return apiServerError('Internal server error');
  }
}

function getScopeDescription(scope: string): string {
  const descriptions: Record<string, string> = {
    'cases:read': 'View public case information',
    'cases:read:detailed': 'View detailed case information',
    'cases:write': 'Create and update cases',
    'leads:read': 'View leads',
    'leads:write': 'Create and update leads',
    'tips:write': 'Submit tips',
    'tips:read': 'View tips',
    'webhooks:manage': 'Manage webhooks',
    'statistics:read': 'View statistics',
    'statistics:read:detailed': 'View detailed statistics',
    'alerts:read': 'View active alerts',
    'alerts:subscribe': 'Subscribe to alert notifications',
  };

  return descriptions[scope] || scope;
}
