/**
 * Compliance Assessments API Routes (LC-FEAT-037)
 * Manage compliance assessments for various frameworks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ComplianceFramework, ComplianceStatus } from '@/types/audit.types';

interface CreateAssessmentInput {
  framework: ComplianceFramework;
  assessmentDate: string;
  assessorName?: string;
  overallStatus: ComplianceStatus;
  complianceScore?: number;
  findings?: unknown[];
  recommendations?: string[];
  actionItems?: unknown[];
  evidenceDocuments?: unknown[];
  nextReviewDate?: string;
  expiresAt?: string;
}

/**
 * GET /api/compliance/assessments
 * List compliance assessments
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
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('compliance_assessments')
    .select('*', { count: 'exact' });

  if (framework) {
    query = query.eq('framework', framework);
  }

  if (status) {
    query = query.eq('overall_status', status);
  }

  query = query
    .order('assessment_date', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching compliance assessments:', error);
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
 * POST /api/compliance/assessments
 * Create a new compliance assessment
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

  const body: CreateAssessmentInput = await request.json();

  const assessmentData = {
    framework: body.framework,
    assessment_date: body.assessmentDate,
    assessor_id: user.id,
    assessor_name: body.assessorName,
    overall_status: body.overallStatus,
    compliance_score: body.complianceScore,
    findings: body.findings,
    recommendations: body.recommendations,
    action_items: body.actionItems,
    evidence_documents: body.evidenceDocuments,
    next_review_date: body.nextReviewDate,
    expires_at: body.expiresAt,
  };

  const { data, error } = await supabase
    .from('compliance_assessments')
    .insert(assessmentData)
    .select()
    .single();

  if (error) {
    console.error('Error creating compliance assessment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
