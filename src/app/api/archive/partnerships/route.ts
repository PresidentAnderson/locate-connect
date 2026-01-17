import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/archive/partnerships
 * List academic partnerships
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') || 'active';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let dbQuery = supabase
      .from('academic_partnerships')
      .select('*', { count: 'exact' });

    if (status !== 'all') {
      dbQuery = dbQuery.eq('status', status);
    }

    const offset = (page - 1) * pageSize;
    dbQuery = dbQuery
      .range(offset, offset + pageSize - 1)
      .order('institution_name', { ascending: true });

    const { data, error, count } = await dbQuery;

    if (error) {
      console.error('Partnerships query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch partnerships' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      partnerships: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Partnerships API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/archive/partnerships
 * Create a new partnership application
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'institutionName',
      'institutionType',
      'primaryContactName',
      'primaryContactEmail',
      'partnershipType',
      'accessLevel',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('academic_partnerships')
      .insert({
        institution_name: body.institutionName,
        institution_type: body.institutionType,
        department: body.department,
        address: body.address,
        city: body.city,
        province: body.province,
        postal_code: body.postalCode,
        country: body.country || 'CA',
        website: body.website,
        primary_contact_name: body.primaryContactName,
        primary_contact_email: body.primaryContactEmail,
        primary_contact_phone: body.primaryContactPhone,
        primary_contact_position: body.primaryContactPosition,
        secondary_contact_name: body.secondaryContactName,
        secondary_contact_email: body.secondaryContactEmail,
        secondary_contact_phone: body.secondaryContactPhone,
        partnership_type: body.partnershipType,
        focus_areas: body.focusAreas || [],
        access_level: body.accessLevel,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Create partnership error:', error);
      return NextResponse.json(
        { error: 'Failed to submit partnership application' },
        { status: 500 }
      );
    }

    // Log activity if user is logged in
    if (user) {
      await supabase.from('research_activity_logs').insert({
        user_id: user.id,
        action: 'submit_partnership',
        resource_type: 'partnership',
        resource_id: data.id,
        details: {
          institutionName: body.institutionName,
          partnershipType: body.partnershipType,
        },
      });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Partnership submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/archive/partnerships
 * Update partnership status (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'developer'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { partnershipId, status, approvalNotes, mouSignedDate, mouExpiryDate } = body;

    if (!partnershipId) {
      return NextResponse.json(
        { error: 'Missing partnership ID' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;
    }

    if (status === 'active') {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    }

    if (approvalNotes !== undefined) {
      updateData.approval_notes = approvalNotes;
    }

    if (mouSignedDate) {
      updateData.mou_signed_date = mouSignedDate;
    }

    if (mouExpiryDate) {
      updateData.mou_expiry_date = mouExpiryDate;
    }

    const { data, error } = await supabase
      .from('academic_partnerships')
      .update(updateData)
      .eq('id', partnershipId)
      .select()
      .single();

    if (error) {
      console.error('Update partnership error:', error);
      return NextResponse.json(
        { error: 'Failed to update partnership' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('research_activity_logs').insert({
      user_id: user.id,
      action: 'update_partnership',
      resource_type: 'partnership',
      resource_id: partnershipId,
      details: { status, approvalNotes },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Partnership update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
