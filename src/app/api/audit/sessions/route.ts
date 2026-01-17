/**
 * User Sessions API Routes (LC-FEAT-037)
 * Track and manage user sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapUserSessionFromDb } from '@/types/audit.types';

/**
 * GET /api/audit/sessions
 * Retrieve user sessions with filtering
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has admin/developer role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const activeOnly = searchParams.get('activeOnly') === 'true';
  const suspiciousOnly = searchParams.get('suspiciousOnly') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Non-admin users can only see their own sessions
  const isAdmin = ['admin', 'developer'].includes(profile.role);
  const targetUserId = isAdmin && userId ? userId : user.id;

  let query = supabase
    .from('user_sessions')
    .select('*', { count: 'exact' });

  // If not admin, only show own sessions
  if (!isAdmin || !userId) {
    query = query.eq('user_id', targetUserId);
  } else if (userId) {
    query = query.eq('user_id', userId);
  }

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  if (suspiciousOnly) {
    query = query.eq('is_suspicious', true);
  }

  query = query
    .order('login_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessions = (data || []).map((row) => mapUserSessionFromDb(row as Record<string, unknown>));

  return NextResponse.json({
    data: sessions,
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  });
}

/**
 * POST /api/audit/sessions
 * Create a new session record
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Get IP and user agent from request
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                    request.headers.get('x-real-ip') ||
                    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Parse user agent for device info
  const deviceInfo = parseUserAgent(userAgent);

  const sessionData = {
    user_id: user.id,
    session_token_hash: body.sessionTokenHash || generateHash(),
    refresh_token_hash: body.refreshTokenHash,
    device_id: body.deviceId,
    device_type: deviceInfo.deviceType,
    device_name: body.deviceName,
    browser: deviceInfo.browser,
    browser_version: deviceInfo.browserVersion,
    os: deviceInfo.os,
    os_version: deviceInfo.osVersion,
    ip_address: ipAddress,
    geo_country: body.geoCountry,
    geo_region: body.geoRegion,
    geo_city: body.geoCity,
    is_active: true,
    mfa_used: body.mfaUsed || false,
    mfa_method: body.mfaMethod,
    expires_at: body.expiresAt,
  };

  const { data, error } = await supabase
    .from('user_sessions')
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapUserSessionFromDb(data as Record<string, unknown>), { status: 201 });
}

// Helper functions
function parseUserAgent(userAgent: string): {
  deviceType: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
} {
  // Basic user agent parsing
  let deviceType = 'desktop';
  let browser = 'unknown';
  let browserVersion = '';
  let os = 'unknown';
  let osVersion = '';

  // Device type detection
  if (/mobile/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = 'tablet';
  }

  // Browser detection
  if (/chrome/i.test(userAgent)) {
    browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    if (match) browserVersion = match[1];
  } else if (/firefox/i.test(userAgent)) {
    browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    if (match) browserVersion = match[1];
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    if (match) browserVersion = match[1];
  } else if (/edge/i.test(userAgent)) {
    browser = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    if (match) browserVersion = match[1];
  }

  // OS detection
  if (/windows/i.test(userAgent)) {
    os = 'Windows';
    const match = userAgent.match(/Windows NT (\d+\.\d+)/);
    if (match) {
      const ntVersion = match[1];
      if (ntVersion === '10.0') osVersion = '10/11';
      else if (ntVersion === '6.3') osVersion = '8.1';
      else if (ntVersion === '6.2') osVersion = '8';
      else if (ntVersion === '6.1') osVersion = '7';
    }
  } else if (/mac os/i.test(userAgent)) {
    os = 'macOS';
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    if (match) osVersion = match[1].replace('_', '.');
  } else if (/linux/i.test(userAgent)) {
    os = 'Linux';
  } else if (/android/i.test(userAgent)) {
    os = 'Android';
    const match = userAgent.match(/Android (\d+)/);
    if (match) osVersion = match[1];
  } else if (/ios|iphone|ipad/i.test(userAgent)) {
    os = 'iOS';
    const match = userAgent.match(/OS (\d+)/);
    if (match) osVersion = match[1];
  }

  return { deviceType, browser, browserVersion, os, osVersion };
}

function generateHash(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
