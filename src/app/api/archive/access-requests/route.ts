import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/archive/access-requests
 * Get user's access requests or all requests (admin)
 */
export async function GET(request: NextRequest) {
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

    const isAdmin = profile && ['admin', 'developer'].includes(profile.role);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let dbQuery = supabase
      .from('research_access_requests')
      .select('*', { count: 'exact' });

    // Non-admins can only see their own requests
    if (!isAdmin) {
      dbQuery = dbQuery.eq('requester_id', user.id);
    }

    if (status) {
      dbQuery = dbQuery.eq('status', status);
    }

    const offset = (page - 1) * pageSize;
    dbQuery = dbQuery
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await dbQuery;

    if (error) {
      console.error('Access requests query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch access requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      requests: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Access requests API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/archive/access-requests
 * Submit a new research access request
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'requesterName',
      'requesterEmail',
      'organizationName',
      'organizationType',
      'accessLevelRequested',
      'researchCategory',
      'researchTitle',
      'researchDescription',
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
      .from('research_access_requests')
      .insert({
        requester_id: user.id,
        requester_name: body.requesterName,
        requester_email: body.requesterEmail,
        requester_phone: body.requesterPhone,
        organization_name: body.organizationName,
        organization_type: body.organizationType,
        position_title: body.positionTitle,
        access_level_requested: body.accessLevelRequested,
        research_purpose: body.researchPurpose,
        research_category: body.researchCategory,
        research_title: body.researchTitle,
        research_description: body.researchDescription,
        methodology: body.methodology,
        expected_outcomes: body.expectedOutcomes,
        ethics_approval_number: body.ethicsApprovalNumber,
        ethics_approval_document_url: body.ethicsApprovalDocumentUrl,
        requested_date_range_start: body.requestedDateRangeStart,
        requested_date_range_end: body.requestedDateRangeEnd,
        requested_regions: body.requestedRegions,
        requested_case_types: body.requestedCaseTypes,
        requested_fields: body.requestedFields,
        estimated_cases_needed: body.estimatedCasesNeeded,
        access_duration_months: body.accessDurationMonths || 12,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Create access request error:', error);
      return NextResponse.json(
        { error: 'Failed to submit access request' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('research_activity_logs').insert({
      user_id: user.id,
      action: 'submit_request',
      resource_type: 'access_request',
      resource_id: data.id,
      details: {
        researchTitle: body.researchTitle,
        accessLevel: body.accessLevelRequested,
      },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Access request submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/archive/access-requests
 * Review an access request (admin only)
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
    const { requestId, status, reviewNotes, denialReason } = body;

    if (!requestId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
    };

    if (status === 'denied') {
      updateData.denial_reason = denialReason;
    }

    if (status === 'approved') {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 12); // Default 12 months access

      updateData.access_start_date = startDate.toISOString().split('T')[0];
      updateData.access_end_date = endDate.toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('research_access_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Update access request error:', error);
      return NextResponse.json(
        { error: 'Failed to update access request' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('research_activity_logs').insert({
      user_id: user.id,
      action: `review_${status}`,
      resource_type: 'access_request',
      resource_id: requestId,
      details: { status, reviewNotes },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Access request review error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
