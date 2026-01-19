'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DashboardSummary {
  totalIntegrations: number;
  activeIntegrations: number;
  healthyIntegrations: number;
  degradedIntegrations: number;
  unhealthyIntegrations: number;
  totalRequestsToday: number;
  successRateToday: number;
  avgResponseTimeMs: number;
  activeAlerts: number;
  criticalAlerts: number;
  lastUpdated: string;
}

interface IntegrationCard {
  integrationId: string;
  name: string;
  category: string;
  status: string;
  health: {
    status: string;
    avgResponseTime: number;
  };
  requestsLast24h: number;
  successRate: number;
  avgResponseTimeMs: number;
  lastSync: string | null;
}

interface Alert {
  id: string;
  integrationId: string;
  integrationName: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
}

interface DashboardData {
  summary: DashboardSummary;
  integrations: IntegrationCard[];
  recentAlerts: Alert[];
  categoryBreakdown: Record<string, number>;
}

const healthStatusConfig = {
  healthy: { color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
  degraded: { color: 'text-yellow-700', bg: 'bg-yellow-100', dot: 'bg-yellow-500' },
  unhealthy: { color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
  unknown: { color: 'text-gray-700', bg: 'bg-gray-100', dot: 'bg-gray-500' },
};

const severityConfig = {
  low: { color: 'text-blue-700', bg: 'bg-blue-100' },
  medium: { color: 'text-yellow-700', bg: 'bg-yellow-100' },
  high: { color: 'text-orange-700', bg: 'bg-orange-100' },
  critical: { color: 'text-red-700', bg: 'bg-red-100' },
};

const categoryIcons: Record<string, string> = {
  healthcare: '🏥',
  law_enforcement: '🚔',
  government: '🏛️',
  transportation: '🚇',
  border_services: '🛂',
  social_services: '🤝',
  communication: '📡',
  data_provider: '📊',
  custom: '🔧',
  hospital: '🏥',
  border: '🛂',
  transit: '🚇',
  morgue: '🏛️',
  social_media: '📱',
};

export default function IntegrationMonitoringPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updatingAlert, setUpdatingAlert] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/monitoring/dashboard');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch dashboard');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboard]);

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve') => {
    setUpdatingAlert(alertId);
    try {
      const response = await fetch('/api/integrations/monitoring/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, action }),
      });

      if (response.ok) {
        fetchDashboard();
      }
    } catch (err) {
      console.error('Failed to update alert:', err);
    } finally {
      setUpdatingAlert(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{error || 'Failed to load dashboard'}</p>
        <button onClick={fetchDashboard} className="mt-2 text-sm font-medium text-red-600 hover:text-red-500">
          Try again
        </button>
      </div>
    );
  }

  const { summary, integrations, recentAlerts, categoryBreakdown } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/integrations"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integration Monitoring</h1>
            <p className="text-sm text-gray-500">Real-time health status and alerts for all integrations</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <button onClick={fetchDashboard} className="text-gray-500 hover:text-gray-700 transition-colors">
              <RefreshIcon className={cn('h-4 w-4', autoRefresh && 'animate-spin')} />
            </button>
            <span className="text-sm text-gray-500">
              {summary.lastUpdated ? `Updated ${formatTimeAgo(new Date(summary.lastUpdated))}` : ''}
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-xs text-gray-600">Auto</span>
            </label>
          </div>
          <Link
            href="/admin/integrations/monitoring/rules"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <CogIcon className="h-5 w-5" />
            Alert Rules
          </Link>
          <Link
            href="/admin/integrations/monitoring/alerts"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition-colors"
          >
            <BellIcon className="h-5 w-5" />
            View All Alerts
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          title="Total Integrations"
          value={summary.totalIntegrations}
          subtext={`${summary.activeIntegrations} active`}
          icon="🔌"
        />
        <StatCard
          title="Healthy"
          value={summary.healthyIntegrations}
          color="green"
          icon="✅"
        />
        <StatCard
          title="Degraded"
          value={summary.degradedIntegrations}
          color="yellow"
          icon="⚠️"
        />
        <StatCard
          title="Unhealthy"
          value={summary.unhealthyIntegrations}
          color="red"
          icon="❌"
        />
        <StatCard
          title="Active Alerts"
          value={summary.activeAlerts}
          subtext={summary.criticalAlerts > 0 ? `${summary.criticalAlerts} critical` : undefined}
          color={summary.criticalAlerts > 0 ? 'red' : summary.activeAlerts > 0 ? 'yellow' : 'gray'}
          icon="🔔"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-medium text-gray-500">Requests Today</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{summary.totalRequestsToday.toLocaleString()}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${summary.successRateToday}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">{summary.successRateToday}% success</span>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-medium text-gray-500">Avg Response Time</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{summary.avgResponseTimeMs}ms</p>
          <p className="mt-2 text-sm text-gray-500">
            {summary.avgResponseTimeMs < 200 ? 'Excellent' : summary.avgResponseTimeMs < 500 ? 'Good' : 'Needs attention'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-medium text-gray-500">Category Breakdown</h3>
          <div className="mt-3 space-y-2">
            {Object.entries(categoryBreakdown).slice(0, 4).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{categoryIcons[category] || '📦'}</span>
                  {category}
                </span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Integration Health Grid */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Integration Health</h2>
          <Link href="/admin/integrations" className="text-sm text-cyan-600 hover:text-cyan-500">
            View all
          </Link>
        </div>
        {integrations.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No active integrations</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((int) => {
              const healthConfig = healthStatusConfig[int.health.status as keyof typeof healthStatusConfig] || healthStatusConfig.unknown;
              return (
                <Link
                  key={int.integrationId}
                  href={`/admin/integrations/${int.integrationId}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 hover:border-cyan-200 hover:bg-cyan-50/30 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-200">
                    <span className="text-lg">{categoryIcons[int.category] || '📦'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', healthConfig.dot)} />
                      <span className="font-medium text-gray-900 truncate">{int.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span>{int.requestsLast24h.toLocaleString()} req</span>
                      <span>{int.avgResponseTimeMs}ms</span>
                      <span>{int.successRate}%</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Alerts */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
          <Link href="/admin/integrations/monitoring/alerts" className="text-sm text-cyan-600 hover:text-cyan-500">
            View all
          </Link>
        </div>
        {recentAlerts.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <span className="text-2xl">✓</span>
            </div>
            <p className="mt-3 text-sm text-gray-500">No recent alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAlerts.map((alert) => {
              const severityCfg = severityConfig[alert.severity] || severityConfig.medium;
              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
                >
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', severityCfg.bg)}>
                    <AlertIcon className={cn('h-4 w-4', severityCfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{alert.title}</span>
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', severityCfg.bg, severityCfg.color)}>
                        {alert.severity}
                      </span>
                      {alert.status === 'acknowledged' && (
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Acknowledged
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>{alert.integrationName}</span>
                      <span>{formatTimeAgo(new Date(alert.createdAt))}</span>
                    </div>
                  </div>
                  {alert.status === 'active' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                        disabled={updatingAlert === alert.id}
                        className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleAlertAction(alert.id, 'resolve')}
                        disabled={updatingAlert === alert.id}
                        className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtext,
  icon,
  color = 'gray',
}: {
  title: string;
  value: number;
  subtext?: string;
  icon: string;
  color?: 'gray' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    gray: 'bg-gray-100',
    green: 'bg-green-100',
    yellow: 'bg-yellow-100',
    red: 'bg-red-100',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colorClasses[color])}>
          <span className="text-xl">{icon}</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{title}</p>
          {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function CogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
