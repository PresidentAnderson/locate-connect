/**
 * Compliance Violations API Routes (LC-FEAT-037)
 * Track and manage compliance violations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ComplianceFramework,
  ViolationSeverity,
  RemediationStatus,
  mapComplianceViolationFromDb,
} from '@/types/audit.types';

interface CreateViolationInput {
  violationCode?: string;
  title: string;
  description?: string;
  framework?: ComplianceFramework;
  requirementId?: string;
  severity: ViolationSeverity;
  detectedBy: string;
  affectedResourceType?: string;
  affectedResourceId?: string;
  affectedUsers?: number;
  evidence?: unknown[];
  auditLogIds?: string[];
}

/**
 * GET /api/compliance/violations
 * List compliance violations
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
  const status = searchParams.get('status') as RemediationStatus | null;
  const severity = searchParams.get('severity') as ViolationSeverity | null;
  const framework = searchParams.get('framework') as ComplianceFramework | null;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('compliance_violations')
    .select('*', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  if (severity) {
    query = query.eq('severity', severity);
  }

  if (framework) {
    query = query.eq('framework', framework);
  }

  query = query
    .order('detected_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching compliance violations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const violations = (data || []).map((row) =>
    mapComplianceViolationFromDb(row as Record<string, unknown>)
  );

  return NextResponse.json({
    data: violations,
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  });
}

/**
 * POST /api/compliance/violations
 * Create a new compliance violation
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

  const body: CreateViolationInput = await request.json();

  const violationData = {
    violation_code: body.violationCode,
    title: body.title,
    description: body.description,
    framework: body.framework,
    requirement_id: body.requirementId,
    severity: body.severity,
    detected_at: new Date().toISOString(),
    detected_by: body.detectedBy,
    detector_id: user.id,
    affected_resource_type: body.affectedResourceType,
    affected_resource_id: body.affectedResourceId,
    affected_users: body.affectedUsers,
    evidence: body.evidence,
    audit_log_ids: body.auditLogIds,
    status: 'open',
  };

  const { data, error } = await supabase
    .from('compliance_violations')
    .insert(violationData)
    .select()
    .single();

  if (error) {
    console.error('Error creating compliance violation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    mapComplianceViolationFromDb(data as Record<string, unknown>),
    { status: 201 }
  );
}

/**
 * PATCH /api/compliance/violations
 * Update a compliance violation
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
    return NextResponse.json({ error: 'Violation ID is required' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.status) {
    updateData.status = body.status;
    if (body.status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = user.id;
    }
    if (body.status === 'verified') {
      updateData.verified_at = new Date().toISOString();
      updateData.verified_by = user.id;
    }
  }

  if (body.assignedTo) {
    updateData.assigned_to = body.assignedTo;
  }

  if (body.resolutionNotes) {
    updateData.resolution_notes = body.resolutionNotes;
  }

  if (body.resolutionEvidence) {
    updateData.resolution_evidence = body.resolutionEvidence;
  }

  if (body.actualImpact) {
    updateData.actual_impact = body.actualImpact;
  }

  const { data, error } = await supabase
    .from('compliance_violations')
    .update(updateData)
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating compliance violation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapComplianceViolationFromDb(data as Record<string, unknown>));
}
