/**
 * Cold Case Metrics API
 * GET - Get cold case program metrics and statistics
 */

import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiServerError,
} from '@/lib/api/response';
import type { ColdCaseDashboardStats } from '@/types/cold-case.types';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  // Check if user has LE/admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role)) {
    return apiForbidden('Access restricted to law enforcement and administrators');
  }

  try {
    // Get total cold cases
    const { count: totalColdCases } = await supabase
      .from('cold_case_profiles')
      .select('id', { count: 'exact', head: true });

    // Get cases under review
    const { count: casesUnderReview } = await supabase
      .from('cold_case_profiles')
      .select('id', { count: 'exact', head: true })
      .not('current_reviewer_id', 'is', null);

    // Get overdue reviews
    const { count: overdueReviews } = await supabase
      .from('cold_case_profiles')
      .select('id', { count: 'exact', head: true })
      .lt('next_review_date', new Date().toISOString().split('T')[0])
      .is('current_reviewer_id', null);

    // Get upcoming anniversaries (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const today = new Date().toISOString().split('T')[0];
    const futureDate = thirtyDaysFromNow.toISOString().split('T')[0];

    const { count: upcomingAnniversaries } = await supabase
      .from('cold_case_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('anniversary_date', today)
      .lte('anniversary_date', futureDate);

    // Get pending DNA submissions
    const { count: pendingDNASubmissions } = await supabase
      .from('cold_case_profiles')
      .select('id', { count: 'exact', head: true })
      .in('dna_submission_status', ['not_submitted', 'pending_submission', 'resubmission_pending']);

    // Get unprocessed evidence
    const { count: unprocessedEvidence } = await supabase
      .from('cold_case_new_evidence')
      .select('id', { count: 'exact', head: true })
      .eq('processed', false);

    // Get unreviewed pattern matches
    const { count: unreviewedPatternMatches } = await supabase
      .from('cold_case_pattern_matches')
      .select('id', { count: 'exact', head: true })
      .eq('reviewed', false);

    // Get revived this year
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const { count: revivedThisYear } = await supabase
      .from('cold_case_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('classification', 'reclassified_active')
      .gte('updated_at', startOfYear);

    // Calculate revival success rate
    const { data: revivalStats } = await supabase
      .from('cold_case_profiles')
      .select('revival_attempts, revival_success_count');

    let totalAttempts = 0;
    let totalSuccesses = 0;
    revivalStats?.forEach(profile => {
      totalAttempts += profile.revival_attempts || 0;
      totalSuccesses += profile.revival_success_count || 0;
    });
    const revivalSuccessRate = totalAttempts > 0
      ? Math.round((totalSuccesses / totalAttempts) * 100)
      : 0;

    // Get age distribution
    const { data: ageData } = await supabase
      .from('cold_case_profiles')
      .select('days_since_cold');

    let oneToTwoYears = 0;
    let twoToFiveYears = 0;
    let fiveToTenYears = 0;
    let tenPlusYears = 0;

    ageData?.forEach(profile => {
      const days = profile.days_since_cold || 0;
      if (days <= 730) oneToTwoYears++;
      else if (days <= 1825) twoToFiveYears++;
      else if (days <= 3650) fiveToTenYears++;
      else tenPlusYears++;
    });

    // Get recent revivals
    const { data: recentRevivals } = await supabase
      .from('cold_case_profiles')
      .select(`
        id,
        case_id,
        days_since_cold,
        updated_at,
        case:cases(case_number)
      `)
      .eq('classification', 'reclassified_active')
      .order('updated_at', { ascending: false })
      .limit(5);

    const stats: ColdCaseDashboardStats = {
      totalColdCases: totalColdCases || 0,
      casesUnderReview: casesUnderReview || 0,
      overdueReviews: overdueReviews || 0,
      upcomingAnniversaries: upcomingAnniversaries || 0,
      pendingDNASubmissions: pendingDNASubmissions || 0,
      unprocessedEvidence: unprocessedEvidence || 0,
      unreviewedPatternMatches: unreviewedPatternMatches || 0,
      revivedThisYear: revivedThisYear || 0,
      revivalSuccessRate,
      ageDistribution: {
        oneToTwoYears,
        twoToFiveYears,
        fiveToTenYears,
        tenPlusYears,
      },
      recentRevivals: recentRevivals?.map(r => ({
        caseId: r.case_id,
        caseNumber: r.case?.case_number || 'Unknown',
        revivedAt: r.updated_at,
        daysCold: r.days_since_cold || 0,
      })) || [],
    };

    return apiSuccess(stats);
  } catch (error) {
    console.error('Error fetching cold case metrics:', error);
    return apiServerError('Failed to fetch metrics');
  }
}
