/**
 * Integration Monitor Service
 * Monitors integration health, collects metrics, and evaluates alert rules
 */

import type {
  IntegrationMetrics,
  IntegrationAlert,
  HealthCheckResult,
} from '@/types';
import type { IntegrationAlertRule } from '@/types/integration.types';
import { getConnectorFactory } from '../connector-framework';

export interface MonitoringConfig {
  healthCheckIntervalMs: number;
  metricsCollectionIntervalMs: number;
  alertEvaluationIntervalMs: number;
  retentionDays: number;
}

export interface MetricSnapshot {
  integrationId: string;
  timestamp: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTimeMs: number;
  errorRate: number;
}

const DEFAULT_CONFIG: MonitoringConfig = {
  healthCheckIntervalMs: 60000, // 1 minute
  metricsCollectionIntervalMs: 60000, // 1 minute
  alertEvaluationIntervalMs: 30000, // 30 seconds
  retentionDays: 30,
};

/**
 * Integration Monitor Service
 */
export class IntegrationMonitorService {
  private config: MonitoringConfig;
  private alertRules: Map<string, IntegrationAlertRule> = new Map();
  private activeAlerts: Map<string, IntegrationAlert> = new Map();
  private metricsBuffer: Map<string, MetricSnapshot[]> = new Map();
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start monitoring an integration
   */
  startMonitoring(integrationId: string): void {
    if (this.healthCheckTimers.has(integrationId)) {
      return; // Already monitoring
    }

    console.log(`[IntegrationMonitor] Starting monitoring for ${integrationId}`);

    // Initialize metrics buffer
    this.metricsBuffer.set(integrationId, []);

    // Start health check timer
    const timer = setInterval(async () => {
      await this.runHealthCheck(integrationId);
    }, this.config.healthCheckIntervalMs);

    this.healthCheckTimers.set(integrationId, timer);

    // Run initial health check
    this.runHealthCheck(integrationId);
  }

  /**
   * Stop monitoring an integration
   */
  stopMonitoring(integrationId: string): void {
    const timer = this.healthCheckTimers.get(integrationId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(integrationId);
    }
    this.metricsBuffer.delete(integrationId);
    console.log(`[IntegrationMonitor] Stopped monitoring for ${integrationId}`);
  }

  /**
   * Run health check for an integration
   */
  async runHealthCheck(integrationId: string): Promise<HealthCheckResult> {
    const factory = getConnectorFactory();
    const connector = factory.get(integrationId);

    if (!connector) {
      return {
        healthy: false,
        status: 'unknown',
        responseTimeMs: 0,
        lastCheck: new Date().toISOString(),
        message: 'Connector not found',
      };
    }

    const result = await connector.healthCheck();

    // Evaluate alert rules
    await this.evaluateHealthAlerts(integrationId, result);

    return result;
  }

  /**
   * Record a metric snapshot
   */
  recordMetrics(integrationId: string, snapshot: MetricSnapshot): void {
    const buffer = this.metricsBuffer.get(integrationId) || [];
    buffer.push(snapshot);

    // Keep only last hour of data in memory
    const oneHourAgo = new Date(Date.now() - 3600000);
    const filtered = buffer.filter((s) => s.timestamp > oneHourAgo);
    this.metricsBuffer.set(integrationId, filtered);
  }

  /**
   * Get metrics for an integration
   */
  getMetrics(
    integrationId: string,
    period: 'hour' | 'day' | 'week' | 'month'
  ): IntegrationMetrics {
    const buffer = this.metricsBuffer.get(integrationId) || [];

    // Calculate period start
    const now = new Date();
    let periodStart: Date;
    switch (period) {
      case 'hour':
        periodStart = new Date(now.getTime() - 3600000);
        break;
      case 'day':
        periodStart = new Date(now.getTime() - 86400000);
        break;
      case 'week':
        periodStart = new Date(now.getTime() - 604800000);
        break;
      case 'month':
        periodStart = new Date(now.getTime() - 2592000000);
        break;
    }

    // Filter and aggregate
    const relevantSnapshots = buffer.filter((s) => s.timestamp >= periodStart);

    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    const responseTimes: number[] = [];
    const errorsByType: Record<string, number> = {};

    for (const snapshot of relevantSnapshots) {
      totalRequests += snapshot.totalRequests;
      successfulRequests += snapshot.successfulRequests;
      failedRequests += snapshot.failedRequests;
      totalResponseTime += snapshot.avgResponseTimeMs * snapshot.totalRequests;
      responseTimes.push(snapshot.avgResponseTimeMs);
    }

    // Calculate percentiles
    responseTimes.sort((a, b) => a - b);
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)] || 0;
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;

    return {
      integrationId,
      period,
      startTime: periodStart.toISOString(),
      endTime: now.toISOString(),
      totalRequests,
      successfulRequests,
      failedRequests,
      avgResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      p50ResponseTime: p50,
      p95ResponseTime: p95,
      p99ResponseTime: p99,
      errorsByType,
      dataIn: 0,
      dataOut: 0,
      recordsProcessed: 0,
    };
  }

  /**
   * Register an alert rule
   */
  registerIntegrationAlertRule(rule: IntegrationAlertRule): void {
    this.alertRules.set(rule.id, rule);
    console.log(`[IntegrationMonitor] Registered alert rule: ${rule.name}`);
  }

  /**
   * Unregister an alert rule
   */
  unregisterIntegrationAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  /**
   * Evaluate alert rules for all integrations
   */
  async evaluateIntegrationAlertRules(): Promise<IntegrationAlert[]> {
    const newAlerts: IntegrationAlert[] = [];

    for (const [integrationId] of this.metricsBuffer) {
      const alerts = await this.evaluateRulesForIntegration(integrationId);
      newAlerts.push(...alerts);
    }

    return newAlerts;
  }

  /**
   * Evaluate alert rules for a specific integration
   */
  private async evaluateRulesForIntegration(
    integrationId: string
  ): Promise<IntegrationAlert[]> {
    const alerts: IntegrationAlert[] = [];
    const metrics = this.getMetrics(integrationId, 'hour');

    for (const rule of this.alertRules.values()) {
      // Skip if rule is for a different integration
      if (rule.integrationId && rule.integrationId !== integrationId) {
        continue;
      }

      if (!rule.enabled) {
        continue;
      }

      const shouldAlert = this.evaluateRule(rule, metrics);

      if (shouldAlert) {
        const alertId = `${integrationId}-${rule.id}`;
        if (!this.activeAlerts.has(alertId)) {
          const alert: IntegrationAlert = {
            id: crypto.randomUUID(),
            integrationId,
            type: 'error',
            severity: rule.alertSeverity,
            title: `${rule.name} triggered`,
            message: this.formatAlertMessage(rule, metrics),
            status: 'active',
            createdAt: new Date().toISOString(),
          };
          this.activeAlerts.set(alertId, alert);
          alerts.push(alert);
        }
      } else {
        // Clear resolved alert
        const alertId = `${integrationId}-${rule.id}`;
        this.activeAlerts.delete(alertId);
      }
    }

    return alerts;
  }

  /**
   * Evaluate health-based alerts
   */
  private async evaluateHealthAlerts(
    integrationId: string,
    health: HealthCheckResult
  ): Promise<void> {
    const alertId = `${integrationId}-health`;

    if (!health.healthy) {
      if (!this.activeAlerts.has(alertId)) {
        const alert: IntegrationAlert = {
          id: crypto.randomUUID(),
          integrationId,
          type: 'error',
          severity: 'high',
          title: 'Integration unhealthy',
          message: health.message || 'Health check failed',
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        this.activeAlerts.set(alertId, alert);
      }
    } else {
      this.activeAlerts.delete(alertId);
    }
  }

  /**
   * Evaluate a single rule against metrics
   */
  private evaluateRule(rule: IntegrationAlertRule, metrics: IntegrationMetrics): boolean {
    let value: number;

    switch (rule.metric) {
      case 'error_rate':
        value =
          metrics.totalRequests > 0
            ? (metrics.failedRequests / metrics.totalRequests) * 100
            : 0;
        break;
      case 'response_time':
        value = metrics.avgResponseTime;
        break;
      case 'availability':
        value =
          metrics.totalRequests > 0
            ? (metrics.successfulRequests / metrics.totalRequests) * 100
            : 100;
        break;
      case 'rate_limit':
        value = metrics.totalRequests;
        break;
      default:
        return false;
    }

    switch (rule.operator) {
      case 'gt':
        return value > rule.threshold;
      case 'lt':
        return value < rule.threshold;
      case 'eq':
        return value === rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(rule: IntegrationAlertRule, metrics: IntegrationMetrics): string {
    const metricValue = this.getMetricValue(rule.metric, metrics);
    return `${rule.metric} is ${rule.operator === 'gt' ? 'above' : 'below'} threshold: ${metricValue} (threshold: ${rule.threshold})`;
  }

  /**
   * Get metric value for alert message
   */
  private getMetricValue(metric: IntegrationAlertRule['metric'], metrics: IntegrationMetrics): string {
    switch (metric) {
      case 'error_rate':
        const errorRate =
          metrics.totalRequests > 0
            ? (metrics.failedRequests / metrics.totalRequests) * 100
            : 0;
        return `${errorRate.toFixed(2)}%`;
      case 'response_time':
        return `${metrics.avgResponseTime.toFixed(0)}ms`;
      case 'availability':
        const availability =
          metrics.totalRequests > 0
            ? (metrics.successfulRequests / metrics.totalRequests) * 100
            : 100;
        return `${availability.toFixed(2)}%`;
      case 'rate_limit':
        return `${metrics.totalRequests} requests`;
      default:
        return 'unknown';
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): IntegrationAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alerts for an integration
   */
  getAlertsForIntegration(integrationId: string): IntegrationAlert[] {
    return this.getActiveAlerts().filter((a) => a.integrationId === integrationId);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId: string): boolean {
    for (const [key, alert] of this.activeAlerts) {
      if (alert.id === alertId) {
        alert.status = 'acknowledged';
        alert.acknowledgedBy = userId;
        alert.acknowledgedAt = new Date().toISOString();
        return true;
      }
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, userId: string): boolean {
    for (const [key, alert] of this.activeAlerts) {
      if (alert.id === alertId) {
        alert.status = 'resolved';
        alert.resolvedBy = userId;
        alert.resolvedAt = new Date().toISOString();
        this.activeAlerts.delete(key);
        return true;
      }
    }
    return false;
  }

  /**
   * Get monitoring statistics
   */
  getStats(): {
    monitoredIntegrations: number;
    activeIntegrationAlertRules: number;
    activeAlerts: number;
    alertsByType: Record<string, number>;
  } {
    const alertsByType: Record<string, number> = {};
    for (const alert of this.activeAlerts.values()) {
      alertsByType[alert.severity] = (alertsByType[alert.severity] || 0) + 1;
    }

    return {
      monitoredIntegrations: this.healthCheckTimers.size,
      activeIntegrationAlertRules: this.alertRules.size,
      activeAlerts: this.activeAlerts.size,
      alertsByType,
    };
  }

  /**
   * Stop all monitoring
   */
  stopAll(): void {
    for (const timer of this.healthCheckTimers.values()) {
      clearInterval(timer);
    }
    this.healthCheckTimers.clear();
    this.metricsBuffer.clear();
    console.log('[IntegrationMonitor] Stopped all monitoring');
  }
}

// Singleton instance
let monitorInstance: IntegrationMonitorService | null = null;

export function getIntegrationMonitor(
  config?: Partial<MonitoringConfig>
): IntegrationMonitorService {
  if (!monitorInstance) {
    monitorInstance = new IntegrationMonitorService(config);
  }
  return monitorInstance;
}
