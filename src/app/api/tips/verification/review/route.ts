import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  mapTipVerificationFromDb,
  mapVerificationQueueItemFromDb,
  type ReviewOutcome,
  type TipVerificationStatus,
} from '@/types/tip-verification.types';

/**
 * POST /api/tips/verification/review
 * Submit a review decision for a tip
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

  // Check if user has LE/admin role and is verified
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!profile.is_verified) {
    return NextResponse.json({ error: 'Account not verified' }, { status: 403 });
  }

  const body = await request.json();
  const {
    verificationId,
    queueItemId,
    outcome,
    notes,
    overrideScore,
    escalateTo,
    escalationReason,
    createLead,
    leadData,
  } = body as {
    verificationId: string;
    queueItemId?: string;
    outcome: ReviewOutcome;
    notes?: string;
    overrideScore?: number;
    escalateTo?: string;
    escalationReason?: string;
    createLead?: boolean;
    leadData?: {
      title: string;
      description?: string;
    };
  };

  if (!verificationId || !outcome) {
    return NextResponse.json({ error: 'verificationId and outcome are required' }, { status: 400 });
  }

  // Validate outcome
  const validOutcomes: ReviewOutcome[] = ['verified', 'rejected', 'escalated', 'needs_more_info'];
  if (!validOutcomes.includes(outcome)) {
    return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 });
  }

  // Map outcome to verification status
  const statusMap: Record<ReviewOutcome, TipVerificationStatus> = {
    verified: 'verified',
    rejected: 'rejected',
    escalated: 'pending_review',
    needs_more_info: 'pending_review',
  };

  const newStatus = statusMap[outcome];

  // Update the verification record
  const verificationUpdate: Record<string, unknown> = {
    verification_status: newStatus,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    reviewer_notes: notes,
    requires_human_review: outcome === 'needs_more_info' || outcome === 'escalated',
  };

  if (overrideScore !== undefined) {
    verificationUpdate.reviewer_override_score = overrideScore;
    verificationUpdate.credibility_score = overrideScore;
  }

  if (newStatus === 'verified') {
    verificationUpdate.verified_at = new Date().toISOString();
  }

  const { data: verification, error: verificationError } = await supabase
    .from('tip_verifications')
    .update(verificationUpdate)
    .eq('id', verificationId)
    .select()
    .single();

  if (verificationError) {
    return NextResponse.json({ error: verificationError.message }, { status: 500 });
  }

  // Update tip status
  const tipUpdate: Record<string, unknown> = {
    status: outcome === 'verified' ? 'verified' :
            outcome === 'rejected' ? 'hoax' :
            'reviewing',
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    review_notes: notes,
  };

  await supabase
    .from('tips')
    .update(tipUpdate)
    .eq('id', verification.tip_id);

  // Update queue item if provided
  let queueItem;
  if (queueItemId) {
    const queueUpdate: Record<string, unknown> = {
      status: outcome === 'escalated' ? 'escalated' : 'completed',
      review_completed_at: new Date().toISOString(),
      outcome,
      outcome_notes: notes,
    };

    if (outcome === 'escalated' && escalateTo) {
      queueUpdate.escalated_to = escalateTo;
      queueUpdate.escalated_at = new Date().toISOString();
      queueUpdate.escalation_reason = escalationReason;

      // Create a new queue item for the escalated reviewer
      await supabase
        .from('verification_queue')
        .insert({
          tip_id: verification.tip_id,
          tip_verification_id: verificationId,
          queue_type: 'high_priority',
          priority: 1,
          assigned_to: escalateTo,
          assigned_at: new Date().toISOString(),
          assignment_reason: `Escalated by ${user.id}: ${escalationReason || 'No reason provided'}`,
          sla_deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hour SLA
        });
    }

    const { data, error } = await supabase
      .from('verification_queue')
      .update(queueUpdate)
      .eq('id', queueItemId)
      .select()
      .single();

    if (!error) {
      queueItem = mapVerificationQueueItemFromDb(data);
    }
  }

  // Create lead if requested and tip is verified
  let newLead;
  if (createLead && outcome === 'verified' && leadData) {
    const { data: tipData } = await supabase
      .from('tips')
      .select('case_id, location, latitude, longitude, sighting_date, content')
      .eq('id', verification.tip_id)
      .single();

    if (tipData) {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          case_id: tipData.case_id,
          title: leadData.title,
          description: leadData.description || tipData.content,
          source: 'tip_verification',
          source_reference: verification.tip_id,
          location: tipData.location,
          latitude: tipData.latitude,
          longitude: tipData.longitude,
          sighting_date: tipData.sighting_date,
          status: 'new',
          credibility_score: overrideScore || verification.credibility_score,
          is_verified: true,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!leadError) {
        newLead = lead;

        // Link tip to the lead
        await supabase
          .from('tips')
          .update({ lead_id: lead.id })
          .eq('id', verification.tip_id);
      }
    }
  }

  // If needs more info, trigger a follow-up request
  if (outcome === 'needs_more_info') {
    // Get tipster info
    const { data: tipData } = await supabase
      .from('tips')
      .select('tipster_profile_id, tipster_email')
      .eq('id', verification.tip_id)
      .single();

    if (tipData?.tipster_profile_id || tipData?.tipster_email) {
      await supabase
        .from('tip_follow_ups')
        .insert({
          tip_id: verification.tip_id,
          tipster_profile_id: tipData.tipster_profile_id,
          follow_up_type: 'additional_info',
          subject: 'Additional Information Requested',
          message: notes || 'We need additional information to verify your tip. Please provide more details.',
          sent_via: tipData.tipster_email ? 'email' : 'in_app',
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          is_automated: false,
          created_by: user.id,
        });
    }
  }

  return NextResponse.json({
    success: true,
    verification: mapTipVerificationFromDb(verification),
    queueItem,
    lead: newLead,
  });
}
