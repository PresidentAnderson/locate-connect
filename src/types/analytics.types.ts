/**
 * Analytics Types
 * Types for executive dashboards, KPIs, and system monitoring
 */

// Time range for analytics queries
export type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

// KPI trend direction
export type TrendDirection = 'up' | 'down' | 'stable';

// Basic KPI structure
export interface KPI {
  label: string;
  value: number;
  unit?: string;
  change?: number;
  changePercent?: number;
  trend?: TrendDirection;
  previousValue?: number;
}

// Dashboard overview KPIs
export interface DashboardKPIs {
  totalActiveCases: KPI;
  casesResolvedThisPeriod: KPI;
  averageResolutionTime: KPI;
  resolutionRate: KPI;
  criticalCasesActive: KPI;
  tipsReceived: KPI;
  leadsGenerated: KPI;
  amberAlertsActive: KPI;
}

// Case status distribution
export interface CaseStatusDistribution {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

// Priority breakdown
export interface PriorityBreakdown {
  priority: number;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

// Time series data point
export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

// Resolution metrics over time
export interface ResolutionTrend {
  period: string;
  casesOpened: number;
  casesResolved: number;
  avgResolutionHours: number;
  resolutionRate: number;
}

// Geographic distribution
export interface GeographicMetric {
  region: string;
  code: string;
  activeCases: number;
  resolvedCases: number;
  avgResolutionHours: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Agent performance metrics
export interface AgentMetrics {
  agentId: string;
  agentType: string;
  runsToday: number;
  runsThisWeek: number;
  successRate: number;
  avgDuration: number;
  itemsProcessed: number;
  leadsGenerated: number;
  errorsToday: number;
  lastRunAt: string;
  status: 'healthy' | 'degraded' | 'error';
}

// System health metrics
export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  components: SystemComponent[];
  alerts: SystemAlert[];
}

export interface SystemComponent {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency?: number;
  uptime?: number;
  lastCheck: string;
  details?: string;
}

export interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  component: string;
  timestamp: string;
  acknowledged: boolean;
}

// Full analytics response
export interface AnalyticsExecutiveDashboardData {
  kpis: DashboardKPIs;
  caseStatusDistribution: CaseStatusDistribution[];
  priorityBreakdown: PriorityBreakdown[];
  resolutionTrends: ResolutionTrend[];
  geographicDistribution: GeographicMetric[];
  recentActivity: ActivityItem[];
  agentMetrics: AgentMetrics[];
  systemHealth: SystemHealth;
  generatedAt: string;
  timeRange: TimeRange;
}

// Activity feed item
export interface ActivityItem {
  id: string;
  type: 'case_created' | 'case_resolved' | 'tip_received' | 'lead_verified' | 'priority_escalated' | 'amber_alert' | 'agent_run';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Chart configuration
export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
  title: string;
  data: ChartData;
  options?: ChartOptions;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  fill?: boolean;
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: { display: boolean; position?: string };
    title?: { display: boolean; text?: string };
  };
}

// Report export options
export interface ExportOptions {
  format: 'pdf' | 'csv' | 'xlsx' | 'json';
  includeCharts: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  sections: string[];
}

// Analytics query params
export interface AnalyticsQueryParams {
  timeRange?: TimeRange;
  startDate?: string;
  endDate?: string;
  jurisdiction?: string;
  caseType?: string;
  priority?: number;
  includeAgentMetrics?: boolean;
  includeSystemHealth?: boolean;
}
