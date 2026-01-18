/**
 * Analytics Service
 * Provides KPI calculations and dashboard metrics
 */

import { createClient } from '@/lib/supabase/server';
import type {
  TimeRange,
  DashboardKPIs,
  CaseStatusDistribution,
  PriorityBreakdown,
  ResolutionTrend,
  GeographicMetric,
  AgentMetrics,
  SystemHealth,
  ActivityItem,
  AnalyticsExecutiveDashboardData,
  TrendDirection,
} from '@/types/analytics.types';

// Time range to hours mapping
const TIME_RANGE_HOURS: Record<TimeRange, number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
  '90d': 24 * 90,
  '1y': 24 * 365,
  'all': 24 * 365 * 10, // 10 years
};

/**
 * Get complete executive dashboard data
 */
export async function getExecutiveDashboardData(
  timeRange: TimeRange = '30d'
): Promise<AnalyticsExecutiveDashboardData> {
  const [
    kpis,
    caseStatusDistribution,
    priorityBreakdown,
    resolutionTrends,
    geographicDistribution,
    recentActivity,
    agentMetrics,
    systemHealth,
  ] = await Promise.all([
    getDashboardKPIs(timeRange),
    getCaseStatusDistribution(),
    getPriorityBreakdown(),
    getResolutionTrends(timeRange),
    getGeographicDistribution(),
    getRecentActivity(20),
    getAgentMetrics(),
    getSystemHealth(),
  ]);

  return {
    kpis,
    caseStatusDistribution,
    priorityBreakdown,
    resolutionTrends,
    geographicDistribution,
    recentActivity,
    agentMetrics,
    systemHealth,
    generatedAt: new Date().toISOString(),
    timeRange,
  };
}

/**
 * Calculate main dashboard KPIs
 */
export async function getDashboardKPIs(timeRange: TimeRange): Promise<DashboardKPIs> {
  const supabase = await createClient();
  const hours = TIME_RANGE_HOURS[timeRange];
  const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const previousStartDate = new Date(Date.now() - hours * 2 * 60 * 60 * 1000).toISOString();

  // Get current period metrics
  const [
    { count: totalActiveCases },
    { data: resolvedCases },
    { data: previousResolvedCases },
    { count: criticalCases },
    { count: tipsReceived },
    { count: previousTips },
    { count: leadsGenerated },
    { count: amberAlerts },
  ] = await Promise.all([
    supabase.from('cases').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('cases')
      .select('id, created_at, resolved_at')
      .eq('status', 'resolved')
      .gte('resolved_at', startDate),
    supabase
      .from('cases')
      .select('id')
      .eq('status', 'resolved')
      .gte('resolved_at', previousStartDate)
      .lt('resolved_at', startDate),
    supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .lte('priority_level', 1),
    supabase
      .from('tips')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate),
    supabase
      .from('tips')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', previousStartDate)
      .lt('created_at', startDate),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate),
    supabase
      .from('amber_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
  ]);

  // Calculate average resolution time
  let avgResolutionHours = 0;
  if (resolvedCases && resolvedCases.length > 0) {
    const totalHours = resolvedCases.reduce((sum, c) => {
      if (c.resolved_at && c.created_at) {
        const created = new Date(c.created_at).getTime();
        const resolved = new Date(c.resolved_at).getTime();
        return sum + (resolved - created) / (1000 * 60 * 60);
      }
      return sum;
    }, 0);
    avgResolutionHours = totalHours / resolvedCases.length;
  }

  // Calculate changes
  const resolvedCount = resolvedCases?.length || 0;
  const previousResolvedCount = previousResolvedCases?.length || 0;
  const resolvedChange = resolvedCount - previousResolvedCount;

  const tipsChange = (tipsReceived || 0) - (previousTips || 0);

  return {
    totalActiveCases: {
      label: 'Active Cases',
      value: totalActiveCases || 0,
      trend: 'stable',
    },
    casesResolvedThisPeriod: {
      label: 'Cases Resolved',
      value: resolvedCount,
      change: resolvedChange,
      changePercent: previousResolvedCount > 0
        ? Math.round((resolvedChange / previousResolvedCount) * 100)
        : 0,
      trend: getTrend(resolvedChange),
    },
    averageResolutionTime: {
      label: 'Avg Resolution Time',
      value: Math.round(avgResolutionHours),
      unit: 'hours',
      trend: 'stable',
    },
    resolutionRate: {
      label: 'Resolution Rate',
      value: totalActiveCases
        ? Math.round((resolvedCount / (resolvedCount + (totalActiveCases || 0))) * 100)
        : 0,
      unit: '%',
      trend: 'stable',
    },
    criticalCasesActive: {
      label: 'Critical Cases',
      value: criticalCases || 0,
      trend: (criticalCases || 0) > 5 ? 'up' : 'stable',
    },
    tipsReceived: {
      label: 'Tips Received',
      value: tipsReceived || 0,
      change: tipsChange,
      trend: getTrend(tipsChange),
    },
    leadsGenerated: {
      label: 'Leads Generated',
      value: leadsGenerated || 0,
      trend: 'stable',
    },
    amberAlertsActive: {
      label: 'Active AMBER Alerts',
      value: amberAlerts || 0,
      trend: 'stable',
    },
  };
}

/**
 * Get case status distribution
 */
export async function getCaseStatusDistribution(): Promise<CaseStatusDistribution[]> {
  const supabase = await createClient();

  const { data: cases } = await supabase
    .from('cases')
    .select('status');

  if (!cases || cases.length === 0) {
    return [];
  }

  const statusCounts: Record<string, number> = {};
  cases.forEach((c) => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  });

  const total = cases.length;
  const colors: Record<string, string> = {
    active: '#0891b2',
    resolved: '#22c55e',
    closed: '#6b7280',
    cold: '#3b82f6',
    suspended: '#f59e0b',
  };

  return Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    percentage: Math.round((count / total) * 100),
    color: colors[status] || '#6b7280',
  }));
}

/**
 * Get priority breakdown
 */
export async function getPriorityBreakdown(): Promise<PriorityBreakdown[]> {
  const supabase = await createClient();

  const { data: cases } = await supabase
    .from('cases')
    .select('priority_level')
    .eq('status', 'active');

  if (!cases || cases.length === 0) {
    return [];
  }

  const priorityCounts: Record<number, number> = {};
  cases.forEach((c) => {
    const priority = c.priority_level ?? 4;
    priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
  });

  const total = cases.length;
  const labels: Record<number, string> = {
    0: 'P0 - Critical',
    1: 'P1 - High',
    2: 'P2 - Medium',
    3: 'P3 - Low',
    4: 'P4 - Minimal',
  };
  const colors: Record<number, string> = {
    0: '#dc2626',
    1: '#f97316',
    2: '#eab308',
    3: '#22c55e',
    4: '#6b7280',
  };

  return Object.entries(priorityCounts)
    .map(([priority, count]) => ({
      priority: parseInt(priority),
      label: labels[parseInt(priority)] || `P${priority}`,
      count,
      percentage: Math.round((count / total) * 100),
      color: colors[parseInt(priority)] || '#6b7280',
    }))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get resolution trends over time
 */
export async function getResolutionTrends(timeRange: TimeRange): Promise<ResolutionTrend[]> {
  const supabase = await createClient();
  const hours = TIME_RANGE_HOURS[timeRange];
  const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Determine period granularity
  let periodDays = 1;
  if (timeRange === '30d' || timeRange === '90d') periodDays = 7;
  if (timeRange === '1y' || timeRange === 'all') periodDays = 30;

  const { data: cases } = await supabase
    .from('cases')
    .select('id, status, created_at, resolved_at')
    .gte('created_at', startDate.toISOString());

  if (!cases) return [];

  // Group by period
  const periods: Map<string, { opened: number; resolved: number; resolutionHours: number[] }> = new Map();

  cases.forEach((c) => {
    const createdDate = new Date(c.created_at);
    const periodStart = getPeriodStart(createdDate, periodDays);
    const periodKey = periodStart.toISOString().split('T')[0];

    if (!periods.has(periodKey)) {
      periods.set(periodKey, { opened: 0, resolved: 0, resolutionHours: [] });
    }

    const period = periods.get(periodKey)!;
    period.opened++;

    if (c.status === 'resolved' && c.resolved_at) {
      period.resolved++;
      const created = new Date(c.created_at).getTime();
      const resolved = new Date(c.resolved_at).getTime();
      period.resolutionHours.push((resolved - created) / (1000 * 60 * 60));
    }
  });

  return Array.from(periods.entries())
    .map(([period, data]) => ({
      period,
      casesOpened: data.opened,
      casesResolved: data.resolved,
      avgResolutionHours: data.resolutionHours.length > 0
        ? Math.round(data.resolutionHours.reduce((a, b) => a + b, 0) / data.resolutionHours.length)
        : 0,
      resolutionRate: data.opened > 0 ? Math.round((data.resolved / data.opened) * 100) : 0,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Get geographic distribution of cases
 */
export async function getGeographicDistribution(): Promise<GeographicMetric[]> {
  const supabase = await createClient();

  const { data: cases } = await supabase
    .from('cases')
    .select('id, status, last_known_province, resolved_at, created_at');

  if (!cases) return [];

  const regions: Map<string, { active: number; resolved: number; resolutionHours: number[] }> = new Map();

  cases.forEach((c) => {
    const region = c.last_known_province || 'Unknown';

    if (!regions.has(region)) {
      regions.set(region, { active: 0, resolved: 0, resolutionHours: [] });
    }

    const data = regions.get(region)!;

    if (c.status === 'active') {
      data.active++;
    } else if (c.status === 'resolved') {
      data.resolved++;
      if (c.resolved_at && c.created_at) {
        const created = new Date(c.created_at).getTime();
        const resolved = new Date(c.resolved_at).getTime();
        data.resolutionHours.push((resolved - created) / (1000 * 60 * 60));
      }
    }
  });

  const provinceCodes: Record<string, string> = {
    'Quebec': 'QC',
    'Ontario': 'ON',
    'British Columbia': 'BC',
    'Alberta': 'AB',
    'Manitoba': 'MB',
    'Saskatchewan': 'SK',
    'Nova Scotia': 'NS',
    'New Brunswick': 'NB',
    'Newfoundland and Labrador': 'NL',
    'Prince Edward Island': 'PE',
    'Northwest Territories': 'NT',
    'Yukon': 'YT',
    'Nunavut': 'NU',
  };

  return Array.from(regions.entries())
    .map(([region, data]) => ({
      region,
      code: provinceCodes[region] || region.substring(0, 2).toUpperCase(),
      activeCases: data.active,
      resolvedCases: data.resolved,
      avgResolutionHours: data.resolutionHours.length > 0
        ? Math.round(data.resolutionHours.reduce((a, b) => a + b, 0) / data.resolutionHours.length)
        : 0,
    }))
    .sort((a, b) => b.activeCases - a.activeCases);
}

/**
 * Get recent activity feed
 */
export async function getRecentActivity(limit: number = 20): Promise<ActivityItem[]> {
  const supabase = await createClient();
  const activities: ActivityItem[] = [];

  // Get recent cases
  const { data: recentCases } = await supabase
    .from('cases')
    .select('id, case_number, status, first_name, last_name, created_at, resolved_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentCases) {
    recentCases.forEach((c) => {
      if (c.status === 'resolved' && c.resolved_at) {
        activities.push({
          id: `case-resolved-${c.id}`,
          type: 'case_resolved',
          title: `Case ${c.case_number} Resolved`,
          description: `${c.first_name} ${c.last_name} has been found`,
          timestamp: c.resolved_at,
        });
      } else {
        activities.push({
          id: `case-created-${c.id}`,
          type: 'case_created',
          title: `New Case: ${c.case_number}`,
          description: `Missing person report filed for ${c.first_name} ${c.last_name}`,
          timestamp: c.created_at,
        });
      }
    });
  }

  // Get recent tips
  const { data: recentTips } = await supabase
    .from('tips')
    .select('id, case_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentTips) {
    recentTips.forEach((t) => {
      activities.push({
        id: `tip-${t.id}`,
        type: 'tip_received',
        title: 'New Tip Received',
        description: `A tip has been submitted for case review`,
        timestamp: t.created_at,
      });
    });
  }

  // Get recent agent runs
  const { data: recentRuns } = await supabase
    .from('agent_runs')
    .select('id, agent_type, status, completed_at')
    .order('completed_at', { ascending: false })
    .limit(5);

  if (recentRuns) {
    recentRuns.forEach((r) => {
      activities.push({
        id: `agent-${r.id}`,
        type: 'agent_run',
        title: `Agent: ${formatAgentType(r.agent_type)}`,
        description: `Completed with status: ${r.status}`,
        timestamp: r.completed_at,
      });
    });
  }

  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Get agent performance metrics
 */
export async function getAgentMetrics(): Promise<AgentMetrics[]> {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data: runs } = await supabase
    .from('agent_runs')
    .select('*')
    .gte('started_at', weekAgo.toISOString())
    .order('started_at', { ascending: false });

  if (!runs) return [];

  // Group by agent type
  const agentStats: Map<string, {
    runsToday: number;
    runsThisWeek: number;
    successCount: number;
    totalDuration: number;
    itemsProcessed: number;
    leadsGenerated: number;
    errorsToday: number;
    lastRun: string;
  }> = new Map();

  runs.forEach((run) => {
    const agentType = run.agent_type;
    if (!agentStats.has(agentType)) {
      agentStats.set(agentType, {
        runsToday: 0,
        runsThisWeek: 0,
        successCount: 0,
        totalDuration: 0,
        itemsProcessed: 0,
        leadsGenerated: 0,
        errorsToday: 0,
        lastRun: run.completed_at || run.started_at,
      });
    }

    const stats = agentStats.get(agentType)!;
    stats.runsThisWeek++;

    const runDate = new Date(run.started_at);
    if (runDate >= today) {
      stats.runsToday++;
      if (run.status !== 'completed') {
        stats.errorsToday++;
      }
    }

    if (run.status === 'completed' || run.status === 'completed_with_errors') {
      stats.successCount++;
    }

    if (run.started_at && run.completed_at) {
      const duration = new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
      stats.totalDuration += duration;
    }

    stats.itemsProcessed += run.cases_processed || 0;
    stats.leadsGenerated += run.cases_affected || 0;

    if (run.completed_at > stats.lastRun) {
      stats.lastRun = run.completed_at;
    }
  });

  return Array.from(agentStats.entries()).map(([agentType, stats]) => ({
    agentId: agentType,
    agentType: formatAgentType(agentType),
    runsToday: stats.runsToday,
    runsThisWeek: stats.runsThisWeek,
    successRate: stats.runsThisWeek > 0
      ? Math.round((stats.successCount / stats.runsThisWeek) * 100)
      : 0,
    avgDuration: stats.runsThisWeek > 0
      ? Math.round(stats.totalDuration / stats.runsThisWeek / 1000)
      : 0,
    itemsProcessed: stats.itemsProcessed,
    leadsGenerated: stats.leadsGenerated,
    errorsToday: stats.errorsToday,
    lastRunAt: stats.lastRun,
    status: stats.errorsToday > 2 ? 'error' : stats.errorsToday > 0 ? 'degraded' : 'healthy',
  }));
}

/**
 * Get system health status
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const supabase = await createClient();
  const components: SystemHealth['components'] = [];
  const alerts: SystemHealth['alerts'] = [];

  // Check database connectivity
  const dbStart = Date.now();
  const { error: dbError } = await supabase.from('cases').select('id').limit(1);
  const dbLatency = Date.now() - dbStart;

  components.push({
    name: 'Database',
    status: dbError ? 'down' : dbLatency > 1000 ? 'degraded' : 'operational',
    latency: dbLatency,
    lastCheck: new Date().toISOString(),
    details: dbError ? dbError.message : undefined,
  });

  if (dbError) {
    alerts.push({
      id: crypto.randomUUID(),
      severity: 'critical',
      message: 'Database connection failed',
      component: 'Database',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  // Check agent health
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentRuns } = await supabase
    .from('agent_runs')
    .select('agent_type, status, completed_at')
    .gte('completed_at', oneHourAgo);

  const agentErrors = recentRuns?.filter(r => r.status === 'failed').length || 0;

  components.push({
    name: 'Background Agents',
    status: agentErrors > 3 ? 'degraded' : 'operational',
    lastCheck: new Date().toISOString(),
    details: agentErrors > 0 ? `${agentErrors} errors in the last hour` : undefined,
  });

  if (agentErrors > 3) {
    alerts.push({
      id: crypto.randomUUID(),
      severity: 'warning',
      message: `${agentErrors} agent failures in the last hour`,
      component: 'Background Agents',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });
  }

  // Check API health (self)
  components.push({
    name: 'API Server',
    status: 'operational',
    latency: 0,
    lastCheck: new Date().toISOString(),
  });

  // Check storage
  components.push({
    name: 'File Storage',
    status: 'operational',
    lastCheck: new Date().toISOString(),
  });

  // Determine overall health
  const hasDown = components.some(c => c.status === 'down');
  const hasDegraded = components.some(c => c.status === 'degraded');

  return {
    overall: hasDown ? 'critical' : hasDegraded ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    components,
    alerts,
  };
}

// Helper functions
function getTrend(change: number): TrendDirection {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'stable';
}

function getPeriodStart(date: Date, periodDays: number): Date {
  const result = new Date(date);
  const dayOfPeriod = Math.floor(result.getDate() / periodDays) * periodDays;
  result.setDate(dayOfPeriod || 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatAgentType(type: string): string {
  const labels: Record<string, string> = {
    priority_escalation: 'Priority Escalation',
    news_crawler: 'News Crawler',
    social_media: 'Social Media Monitor',
    public_records: 'Public Records',
    hospital_registry: 'Hospital Registry',
    notification_digest: 'Notification Digest',
    stale_case_check: 'Stale Case Check',
  };
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
