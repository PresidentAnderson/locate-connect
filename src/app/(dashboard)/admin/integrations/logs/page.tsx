'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string;
  integration_id: string;
  integration_name: string;
  request_method: string;
  request_path: string;
  status_code: number;
  response_time_ms: number;
  error_message: string | null;
  created_at: string;
}

export default function IntegrationLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        setError(null);

        const statusParam = filter === 'all' ? '' : `&status=${filter}`;
        const response = await fetch(`/api/integrations/logs?limit=100${statusParam}`);

        if (!response.ok) {
          throw new Error('Failed to fetch logs');
        }

        const result = await response.json();

        if (result.data?.logs) {
          // Map API response to component format
          setLogs(result.data.logs.map((log: {
            id: string;
            integrationId: string;
            integrationName: string;
            requestMethod: string;
            requestPath: string;
            statusCode: number;
            responseTimeMs: number;
            errorMessage: string | null;
            createdAt: string;
          }) => ({
            id: log.id,
            integration_id: log.integrationId,
            integration_name: log.integrationName,
            request_method: log.requestMethod,
            request_path: log.requestPath,
            status_code: log.statusCode,
            response_time_ms: log.responseTimeMs,
            error_message: log.errorMessage,
            created_at: log.createdAt,
          })));
        } else {
          setLogs([]);
        }
      } catch (err) {
        console.error('Failed to fetch integration logs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [filter]);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'success') return log.status_code >= 200 && log.status_code < 400;
    if (filter === 'error') return log.status_code >= 400;
    return true;
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Connection Logs</h1>
            <p className="text-sm text-gray-500">
              View API request history across all integrations
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          {(['all', 'success', 'error'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                filter === f
                  ? 'bg-cyan-100 text-cyan-700'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {f === 'all' ? 'All' : f === 'success' ? 'Success' : 'Errors'}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500">
          Showing {filteredLogs.length} of {logs.length} entries
        </span>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Integration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Request
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Error
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {formatTimestamp(log.created_at)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/admin/integrations/${log.integration_id}`}
                    className="font-medium text-cyan-600 hover:text-cyan-500"
                  >
                    {log.integration_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={cn(
                    'inline-flex rounded px-1.5 py-0.5 text-xs font-medium mr-2',
                    log.request_method === 'GET' && 'bg-green-100 text-green-700',
                    log.request_method === 'POST' && 'bg-blue-100 text-blue-700',
                    log.request_method === 'PUT' && 'bg-yellow-100 text-yellow-700',
                    log.request_method === 'DELETE' && 'bg-red-100 text-red-700'
                  )}>
                    {log.request_method}
                  </span>
                  <span className="font-mono text-xs text-gray-600">{log.request_path}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    log.status_code >= 200 && log.status_code < 300 && 'bg-green-100 text-green-700',
                    log.status_code >= 300 && log.status_code < 400 && 'bg-blue-100 text-blue-700',
                    log.status_code >= 400 && log.status_code < 500 && 'bg-yellow-100 text-yellow-700',
                    log.status_code >= 500 && 'bg-red-100 text-red-700'
                  )}>
                    {log.status_code}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  <span className={cn(
                    log.response_time_ms > 1000 && 'text-yellow-600 font-medium',
                    log.response_time_ms > 3000 && 'text-red-600 font-medium'
                  )}>
                    {log.response_time_ms}ms
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {log.error_message ? (
                    <span className="text-red-600">{log.error_message}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLogs.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <span className="text-4xl">📋</span>
          <p className="mt-2 text-gray-500">No logs matching your filter</p>
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
