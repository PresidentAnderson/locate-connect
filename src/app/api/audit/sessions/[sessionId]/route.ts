/**
 * Individual Session Management API Routes (LC-FEAT-037)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapUserSessionFromDb } from '@/types/audit.types';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/audit/sessions/[sessionId]
 * Get a specific session
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Non-admin users can only see their own sessions
  const isAdmin = profile && ['admin', 'developer'].includes(profile.role);
  if (!isAdmin && data.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(mapUserSessionFromDb(data as Record<string, unknown>));
}

/**
 * PATCH /api/audit/sessions/[sessionId]
 * Update session (e.g., mark as suspicious, update activity)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Get existing session
  const { data: existingSession } = await supabase
    .from('user_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single();

  if (!existingSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Check permissions
  const isAdmin = profile && ['admin', 'developer'].includes(profile.role);
  if (!isAdmin && existingSession.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {
    last_activity_at: new Date().toISOString(),
  };

  // Only admins can mark sessions as suspicious
  if (isAdmin && body.isSuspicious !== undefined) {
    updateData.is_suspicious = body.isSuspicious;
    updateData.suspicious_reason = body.suspiciousReason;
  }

  const { data, error } = await supabase
    .from('user_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapUserSessionFromDb(data as Record<string, unknown>));
}

/**
 * DELETE /api/audit/sessions/[sessionId]
 * Terminate a session (logout)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Get existing session
  const { data: existingSession } = await supabase
    .from('user_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single();

  if (!existingSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Check permissions
  const isAdmin = profile && ['admin', 'developer'].includes(profile.role);
  if (!isAdmin && existingSession.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const logoutReason = searchParams.get('reason') || 'User terminated session';

  const { error } = await supabase
    .from('user_sessions')
    .update({
      is_active: false,
      logout_at: new Date().toISOString(),
      logout_reason: logoutReason,
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error terminating session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Session terminated' });
}
