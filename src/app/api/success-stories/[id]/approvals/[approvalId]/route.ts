/**
 * Individual Approval Record API Routes (LC-FEAT-022)
 * PUT /api/success-stories/[id]/approvals/[approvalId] - Submit approval decision
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SubmitApprovalInput } from '@/types/success-story.types';

interface RouteParams {
  params: Promise<{ id: string; approvalId: string }>;
}

/**
 * PUT /api/success-stories/[id]/approvals/[approvalId]
 * Submit an approval decision
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id, approvalId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch existing approval
  const { data: approval, error: fetchError } = await supabase
    .from('story_approvals')
    .select('*')
    .eq('id', approvalId)
    .eq('story_id', id)
    .single();

  if (fetchError || !approval) {
    return NextResponse.json({ error: 'Approval record not found' }, { status: 404 });
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isStaff = profile?.role === 'admin' || profile?.role === 'law_enforcement';
  const isAssignedReviewer = approval.reviewer_id === user.id;

  // Only assigned reviewer or staff can submit decisions
  if (!isStaff && !isAssignedReviewer) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Cannot update if already decided (unless staff is resetting)
  if (approval.status !== 'pending' && !isStaff) {
    return NextResponse.json(
      { error: 'This approval has already been decided' },
      { status: 400 }
    );
  }

  const body: SubmitApprovalInput = await request.json();

  // Validate status
  const validStatuses = ['approved', 'rejected', 'changes_requested'];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {
    status: body.status,
    feedback: body.feedback,
    requested_changes: body.requestedChanges || [],
    responded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // If no reviewer was set (external), set current user as reviewer
  if (!approval.reviewer_id) {
    updateData.reviewer_id = user.id;
  }

  // Update the approval record
  const { data: updatedApproval, error: updateError } = await supabase
    .from('story_approvals')
    .update(updateData)
    .eq('id', approvalId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating approval:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Fetch the story to update its status
  const { data: story } = await supabase
    .from('success_stories')
    .select('id, created_by, status')
    .eq('id', id)
    .single();

  // Update story status based on approval workflow
  if (body.status === 'approved') {
    // Check if all approvals are now complete
    const { data: allApprovals } = await supabase
      .from('story_approvals')
      .select('approval_stage, status')
      .eq('story_id', id);

    const approvalStages = ['family_review', 'content_review', 'legal_review', 'final_approval'];
    const allStagesApproved = approvalStages.every(stage => {
      const stageApproval = allApprovals?.find(a => a.approval_stage === stage);
      return stageApproval?.status === 'approved';
    });

    if (allStagesApproved) {
      // All stages approved - ready to publish
      await supabase
        .from('success_stories')
        .update({ status: 'approved' })
        .eq('id', id);

      // Notify creator
      if (story?.created_by) {
        await supabase.from('notifications').insert({
          user_id: story.created_by,
          type: 'story_approved',
          title: 'Story Approved',
          content: 'Your success story has been approved and is ready to publish!',
        });
      }
    } else {
      // Find next stage and update status
      const currentStageIndex = approvalStages.indexOf(approval.approval_stage);
      if (currentStageIndex < approvalStages.length - 1) {
        const nextStage = approvalStages[currentStageIndex + 1];
        const statusMap: Record<string, string> = {
          family_review: 'pending_family_approval',
          content_review: 'pending_admin_approval',
          legal_review: 'pending_admin_approval',
          final_approval: 'pending_admin_approval',
        };

        await supabase
          .from('success_stories')
          .update({ status: statusMap[nextStage] || 'pending_admin_approval' })
          .eq('id', id);
      }
    }
  } else if (body.status === 'rejected' || body.status === 'changes_requested') {
    // If any stage is rejected/needs changes, notify creator
    if (story?.created_by) {
      const notificationTitle = body.status === 'rejected'
        ? 'Story Review Rejected'
        : 'Story Changes Requested';

      const notificationContent = body.status === 'rejected'
        ? `Your success story was not approved at the ${approval.approval_stage} stage. ${body.feedback || ''}`
        : `Changes have been requested for your success story at the ${approval.approval_stage} stage. ${body.feedback || ''}`;

      await supabase.from('notifications').insert({
        user_id: story.created_by,
        type: body.status === 'rejected' ? 'story_rejected' : 'story_changes_requested',
        title: notificationTitle,
        content: notificationContent,
      });
    }

    // Update story status
    if (body.status === 'rejected') {
      await supabase
        .from('success_stories')
        .update({ status: 'rejected' })
        .eq('id', id);
    }
    // If changes requested, keep status as is but story will need re-submission
  }

  // Log the decision
  await supabase.from('comprehensive_audit_logs').insert({
    user_id: user.id,
    action: `approval_${body.status}`,
    action_description: `Submitted ${body.status} decision for story ${id} (${approval.approval_stage})`,
    resource_type: 'story_approvals',
    resource_id: approvalId,
    old_values: { status: approval.status },
    new_values: updateData,
  });

  return NextResponse.json(transformApprovalFromDB(updatedApproval));
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
