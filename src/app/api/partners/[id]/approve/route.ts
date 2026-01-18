import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/partners/[id]/approve
 * Approve a pending partner organization
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

  // Check user role (admin/developer/law_enforcement only)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer', 'law_enforcement'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get the partner
  const { data: partner, error: fetchError } = await supabase
    .from('partner_organizations')
    .select('status')
    .eq('id', partnerId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (partner.status !== 'pending') {
    return NextResponse.json(
      { error: `Partner is already ${partner.status}` },
      { status: 400 }
    );
  }

  // Parse optional body for access level
  let accessLevel = 'view_only';
  try {
    const body = await request.json();
    if (body.access_level) {
      accessLevel = body.access_level;
    }
  } catch {
    // No body provided, use defaults
  }

  // Approve the partner
  const { data: updated, error: updateError } = await supabase
    .from('partner_organizations')
    .update({
      status: 'active',
      access_level: accessLevel,
      verified_at: new Date().toISOString(),
      verified_by: user.id,
    })
    .eq('id', partnerId)
    .select()
    .single();

  if (updateError) {
    console.error('Partner approval error:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log the activity
  await supabase.from('partner_activity_log').insert({
    partner_id: partnerId,
    user_id: user.id,
    activity_type: 'api_access',
    description: `Partnership request approved by ${profile.role}`,
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/partners/[id]/approve
 * Reject a pending partner organization (or suspend an active one)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

  // Check user role (admin/developer only)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get the partner
  const { data: partner, error: fetchError } = await supabase
    .from('partner_organizations')
    .select('status, name')
    .eq('id', partnerId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Determine new status
  const newStatus = partner.status === 'pending' ? 'inactive' : 'suspended';

  // Update the partner
  const { data: updated, error: updateError } = await supabase
    .from('partner_organizations')
    .update({
      status: newStatus,
    })
    .eq('id', partnerId)
    .select()
    .single();

  if (updateError) {
    console.error('Partner rejection error:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log the activity
  await supabase.from('partner_activity_log').insert({
    partner_id: partnerId,
    user_id: user.id,
    activity_type: 'api_access',
    description: partner.status === 'pending'
      ? `Partnership request rejected`
      : `Partnership suspended`,
  });

  return NextResponse.json(updated);
}
