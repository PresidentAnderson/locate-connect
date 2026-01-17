import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type {
  TipVerificationStats,
  QueueStats,
  TipsterStats,
  TipPriorityBucket,
  VerificationMethod,
  HoaxIndicatorType,
  TipsterReliabilityTier,
} from '@/types/tip-verification.types';

/**
 * GET /api/tips/verification/stats
 * Get comprehensive verification statistics
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
  const caseId = searchParams.get('caseId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  // Build base query for verifications
  let verificationsQuery = supabase.from('tip_verifications').select('*');

  if (caseId) {
    // Get tips for this case first, then filter verifications
    const { data: tips } = await supabase
      .from('tips')
      .select('id')
      .eq('case_id', caseId);

    if (tips && tips.length > 0) {
      verificationsQuery = verificationsQuery.in('tip_id', tips.map(t => t.id));
    }
  }

  if (dateFrom) {
    verificationsQuery = verificationsQuery.gte('created_at', dateFrom);
  }
  if (dateTo) {
    verificationsQuery = verificationsQuery.lte('created_at', dateTo);
  }

  const { data: verifications } = await verificationsQuery;

  // Calculate tip verification statistics
  const tipVerificationStats: TipVerificationStats = {
    totalTips: verifications?.length || 0,
    verifiedTips: verifications?.filter(v => v.verification_status === 'verified' || v.verification_status === 'auto_verified').length || 0,
    pendingReviewTips: verifications?.filter(v => v.verification_status === 'pending_review').length || 0,
    rejectedTips: verifications?.filter(v => v.verification_status === 'rejected').length || 0,
    spamTips: verifications?.filter(v => v.priority_bucket === 'spam').length || 0,
    duplicateTips: verifications?.filter(v => v.is_duplicate).length || 0,
    averageCredibilityScore: verifications?.length
      ? Math.round(verifications.reduce((sum, v) => sum + (v.credibility_score || 0), 0) / verifications.length)
      : 0,
    averageVerificationTime: calculateAverageVerificationTime(verifications || []),
    tipsLeadingToLeads: 0, // Would need to join with leads table
    tipsLeadingToResolutions: 0, // Would need to join with cases table
    priorityDistribution: calculatePriorityDistribution(verifications || []),
    verificationMethodUsage: calculateMethodUsage(verifications || []),
    topHoaxIndicators: calculateTopHoaxIndicators(verifications || []),
  };

  // Get tips that led to leads
  const { data: tipsWithLeads } = await supabase
    .from('tips')
    .select('id')
    .not('lead_id', 'is', null);
  tipVerificationStats.tipsLeadingToLeads = tipsWithLeads?.length || 0;

  // Get queue statistics
  const { data: queueItems } = await supabase
    .from('verification_queue')
    .select('queue_type, status, sla_breached, entered_queue_at, review_completed_at');

  const pendingItems = queueItems?.filter(q => q.status === 'pending') || [];
  const completedToday = queueItems?.filter(q => {
    if (!q.review_completed_at) return false;
    const completedDate = new Date(q.review_completed_at);
    const today = new Date();
    return completedDate.toDateString() === today.toDateString();
  }) || [];

  const queueStats: QueueStats = {
    totalPending: pendingItems.length,
    criticalPending: pendingItems.filter(q => q.queue_type === 'critical').length,
    highPriorityPending: pendingItems.filter(q => q.queue_type === 'high_priority').length,
    standardPending: pendingItems.filter(q => q.queue_type === 'standard').length,
    lowPriorityPending: pendingItems.filter(q => q.queue_type === 'low_priority').length,
    averageWaitTime: calculateAverageWaitTime(pendingItems),
    slaBreachRate: queueItems?.length
      ? (queueItems.filter(q => q.sla_breached).length / queueItems.length) * 100
      : 0,
    reviewsCompletedToday: completedToday.length,
    averageReviewTime: calculateAverageReviewTime(completedToday),
  };

  // Get tipster statistics
  const { data: tipsters } = await supabase
    .from('tipster_profiles')
    .select('*')
    .order('reliability_score', { ascending: false });

  const tipsterStats: TipsterStats = {
    totalTipsters: tipsters?.length || 0,
    verifiedSourceTipsters: tipsters?.filter(t => t.reliability_tier === 'verified_source').length || 0,
    blockedTipsters: tipsters?.filter(t => t.is_blocked).length || 0,
    averageReliabilityScore: tipsters?.length
      ? Math.round(tipsters.reduce((sum, t) => sum + (t.reliability_score || 0), 0) / tipsters.length)
      : 0,
    tierDistribution: calculateTierDistribution(tipsters || []),
    topContributors: (tipsters?.slice(0, 10) || []).map(t => ({
      id: t.id,
      reliabilityTier: t.reliability_tier,
      reliabilityScore: t.reliability_score,
      totalTips: t.total_tips,
      verifiedTips: t.verified_tips,
      isBlocked: t.is_blocked,
    })),
  };

  // Calculate trends (last 7 days vs previous 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const recentVerifications = verifications?.filter(v =>
    new Date(v.created_at) >= sevenDaysAgo
  ) || [];
  const previousVerifications = verifications?.filter(v =>
    new Date(v.created_at) >= fourteenDaysAgo &&
    new Date(v.created_at) < sevenDaysAgo
  ) || [];

  const trends = {
    tipsChange: calculatePercentChange(previousVerifications.length, recentVerifications.length),
    credibilityChange: calculatePercentChange(
      average(previousVerifications.map(v => v.credibility_score || 0)),
      average(recentVerifications.map(v => v.credibility_score || 0))
    ),
    verificationRateChange: calculatePercentChange(
      percentage(previousVerifications.filter(v => v.verification_status === 'verified').length, previousVerifications.length),
      percentage(recentVerifications.filter(v => v.verification_status === 'verified').length, recentVerifications.length)
    ),
    spamRateChange: calculatePercentChange(
      percentage(previousVerifications.filter(v => v.priority_bucket === 'spam').length, previousVerifications.length),
      percentage(recentVerifications.filter(v => v.priority_bucket === 'spam').length, recentVerifications.length)
    ),
  };

  return NextResponse.json({
    tipVerificationStats,
    queueStats,
    tipsterStats,
    trends,
    generatedAt: new Date().toISOString(),
  });
}

// Helper functions

function calculatePriorityDistribution(
  verifications: Array<{ priority_bucket: TipPriorityBucket }>
): Record<TipPriorityBucket, number> {
  const distribution: Record<TipPriorityBucket, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    spam: 0,
  };

  for (const v of verifications) {
    if (v.priority_bucket in distribution) {
      distribution[v.priority_bucket]++;
    }
  }

  return distribution;
}

function calculateMethodUsage(
  verifications: Array<{ verification_methods: VerificationMethod[] }>
): Record<VerificationMethod, number> {
  const usage: Record<VerificationMethod, number> = {
    photo_metadata: 0,
    geolocation: 0,
    text_sentiment: 0,
    pattern_matching: 0,
    cross_reference: 0,
    time_plausibility: 0,
    duplicate_detection: 0,
    manual_review: 0,
  };

  for (const v of verifications) {
    for (const method of v.verification_methods || []) {
      if (method in usage) {
        usage[method]++;
      }
    }
  }

  return usage;
}

function calculateTopHoaxIndicators(
  verifications: Array<{ hoax_indicators: HoaxIndicatorType[] }>
): Array<{ indicator: HoaxIndicatorType; count: number }> {
  const counts: Record<string, number> = {};

  for (const v of verifications) {
    for (const indicator of v.hoax_indicators || []) {
      counts[indicator] = (counts[indicator] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([indicator, count]) => ({ indicator: indicator as HoaxIndicatorType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function calculateTierDistribution(
  tipsters: Array<{ reliability_tier: TipsterReliabilityTier }>
): Record<TipsterReliabilityTier, number> {
  const distribution: Record<TipsterReliabilityTier, number> = {
    new: 0,
    unrated: 0,
    low: 0,
    moderate: 0,
    high: 0,
    verified_source: 0,
  };

  for (const t of tipsters) {
    if (t.reliability_tier in distribution) {
      distribution[t.reliability_tier]++;
    }
  }

  return distribution;
}

function calculateAverageVerificationTime(
  verifications: Array<{ created_at: string; verified_at?: string }>
): string {
  const verifiedWithTime = verifications.filter(v => v.verified_at);
  if (verifiedWithTime.length === 0) return 'N/A';

  const totalMs = verifiedWithTime.reduce((sum, v) => {
    const created = new Date(v.created_at).getTime();
    const verified = new Date(v.verified_at!).getTime();
    return sum + (verified - created);
  }, 0);

  const avgMs = totalMs / verifiedWithTime.length;
  return formatDuration(avgMs);
}

function calculateAverageWaitTime(
  items: Array<{ entered_queue_at: string }>
): string {
  if (items.length === 0) return 'N/A';

  const now = Date.now();
  const totalMs = items.reduce((sum, item) => {
    const entered = new Date(item.entered_queue_at).getTime();
    return sum + (now - entered);
  }, 0);

  const avgMs = totalMs / items.length;
  return formatDuration(avgMs);
}

function calculateAverageReviewTime(
  items: Array<{ entered_queue_at: string; review_completed_at?: string }>
): string {
  const completedItems = items.filter(i => i.review_completed_at);
  if (completedItems.length === 0) return 'N/A';

  const totalMs = completedItems.reduce((sum, item) => {
    const entered = new Date(item.entered_queue_at).getTime();
    const completed = new Date(item.review_completed_at!).getTime();
    return sum + (completed - entered);
  }, 0);

  const avgMs = totalMs / completedItems.length;
  return formatDuration(avgMs);
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function percentage(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}

function calculatePercentChange(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
