/**
 * System Health & Monitoring Types (LC-FEAT-038)
 * Real-time monitoring of all system components, integrations, and agent health
 */

export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertChannel = 'email' | 'sms' | 'slack' | 'pagerduty' | 'webhook';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export interface ServiceHealth {
  id: string;
  serviceName: string;
  displayName: string;
  description?: string;
  status: ServiceStatus;
  lastCheckAt: string;
  lastHealthyAt?: string;
  lastUnhealthyAt?: string;
  uptimePercentage: number;
  responseTimeMs?: number;
  avgResponseTimeMs?: number;
  errorRate: number;
  consecutiveFailures: number;
  lastErrorMessage?: string;
  dependsOn: string[];
  isCritical: boolean;
  checkIntervalSeconds: number;
  timeoutMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemMetric {
  id: string;
  metricName: string;
  displayName: string;
  category: 'performance' | 'usage' | 'error' | 'business';
  value: number;
  unit: string;
  timestamp: string;
  tags: Record<string, string>;
}

export interface MetricTimeSeries {
  metricName: string;
  displayName: string;
  unit: string;
  dataPoints: {
    timestamp: string;
    value: number;
  }[];
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
  interval: string;
}

export interface DatabaseMetrics {
  connectionPoolSize: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  avgQueryTimeMs: number;
  slowQueriesCount: number;
  totalQueries: number;
  errorCount: number;
  replicationLagMs?: number;
  diskUsageBytes: number;
  diskUsagePercentage: number;
}

export interface QueueMetrics {
  queueName: string;
  displayName: string;
  pendingMessages: number;
  processingMessages: number;
  completedMessages: number;
  failedMessages: number;
  avgProcessingTimeMs: number;
  messagesPerSecond: number;
  oldestMessageAge?: number;
  consumerCount: number;
}

export interface AgentHealth {
  id: string;
  agentType: string;
  agentId: string;
  status: ServiceStatus;
  lastHeartbeatAt: string;
  currentTask?: string;
  tasksCompleted: number;
  tasksFailed: number;
  avgTaskDurationMs: number;
  memoryUsageMb: number;
  cpuUsagePercent: number;
  errorCount: number;
  lastErrorMessage?: string;
  startedAt: string;
  version: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  serviceId?: string;
  metricName?: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  channels: AlertChannel[];
  cooldownMinutes: number;
  escalationPolicyId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertCondition {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  threshold: number;
  durationSeconds?: number;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  status: 'firing' | 'acknowledged' | 'resolved';
  serviceName?: string;
  metricName?: string;
  currentValue: number;
  threshold: number;
  message: string;
  firedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notificationsSent: {
    channel: AlertChannel;
    sentAt: string;
    success: boolean;
  }[];
}

export interface EscalationPolicy {
  id: string;
  name: string;
  description?: string;
  levels: EscalationLevel[];
  repeatAfterMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationLevel {
  levelNumber: number;
  delayMinutes: number;
  notifyUserIds: string[];
  notifyTeamIds: string[];
  channels: AlertChannel[];
}

export interface OnCallSchedule {
  id: string;
  name: string;
  teamId: string;
  timezone: string;
  rotationType: 'daily' | 'weekly' | 'custom';
  participants: OnCallParticipant[];
  currentOnCall?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnCallParticipant {
  userId: string;
  userName: string;
  order: number;
  startTime?: string;
  endTime?: string;
}

export interface Incident {
  id: string;
  title: string;
  description?: string;
  status: IncidentStatus;
  severity: AlertSeverity;
  affectedServices: string[];
  commanderId?: string;
  commanderName?: string;
  timeline: IncidentTimelineEntry[];
  relatedAlerts: string[];
  startedAt: string;
  identifiedAt?: string;
  resolvedAt?: string;
  postmortemUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentTimelineEntry {
  id: string;
  timestamp: string;
  type: 'status_change' | 'note' | 'action' | 'notification';
  content: string;
  userId?: string;
  userName?: string;
}

export interface ServiceDependency {
  sourceService: string;
  targetService: string;
  dependencyType: 'hard' | 'soft';
  description?: string;
}

export interface UptimeReport {
  serviceId: string;
  serviceName: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  uptimePercentage: number;
  totalDowntimeMinutes: number;
  incidentCount: number;
  slaTarget?: number;
  slaCompliant: boolean;
  dailyUptime: {
    date: string;
    uptimePercentage: number;
  }[];
}

export interface SystemHealthDashboard {
  overallStatus: ServiceStatus;
  services: ServiceHealth[];
  activeAlerts: Alert[];
  activeIncidents: Incident[];
  databaseMetrics: DatabaseMetrics;
  queueMetrics: QueueMetrics[];
  agentHealth: AgentHealth[];
  recentMetrics: MetricTimeSeries[];
  uptimeSummary: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
}

// Display helpers
export const SERVICE_STATUS_COLORS: Record<ServiceStatus, string> = {
  healthy: 'green',
  degraded: 'yellow',
  unhealthy: 'red',
  unknown: 'gray',
};

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info: 'blue',
  warning: 'yellow',
  critical: 'orange',
  emergency: 'red',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
};
