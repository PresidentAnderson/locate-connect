/**
 * Audit Reports API Routes (LC-FEAT-037)
 * Generate and manage audit reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ComplianceFramework, AuditActionType, ViolationSeverity } from '@/types/audit.types';

interface ReportGenerationParams {
  reportType: 'compliance' | 'access' | 'security' | 'activity' | 'custom';
  title: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  frameworks?: ComplianceFramework[];
  includeUserActivity?: boolean;
  includeDataAccess?: boolean;
  includeComplianceStatus?: boolean;
  includeViolations?: boolean;
  filterByUsers?: string[];
  filterByResources?: string[];
  filterByActions?: AuditActionType[];
}

/**
 * GET /api/audit/reports
 * List audit reports
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

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const reportType = searchParams.get('reportType');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('audit_reports')
    .select('*', { count: 'exact' });

  if (reportType) {
    query = query.eq('report_type', reportType);
  }

  if (status) {
    query = query.eq('status', status);
  }

  query = query
    .order('generated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching audit reports:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data || [],
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  });
}

/**
 * POST /api/audit/reports
 * Generate a new audit report
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

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body: ReportGenerationParams = await request.json();

  // Generate report data based on type
  const reportData = await generateReportData(supabase, body);

  // Create report record
  const reportRecord = {
    report_type: body.reportType,
    title: body.title,
    date_range_start: body.dateRangeStart,
    date_range_end: body.dateRangeEnd,
    frameworks: body.frameworks,
    generated_by: user.id,
    generated_at: new Date().toISOString(),
    generation_parameters: {
      includeUserActivity: body.includeUserActivity,
      includeDataAccess: body.includeDataAccess,
      includeComplianceStatus: body.includeComplianceStatus,
      includeViolations: body.includeViolations,
      filterByUsers: body.filterByUsers,
      filterByResources: body.filterByResources,
      filterByActions: body.filterByActions,
    },
    summary: reportData.summary,
    findings: reportData.findings,
    statistics: reportData.statistics,
    recommendations: reportData.recommendations,
    status: 'final',
  };

  const { data, error } = await supabase
    .from('audit_reports')
    .insert(reportRecord)
    .select()
    .single();

  if (error) {
    console.error('Error creating audit report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

async function generateReportData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: ReportGenerationParams
) {
  const dateFilter = {
    start: params.dateRangeStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: params.dateRangeEnd || new Date().toISOString(),
  };

  // Gather statistics
  const statistics: Record<string, unknown> = {
    totalActions: 0,
    actionsByType: {} as Record<string, number>,
    uniqueUsers: 0,
    topUsers: [] as { userId: string; email: string; count: number }[],
    topResources: [] as { resourceType: string; count: number }[],
    violationsCount: 0,
    violationsBySeverity: {} as Record<string, number>,
  };

  const findings: { category: string; title: string; description: string; severity: ViolationSeverity; count?: number }[] = [];
  const recommendations: string[] = [];

  // Get audit log statistics
  const { data: auditLogs, count: totalLogs } = await supabase
    .from('comprehensive_audit_logs')
    .select('*', { count: 'exact' })
    .gte('created_at', dateFilter.start)
    .lte('created_at', dateFilter.end);

  statistics.totalActions = totalLogs || 0;

  if (auditLogs) {
    // Count actions by type
    const actionCounts: Record<string, number> = {};
    const userCounts: Record<string, { email: string; count: number }> = {};
    const resourceCounts: Record<string, number> = {};

    for (const log of auditLogs) {
      // Action counts
      const action = log.action as string;
      actionCounts[action] = (actionCounts[action] || 0) + 1;

      // User counts
      const userId = log.user_id;
      const email = log.actor_email || 'unknown';
      if (userId) {
        if (!userCounts[userId]) {
          userCounts[userId] = { email, count: 0 };
        }
        userCounts[userId].count++;
      }

      // Resource counts
      const resourceType = log.resource_type as string;
      resourceCounts[resourceType] = (resourceCounts[resourceType] || 0) + 1;
    }

    statistics.actionsByType = actionCounts;
    statistics.uniqueUsers = Object.keys(userCounts).length;
    statistics.topUsers = Object.entries(userCounts)
      .map(([userId, data]) => ({ userId, email: data.email, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    statistics.topResources = Object.entries(resourceCounts)
      .map(([resourceType, count]) => ({ resourceType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // Get violation statistics if requested
  if (params.includeViolations) {
    const { data: violations, count: violationCount } = await supabase
      .from('compliance_violations')
      .select('*', { count: 'exact' })
      .gte('detected_at', dateFilter.start)
      .lte('detected_at', dateFilter.end);

    statistics.violationsCount = violationCount || 0;

    if (violations) {
      const severityCounts: Record<string, number> = {};
      for (const violation of violations) {
        const severity = violation.severity as string;
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      }
      statistics.violationsBySeverity = severityCounts;

      // Add findings for open violations
      const openViolations = violations.filter((v) => v.status === 'open');
      if (openViolations.length > 0) {
        findings.push({
          category: 'Compliance',
          title: 'Open Violations',
          description: `There are ${openViolations.length} open compliance violations that require attention.`,
          severity: 'high',
          count: openViolations.length,
        });
        recommendations.push('Review and resolve open compliance violations promptly.');
      }
    }
  }

  // Check for compliance issues
  if (params.includeComplianceStatus) {
    const { data: assessments } = await supabase
      .from('compliance_assessments')
      .select('*')
      .order('assessment_date', { ascending: false })
      .limit(1);

    if (assessments && assessments.length > 0) {
      const latestAssessment = assessments[0];
      if (latestAssessment.overall_status === 'non_compliant') {
        findings.push({
          category: 'Compliance',
          title: 'Non-Compliant Status',
          description: `The system is currently marked as non-compliant for ${latestAssessment.framework}.`,
          severity: 'critical',
        });
        recommendations.push('Immediately address compliance gaps identified in the latest assessment.');
      }
    }
  }

  // Check for unusual access patterns
  const { data: sensitiveAccessLogs } = await supabase
    .from('data_access_logs')
    .select('*')
    .eq('contains_pii', true)
    .gte('created_at', dateFilter.start)
    .lte('created_at', dateFilter.end);

  if (sensitiveAccessLogs && sensitiveAccessLogs.length > 100) {
    findings.push({
      category: 'Security',
      title: 'High Volume of PII Access',
      description: `${sensitiveAccessLogs.length} PII access events were recorded during this period.`,
      severity: 'medium',
      count: sensitiveAccessLogs.length,
    });
    recommendations.push('Review PII access patterns to ensure compliance with data minimization principles.');
  }

  // Check for failed login attempts
  const failedLogins = auditLogs?.filter((log) => log.action === 'failed_login').length || 0;
  if (failedLogins > 50) {
    findings.push({
      category: 'Security',
      title: 'Elevated Failed Login Attempts',
      description: `${failedLogins} failed login attempts were recorded, which may indicate a security threat.`,
      severity: 'high',
      count: failedLogins,
    });
    recommendations.push('Investigate failed login patterns and consider implementing additional authentication measures.');
  }

  // Generate summary
  const summary = `Audit report covering ${dateFilter.start.split('T')[0]} to ${dateFilter.end.split('T')[0]}. ` +
    `Total actions: ${statistics.totalActions}. Unique users: ${statistics.uniqueUsers}. ` +
    `Violations: ${statistics.violationsCount}. Findings: ${findings.length}.`;

  return {
    summary,
    findings,
    statistics,
    recommendations,
  };
}
