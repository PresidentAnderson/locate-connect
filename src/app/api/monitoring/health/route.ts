import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SystemHealthDashboard } from "@/types/monitoring.types";

function buildMockDashboard(): SystemHealthDashboard {
  const now = new Date();
  const iso = now.toISOString();
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  return {
    overallStatus: "healthy",
    uptimeSummary: {
      last24Hours: 99.97,
      last7Days: 99.92,
      last30Days: 99.86,
    },
    activeAlerts: [],
    activeIncidents: [],
    services: [
      {
        id: "api-core",
        serviceName: "api-core",
        displayName: "API Core",
        description: "Primary API gateway and routing layer.",
        status: "healthy",
        lastCheckAt: iso,
        lastHealthyAt: iso,
        uptimePercentage: 99.98,
        responseTimeMs: 128,
        avgResponseTimeMs: 142,
        errorRate: 0.2,
        consecutiveFailures: 0,
        dependsOn: ["database", "auth"],
        isCritical: true,
        checkIntervalSeconds: 30,
        timeoutMs: 5000,
        createdAt: lastDay,
        updatedAt: iso,
      },
      {
        id: "auth-service",
        serviceName: "auth",
        displayName: "Auth Service",
        description: "Supabase auth and session validation.",
        status: "healthy",
        lastCheckAt: iso,
        lastHealthyAt: iso,
        uptimePercentage: 99.95,
        responseTimeMs: 210,
        avgResponseTimeMs: 195,
        errorRate: 0.4,
        consecutiveFailures: 0,
        dependsOn: ["database"],
        isCritical: true,
        checkIntervalSeconds: 60,
        timeoutMs: 5000,
        createdAt: lastDay,
        updatedAt: iso,
      },
      {
        id: "notifications",
        serviceName: "notifications",
        displayName: "Notification Pipeline",
        description: "Email/SMS dispatch and retries.",
        status: "degraded",
        lastCheckAt: iso,
        lastHealthyAt: lastHour,
        uptimePercentage: 99.62,
        responseTimeMs: 480,
        avgResponseTimeMs: 395,
        errorRate: 1.8,
        consecutiveFailures: 1,
        lastErrorMessage: "Transient provider timeout",
        dependsOn: ["queue"],
        isCritical: false,
        checkIntervalSeconds: 120,
        timeoutMs: 8000,
        createdAt: lastDay,
        updatedAt: iso,
      },
    ],
    databaseMetrics: {
      connectionPoolSize: 50,
      activeConnections: 18,
      idleConnections: 32,
      waitingRequests: 0,
      avgQueryTimeMs: 42,
      slowQueriesCount: 1,
      totalQueries: 14230,
      errorCount: 3,
      replicationLagMs: 120,
      diskUsageBytes: 31234567890,
      diskUsagePercentage: 61.4,
    },
    queueMetrics: [
      {
        queueName: "notifications",
        displayName: "Notifications",
        pendingMessages: 42,
        processingMessages: 7,
        completedMessages: 2140,
        failedMessages: 3,
        avgProcessingTimeMs: 950,
        messagesPerSecond: 2.1,
        oldestMessageAge: 180,
        consumerCount: 4,
      },
      {
        queueName: "ingestion",
        displayName: "Ingestion",
        pendingMessages: 8,
        processingMessages: 2,
        completedMessages: 531,
        failedMessages: 0,
        avgProcessingTimeMs: 1200,
        messagesPerSecond: 0.4,
        oldestMessageAge: 60,
        consumerCount: 2,
      },
    ],
    agentHealth: [
      {
        id: "agent-social-1",
        agentType: "social-monitoring",
        agentId: "soc-01",
        status: "healthy",
        lastHeartbeatAt: iso,
        currentTask: "Monitoring Twitter feeds",
        tasksCompleted: 1240,
        tasksFailed: 4,
        avgTaskDurationMs: 820,
        memoryUsageMb: 312,
        cpuUsagePercent: 38,
        errorCount: 2,
        startedAt: lastDay,
        version: "1.4.2",
      },
      {
        id: "agent-hospital-1",
        agentType: "hospital-registry",
        agentId: "hosp-02",
        status: "healthy",
        lastHeartbeatAt: iso,
        currentTask: "Polling registry API",
        tasksCompleted: 620,
        tasksFailed: 1,
        avgTaskDurationMs: 1040,
        memoryUsageMb: 288,
        cpuUsagePercent: 22,
        errorCount: 1,
        startedAt: lastDay,
        version: "1.1.0",
      },
    ],
    recentMetrics: [
      {
        metricName: "api_latency_ms",
        displayName: "API Latency",
        unit: "ms",
        aggregation: "avg",
        interval: "5m",
        dataPoints: [
          { timestamp: lastHour, value: 152 },
          { timestamp: iso, value: 142 },
        ],
      },
      {
        metricName: "error_rate",
        displayName: "Error Rate",
        unit: "%",
        aggregation: "avg",
        interval: "5m",
        dataPoints: [
          { timestamp: lastHour, value: 0.4 },
          { timestamp: iso, value: 0.3 },
        ],
      },
    ],
  };
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(buildMockDashboard());
}
