import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PartnerMember, PartnerMemberInsert } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/partners/[id]/members
 * List members of a partner organization
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: partnerId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('include_inactive') === 'true';

  let query = supabase
    .from('partner_members')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Partner members fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as PartnerMember[]);
}

/**
 * POST /api/partners/[id]/members
 * Invite a new member to a partner organization
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: partnerId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user can manage members
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile && ['admin', 'developer'].includes(profile.role);

  if (!isAdmin) {
    const { data: membership } = await supabase
      .from('partner_members')
      .select('can_manage_members')
      .eq('partner_id', partnerId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership?.can_manage_members) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const body = (await request.json()) as PartnerMemberInsert;

  if (!body.email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Check if member already exists
  const { data: existing } = await supabase
    .from('partner_members')
    .select('id, is_active')
    .eq('partner_id', partnerId)
    .eq('email', body.email)
    .single();

  if (existing) {
    if (existing.is_active) {
      return NextResponse.json({ error: 'Member already exists' }, { status: 409 });
    }
    // Reactivate inactive member
    const { data: reactivated, error: reactivateError } = await supabase
      .from('partner_members')
      .update({
        is_active: true,
        name: body.name,
        role: body.role || 'member',
        can_submit_tips: body.can_submit_tips ?? true,
        can_view_cases: body.can_view_cases ?? true,
        can_manage_members: body.can_manage_members ?? false,
        can_access_api: body.can_access_api ?? false,
        invited_at: new Date().toISOString(),
        accepted_at: null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (reactivateError) {
      return NextResponse.json({ error: reactivateError.message }, { status: 500 });
    }

    return NextResponse.json(reactivated, { status: 200 });
  }

  // Check if user already has an account
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', body.email)
    .single();

  const { data: member, error: insertError } = await supabase
    .from('partner_members')
    .insert({
      partner_id: partnerId,
      user_id: existingUser?.id || null,
      email: body.email,
      name: body.name,
      role: body.role || 'member',
      can_submit_tips: body.can_submit_tips ?? true,
      can_view_cases: body.can_view_cases ?? true,
      can_manage_members: body.can_manage_members ?? false,
      can_access_api: body.can_access_api ?? false,
      accepted_at: existingUser ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Member invite error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Log the activity
  await supabase.from('partner_activity_log').insert({
    partner_id: partnerId,
    user_id: user.id,
    activity_type: 'api_access',
    description: `Invited ${body.email} to the organization`,
  });

  return NextResponse.json(member as PartnerMember, { status: 201 });
}
