/**
 * Story Approval Workflow API Routes (LC-FEAT-022)
 * GET /api/success-stories/[id]/approvals - List approvals
 * POST /api/success-stories/[id]/approvals - Request approval
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateApprovalInput, SubmitApprovalInput } from '@/types/success-story.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/success-stories/[id]/approvals
 * Get all approval records and workflow state
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify story exists and user has access
  const { data: story, error: storyError } = await supabase
    .from('success_stories')
    .select('id, status, created_by, cases(reporter_id)')
    .eq('id', id)
    .single();

  if (storyError || !story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isStaff = profile?.role === 'admin' || profile?.role === 'law_enforcement';
  const isCreator = story.created_by === user.id;
  const caseData = story.cases as unknown as { reporter_id: string } | null;
  const isCaseOwner = caseData?.reporter_id === user.id;

  if (!isStaff && !isCreator && !isCaseOwner) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Fetch approvals
  const { data: approvals, error } = await supabase
    .from('story_approvals')
    .select('*')
    .eq('story_id', id)
    .order('approval_order', { ascending: true });

  if (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate workflow state
  const stages = [
    { stage: 'family_review', order: 1 },
    { stage: 'content_review', order: 2 },
    { stage: 'legal_review', order: 3 },
    { stage: 'final_approval', order: 4 },
  ];

  const stageStatuses = stages.map(s => {
    const approval = approvals?.find(a => a.approval_stage === s.stage);
    return {
      stage: s.stage,
      status: approval?.status || 'not_started',
      reviewer: approval?.reviewer_name || approval?.reviewer_email,
      completedAt: approval?.responded_at,
    };
  });

  // Find current stage (first incomplete or the last stage if all complete)
  const currentStageIndex = stageStatuses.findIndex(s =>
    s.status === 'pending' || s.status === 'changes_requested' || s.status === 'not_started'
  );
  const currentStage = currentStageIndex >= 0
    ? stageStatuses[currentStageIndex].stage
    : 'final_approval';

  // Check if we can advance (current stage approved)
  const currentApproval = approvals?.find(a => a.approval_stage === currentStage);
  const canAdvance = currentApproval?.status === 'approved';

  // Check if we can publish (all stages approved)
  const allApproved = stageStatuses.every(s => s.status === 'approved');

  const blockedReasons: string[] = [];
  if (!allApproved) {
    const incomplete = stageStatuses.filter(s => s.status !== 'approved');
    incomplete.forEach(s => {
      if (s.status === 'rejected') {
        blockedReasons.push(`${s.stage} was rejected`);
      } else if (s.status === 'changes_requested') {
        blockedReasons.push(`${s.stage} requires changes`);
      } else if (s.status === 'pending') {
        blockedReasons.push(`${s.stage} is pending review`);
      } else {
        blockedReasons.push(`${s.stage} has not been started`);
      }
    });
  }

  return NextResponse.json({
    approvals: approvals?.map(transformApprovalFromDB) || [],
    workflowState: {
      storyId: id,
      currentStage,
      stages: stageStatuses,
      canAdvance,
      canPublish: allApproved,
      blockedReasons,
    },
  });
}

/**
 * POST /api/success-stories/[id]/approvals
 * Create a new approval request
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify story exists
  const { data: story, error: storyError } = await supabase
    .from('success_stories')
    .select('id, created_by, cases(reporter_id)')
    .eq('id', id)
    .single();

  if (storyError || !story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  // Check permissions - only staff and creators can request approvals
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isStaff = profile?.role === 'admin' || profile?.role === 'law_enforcement';
  const isCreator = story.created_by === user.id;

  if (!isStaff && !isCreator) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body: CreateApprovalInput = await request.json();

  // Validate required fields
  if (!body.approvalStage || !body.reviewerType) {
    return NextResponse.json(
      { error: 'Missing required fields: approvalStage, reviewerType' },
      { status: 400 }
    );
  }

  // Check if approval for this stage already exists
  const { data: existingApproval } = await supabase
    .from('story_approvals')
    .select('id, status')
    .eq('story_id', id)
    .eq('approval_stage', body.approvalStage)
    .single();

  if (existingApproval && existingApproval.status !== 'rejected') {
    return NextResponse.json(
      { error: `Approval for ${body.approvalStage} already exists` },
      { status: 400 }
    );
  }

  // Set default order based on stage
  const stageOrder: Record<string, number> = {
    family_review: 1,
    content_review: 2,
    legal_review: 3,
    final_approval: 4,
  };

  // Default deadline is 7 days from now
  const defaultDeadline = new Date();
  defaultDeadline.setDate(defaultDeadline.getDate() + 7);

  const approvalData = {
    story_id: id,
    approval_stage: body.approvalStage,
    approval_order: body.approvalOrder || stageOrder[body.approvalStage] || 1,
    reviewer_type: body.reviewerType,
    reviewer_id: body.reviewerId,
    reviewer_email: body.reviewerEmail,
    reviewer_name: body.reviewerName,
    status: 'pending',
    deadline_at: body.deadlineAt || defaultDeadline.toISOString(),
    requested_at: new Date().toISOString(),
  };

  const { data: approval, error: createError } = await supabase
    .from('story_approvals')
    .insert(approvalData)
    .select()
    .single();

  if (createError) {
    console.error('Error creating approval:', createError);
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Send notification to reviewer
  if (body.reviewerId) {
    await supabase.from('notifications').insert({
      user_id: body.reviewerId,
      type: 'approval_request',
      title: 'Story Approval Request',
      content: `You have been requested to review a success story (${body.approvalStage})`,
    });
  }

  // Update story status if this is the first approval
  if (body.approvalStage === 'family_review') {
    await supabase
      .from('success_stories')
      .update({ status: 'pending_family_approval' })
      .eq('id', id);
  }

  // Log the creation
  await supabase.from('comprehensive_audit_logs').insert({
    user_id: user.id,
    action: 'create',
    action_description: `Created approval request for story ${id} (${body.approvalStage})`,
    resource_type: 'story_approvals',
    resource_id: approval.id,
    new_values: approvalData,
  });

  return NextResponse.json(transformApprovalFromDB(approval), { status: 201 });
}

// Helper function to transform approval from DB
function transformApprovalFromDB(record: Record<string, unknown>): Record<string, unknown> {
  return {
    id: record.id,
    storyId: record.story_id,
    approvalStage: record.approval_stage,
    approvalOrder: record.approval_order,
    reviewerType: record.reviewer_type,
    reviewerId: record.reviewer_id,
    reviewerEmail: record.reviewer_email,
    reviewerName: record.reviewer_name,
    status: record.status,
    feedback: record.feedback,
    requestedChanges: record.requested_changes,
    requestedAt: record.requested_at,
    respondedAt: record.responded_at,
    deadlineAt: record.deadline_at,
    reminderCount: record.reminder_count,
    lastReminderAt: record.last_reminder_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
