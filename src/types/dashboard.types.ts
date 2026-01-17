/**
 * Dashboard Types for Executive & Operational Dashboards
 * LC-FEAT-039
 */

// =============================================================================
// ENUMS
// =============================================================================

export type AgentStatus = 'available' | 'busy' | 'away' | 'offline';
export type IntegrationStatus = 'healthy' | 'degraded' | 'down' | 'unknown';
export type ReportFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type ReportFormat = 'pdf' | 'csv' | 'excel' | 'json';
export type BottleneckSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BottleneckStatus = 'active' | 'investigating' | 'resolved' | 'monitoring';
export type MetricType = 'daily' | 'weekly' | 'monthly' | 'yearly';

// =============================================================================
// DASHBOARD METRICS
// =============================================================================

export interface DashboardMetrics {
  id: string;
  metricType: MetricType;
  metricDate: string;
  jurisdictionId?: string;

  // Case Metrics
  totalCases: number;
  activeCases: number;
  resolvedCases: number;
  closedCases: number;
  coldCases: number;

  // Resolution Metrics
  foundAliveSafe: number;
  foundAliveInjured: number;
  foundDeceased: number;
  returnedVoluntarily: number;

  // Priority Distribution
  p0CriticalCount: number;
  p1HighCount: number;
  p2MediumCount: number;
  p3LowCount: number;
  p4RoutineCount: number;

  // Time Metrics
  avgTimeToResolution?: number;
  medianTimeToResolution?: number;

  // Demographics
  minorCases: number;
  elderlyCases: number;
  indigenousCases: number;
  medicalDependencyCases: number;

  // Lead and Tip Metrics
  totalLeads: number;
  verifiedLeads: number;
  totalTips: number;
  verifiedTips: number;

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// KPI CARDS
// =============================================================================

export interface KPICard {
  id: string;
  title: string;
  value: number | string;
  previousValue?: number | string;
  changePercentage?: number;
  changeDirection?: 'up' | 'down' | 'neutral';
  format?: 'number' | 'percentage' | 'currency' | 'duration' | 'time';
  icon?: string;
  color?: 'cyan' | 'green' | 'red' | 'orange' | 'yellow' | 'gray';
  description?: string;
  trend?: TrendData[];
}

export interface TrendData {
  date: string;
  value: number;
}

// =============================================================================
// STAFF PRODUCTIVITY
// =============================================================================

export interface StaffProductivity {
  id: string;
  userId: string;
  metricDate: string;

  // Workload
  casesAssigned: number;
  casesResolved: number;
  casesEscalated: number;

  // Lead Management
  leadsCreated: number;
  leadsVerified: number;
  leadsDismissed: number;

  // Tip Processing
  tipsReviewed: number;
  tipsConvertedToLeads: number;

  // Response Times (in minutes)
  avgResponseTime?: number;

  // Activity
  totalActions: number;
  caseUpdatesMade: number;

  createdAt: string;
  updatedAt: string;
}

export interface StaffProductivitySummary extends StaffProductivity {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  performanceScore: number;
  rank?: number;
}

// =============================================================================
// AGENT QUEUE STATUS
// =============================================================================

export interface AgentQueueStatus {
  id: string;
  userId: string;
  status: AgentStatus;
  currentCaseId?: string;
  activeCasesCount: number;
  pendingLeadsCount: number;
  pendingTipsCount: number;
  maxCapacity: number;
  utilizationPercentage: number;
  lastActivityAt?: string;
  sessionStartedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentQueueStatusWithUser extends AgentQueueStatus {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  currentCase?: {
    id: string;
    caseNumber: string;
    firstName: string;
    lastName: string;
  };
}

// =============================================================================
// SLA
// =============================================================================

export interface SLADefinition {
  id: string;
  name: string;
  priorityLevel: string;
  jurisdictionId?: string;
  initialResponseHours: number;
  firstActionHours: number;
  updateFrequencyHours: number;
  escalationThresholdHours: number;
  resolutionTargetHours?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SLACompliance {
  id: string;
  caseId: string;
  slaDefinitionId: string;
  initialResponseMet?: boolean;
  initialResponseAt?: string;
  firstActionMet?: boolean;
  firstActionAt?: string;
  updatesOnTime: number;
  updatesLate: number;
  lastUpdateAt?: string;
  nextUpdateDue?: string;
  wasEscalated: boolean;
  escalatedAt?: string;
  escalationReason?: string;
  resolutionMet?: boolean;
  resolvedAt?: string;
  complianceScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SLAComplianceSummary {
  totalCases: number;
  compliantCases: number;
  nonCompliantCases: number;
  averageComplianceScore: number;
  byPriority: {
    priority: string;
    total: number;
    compliant: number;
    avgScore: number;
  }[];
}

// =============================================================================
// INTEGRATION HEALTH
// =============================================================================

export interface IntegrationHealth {
  id: string;
  integrationName: string;
  displayName: string;
  description?: string;
  status: IntegrationStatus;
  lastCheckAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  uptimePercentage: number;
  avgResponseTimeMs?: number;
  errorRate: number;
  consecutiveFailures: number;
  lastErrorMessage?: string;
  isCritical: boolean;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// PARTNER ENGAGEMENT
// =============================================================================

export interface PartnerEngagement {
  id: string;
  organizationId: string;
  metricDate: string;
  casesReferred: number;
  casesReceived: number;
  casesJointlyResolved: number;
  leadsShared: number;
  leadsReceived: number;
  tipsForwarded: number;
  avgResponseTimeHours?: number;
  collaborationScore?: number;
  apiCalls: number;
  emailsSent: number;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerEngagementWithOrg extends PartnerEngagement {
  organization: {
    id: string;
    name: string;
    type: string;
  };
}

// =============================================================================
// SCHEDULED REPORTS
// =============================================================================

export interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  reportType: string;
  frequency: ReportFrequency;
  nextRunAt: string;
  lastRunAt?: string;
  timezone: string;
  jurisdictionId?: string;
  organizationId?: string;
  dateRangeDays: number;
  customFilters: Record<string, unknown>;
  format: ReportFormat;
  includeCharts: boolean;
  includeBranding: boolean;
  recipients: ReportRecipient[];
  ccRecipients: ReportRecipient[];
  subjectTemplate?: string;
  bodyTemplate?: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportRecipient {
  email: string;
  name: string;
}

export interface GeneratedReport {
  id: string;
  scheduledReportId?: string;
  name: string;
  reportType: string;
  format: ReportFormat;
  dateFrom: string;
  dateTo: string;
  jurisdictionId?: string;
  organizationId?: string;
  filtersApplied: Record<string, unknown>;
  fileUrl?: string;
  fileSizeBytes?: number;
  generatedBy?: string;
  generationStartedAt?: string;
  generationCompletedAt?: string;
  generationError?: string;
  deliveryStatus: 'pending' | 'sent' | 'failed';
  deliveredAt?: string;
  deliveryError?: string;
  createdAt: string;
}

// =============================================================================
// GEOGRAPHIC DISTRIBUTION
// =============================================================================

export interface GeographicDistribution {
  id: string;
  metricDate: string;
  province: string;
  city?: string;
  jurisdictionId?: string;
  latitude?: number;
  longitude?: number;
  activeCases: number;
  resolvedCases: number;
  totalCases: number;
  minorCases: number;
  indigenousCases: number;
  avgResolutionHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GeoMapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  count: number;
  type: 'active' | 'resolved' | 'all';
  details?: GeographicDistribution;
}

// =============================================================================
// BOTTLENECK TRACKING
// =============================================================================

export interface BottleneckTracking {
  id: string;
  bottleneckType: string;
  description: string;
  severity: BottleneckSeverity;
  status: BottleneckStatus;
  affectedCasesCount: number;
  affectedUsers: string[];
  estimatedDelayHours?: number;
  jurisdictionId?: string;
  affectedStage?: string;
  identifiedAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  isRecurring: boolean;
  occurrenceCount: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// EXECUTIVE DASHBOARD
// =============================================================================

export interface ExecutiveDashboardData {
  kpis: KPICard[];
  resolutionRates: {
    overall: number;
    byPriority: { priority: string; rate: number }[];
    byDisposition: { disposition: string; count: number }[];
  };
  avgTimeToResolution: {
    current: number;
    previous: number;
    changePercentage: number;
    byPriority: { priority: string; avgHours: number }[];
  };
  geographicDistribution: GeographicDistribution[];
  trendComparisons: {
    yearOverYear: TrendComparison;
    monthOverMonth: TrendComparison;
  };
  resourceUtilization: {
    totalAgents: number;
    activeAgents: number;
    avgUtilization: number;
    byStatus: { status: AgentStatus; count: number }[];
  };
  partnerEngagement: PartnerEngagementWithOrg[];
}

export interface TrendComparison {
  currentPeriod: { start: string; end: string; value: number };
  previousPeriod: { start: string; end: string; value: number };
  changePercentage: number;
  metrics: {
    name: string;
    current: number;
    previous: number;
    change: number;
  }[];
}

// =============================================================================
// OPERATIONS DASHBOARD
// =============================================================================

export interface OperationsDashboardData {
  activeWorkload: {
    totalActiveCases: number;
    byPriority: { priority: string; count: number }[];
    byStatus: { status: string; count: number }[];
    unassignedCases: number;
    overdueCases: number;
  };
  agentQueue: AgentQueueStatusWithUser[];
  integrationHealth: IntegrationHealth[];
  staffProductivity: StaffProductivitySummary[];
  slaCompliance: SLAComplianceSummary;
  bottlenecks: BottleneckTracking[];
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

export interface ReportGenerationRequest {
  reportType: 'executive_summary' | 'operations' | 'case_metrics' | 'partner_engagement' | 'sla_compliance' | 'staff_productivity' | 'geographic_analysis' | 'comprehensive' | 'custom';
  dateFrom: string;
  dateTo: string;
  format: ReportFormat;
  jurisdictionId?: string;
  organizationId?: string;
  includeCharts?: boolean;
  includeBranding?: boolean;
  customFilters?: Record<string, unknown>;
}

export interface ReportGenerationResponse {
  reportId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedCompletionTime?: string;
  fileUrl?: string;
  error?: string;
}

// =============================================================================
// DATE RANGE FILTERS
// =============================================================================

export interface DateRangeFilter {
  startDate: string;
  endDate: string;
  preset?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'lastYear' | 'custom';
}

export interface DashboardFilters {
  dateRange: DateRangeFilter;
  jurisdictionId?: string;
  priorityLevels?: string[];
  caseStatuses?: string[];
}
