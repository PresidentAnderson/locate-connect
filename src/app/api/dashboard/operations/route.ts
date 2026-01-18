import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  OperationsDashboardData,
  AgentQueueStatusWithUser,
  StaffProductivitySummary,
  DashboardIntegrationHealth,
  BottleneckTracking,
  SLAComplianceSummary,
} from "@/types/dashboard.types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const jurisdictionId = searchParams.get("jurisdictionId");

    // Fetch all data in parallel
    const [
      casesResult,
      agentQueueResult,
      integrationHealthResult,
      staffProductivityResult,
      slaComplianceResult,
      bottlenecksResult,
    ] = await Promise.all([
      // Get active cases for workload
      supabase
        .from("cases")
        .select("id, status, priority_level, primary_investigator_id, created_at, updated_at")
        .eq("status", "active"),

      // Get agent queue status with user info
      supabase
        .from("agent_queue_status")
        .select(`
          *,
          profiles(id, first_name, last_name, email, avatar_url),
          cases(id, case_number, first_name, last_name)
        `),

      // Get integration health
      supabase
        .from("integration_health")
        .select("*")
        .order("is_critical", { ascending: false }),

      // Get staff productivity for today
      supabase
        .from("staff_productivity")
        .select(`
          *,
          profiles(id, first_name, last_name, email, role)
        `)
        .eq("metric_date", new Date().toISOString().split("T")[0]),

      // Get SLA compliance
      supabase
        .from("sla_compliance")
        .select(`
          *,
          sla_definitions(priority_level)
        `),

      // Get active bottlenecks
      supabase
        .from("bottleneck_tracking")
        .select("*")
        .in("status", ["active", "investigating"])
        .order("severity", { ascending: false }),
    ]);

    // Process active workload
    const activeCases = casesResult.data || [];
    const unassignedCases = activeCases.filter((c) => !c.primary_investigator_id).length;

    // Calculate overdue cases (cases not updated in 48+ hours)
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    const overdueCases = activeCases.filter(
      (c) => new Date(c.updated_at) < fortyEightHoursAgo
    ).length;

    // Group by priority
    const byPriority = [
      { priority: "P0 Critical", count: activeCases.filter((c) => c.priority_level === "p0_critical").length },
      { priority: "P1 High", count: activeCases.filter((c) => c.priority_level === "p1_high").length },
      { priority: "P2 Medium", count: activeCases.filter((c) => c.priority_level === "p2_medium").length },
      { priority: "P3 Low", count: activeCases.filter((c) => c.priority_level === "p3_low").length },
      { priority: "P4 Routine", count: activeCases.filter((c) => c.priority_level === "p4_routine").length },
    ];

    // Format agent queue data
    const agentQueue: AgentQueueStatusWithUser[] = (agentQueueResult.data || []).map((a) => ({
      id: a.id,
      userId: a.user_id,
      status: a.status,
      currentCaseId: a.current_case_id,
      activeCasesCount: a.active_cases_count,
      pendingLeadsCount: a.pending_leads_count,
      pendingTipsCount: a.pending_tips_count,
      maxCapacity: a.max_capacity,
      utilizationPercentage: a.utilization_percentage,
      lastActivityAt: a.last_activity_at,
      sessionStartedAt: a.session_started_at,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      user: {
        id: a.profiles?.id || "",
        firstName: a.profiles?.first_name || "",
        lastName: a.profiles?.last_name || "",
        email: a.profiles?.email || "",
        avatarUrl: a.profiles?.avatar_url,
      },
      currentCase: a.cases
        ? {
            id: a.cases.id,
            caseNumber: a.cases.case_number,
            firstName: a.cases.first_name,
            lastName: a.cases.last_name,
          }
        : undefined,
    }));

    // Format integration health
    const integrationHealth: DashboardIntegrationHealth[] = (integrationHealthResult.data || []).map((i) => ({
      id: i.id,
      integrationName: i.integration_name,
      displayName: i.display_name,
      description: i.description,
      status: i.status,
      lastCheckAt: i.last_check_at,
      lastSuccessAt: i.last_success_at,
      lastFailureAt: i.last_failure_at,
      uptimePercentage: i.uptime_percentage,
      avgResponseTimeMs: i.avg_response_time_ms,
      errorRate: i.error_rate,
      consecutiveFailures: i.consecutive_failures,
      lastErrorMessage: i.last_error_message,
      isCritical: i.is_critical,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
    }));

    // Format staff productivity
    const staffProductivity: StaffProductivitySummary[] = (staffProductivityResult.data || []).map((s) => {
      // Calculate performance score based on various metrics
      const performanceScore = calculatePerformanceScore(s);
      return {
        id: s.id,
        userId: s.user_id,
        metricDate: s.metric_date,
        casesAssigned: s.cases_assigned,
        casesResolved: s.cases_resolved,
        casesEscalated: s.cases_escalated,
        leadsCreated: s.leads_created,
        leadsVerified: s.leads_verified,
        leadsDismissed: s.leads_dismissed,
        tipsReviewed: s.tips_reviewed,
        tipsConvertedToLeads: s.tips_converted_to_leads,
        avgResponseTime: s.avg_response_time,
        totalActions: s.total_actions,
        caseUpdatesMade: s.case_updates_made,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        user: {
          id: s.profiles?.id || "",
          firstName: s.profiles?.first_name || "",
          lastName: s.profiles?.last_name || "",
          email: s.profiles?.email || "",
          role: s.profiles?.role || "",
        },
        performanceScore,
      };
    });

    // Sort by performance score and add rank
    staffProductivity.sort((a, b) => b.performanceScore - a.performanceScore);
    staffProductivity.forEach((s, index) => {
      s.rank = index + 1;
    });

    // Calculate SLA compliance summary
    const slaData = slaComplianceResult.data || [];
    const totalSLACases = slaData.length;
    const compliantCases = slaData.filter((s) => (s.compliance_score || 0) >= 80).length;
    const avgComplianceScore =
      totalSLACases > 0
        ? slaData.reduce((sum, s) => sum + (s.compliance_score || 0), 0) / totalSLACases
        : 0;

    // Group SLA by priority
    const slaPriorityGroups = slaData.reduce((acc, s) => {
      const priority = s.sla_definitions?.priority_level || "unknown";
      if (!acc[priority]) {
        acc[priority] = { total: 0, compliant: 0, totalScore: 0 };
      }
      acc[priority].total++;
      if ((s.compliance_score || 0) >= 80) acc[priority].compliant++;
      acc[priority].totalScore += s.compliance_score || 0;
      return acc;
    }, {} as Record<string, { total: number; compliant: number; totalScore: number }>);

    const slaCompliance: SLAComplianceSummary = {
      totalCases: totalSLACases,
      compliantCases,
      nonCompliantCases: totalSLACases - compliantCases,
      averageComplianceScore: avgComplianceScore,
      byPriority: (Object.entries(slaPriorityGroups) as [string, { total: number; compliant: number; totalScore: number }][]).map(([priority, data]) => ({
        priority,
        total: data.total,
        compliant: data.compliant,
        avgScore: data.total > 0 ? data.totalScore / data.total : 0,
      })),
    };

    // Format bottlenecks
    const bottlenecks: BottleneckTracking[] = (bottlenecksResult.data || []).map((b) => ({
      id: b.id,
      bottleneckType: b.bottleneck_type,
      description: b.description,
      severity: b.severity,
      status: b.status,
      affectedCasesCount: b.affected_cases_count,
      affectedUsers: b.affected_users || [],
      estimatedDelayHours: b.estimated_delay_hours,
      jurisdictionId: b.jurisdiction_id,
      affectedStage: b.affected_stage,
      identifiedAt: b.identified_at,
      resolvedAt: b.resolved_at,
      resolutionNotes: b.resolution_notes,
      resolvedBy: b.resolved_by,
      isRecurring: b.is_recurring,
      occurrenceCount: b.occurrence_count,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));

    // Build response
    const dashboardData: OperationsDashboardData = {
      activeWorkload: {
        totalActiveCases: activeCases.length,
        byPriority,
        byStatus: [
          { status: "Active", count: activeCases.length },
        ],
        unassignedCases,
        overdueCases,
      },
      agentQueue,
      integrationHealth,
      staffProductivity,
      slaCompliance,
      bottlenecks,
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Error fetching operations dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch operations dashboard data" },
      { status: 500 }
    );
  }
}

function calculatePerformanceScore(productivity: any): number {
  // Weight different metrics to calculate a performance score out of 100
  let score = 0;

  // Cases resolved (max 30 points)
  score += Math.min(productivity.cases_resolved * 10, 30);

  // Leads verified (max 20 points)
  score += Math.min(productivity.leads_verified * 5, 20);

  // Tips reviewed (max 15 points)
  score += Math.min(productivity.tips_reviewed * 3, 15);

  // Response time bonus (max 15 points) - lower is better
  if (productivity.avg_response_time) {
    const responseTimeScore = Math.max(0, 15 - productivity.avg_response_time / 10);
    score += responseTimeScore;
  }

  // Total actions (max 10 points)
  score += Math.min(productivity.total_actions / 5, 10);

  // Case updates (max 10 points)
  score += Math.min(productivity.case_updates_made * 2, 10);

  return Math.min(Math.round(score), 100);
}
