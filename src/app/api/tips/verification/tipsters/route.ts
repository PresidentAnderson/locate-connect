import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  mapTipsterProfileFromDb,
  type TipsterReliabilityTier,
} from '@/types/tip-verification.types';

/**
 * GET /api/tips/verification/tipsters
 * List tipster profiles with optional filters
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
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const reliabilityTier = searchParams.get('reliabilityTier') as TipsterReliabilityTier | null;
  const isBlocked = searchParams.get('isBlocked');
  const minScore = searchParams.get('minScore');
  const maxScore = searchParams.get('maxScore');
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sortBy') || 'reliability_score';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? true : false;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('tipster_profiles')
    .select('*', { count: 'exact' });

  // Apply filters
  if (reliabilityTier) {
    query = query.eq('reliability_tier', reliabilityTier);
  }
  if (isBlocked !== null) {
    query = query.eq('is_blocked', isBlocked === 'true');
  }
  if (minScore) {
    query = query.gte('reliability_score', parseInt(minScore, 10));
  }
  if (maxScore) {
    query = query.lte('reliability_score', parseInt(maxScore, 10));
  }
  if (search) {
    query = query.or(`email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  // Apply sorting
  const validSortFields = ['reliability_score', 'total_tips', 'verified_tips', 'created_at', 'last_tip_at'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'reliability_score';
  query = query.order(sortField, { ascending: sortOrder });

  // Apply pagination
  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tipsters = data?.map(mapTipsterProfileFromDb) || [];

  return NextResponse.json({
    tipsters,
    total: count || 0,
    limit,
    offset,
  });
}

/**
 * POST /api/tips/verification/tipsters
 * Perform actions on a tipster profile (block/unblock, upgrade/downgrade tier)
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

  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { tipsterProfileId, action, reason, newTier } = body as {
    tipsterProfileId: string;
    action: 'block' | 'unblock' | 'upgrade_tier' | 'downgrade_tier' | 'set_tier';
    reason?: string;
    newTier?: TipsterReliabilityTier;
  };

  if (!tipsterProfileId || !action) {
    return NextResponse.json({ error: 'tipsterProfileId and action are required' }, { status: 400 });
  }

  let updateData: Record<string, unknown> = {};

  switch (action) {
    case 'block':
      updateData = {
        is_blocked: true,
        blocked_reason: reason,
        blocked_at: new Date().toISOString(),
        blocked_by: user.id,
      };
      break;

    case 'unblock':
      updateData = {
        is_blocked: false,
        blocked_reason: null,
        blocked_at: null,
        blocked_by: null,
      };
      break;

    case 'set_tier':
      if (!newTier) {
        return NextResponse.json({ error: 'newTier is required for set_tier action' }, { status: 400 });
      }
      const tierScores: Record<TipsterReliabilityTier, number> = {
        verified_source: 95,
        high: 80,
        moderate: 60,
        low: 35,
        unrated: 50,
        new: 50,
      };
      updateData = {
        reliability_tier: newTier,
        reliability_score: tierScores[newTier],
        internal_notes: `Tier manually set to ${newTier} by admin. Reason: ${reason || 'No reason provided'}`,
      };
      break;

    case 'upgrade_tier':
    case 'downgrade_tier':
      // Get current tier
      const { data: currentProfile } = await supabase
        .from('tipster_profiles')
        .select('reliability_tier')
        .eq('id', tipsterProfileId)
        .single();

      if (!currentProfile) {
        return NextResponse.json({ error: 'Tipster profile not found' }, { status: 404 });
      }

      const tierOrder: TipsterReliabilityTier[] = [
        'new', 'unrated', 'low', 'moderate', 'high', 'verified_source'
      ];
      const currentIndex = tierOrder.indexOf(currentProfile.reliability_tier);

      if (action === 'upgrade_tier' && currentIndex < tierOrder.length - 1) {
        const nextTier = tierOrder[currentIndex + 1];
        updateData = {
          reliability_tier: nextTier,
          reliability_score: [50, 50, 35, 60, 80, 95][currentIndex + 1],
        };
      } else if (action === 'downgrade_tier' && currentIndex > 0) {
        const prevTier = tierOrder[currentIndex - 1];
        updateData = {
          reliability_tier: prevTier,
          reliability_score: [50, 50, 35, 60, 80, 95][currentIndex - 1],
        };
      } else {
        return NextResponse.json({
          error: `Cannot ${action} - already at ${action === 'upgrade_tier' ? 'highest' : 'lowest'} tier`
        }, { status: 400 });
      }
      break;

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tipster_profiles')
    .update(updateData)
    .eq('id', tipsterProfileId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    tipsterProfile: mapTipsterProfileFromDb(data),
  });
}
