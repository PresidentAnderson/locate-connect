import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  mapVerificationQueueItemFromDb,
  mapTipVerificationFromDb,
  type QueueType,
  type QueueStatus,
} from '@/types/tip-verification.types';

/**
 * GET /api/tips/verification/queue
 * Get the verification review queue
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

  // Check if user has LE/admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const queueType = searchParams.get('queueType') as QueueType | null;
  const status = searchParams.get('status') as QueueStatus | null;
  const assignedTo = searchParams.get('assignedTo');
  const myQueue = searchParams.get('myQueue') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('verification_queue')
    .select(`
      *,
      tips (
        id,
        case_id,
        content,
        location,
        latitude,
        longitude,
        sighting_date,
        is_anonymous,
        attachments_count,
        created_at,
        cases (
          id,
          case_number,
          first_name,
          last_name,
          primary_photo_url,
          priority_level,
          status,
          last_seen_date,
          last_seen_location
        )
      ),
      tip_verifications (*),
      tipster_profiles:tips(tipster_profiles(*))
    `, { count: 'exact' });

  // Apply filters
  if (queueType) {
    query = query.eq('queue_type', queueType);
  }
  if (status) {
    query = query.eq('status', status);
  } else {
    // Default to pending items
    query = query.eq('status', 'pending');
  }
  if (assignedTo) {
    query = query.eq('assigned_to', assignedTo);
  }
  if (myQueue) {
    query = query.eq('assigned_to', user.id);
  }

  // Apply ordering (priority first, then by SLA deadline)
  const { data, error, count } = await query
    .order('priority', { ascending: true })
    .order('sla_deadline', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get queue statistics
  const { data: stats } = await supabase
    .from('verification_queue')
    .select('queue_type, status, sla_breached')
    .eq('status', 'pending');

  const queueStats = {
    totalPending: stats?.filter(s => s.status === 'pending').length || 0,
    criticalPending: stats?.filter(s => s.queue_type === 'critical' && s.status === 'pending').length || 0,
    highPriorityPending: stats?.filter(s => s.queue_type === 'high_priority' && s.status === 'pending').length || 0,
    standardPending: stats?.filter(s => s.queue_type === 'standard' && s.status === 'pending').length || 0,
    lowPriorityPending: stats?.filter(s => s.queue_type === 'low_priority' && s.status === 'pending').length || 0,
    slaBreached: stats?.filter(s => s.sla_breached).length || 0,
  };

  const items = data?.map((item) => ({
    ...mapVerificationQueueItemFromDb(item),
    tip: item.tips ? {
      id: item.tips.id,
      caseId: item.tips.case_id,
      content: item.tips.content,
      location: item.tips.location,
      latitude: item.tips.latitude,
      longitude: item.tips.longitude,
      sightingDate: item.tips.sighting_date,
      isAnonymous: item.tips.is_anonymous,
      attachmentsCount: item.tips.attachments_count,
      createdAt: item.tips.created_at,
    } : undefined,
    case: item.tips?.cases ? {
      id: item.tips.cases.id,
      caseNumber: item.tips.cases.case_number,
      firstName: item.tips.cases.first_name,
      lastName: item.tips.cases.last_name,
      primaryPhotoUrl: item.tips.cases.primary_photo_url,
      priorityLevel: item.tips.cases.priority_level,
      status: item.tips.cases.status,
      lastSeenDate: item.tips.cases.last_seen_date,
      lastSeenLocation: item.tips.cases.last_seen_location,
    } : undefined,
    verification: item.tip_verifications ? mapTipVerificationFromDb(item.tip_verifications) : undefined,
  })) || [];

  return NextResponse.json({
    items,
    total: count || 0,
    stats: queueStats,
    limit,
    offset,
  });
}

/**
 * POST /api/tips/verification/queue
 * Assign a queue item to a reviewer
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
  const { queueItemId, assignTo, action } = body;

  if (!queueItemId) {
    return NextResponse.json({ error: 'queueItemId is required' }, { status: 400 });
  }

  // Handle different actions
  if (action === 'claim') {
    // Claim the item for yourself
    const { data, error } = await supabase
      .from('verification_queue')
      .update({
        assigned_to: user.id,
        assigned_at: new Date().toISOString(),
        assignment_reason: 'Self-claimed by reviewer',
        status: 'in_review',
        review_started_at: new Date().toISOString(),
      })
      .eq('id', queueItemId)
      .eq('status', 'pending') // Only claim pending items
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      queueItem: mapVerificationQueueItemFromDb(data),
    });
  }

  if (action === 'assign' && assignTo) {
    // Assign to another user (admin only)
    if (profile.role !== 'admin' && profile.role !== 'developer') {
      return NextResponse.json({ error: 'Only admins can assign to others' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('verification_queue')
      .update({
        assigned_to: assignTo,
        assigned_at: new Date().toISOString(),
        assignment_reason: `Assigned by ${user.id}`,
      })
      .eq('id', queueItemId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      queueItem: mapVerificationQueueItemFromDb(data),
    });
  }

  if (action === 'release') {
    // Release the item back to queue
    const { data, error } = await supabase
      .from('verification_queue')
      .update({
        assigned_to: null,
        assigned_at: null,
        assignment_reason: null,
        status: 'pending',
        review_started_at: null,
      })
      .eq('id', queueItemId)
      .eq('assigned_to', user.id) // Only release your own items
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      queueItem: mapVerificationQueueItemFromDb(data),
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
