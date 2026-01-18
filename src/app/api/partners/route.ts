import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type {
  PartnerOrganization,
  PartnerOrganizationInsert,
  PartnerListResponse,
  PartnerOrgType,
  PartnerStatus,
  PartnerAccessLevel,
} from '@/types';

/**
 * GET /api/partners
 * List partner organizations with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer', 'law_enforcement'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const type = searchParams.get('type') as PartnerOrgType | null;
  const status = searchParams.get('status') as PartnerStatus | null;
  const accessLevel = searchParams.get('access_level') as PartnerAccessLevel | null;
  const province = searchParams.get('province');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = Math.min(parseInt(searchParams.get('page_size') || '20'), 100);

  let query = supabase
    .from('partner_organizations')
    .select('*', { count: 'exact' });

  // Apply filters
  if (search) {
    query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%`);
  }

  if (type) {
    query = query.eq('type', type);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (accessLevel) {
    query = query.eq('access_level', accessLevel);
  }

  if (province) {
    query = query.eq('province', province);
  }

  // Pagination
  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize - 1);

  // Order by most recent
  query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error('Partners list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response: PartnerListResponse = {
    data: data as PartnerOrganization[],
    total: count || 0,
    page,
    page_size: pageSize,
  };

  return NextResponse.json(response);
}

/**
 * POST /api/partners
 * Create a new partner organization
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check user role (admin/developer can create, or self-registration creates pending)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const body = (await request.json()) as PartnerOrganizationInsert;

  // Validate required fields
  if (!body.name || !body.type || !body.contact_name || !body.contact_email || !body.address) {
    return NextResponse.json(
      { error: 'Missing required fields: name, type, contact_name, contact_email, address' },
      { status: 400 }
    );
  }

  // Determine initial status based on who is creating
  const isAdmin = ['admin', 'developer'].includes(profile.role);
  const initialStatus = isAdmin ? 'active' : 'pending';

  const { data: partner, error: insertError } = await supabase
    .from('partner_organizations')
    .insert({
      name: body.name,
      type: body.type,
      status: initialStatus,
      contact_name: body.contact_name,
      contact_email: body.contact_email,
      contact_phone: body.contact_phone,
      address: body.address,
      city: body.city,
      province: body.province,
      postal_code: body.postal_code,
      country: body.country || 'Canada',
      website: body.website,
      description: body.description,
      access_level: body.access_level || 'view_only',
    })
    .select()
    .single();

  if (insertError) {
    console.error('Partner creation error:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // If self-registration, add the creator as an admin member
  if (!isAdmin) {
    await supabase.from('partner_members').insert({
      partner_id: partner.id,
      user_id: user.id,
      email: body.contact_email,
      name: body.contact_name,
      role: 'admin',
      can_submit_tips: true,
      can_view_cases: true,
      can_manage_members: true,
      can_access_api: false,
      accepted_at: new Date().toISOString(),
    });
  }

  return NextResponse.json(partner, { status: 201 });
}
