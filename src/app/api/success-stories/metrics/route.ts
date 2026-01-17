/**
 * Success Metrics API (LC-FEAT-022)
 * GET /api/success-stories/metrics - Get success metrics
 * POST /api/success-stories/metrics/calculate - Calculate metrics (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/success-stories/metrics
 * Get success metrics (public, anonymized)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || 'all_time';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  let query = supabase
    .from('success_metrics')
    .select('*');

  if (period === 'custom' && startDate && endDate) {
    query = query
      .gte('period_start', startDate)
      .lte('period_end', endDate);
  } else {
    query = query.eq('metric_period', period);
  }

  query = query.order('period_start', { ascending: false }).limit(12);

  const { data: metrics, error } = await query;

  if (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform metrics to camelCase
  const transformedMetrics = (metrics || []).map(m => ({
    id: m.id,
    metricPeriod: m.metric_period,
    periodStart: m.period_start,
    periodEnd: m.period_end,
    totalCasesResolved: m.total_cases_resolved,
    foundAliveSafe: m.found_alive_safe,
    foundAliveInjured: m.found_alive_injured,
    reunitedWithFamily: m.reunited_with_family,
    voluntaryReturn: m.voluntary_return,
    minorsFound: m.minors_found,
    adultsFound: m.adults_found,
    seniorsFound: m.seniors_found,
    indigenousCasesResolved: m.indigenous_cases_resolved,
    averageResolutionDays: m.average_resolution_days,
    medianResolutionDays: m.median_resolution_days,
    fastestResolutionHours: m.fastest_resolution_hours,
    totalTipsReceived: m.total_tips_received,
    verifiedTips: m.verified_tips,
    totalVolunteers: m.total_volunteers,
    volunteerHours: m.volunteer_hours,
    agenciesInvolved: m.agencies_involved,
    crossJurisdictionCases: m.cross_jurisdiction_cases,
    storiesPublished: m.stories_published,
    totalStoryViews: m.total_story_views,
    totalStoryShares: m.total_story_shares,
    calculatedAt: m.calculated_at,
  }));

  // Get latest metrics for summary
  const latestAllTime = transformedMetrics.find(m => m.metricPeriod === 'all_time') ||
    transformedMetrics[0];

  return NextResponse.json({
    metrics: transformedMetrics,
    summary: latestAllTime,
    period,
  });
}

/**
 * POST /api/success-stories/metrics
 * Calculate and store new metrics (admin only)
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

  if (profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only administrators can calculate metrics' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const period = body.period || 'all_time';

  // Calculate date ranges based on period
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date = now;

  switch (period) {
    case 'daily':
      periodStart = new Date(now);
      periodStart.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      periodStart = new Date(now);
      periodStart.setMonth(now.getMonth() - 1);
      break;
    case 'yearly':
      periodStart = new Date(now);
      periodStart.setFullYear(now.getFullYear() - 1);
      break;
    case 'all_time':
    default:
      periodStart = new Date('2020-01-01');
      break;
  }

  // Calculate case metrics
  const { data: cases, error: casesError } = await supabase
    .from('cases')
    .select('disposition, is_minor, is_elderly, is_indigenous, resolution_date, last_seen_date')
    .in('status', ['resolved', 'closed'])
    .gte('resolution_date', periodStart.toISOString())
    .lte('resolution_date', periodEnd.toISOString());

  if (casesError) {
    console.error('Error fetching cases for metrics:', casesError);
    return NextResponse.json({ error: casesError.message }, { status: 500 });
  }

  // Calculate resolution times
  const resolutionDays = cases
    ?.filter(c => c.resolution_date && c.last_seen_date)
    .map(c => {
      const resolution = new Date(c.resolution_date);
      const lastSeen = new Date(c.last_seen_date);
      return (resolution.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    }) || [];

  const sortedDays = [...resolutionDays].sort((a, b) => a - b);
  const medianDays = sortedDays.length > 0
    ? sortedDays[Math.floor(sortedDays.length / 2)]
    : null;
  const avgDays = resolutionDays.length > 0
    ? resolutionDays.reduce((a, b) => a + b, 0) / resolutionDays.length
    : null;
  const fastestHours = sortedDays.length > 0
    ? Math.floor(sortedDays[0] * 24)
    : null;

  // Calculate story metrics
  const { count: storiesCount } = await supabase
    .from('success_stories')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', periodStart.toISOString())
    .lte('published_at', periodEnd.toISOString());

  const { data: storyStats } = await supabase
    .from('success_stories')
    .select('view_count, share_count')
    .eq('status', 'published');

  const totalViews = storyStats?.reduce((sum, s) => sum + (s.view_count || 0), 0) || 0;
  const totalShares = storyStats?.reduce((sum, s) => sum + (s.share_count || 0), 0) || 0;

  // Calculate tip metrics
  const { count: tipsCount } = await supabase
    .from('tips')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', periodEnd.toISOString());

  const { count: verifiedTipsCount } = await supabase
    .from('tips')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'verified')
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', periodEnd.toISOString());

  // Build metrics record
  const metricsData = {
    metric_period: period,
    period_start: periodStart.toISOString().split('T')[0],
    period_end: periodEnd.toISOString().split('T')[0],
    total_cases_resolved: cases?.length || 0,
    found_alive_safe: cases?.filter(c => c.disposition === 'found_alive_safe').length || 0,
    found_alive_injured: cases?.filter(c => c.disposition === 'found_alive_injured').length || 0,
    reunited_with_family: cases?.filter(c =>
      c.disposition === 'found_alive_safe' || c.disposition === 'returned_voluntarily'
    ).length || 0,
    voluntary_return: cases?.filter(c => c.disposition === 'returned_voluntarily').length || 0,
    minors_found: cases?.filter(c => c.is_minor).length || 0,
    adults_found: cases?.filter(c => !c.is_minor && !c.is_elderly).length || 0,
    seniors_found: cases?.filter(c => c.is_elderly).length || 0,
    indigenous_cases_resolved: cases?.filter(c => c.is_indigenous).length || 0,
    average_resolution_days: avgDays,
    median_resolution_days: medianDays,
    fastest_resolution_hours: fastestHours,
    total_tips_received: tipsCount || 0,
    verified_tips: verifiedTipsCount || 0,
    stories_published: storiesCount || 0,
    total_story_views: totalViews,
    total_story_shares: totalShares,
    calculated_at: new Date().toISOString(),
  };

  // Upsert metrics (update if exists for this period)
  const { data: metrics, error: upsertError } = await supabase
    .from('success_metrics')
    .upsert(metricsData, {
      onConflict: 'metric_period,period_start,period_end',
    })
    .select()
    .single();

  if (upsertError) {
    console.error('Error saving metrics:', upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Log the calculation
  await supabase.from('comprehensive_audit_logs').insert({
    user_id: user.id,
    action: 'calculate_metrics',
    action_description: `Calculated ${period} success metrics`,
    resource_type: 'success_metrics',
    resource_id: metrics.id,
    new_values: metricsData,
  });

  return NextResponse.json({
    success: true,
    metrics: {
      id: metrics.id,
      metricPeriod: metrics.metric_period,
      periodStart: metrics.period_start,
      periodEnd: metrics.period_end,
      totalCasesResolved: metrics.total_cases_resolved,
      foundAliveSafe: metrics.found_alive_safe,
      reunitedWithFamily: metrics.reunited_with_family,
      storiesPublished: metrics.stories_published,
      calculatedAt: metrics.calculated_at,
    },
  });
}
