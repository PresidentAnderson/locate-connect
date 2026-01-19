'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending' | 'configuring';
type IntegrationCategory = 'hospital' | 'border' | 'transit' | 'morgue' | 'social_media' | 'custom';

interface MetricsSummary {
  totalConnectors: number;
  activeConnectors: number;
  healthyConnectors: number;
  unhealthyConnectors: number;
  totalRequests: number;
  totalSuccessful: number;
  totalFailed: number;
  totalThrottled: number;
  successRate: string;
  cacheHitRate: string;
}

interface Integration {
  id: string;
  name: string;
  description: string | null;
  category: IntegrationCategory;
  provider: string | null;
  status: IntegrationStatus;
  base_url: string;
  is_enabled: boolean;
  last_sync_at: string | null;
  connector?: {
    state: string;
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    avg_response_time_ms: number;
    circuit_breaker_state: string;
  };
  health?: {
    status: string;
    last_check_at: string;
    response_time_ms: number;
  };
}

interface IntegrationsResponse {
  integrations: Integration[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

const categoryLabels: Record<IntegrationCategory, string> = {
  hospital: 'Hospital Registry',
  border: 'Border Services',
  transit: 'Transit Authority',
  morgue: 'Morgue/Coroner',
  social_media: 'Social Media',
  custom: 'Custom API',
};

const categoryIcons: Record<IntegrationCategory, string> = {
  hospital: '🏥',
  border: '🛂',
  transit: '🚇',
  morgue: '🏛️',
  social_media: '📱',
  custom: '🔌',
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      if (!loading) setLoading(true);
      const response = await fetch('/api/integrations');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch integrations');
      }

      setIntegrations(data.data?.integrations || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/connectors/metrics');
      const data = await response.json();

      if (response.ok && data.data?.summary) {
        setMetrics(data.data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchIntegrations(), fetchMetrics()]);
  }, [fetchIntegrations, fetchMetrics]);

  useEffect(() => {
    refreshAll();
  }, []);

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refreshAll, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshAll]);

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(null);

    try {
      const response = await fetch(`/api/integrations/${id}/test`, {
        method: 'POST',
      });
      const data = await response.json();
      const testData = data.data;

      // Handle detailed test response format
      const isSuccess = testData?.success ?? false;
      const totalDuration = testData?.totalDurationMs ?? 0;
      const failedStep = testData?.results?.find((r: { success: boolean; message?: string }) => !r.success);

      setTestResult({
        id,
        success: isSuccess,
        message: isSuccess
          ? `Connection successful (${totalDuration}ms)`
          : failedStep?.message || data.error?.message || 'Connection failed',
      });
    } catch (err) {
      setTestResult({
        id,
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !currentStatus }),
      });

      if (response.ok) {
        fetchIntegrations();
      }
    } catch (err) {
      console.error('Failed to toggle integration status:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
        <button
          onClick={fetchIntegrations}
          className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Integrations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage external API connections and monitor their health status
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <button
              onClick={refreshAll}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Refresh now"
            >
              <RefreshIcon className={cn('h-4 w-4', autoRefresh && 'animate-spin')} />
            </button>
            <span className="text-sm text-gray-500">
              {lastUpdated ? `Updated ${formatTimeAgo(lastUpdated)}` : 'Loading...'}
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
            href="/admin/integrations/new"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Add Integration
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Integrations"
          value={integrations.length.toString()}
          icon="🔌"
        />
        <StatCard
          title="Healthy"
          value={metrics?.healthyConnectors?.toString() || integrations.filter((i) => i.status === 'active' && i.is_enabled).length.toString()}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Unhealthy"
          value={metrics?.unhealthyConnectors?.toString() || integrations.filter((i) => i.status === 'error').length.toString()}
          icon="⚠️"
          color="red"
        />
        <StatCard
          title="Success Rate"
          value={metrics?.successRate ? `${metrics.successRate}%` : '--'}
          icon="📊"
          color="gray"
        />
      </div>

      {/* Health Metrics Panel */}
      {metrics && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health Metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricItem label="Total Requests" value={metrics.totalRequests.toLocaleString()} />
            <MetricItem label="Successful" value={metrics.totalSuccessful.toLocaleString()} color="green" />
            <MetricItem label="Failed" value={metrics.totalFailed.toLocaleString()} color="red" />
            <MetricItem label="Throttled" value={metrics.totalThrottled.toLocaleString()} color="yellow" />
            <MetricItem label="Cache Hit Rate" value={`${metrics.cacheHitRate}%`} />
            <MetricItem
              label="Active Connectors"
              value={`${metrics.activeConnectors}/${metrics.totalConnectors}`}
            />
          </div>
        </div>
      )}

      {/* Integration Cards */}
      {integrations.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <span className="text-2xl">🔌</span>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No integrations configured</h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by adding your first external API integration.
          </p>
          <Link
            href="/admin/integrations/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Add Integration
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onTest={() => handleTestConnection(integration.id)}
              onToggle={() => handleToggleStatus(integration.id, integration.is_enabled)}
              testing={testingId === integration.id}
              testResult={testResult?.id === integration.id ? testResult : null}
            />
          ))}
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link
          href="/admin/integrations/monitoring"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-cyan-300 hover:bg-cyan-50/50 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
            <span className="text-xl">📊</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">Monitoring</p>
            <p className="text-sm text-gray-500">Health and alerts</p>
          </div>
        </Link>
        <Link
          href="/admin/integrations/routes"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-cyan-300 hover:bg-cyan-50/50 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
            <span className="text-xl">🔀</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">Route Bindings</p>
            <p className="text-sm text-gray-500">Map routes to integrations</p>
          </div>
        </Link>
        <Link
          href="/admin/integrations/credentials"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-cyan-300 hover:bg-cyan-50/50 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
            <span className="text-xl">🔑</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">Credentials</p>
            <p className="text-sm text-gray-500">Manage API keys and secrets</p>
          </div>
        </Link>
        <Link
          href="/admin/integrations/logs"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-cyan-300 hover:bg-cyan-50/50 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
            <span className="text-xl">📋</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">Connection Logs</p>
            <p className="text-sm text-gray-500">View API request history</p>
          </div>
        </Link>
        <Link
          href="/admin/integrations/templates"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-cyan-300 hover:bg-cyan-50/50 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
            <span className="text-xl">📦</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">Templates</p>
            <p className="text-sm text-gray-500">Pre-built integrations</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color = 'gray',
}: {
  title: string;
  value: string;
  icon: string;
  color?: 'gray' | 'green' | 'red' | 'yellow';
}) {
  const colorClasses = {
    gray: 'bg-gray-100',
    green: 'bg-green-100',
    red: 'bg-red-100',
    yellow: 'bg-yellow-100',
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', colorClasses[color])}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    </div>
  );
}

function IntegrationCard({
  integration,
  onTest,
  onToggle,
  testing,
  testResult,
}: {
  integration: Integration;
  onTest: () => void;
  onToggle: () => void;
  testing: boolean;
  testResult: { success: boolean; message: string } | null;
}) {
  const statusConfig: Record<IntegrationStatus, { color: string; bg: string; label: string }> = {
    active: { color: 'text-green-700', bg: 'bg-green-100', label: 'Active' },
    inactive: { color: 'text-gray-700', bg: 'bg-gray-100', label: 'Inactive' },
    error: { color: 'text-red-700', bg: 'bg-red-100', label: 'Error' },
    pending: { color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Pending' },
    configuring: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'Configuring' },
  };

  const config = statusConfig[integration.status];
  const connector = integration.connector;
  const errorRate = connector && connector.total_requests > 0
    ? ((connector.failed_requests / connector.total_requests) * 100).toFixed(1)
    : '0';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
            <span className="text-xl">{categoryIcons[integration.category]}</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{integration.name}</h3>
            <p className="text-sm text-gray-500">{categoryLabels[integration.category]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', config.bg, config.color)}>
            {config.label}
          </span>
          <button
            onClick={onToggle}
            className={cn(
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2',
              integration.is_enabled ? 'bg-cyan-600' : 'bg-gray-200'
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition',
                integration.is_enabled ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>

      {/* Description */}
      {integration.description && (
        <p className="mt-3 text-sm text-gray-600">{integration.description}</p>
      )}

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
        <div>
          <p className="text-xs text-gray-500">Requests (24h)</p>
          <p className="text-lg font-semibold text-gray-900">
            {connector?.total_requests?.toLocaleString() || '0'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Avg Response</p>
          <p className="text-lg font-semibold text-gray-900">
            {connector?.avg_response_time_ms ? `${connector.avg_response_time_ms}ms` : '--'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Error Rate</p>
          <p className={cn(
            'text-lg font-semibold',
            parseFloat(errorRate) > 5 ? 'text-red-600' : 'text-gray-900'
          )}>
            {errorRate}%
          </p>
        </div>
      </div>

      {/* Last Sync */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>
          Last sync: {integration.last_sync_at
            ? new Date(integration.last_sync_at).toLocaleString()
            : 'Never'}
        </span>
        {connector?.circuit_breaker_state === 'open' && (
          <span className="flex items-center gap-1 text-red-600">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Circuit Open
          </span>
        )}
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={cn(
          'mt-3 rounded-lg px-3 py-2 text-sm',
          testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          {testResult.message}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
        <button
          onClick={onTest}
          disabled={testing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {testing ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
              Testing...
            </>
          ) : (
            <>
              <span>🔗</span>
              Test Connection
            </>
          )}
        </button>
        <Link
          href={`/admin/integrations/${integration.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>⚙️</span>
          Configure
        </Link>
        <Link
          href={`/admin/integrations/${integration.id}/logs`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>📋</span>
          Logs
        </Link>
      </div>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

function MetricItem({
  label,
  value,
  color = 'gray',
}: {
  label: string;
  value: string;
  color?: 'gray' | 'green' | 'red' | 'yellow';
}) {
  const colorClasses = {
    gray: 'text-gray-900',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
  };

  return (
    <div className="text-center p-3 rounded-lg bg-gray-50">
      <p className={cn('text-xl font-bold', colorClasses[color])}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return date.toLocaleTimeString();
}
