/**
 * Data Retention Policies API Routes (LC-FEAT-037)
 * Manage data retention policies and enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ComplianceFramework, RetentionPolicyStatus } from '@/types/audit.types';

interface CreateRetentionPolicyInput {
  name: string;
  description?: string;
  tableName: string;
  recordFilter?: Record<string, unknown>;
  retentionPeriodDays: number;
  retentionBasis: string;
  applicableFrameworks?: ComplianceFramework[];
  actionOnExpiry: 'delete' | 'archive' | 'anonymize';
  archiveLocation?: string;
}

/**
 * GET /api/compliance/retention-policies
 * List data retention policies
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
  const status = searchParams.get('status') as RetentionPolicyStatus | null;
  const tableName = searchParams.get('tableName');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('data_retention_policies')
    .select('*', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  if (tableName) {
    query = query.eq('table_name', tableName);
  }

  query = query
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching retention policies:', error);
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
 * POST /api/compliance/retention-policies
 * Create a new retention policy
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

  const body: CreateRetentionPolicyInput = await request.json();

  const policyData = {
    name: body.name,
    description: body.description,
    table_name: body.tableName,
    record_filter: body.recordFilter,
    retention_period_days: body.retentionPeriodDays,
    retention_basis: body.retentionBasis,
    applicable_frameworks: body.applicableFrameworks,
    action_on_expiry: body.actionOnExpiry,
    archive_location: body.archiveLocation,
    status: 'active',
    is_active: true,
  };

  const { data, error } = await supabase
    .from('data_retention_policies')
    .insert(policyData)
    .select()
    .single();

  if (error) {
    console.error('Error creating retention policy:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

/**
 * PATCH /api/compliance/retention-policies
 * Update a retention policy
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
    return NextResponse.json({ error: 'Policy ID is required' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.name) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.retentionPeriodDays) updateData.retention_period_days = body.retentionPeriodDays;
  if (body.retentionBasis) updateData.retention_basis = body.retentionBasis;
  if (body.actionOnExpiry) updateData.action_on_expiry = body.actionOnExpiry;
  if (body.archiveLocation !== undefined) updateData.archive_location = body.archiveLocation;
  if (body.status) updateData.status = body.status;
  if (body.isActive !== undefined) updateData.is_active = body.isActive;

  const { data, error } = await supabase
    .from('data_retention_policies')
    .update(updateData)
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating retention policy:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
