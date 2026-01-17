/**
 * Compliance Requirements API Routes (LC-FEAT-037)
 * Manage compliance requirements per framework
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ComplianceFramework, ComplianceStatus } from '@/types/audit.types';

/**
 * GET /api/compliance/requirements
 * List compliance requirements
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
  const framework = searchParams.get('framework') as ComplianceFramework | null;
  const status = searchParams.get('status') as ComplianceStatus | null;
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('compliance_requirements')
    .select('*', { count: 'exact' });

  if (framework) {
    query = query.eq('framework', framework);
  }

  if (status) {
    query = query.eq('implementation_status', status);
  }

  if (category) {
    query = query.eq('category', category);
  }

  query = query
    .order('requirement_code', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching compliance requirements:', error);
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
 * PATCH /api/compliance/requirements
 * Update a compliance requirement's status
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
    return NextResponse.json({ error: 'Requirement ID is required' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    last_reviewed_at: new Date().toISOString(),
    last_reviewed_by: user.id,
  };

  if (body.implementationStatus) {
    updateData.implementation_status = body.implementationStatus;
  }

  if (body.implementationNotes) {
    updateData.implementation_notes = body.implementationNotes;
  }

  if (body.evidenceProvided) {
    updateData.evidence_provided = body.evidenceProvided;
  }

  if (body.nextReviewAt) {
    updateData.next_review_at = body.nextReviewAt;
  }

  const { data, error } = await supabase
    .from('compliance_requirements')
    .update(updateData)
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating compliance requirement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
