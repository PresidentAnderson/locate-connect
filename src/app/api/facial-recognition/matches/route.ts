/**
 * Face Matches API Routes (LC-FEAT-030)
 * Handles face match results, reviews, and notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  mapFaceMatchFromDb,
  FaceMatch,
  FaceMatchStatus,
  MatchReviewDecision,
} from '@/types/facial-recognition.types';

/**
 * GET /api/facial-recognition/matches
 * Retrieve face matches with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const recognitionRequestId = searchParams.get('recognitionRequestId');
  const caseId = searchParams.get('caseId');
  const status = searchParams.get('status') as FaceMatchStatus | null;
  const minConfidence = parseInt(searchParams.get('minConfidence') || '0', 10);
  const pendingReviewOnly = searchParams.get('pendingReview') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Build query with joins
  let query = supabase
    .from('face_matches')
    .select(`
      *,
      source_photo:photo_submissions!face_matches_source_photo_id_fkey(
        id, file_url, case_id
      ),
      matched_photo:photo_submissions!face_matches_matched_photo_id_fkey(
        id, file_url, case_id
      ),
      matched_case:cases!face_matches_matched_case_id_fkey(
        id, case_number, first_name, last_name, status
      ),
      reviewer:profiles!face_matches_reviewer_id_fkey(
        id, first_name, last_name, email
      )
    `, { count: 'exact' });

  if (recognitionRequestId) {
    query = query.eq('recognition_request_id', recognitionRequestId);
  }

  if (caseId) {
    query = query.eq('matched_case_id', caseId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (pendingReviewOnly) {
    query = query.in('status', ['pending_review', 'under_review']);
  }

  if (minConfidence > 0) {
    query = query.gte('confidence_score', minConfidence);
  }

  // Apply pagination and ordering
  query = query
    .order('confidence_score', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching face matches:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform data
  const matches = (data || []).map((row) => ({
    ...mapFaceMatchFromDb(row as Record<string, unknown>),
    sourcePhoto: row.source_photo,
    matchedPhoto: row.matched_photo,
    matchedCase: row.matched_case,
    reviewer: row.reviewer,
  }));

  return NextResponse.json({
    data: matches,
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  });
}

/**
 * PATCH /api/facial-recognition/matches
 * Update a face match (review, status change, etc.)
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

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role) || !profile.is_verified) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      matchId,
      status,
      reviewNotes,
      reviewOutcome,
      markedAsFalsePositive,
      falsePositiveReason,
    } = body as {
      matchId: string;
      status?: FaceMatchStatus;
      reviewNotes?: string;
      reviewOutcome?: 'match' | 'no_match' | 'possible_match';
      markedAsFalsePositive?: boolean;
      falsePositiveReason?: string;
    };

    if (!matchId) {
      return NextResponse.json({ error: 'matchId is required' }, { status: 400 });
    }

    // Verify match exists
    const { data: existingMatch, error: fetchError } = await supabase
      .from('face_matches')
      .select('id, status, reviewer_id')
      .eq('id', matchId)
      .single();

    if (fetchError || !existingMatch) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (status) {
      updates.status = status;
      updates.reviewer_id = user.id;
      updates.reviewed_at = new Date().toISOString();
    }

    if (reviewNotes !== undefined) {
      updates.review_notes = reviewNotes;
    }

    if (reviewOutcome !== undefined) {
      updates.review_outcome = reviewOutcome;
    }

    if (markedAsFalsePositive !== undefined) {
      updates.marked_as_false_positive = markedAsFalsePositive;
      if (markedAsFalsePositive) {
        updates.false_positive_reason = falsePositiveReason;
        updates.status = 'false_positive';
      }
    }

    // Update the match
    const { data: updatedMatch, error: updateError } = await supabase
      .from('face_matches')
      .update(updates)
      .eq('id', matchId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating match:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create review record
    if (status || reviewOutcome) {
      await supabase.from('match_reviews').insert({
        face_match_id: matchId,
        reviewer_id: user.id,
        reviewer_role: profile.role,
        review_type: existingMatch.reviewer_id ? 'secondary' : 'initial',
        decision: mapOutcomeToDecision(reviewOutcome || status),
        analysis_notes: reviewNotes,
        review_completed_at: new Date().toISOString(),
      });
    }

    // Send notification if match is confirmed
    if (status === 'confirmed') {
      await sendMatchNotification(supabase, matchId);
    }

    return NextResponse.json({
      data: mapFaceMatchFromDb(updatedMatch as Record<string, unknown>),
    });

  } catch (error) {
    console.error('Match update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Map review outcome to decision type
 */
function mapOutcomeToDecision(outcome?: string): MatchReviewDecision {
  switch (outcome) {
    case 'confirmed':
    case 'match':
      return 'confirm_match';
    case 'rejected':
    case 'no_match':
    case 'false_positive':
      return 'reject_match';
    case 'inconclusive':
    case 'possible_match':
      return 'needs_investigation';
    default:
      return 'needs_investigation';
  }
}

/**
 * Send notification for confirmed match
 */
async function sendMatchNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string
): Promise<void> {
  try {
    // Get match details
    const { data: match } = await supabase
      .from('face_matches')
      .select(`
        id,
        confidence_score,
        matched_case_id,
        recognition_request_id,
        recognition_request:facial_recognition_requests!face_matches_recognition_request_id_fkey(
          case_id,
          requested_by
        )
      `)
      .eq('id', matchId)
      .single();

    const request = match?.recognition_request as unknown as { case_id: string; requested_by: string } | null;
    if (!match || !request) return;

    // Create notification for the requester
    await supabase.from('match_notifications').insert({
      face_match_id: matchId,
      recipient_id: request.requested_by,
      recipient_type: 'investigator',
      notification_type: 'match_confirmed',
      channel: 'in_app',
      priority: match.confidence_score >= 90 ? 'high' : 'normal',
      subject: 'Face Match Confirmed',
      message_body: `A potential match has been confirmed with ${match.confidence_score}% confidence.`,
      status: 'pending',
    });

    // Update match to indicate notification was sent
    await supabase
      .from('face_matches')
      .update({
        notification_sent: true,
        notification_sent_at: new Date().toISOString(),
        notification_method: 'in_app',
      })
      .eq('id', matchId);

  } catch (error) {
    console.error('Error sending match notification:', error);
  }
}
