/**
 * Legal Holds API Routes (LC-FEAT-037)
 * Manage legal holds to prevent data deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface CreateLegalHoldInput {
  holdName: string;
  holdReference?: string;
  matterDescription?: string;
  custodians?: string[];
  tablesInScope?: string[];
  recordFilters?: Record<string, unknown>;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  expiresAt?: string;
  legalContact?: string;
}

/**
 * GET /api/compliance/legal-holds
 * List legal holds
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

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const activeOnly = searchParams.get('activeOnly') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('legal_holds')
    .select('*', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  query = query
    .order('effective_from', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching legal holds:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data || [],
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  });
}

/**
 * POST /api/compliance/legal-holds
 * Create a new legal hold
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

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body: CreateLegalHoldInput = await request.json();

  const holdData = {
    hold_name: body.holdName,
    hold_reference: body.holdReference,
    matter_description: body.matterDescription,
    custodians: body.custodians,
    tables_in_scope: body.tablesInScope || [
      'cases',
      'leads',
      'tips',
      'case_updates',
      'case_attachments',
      'comprehensive_audit_logs',
      'data_access_logs',
    ],
    record_filters: body.recordFilters,
    date_range_start: body.dateRangeStart,
    date_range_end: body.dateRangeEnd,
    is_active: true,
    status: 'active',
    effective_from: new Date().toISOString(),
    expires_at: body.expiresAt,
    created_by: user.id,
    legal_contact: body.legalContact,
  };

  const { data, error } = await supabase
    .from('legal_holds')
    .insert(holdData)
    .select()
    .single();

  if (error) {
    console.error('Error creating legal hold:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log audit event
  await supabase.from('comprehensive_audit_logs').insert({
    user_id: user.id,
    action: 'create',
    action_description: `Legal hold created: ${body.holdName}`,
    resource_type: 'legal_holds',
    resource_id: data.id,
    is_sensitive_data: true,
    compliance_relevant: true,
    new_values: holdData,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent'),
  });

  return NextResponse.json(data, { status: 201 });
}

/**
 * PATCH /api/compliance/legal-holds
 * Update a legal hold (including release)
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
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await request.json();

  if (!body.id) {
    return NextResponse.json({ error: 'Hold ID is required' }, { status: 400 });
  }

  // Get existing hold for audit
  const { data: existingHold } = await supabase
    .from('legal_holds')
    .select('*')
    .eq('id', body.id)
    .single();

  if (!existingHold) {
    return NextResponse.json({ error: 'Legal hold not found' }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  // Handle hold release
  if (body.release) {
    updateData.is_active = false;
    updateData.status = 'released';
    updateData.released_at = new Date().toISOString();
    updateData.released_by = user.id;
    updateData.release_reason = body.releaseReason;
  } else {
    if (body.holdName) updateData.hold_name = body.holdName;
    if (body.matterDescription !== undefined) updateData.matter_description = body.matterDescription;
    if (body.custodians) updateData.custodians = body.custodians;
    if (body.tablesInScope) updateData.tables_in_scope = body.tablesInScope;
    if (body.expiresAt !== undefined) updateData.expires_at = body.expiresAt;
    if (body.legalContact !== undefined) updateData.legal_contact = body.legalContact;
  }

  const { data, error } = await supabase
    .from('legal_holds')
    .update(updateData)
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating legal hold:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log audit event
  await supabase.from('comprehensive_audit_logs').insert({
    user_id: user.id,
    action: body.release ? 'update' : 'update',
    action_description: body.release
      ? `Legal hold released: ${existingHold.hold_name}`
      : `Legal hold updated: ${existingHold.hold_name}`,
    resource_type: 'legal_holds',
    resource_id: body.id,
    is_sensitive_data: true,
    compliance_relevant: true,
    old_values: existingHold,
    new_values: data,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent'),
  });

  return NextResponse.json(data);
}
