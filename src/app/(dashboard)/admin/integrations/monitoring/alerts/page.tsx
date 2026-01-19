'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  integration_id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  integrations?: { id: string; name: string };
}

interface Pagination {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const severityConfig = {
  low: { color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' },
  medium: { color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-200' },
  high: { color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-200' },
  critical: { color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' },
};

const statusConfig = {
  active: { color: 'text-red-700', bg: 'bg-red-100', label: 'Active' },
  acknowledged: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'Acknowledged' },
  resolved: { color: 'text-green-700', bg: 'bg-green-100', label: 'Resolved' },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '20');
      if (statusFilter) params.set('status', statusFilter);
      if (severityFilter) params.set('severity', severityFilter);

      const response = await fetch(`/api/integrations/monitoring/alerts?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch alerts');
      }

      setAlerts(result.data || []);
      setPagination(result.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, page]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve') => {
    setUpdating(alertId);
    try {
      const response = await fetch('/api/integrations/monitoring/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, action }),
      });

      if (response.ok) {
        fetchAlerts();
        setSelectedAlerts((prev) => {
          const next = new Set(prev);
          next.delete(alertId);
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to update alert:', err);
    } finally {
      setUpdating(null);
    }
  };

  const handleBulkAction = async (action: 'acknowledge' | 'resolve') => {
    const alertIds = Array.from(selectedAlerts);
    for (const alertId of alertIds) {
      await handleAlertAction(alertId, action);
    }
    setSelectedAlerts(new Set());
  };

  const toggleSelect = (alertId: string) => {
    setSelectedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(alertId)) {
        next.delete(alertId);
      } else {
        next.add(alertId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAlerts.size === alerts.filter((a) => a.status === 'active').length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(alerts.filter((a) => a.status === 'active').map((a) => a.id)));
    }
  };

  const activeAlerts = alerts.filter((a) => a.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/integrations/monitoring"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integration Alerts</h1>
            <p className="text-sm text-gray-500">
              {pagination ? `${pagination.total} total alerts` : 'Loading...'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchAlerts}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RefreshIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Severity:</label>
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedAlerts.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600">{selectedAlerts.size} selected</span>
            <button
              onClick={() => handleBulkAction('acknowledge')}
              className="rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200"
            >
              Acknowledge All
            </button>
            <button
              onClick={() => handleBulkAction('resolve')}
              className="rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-200"
            >
              Resolve All
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Alerts List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckIcon className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No alerts found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {statusFilter === 'active'
              ? 'All integrations are operating normally'
              : 'No alerts match your filters'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* Table Header */}
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-4">
              {activeAlerts.length > 0 && (
                <input
                  type="checkbox"
                  checked={selectedAlerts.size === activeAlerts.length && activeAlerts.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
              )}
              <span className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wide">Alert</span>
              <span className="w-32 text-xs font-medium text-gray-500 uppercase tracking-wide">Integration</span>
              <span className="w-24 text-xs font-medium text-gray-500 uppercase tracking-wide">Severity</span>
              <span className="w-28 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
              <span className="w-32 text-xs font-medium text-gray-500 uppercase tracking-wide">Time</span>
              <span className="w-40 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</span>
            </div>
          </div>

          {/* Alerts */}
          <div className="divide-y divide-gray-100">
            {alerts.map((alert) => {
              const severity = severityConfig[alert.severity] || severityConfig.medium;
              const status = statusConfig[alert.status] || statusConfig.active;

              return (
                <div key={alert.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {alert.status === 'active' && (
                      <input
                        type="checkbox"
                        checked={selectedAlerts.has(alert.id)}
                        onChange={() => toggleSelect(alert.id)}
                        className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                    )}
                    {alert.status !== 'active' && <div className="w-4" />}

                    {/* Alert Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{alert.title}</p>
                      <p className="text-sm text-gray-500 truncate">{alert.message}</p>
                    </div>

                    {/* Integration */}
                    <div className="w-32">
                      <Link
                        href={`/admin/integrations/${alert.integration_id}`}
                        className="text-sm text-cyan-600 hover:text-cyan-500 truncate block"
                      >
                        {alert.integrations?.name || 'Unknown'}
                      </Link>
                    </div>

                    {/* Severity */}
                    <div className="w-24">
                      <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', severity.bg, severity.color)}>
                        {alert.severity}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="w-28">
                      <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', status.bg, status.color)}>
                        {status.label}
                      </span>
                    </div>

                    {/* Time */}
                    <div className="w-32 text-sm text-gray-500">
                      {formatTimeAgo(new Date(alert.created_at))}
                    </div>

                    {/* Actions */}
                    <div className="w-40 flex items-center gap-2">
                      {alert.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                            disabled={updating === alert.id}
                            className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                          >
                            Acknowledge
                          </button>
                          <button
                            onClick={() => handleAlertAction(alert.id, 'resolve')}
                            disabled={updating === alert.id}
                            className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
                          >
                            Resolve
                          </button>
                        </>
                      )}
                      {alert.status === 'acknowledged' && (
                        <button
                          onClick={() => handleAlertAction(alert.id, 'resolve')}
                          disabled={updating === alert.id}
                          className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      )}
                      {alert.status === 'resolved' && (
                        <span className="text-xs text-gray-400">
                          {alert.resolved_at && formatTimeAgo(new Date(alert.resolved_at))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * pagination.page_size + 1} to{' '}
            {Math.min(page * pagination.page_size, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {pagination.total_pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              disabled={page === pagination.total_pages}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
