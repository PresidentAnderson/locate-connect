'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib';
import type {
  FRAuditLog,
  FRAuditAction,
  FRAuditCategory,
} from '@/types/facial-recognition.types';

interface FRAuditLogViewerProps {
  caseId?: string;
  resourceType?: string;
  resourceId?: string;
  limit?: number;
}

interface AuditFilters {
  action?: FRAuditAction;
  actionCategory?: FRAuditCategory;
  userId?: string;
  complianceRelevant?: boolean;
  biometricDataAccessed?: boolean;
  startDate?: string;
  endDate?: string;
}

const ACTION_ICONS: Record<FRAuditAction, { icon: string; color: string }> = {
  photo_uploaded: { icon: 'upload', color: 'text-blue-600' },
  photo_updated: { icon: 'pencil', color: 'text-yellow-600' },
  photo_deleted: { icon: 'trash', color: 'text-red-600' },
  search_initiated: { icon: 'search', color: 'text-purple-600' },
  search_updated: { icon: 'refresh', color: 'text-purple-600' },
  search_completed: { icon: 'check', color: 'text-green-600' },
  match_found: { icon: 'star', color: 'text-amber-600' },
  match_reviewed: { icon: 'eye', color: 'text-cyan-600' },
  match_confirmed: { icon: 'check-circle', color: 'text-green-600' },
  match_rejected: { icon: 'x-circle', color: 'text-red-600' },
  consent_recorded: { icon: 'shield-check', color: 'text-green-600' },
  consent_updated: { icon: 'shield', color: 'text-yellow-600' },
  consent_withdrawn: { icon: 'shield-exclamation', color: 'text-red-600' },
  age_progression_requested: { icon: 'clock', color: 'text-indigo-600' },
  age_progression_completed: { icon: 'clock-check', color: 'text-green-600' },
  data_exported: { icon: 'download', color: 'text-blue-600' },
  data_deleted: { icon: 'trash', color: 'text-red-600' },
};

const CATEGORY_LABELS: Record<FRAuditCategory, { label: string; color: string }> = {
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-700' },
  review: { label: 'Review', color: 'bg-cyan-100 text-cyan-700' },
  consent: { label: 'Consent', color: 'bg-green-100 text-green-700' },
  export: { label: 'Export', color: 'bg-blue-100 text-blue-700' },
  deletion: { label: 'Deletion', color: 'bg-red-100 text-red-700' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-700' },
};

export function FRAuditLogViewer({
  caseId,
  resourceType,
  resourceId,
  limit: initialLimit = 50,
}: FRAuditLogViewerProps) {
  const [logs, setLogs] = useState<(FRAuditLog & { user?: Record<string, unknown> })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<FRAuditLog | null>(null);
  const limit = initialLimit;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (caseId) params.set('caseId', caseId);
      if (resourceType) params.set('resourceType', resourceType);
      if (resourceId) params.set('resourceId', resourceId);
      if (filters.action) params.set('action', filters.action);
      if (filters.actionCategory) params.set('actionCategory', filters.actionCategory);
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.complianceRelevant !== undefined) {
        params.set('complianceRelevant', filters.complianceRelevant.toString());
      }
      if (filters.biometricDataAccessed !== undefined) {
        params.set('biometricDataAccessed', filters.biometricDataAccessed.toString());
      }
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      params.set('limit', limit.toString());
      params.set('offset', (page * limit).toString());

      const response = await fetch(`/api/facial-recognition/audit?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');

      const data = await response.json();
      setLogs(data.data);
      setTotal(data.meta.total);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [caseId, resourceType, resourceId, filters, page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (key: keyof AuditFilters, value: string | boolean | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(0);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== '');

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Facial Recognition Audit Logs
          </h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-cyan-600 hover:text-cyan-700"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action Filter */}
          <select
            value={filters.action || ''}
            onChange={(e) => handleFilterChange('action', e.target.value as FRAuditAction || undefined)}
            className="rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
          >
            <option value="">All Actions</option>
            <option value="photo_uploaded">Photo Uploaded</option>
            <option value="search_initiated">Search Initiated</option>
            <option value="match_found">Match Found</option>
            <option value="match_reviewed">Match Reviewed</option>
            <option value="consent_recorded">Consent Recorded</option>
            <option value="consent_withdrawn">Consent Withdrawn</option>
            <option value="data_deleted">Data Deleted</option>
          </select>

          {/* Category Filter */}
          <select
            value={filters.actionCategory || ''}
            onChange={(e) => handleFilterChange('actionCategory', e.target.value as FRAuditCategory || undefined)}
            className="rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Compliance Filter */}
          <select
            value={filters.complianceRelevant === undefined ? '' : filters.complianceRelevant.toString()}
            onChange={(e) =>
              handleFilterChange(
                'complianceRelevant',
                e.target.value === '' ? undefined : e.target.value === 'true'
              )
            }
            className="rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
          >
            <option value="">All Events</option>
            <option value="true">Compliance Relevant Only</option>
          </select>

          {/* Biometric Data Filter */}
          <select
            value={filters.biometricDataAccessed === undefined ? '' : filters.biometricDataAccessed.toString()}
            onChange={(e) =>
              handleFilterChange(
                'biometricDataAccessed',
                e.target.value === '' ? undefined : e.target.value === 'true'
              )
            }
            className="rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
          >
            <option value="">All Data Types</option>
            <option value="true">Biometric Data Only</option>
          </select>
        </div>

        {/* Date Range */}
        <div className="flex gap-3 mt-3">
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
            className="rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
            placeholder="Start date"
          />
          <span className="text-gray-500 self-center">to</span>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
            className="rounded-md border-gray-300 text-sm focus:border-cyan-500 focus:ring-cyan-500"
            placeholder="End date"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner className="h-8 w-8 text-cyan-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600">No audit logs found</p>
            <p className="text-sm text-gray-500">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Logs will appear here as actions are performed'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compliance
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ActionIcon action={log.action} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatActionName(log.action)}
                          </p>
                          <span
                            className={cn(
                              'inline-flex px-2 py-0.5 text-xs font-medium rounded',
                              CATEGORY_LABELS[log.actionCategory].color
                            )}
                          >
                            {CATEGORY_LABELS[log.actionCategory].label}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {log.user ? (
                        <div>
                          <p className="text-gray-900">
                            {(log.user as { first_name?: string; last_name?: string }).first_name}{' '}
                            {(log.user as { first_name?: string; last_name?: string }).last_name}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {(log.user as { email?: string }).email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <p className="text-gray-900">{log.resourceType}</p>
                      <p className="text-gray-500 text-xs font-mono">
                        {log.resourceId.slice(0, 8)}...
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {log.complianceRelevant && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            Compliance
                          </span>
                        )}
                        {log.biometricDataAccessed && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                            Biometric
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-cyan-600 hover:text-cyan-700 text-sm font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * limit >= total}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

interface LogDetailModalProps {
  log: FRAuditLog;
  onClose: () => void;
}

function LogDetailModal({ log, onClose }: LogDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Audit Log Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Action</label>
              <p className="font-medium text-gray-900">{formatActionName(log.action)}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Category</label>
              <span
                className={cn(
                  'inline-flex px-2 py-0.5 text-sm font-medium rounded',
                  CATEGORY_LABELS[log.actionCategory].color
                )}
              >
                {CATEGORY_LABELS[log.actionCategory].label}
              </span>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Timestamp</label>
              <p className="text-gray-900">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Resource Type</label>
              <p className="text-gray-900">{log.resourceType}</p>
            </div>
          </div>

          {/* IDs */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div>
              <label className="text-xs text-gray-500">Log ID</label>
              <p className="font-mono text-sm text-gray-900">{log.id}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">Resource ID</label>
              <p className="font-mono text-sm text-gray-900">{log.resourceId}</p>
            </div>
            {log.caseId && (
              <div>
                <label className="text-xs text-gray-500">Case ID</label>
                <p className="font-mono text-sm text-gray-900">{log.caseId}</p>
              </div>
            )}
            {log.sessionId && (
              <div>
                <label className="text-xs text-gray-500">Session ID</label>
                <p className="font-mono text-sm text-gray-900">{log.sessionId}</p>
              </div>
            )}
          </div>

          {/* Compliance Flags */}
          <div className="flex flex-wrap gap-2">
            {log.complianceRelevant && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                Compliance Relevant
              </span>
            )}
            {log.biometricDataAccessed && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                Biometric Data Accessed
              </span>
            )}
            {log.personalDataAccessed && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full">
                Personal Data Accessed
              </span>
            )}
            {log.complianceFrameworks?.map((framework) => (
              <span
                key={framework}
                className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full"
              >
                {framework}
              </span>
            ))}
          </div>

          {/* Request Context */}
          {(log.ipAddress || log.userAgent) && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                Request Context
              </label>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                {log.ipAddress && (
                  <p>
                    <span className="text-gray-500">IP Address:</span>{' '}
                    <span className="font-mono">{log.ipAddress}</span>
                  </p>
                )}
                {log.userAgent && (
                  <p>
                    <span className="text-gray-500">User Agent:</span>{' '}
                    <span className="text-gray-700 break-all">{log.userAgent}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* State Changes */}
          {(log.previousState || log.newState) && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                State Changes
              </label>
              <div className="grid grid-cols-2 gap-4">
                {log.previousState && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Previous State</label>
                    <pre className="bg-red-50 rounded p-3 text-xs overflow-x-auto text-red-800">
                      {JSON.stringify(log.previousState, null, 2)}
                    </pre>
                  </div>
                )}
                {log.newState && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">New State</label>
                    <pre className="bg-green-50 rounded p-3 text-xs overflow-x-auto text-green-800">
                      {JSON.stringify(log.newState, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Details */}
          {log.actionDetails && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                Action Details
              </label>
              <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto text-gray-800">
                {JSON.stringify(log.actionDetails, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionIcon({ action }: { action: FRAuditAction }) {
  const config = ACTION_ICONS[action] || { icon: 'info', color: 'text-gray-600' };

  return (
    <div className={cn('h-8 w-8 rounded-full flex items-center justify-center bg-gray-100', config.color)}>
      <span className="text-sm">{getIconEmoji(config.icon)}</span>
    </div>
  );
}

function getIconEmoji(icon: string): string {
  const icons: Record<string, string> = {
    upload: 'UP',
    pencil: 'ED',
    trash: 'DE',
    search: 'SR',
    refresh: 'RF',
    check: 'OK',
    star: 'MT',
    eye: 'RV',
    'check-circle': 'CF',
    'x-circle': 'RJ',
    'shield-check': 'CS',
    shield: 'SH',
    'shield-exclamation': 'CW',
    clock: 'AP',
    'clock-check': 'AC',
    download: 'DL',
    info: 'IN',
  };
  return icons[icon] || 'IN';
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return date.toLocaleDateString();
}

function formatActionName(action: FRAuditAction): string {
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Icon components
function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
