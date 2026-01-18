import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PartnerOrganizationUpdate } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/partners/[id]
 * Get a single partner organization
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: partner, error } = await supabase
    .from('partner_organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }
    console.error('Partner fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(partner);
}

/**
 * PUT /api/partners/[id]
 * Update a partner organization
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check user role or membership
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile && ['admin', 'developer'].includes(profile.role);

  // If not admin, check if user is a partner admin
  if (!isAdmin) {
    const { data: membership } = await supabase
      .from('partner_members')
      .select('role, can_manage_members')
      .eq('partner_id', id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const body = (await request.json()) as PartnerOrganizationUpdate;

  // Build update object, excluding status changes for non-admins
  const updateData: Record<string, unknown> = {};
  const allowedFields: (keyof PartnerOrganizationUpdate)[] = [
    'name',
    'type',
    'description',
    'logo_url',
    'contact_name',
    'contact_email',
    'contact_phone',
    'address',
    'city',
    'province',
    'postal_code',
    'website',
  ];

  // Admin-only fields
  const adminOnlyFields: (keyof PartnerOrganizationUpdate)[] = [
    'status',
    'access_level',
    'allowed_provinces',
    'allowed_case_types',
    'can_submit_tips',
    'can_view_updates',
    'can_access_api',
    'api_rate_limit',
    'onboarding_completed',
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (isAdmin) {
    for (const field of adminOnlyFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: partner, error: updateError } = await supabase
    .from('partner_organizations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Partner update error:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(partner);
}

/**
 * DELETE /api/partners/[id]
 * Delete a partner organization (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check user role (admin only)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error: deleteError } = await supabase
    .from('partner_organizations')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Partner delete error:', deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
