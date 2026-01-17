/**
 * Data Subject Requests API Routes (LC-FEAT-037)
 * Handle GDPR/PIPEDA data subject rights requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  DataRequestType,
  DataRequestStatus,
  ComplianceFramework,
  ViolationSeverity,
  mapDataSubjectRequestFromDb,
} from '@/types/audit.types';

interface CreateDataRequestInput {
  requestType: DataRequestType;
  requestDescription?: string;
  specificDataRequested?: string[];
  applicableFramework?: ComplianceFramework;
}

/**
 * GET /api/compliance/data-requests
 * List data subject requests
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

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') as DataRequestStatus | null;
  const requestType = searchParams.get('requestType') as DataRequestType | null;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const isAdmin = ['admin', 'developer'].includes(profile.role);

  let query = supabase
    .from('data_subject_requests')
    .select('*', { count: 'exact' });

  // Non-admin users can only see their own requests
  if (!isAdmin) {
    query = query.eq('requestor_id', user.id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (requestType) {
    query = query.eq('request_type', requestType);
  }

  query = query
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching data requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const requests = (data || []).map((row) =>
    mapDataSubjectRequestFromDb(row as Record<string, unknown>)
  );

  return NextResponse.json({
    data: requests,
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  });
}

/**
 * POST /api/compliance/data-requests
 * Create a new data subject request
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

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, first_name, last_name, phone')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const body: CreateDataRequestInput = await request.json();

  // Calculate due date (30 days for GDPR/PIPEDA)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const requestData = {
    requestor_id: user.id,
    requestor_email: profile.email,
    requestor_name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null,
    requestor_phone: profile.phone,
    request_type: body.requestType,
    request_description: body.requestDescription,
    specific_data_requested: body.specificDataRequested,
    applicable_framework: body.applicableFramework || 'pipeda',
    status: 'submitted',
    priority: 'medium' as ViolationSeverity,
    submitted_at: new Date().toISOString(),
    acknowledged_at: new Date().toISOString(), // Auto-acknowledge
    due_date: dueDate.toISOString(),
    processing_log: [
      {
        timestamp: new Date().toISOString(),
        action: 'Request submitted',
        performedBy: 'system',
        notes: 'Request automatically acknowledged',
      },
    ],
  };

  const { data, error } = await supabase
    .from('data_subject_requests')
    .insert(requestData)
    .select()
    .single();

  if (error) {
    console.error('Error creating data request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    mapDataSubjectRequestFromDb(data as Record<string, unknown>),
    { status: 201 }
  );
}

/**
 * PATCH /api/compliance/data-requests
 * Update a data subject request (admin only)
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await request.json();

  if (!body.id) {
    return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
  }

  // Get existing request
  const { data: existingRequest } = await supabase
    .from('data_subject_requests')
    .select('processing_log')
    .eq('id', body.id)
    .single();

  if (!existingRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  const processingLog = existingRequest.processing_log || [];

  if (body.status) {
    updateData.status = body.status;
    processingLog.push({
      timestamp: new Date().toISOString(),
      action: `Status changed to ${body.status}`,
      performedBy: profile.email,
      notes: body.statusNotes,
    });

    if (body.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
  }

  if (body.assignedTo) {
    updateData.assigned_to = body.assignedTo;
  }

  if (body.identityVerified !== undefined) {
    updateData.identity_verified = body.identityVerified;
    if (body.identityVerified) {
      updateData.identity_verified_at = new Date().toISOString();
      updateData.identity_verified_by = user.id;
      updateData.verification_method = body.verificationMethod;
    }
  }

  if (body.responseNotes) {
    updateData.response_notes = body.responseNotes;
  }

  if (body.dataProvided) {
    updateData.data_provided = body.dataProvided;
  }

  if (body.denialReason) {
    updateData.denial_reason = body.denialReason;
  }

  if (body.priority) {
    updateData.priority = body.priority;
  }

  updateData.processing_log = processingLog;

  const { data, error } = await supabase
    .from('data_subject_requests')
    .update(updateData)
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating data request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapDataSubjectRequestFromDb(data as Record<string, unknown>));
}
