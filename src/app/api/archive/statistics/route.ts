import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/archive/statistics
 * Get archive statistics for research and analysis
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';

    // Check cache first
    const { data: cachedStats } = await supabase
      .from('archive_statistics')
      .select('*')
      .eq('statistic_type', type)
      .eq('statistic_key', 'all')
      .single();

    if (cachedStats && new Date(cachedStats.computed_at) > new Date(Date.now() - 3600000)) {
      return NextResponse.json(cachedStats.data);
    }

    // Compute fresh statistics
    let statistics: Record<string, unknown> = {};

    switch (type) {
      case 'overview':
        statistics = await computeOverviewStats(supabase);
        break;
      case 'by_disposition':
        statistics = await computeDispositionStats(supabase);
        break;
      case 'by_province':
        statistics = await computeProvinceStats(supabase);
        break;
      case 'by_year':
        statistics = await computeYearlyStats(supabase);
        break;
      case 'by_category':
        statistics = await computeCategoryStats(supabase);
        break;
      case 'risk_factors':
        statistics = await computeRiskFactorStats(supabase);
        break;
      case 'resolution_time':
        statistics = await computeResolutionTimeStats(supabase);
        break;
      default:
        statistics = await computeOverviewStats(supabase);
    }

    // Cache the result
    await supabase.from('archive_statistics').upsert({
      statistic_type: type,
      statistic_key: 'all',
      data: statistics,
      computed_at: new Date().toISOString(),
    });

    return NextResponse.json(statistics);
  } catch (error) {
    console.error('Statistics API error:', error);
    return NextResponse.json(
      { error: 'Failed to compute statistics' },
      { status: 500 }
    );
  }
}

async function computeOverviewStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { count: totalCases } = await supabase
    .from('archived_cases')
    .select('*', { count: 'exact', head: true })
    .eq('archive_status', 'published')
    .eq('family_opted_out', false);

  const { count: totalCaseStudies } = await supabase
    .from('case_studies')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true);

  const { count: activePartnerships } = await supabase
    .from('academic_partnerships')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: totalResearchers } = await supabase
    .from('research_access_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  const currentYear = new Date().getFullYear();
  const { count: casesThisYear } = await supabase
    .from('archived_cases')
    .select('*', { count: 'exact', head: true })
    .eq('archive_status', 'published')
    .eq('year_reported', currentYear);

  const { data: dispositionData } = await supabase
    .from('archived_cases')
    .select('disposition')
    .eq('archive_status', 'published')
    .eq('family_opted_out', false);

  const resolvedCount = dispositionData?.filter(
    (d) =>
      d.disposition === 'found_alive_safe' ||
      d.disposition === 'returned_voluntarily' ||
      d.disposition === 'located_runaway'
  ).length || 0;

  const resolutionRate = totalCases ? ((resolvedCount / totalCases) * 100).toFixed(1) : '0';

  return {
    totalCases: totalCases || 0,
    totalCaseStudies: totalCaseStudies || 0,
    activePartnerships: activePartnerships || 0,
    totalResearchers: totalResearchers || 0,
    casesThisYear: casesThisYear || 0,
    resolutionRate: parseFloat(resolutionRate),
    lastUpdated: new Date().toISOString(),
  };
}

async function computeDispositionStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('archived_cases')
    .select('disposition')
    .eq('archive_status', 'published')
    .eq('family_opted_out', false);

  if (!data) return { dispositions: [] };

  const counts: Record<string, number> = {};
  data.forEach((row) => {
    counts[row.disposition] = (counts[row.disposition] || 0) + 1;
  });

  const total = data.length;
  const dispositions = Object.entries(counts)
    .map(([disposition, count]) => ({
      disposition,
      count,
      percentage: parseFloat(((count / total) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count);

  return { dispositions, total };
}

async function computeProvinceStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('archived_cases')
    .select('province, disposition, days_to_resolution')
    .eq('archive_status', 'published')
    .eq('family_opted_out', false);

  if (!data) return { provinces: [] };

  const provinceMap: Record<string, { total: number; resolved: number; days: number[] }> = {};

  data.forEach((row) => {
    if (!row.province) return;

    if (!provinceMap[row.province]) {
      provinceMap[row.province] = { total: 0, resolved: 0, days: [] };
    }

    provinceMap[row.province].total++;

    if (
      row.disposition === 'found_alive_safe' ||
      row.disposition === 'returned_voluntarily' ||
      row.disposition === 'located_runaway'
    ) {
      provinceMap[row.province].resolved++;
      if (row.days_to_resolution) {
        provinceMap[row.province].days.push(row.days_to_resolution);
      }
    }
  });

  const provinces = Object.entries(provinceMap)
    .map(([province, stats]) => ({
      province,
      totalCases: stats.total,
      resolvedCases: stats.resolved,
      resolutionRate: parseFloat(((stats.resolved / stats.total) * 100).toFixed(1)),
      averageDaysToResolution:
        stats.days.length > 0
          ? Math.round(stats.days.reduce((a, b) => a + b, 0) / stats.days.length)
          : null,
    }))
    .sort((a, b) => b.totalCases - a.totalCases);

  return { provinces };
}

async function computeYearlyStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('archived_cases')
    .select('year_reported, disposition')
    .eq('archive_status', 'published')
    .eq('family_opted_out', false)
    .not('year_reported', 'is', null)
    .order('year_reported', { ascending: true });

  if (!data) return { years: [] };

  const yearMap: Record<number, { total: number; byDisposition: Record<string, number> }> = {};

  data.forEach((row) => {
    const year = row.year_reported;
    if (!year) return;

    if (!yearMap[year]) {
      yearMap[year] = { total: 0, byDisposition: {} };
    }

    yearMap[year].total++;
    yearMap[year].byDisposition[row.disposition] =
      (yearMap[year].byDisposition[row.disposition] || 0) + 1;
  });

  const years = Object.entries(yearMap)
    .map(([year, stats]) => ({
      year: parseInt(year),
      totalCases: stats.total,
      byDisposition: stats.byDisposition,
    }))
    .sort((a, b) => a.year - b.year);

  return { years };
}

async function computeCategoryStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('archived_cases')
    .select('case_category')
    .eq('archive_status', 'published')
    .eq('family_opted_out', false);

  if (!data) return { categories: [] };

  const counts: Record<string, number> = {};
  data.forEach((row) => {
    counts[row.case_category] = (counts[row.case_category] || 0) + 1;
  });

  const total = data.length;
  const categories = Object.entries(counts)
    .map(([category, count]) => ({
      category,
      count,
      percentage: parseFloat(((count / total) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count);

  return { categories, total };
}

async function computeRiskFactorStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('archived_cases')
    .select(
      'was_minor, was_elderly, was_indigenous, had_dementia, had_autism, was_suicidal_risk, suspected_abduction, suspected_foul_play, had_medical_conditions, had_mental_health_conditions'
    )
    .eq('archive_status', 'published')
    .eq('family_opted_out', false);

  if (!data) return { riskFactors: [] };

  const total = data.length;
  const factors = [
    { key: 'was_minor', label: 'Minor' },
    { key: 'was_elderly', label: 'Elderly' },
    { key: 'was_indigenous', label: 'Indigenous' },
    { key: 'had_dementia', label: 'Dementia' },
    { key: 'had_autism', label: 'Autism' },
    { key: 'was_suicidal_risk', label: 'Suicidal Risk' },
    { key: 'suspected_abduction', label: 'Suspected Abduction' },
    { key: 'suspected_foul_play', label: 'Suspected Foul Play' },
    { key: 'had_medical_conditions', label: 'Medical Conditions' },
    { key: 'had_mental_health_conditions', label: 'Mental Health Conditions' },
  ];

  const riskFactors = factors.map((factor) => {
    const count = data.filter((row) => row[factor.key as keyof typeof row]).length;
    return {
      factor: factor.label,
      count,
      percentage: parseFloat(((count / total) * 100).toFixed(1)),
    };
  }).sort((a, b) => b.count - a.count);

  return { riskFactors, total };
}

async function computeResolutionTimeStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('archived_cases')
    .select('case_category, days_to_resolution')
    .eq('archive_status', 'published')
    .eq('family_opted_out', false)
    .not('days_to_resolution', 'is', null);

  if (!data) return { resolutionTimes: [] };

  const categoryMap: Record<string, number[]> = {};

  data.forEach((row) => {
    if (!categoryMap[row.case_category]) {
      categoryMap[row.case_category] = [];
    }
    categoryMap[row.case_category].push(row.days_to_resolution);
  });

  const resolutionTimes = Object.entries(categoryMap).map(([category, days]) => {
    const sorted = days.sort((a, b) => a - b);
    const avg = days.reduce((a, b) => a + b, 0) / days.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    return {
      category,
      count: days.length,
      averageDays: Math.round(avg),
      medianDays: median,
      minDays: sorted[0],
      maxDays: sorted[sorted.length - 1],
    };
  });

  return { resolutionTimes };
}
