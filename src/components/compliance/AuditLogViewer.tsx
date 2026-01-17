'use client';

/**
 * Audit Log Viewer Component (LC-FEAT-037)
 * Comprehensive view of audit logs with filtering and export
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib';
import {
  ComprehensiveAuditLog,
  AuditActionType,
  AUDIT_ACTION_LABELS,
} from '@/types/audit.types';

interface AuditLogFilters {
  userId?: string;
  action?: AuditActionType;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  complianceRelevant?: boolean;
  isSensitiveData?: boolean;
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<ComprehensiveAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ComprehensiveAuditLog | null>(null);
  const pageSize = 50;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.action) params.set('action', filters.action);
      if (filters.resourceType) params.set('resourceType', filters.resourceType);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.complianceRelevant) params.set('complianceRelevant', 'true');
      if (filters.isSensitiveData) params.set('isSensitiveData', 'true');
      params.set('limit', String(pageSize));
      params.set('offset', String(page * pageSize));

      const response = await fetch(`/api/audit/logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data || []);
        setTotal(data.meta?.total || 0);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleExport = async () => {
    try {
      const response = await fetch('/api/audit/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'json',
          startDate: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: filters.endDate || new Date().toISOString(),
          purpose: 'Compliance audit export',
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  const actionTypes = Object.keys(AUDIT_ACTION_LABELS) as AuditActionType[];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button
            onClick={handleExport}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Export Logs
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filters.action || ''}
              onChange={(e) =>
                setFilters({ ...filters, action: e.target.value as AuditActionType || undefined })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Actions</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>
                  {AUDIT_ACTION_LABELS[action].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
            <select
              value={filters.resourceType || ''}
              onChange={(e) =>
                setFilters({ ...filters, resourceType: e.target.value || undefined })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Resources</option>
              <option value="cases">Cases</option>
              <option value="profiles">Profiles</option>
              <option value="leads">Leads</option>
              <option value="tips">Tips</option>
              <option value="consent_records">Consent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate?.split('T')[0] || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  startDate: e.target.value ? `${e.target.value}T00:00:00Z` : undefined,
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate?.split('T')[0] || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  endDate: e.target.value ? `${e.target.value}T23:59:59Z` : undefined,
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={filters.complianceRelevant || false}
              onChange={(e) =>
                setFilters({ ...filters, complianceRelevant: e.target.checked || undefined })
              }
              className="rounded border-gray-300"
            />
            Compliance Relevant Only
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={filters.isSensitiveData || false}
              onChange={(e) =>
                setFilters({ ...filters, isSensitiveData: e.target.checked || undefined })
              }
              className="rounded border-gray-300"
            />
            Sensitive Data Only
          </label>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
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
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Flags
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <AuditLogRow
                    key={log.id}
                    log={log}
                    onViewDetails={() => setSelectedLog(log)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
            <div className="text-sm text-gray-700">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * pageSize >= total}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <AuditLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

function AuditLogRow({
  log,
  onViewDetails,
}: {
  log: ComprehensiveAuditLog;
  onViewDetails: () => void;
}) {
  const actionLabel = AUDIT_ACTION_LABELS[log.action]?.label || log.action;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {new Date(log.createdAt).toLocaleString()}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <ActionBadge action={log.action} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        <div>
          <p className="text-gray-900">{log.actorEmail || 'System'}</p>
          {log.actorRole && <p className="text-xs text-gray-500">{log.actorRole}</p>}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        <div>
          <p className="text-gray-900">{log.resourceType}</p>
          {log.resourceId && (
            <p className="text-xs text-gray-500 font-mono">{log.resourceId.slice(0, 8)}...</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">
        {log.ipAddress || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex gap-1">
          {log.isSensitiveData && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              PII
            </span>
          )}
          {log.complianceRelevant && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Compliance
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <button
          onClick={onViewDetails}
          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
        >
          View
        </button>
      </td>
    </tr>
  );
}

function ActionBadge({ action }: { action: AuditActionType }) {
  const config = {
    create: 'bg-green-100 text-green-700',
    read: 'bg-blue-100 text-blue-700',
    update: 'bg-yellow-100 text-yellow-700',
    delete: 'bg-red-100 text-red-700',
    login: 'bg-emerald-100 text-emerald-700',
    logout: 'bg-gray-100 text-gray-700',
    failed_login: 'bg-red-100 text-red-700',
    export: 'bg-purple-100 text-purple-700',
    import: 'bg-indigo-100 text-indigo-700',
    search: 'bg-cyan-100 text-cyan-700',
    share: 'bg-pink-100 text-pink-700',
    download: 'bg-violet-100 text-violet-700',
    print: 'bg-slate-100 text-slate-700',
    consent_given: 'bg-green-100 text-green-700',
    consent_withdrawn: 'bg-orange-100 text-orange-700',
    data_request: 'bg-amber-100 text-amber-700',
    data_erasure: 'bg-rose-100 text-rose-700',
    data_portability: 'bg-teal-100 text-teal-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config[action] || 'bg-gray-100 text-gray-700'
      )}
    >
      {AUDIT_ACTION_LABELS[action]?.label || action}
    </span>
  );
}

function AuditLogDetailModal({
  log,
  onClose,
}: {
  log: ComprehensiveAuditLog;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
        <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Audit Log Details</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
            <DetailRow label="ID" value={log.id} />
            <DetailRow label="Timestamp" value={new Date(log.createdAt).toLocaleString()} />
            <DetailRow label="Action" value={AUDIT_ACTION_LABELS[log.action]?.label || log.action} />
            <DetailRow label="User" value={log.actorEmail || 'System'} />
            <DetailRow label="Role" value={log.actorRole || '-'} />
            <DetailRow label="Organization" value={log.actorOrganization || '-'} />
            <DetailRow label="Resource Type" value={log.resourceType} />
            <DetailRow label="Resource ID" value={log.resourceId || '-'} />
            <DetailRow label="IP Address" value={log.ipAddress || '-'} />
            <DetailRow label="User Agent" value={log.userAgent || '-'} />
            {log.geoCountry && (
              <DetailRow
                label="Location"
                value={[log.geoCity, log.geoRegion, log.geoCountry].filter(Boolean).join(', ')}
              />
            )}
            {log.oldValues && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Old Values</p>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto">
                  {JSON.stringify(log.oldValues, null, 2)}
                </pre>
              </div>
            )}
            {log.newValues && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">New Values</p>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto">
                  {JSON.stringify(log.newValues, null, 2)}
                </pre>
              </div>
            )}
            {log.changedFields && log.changedFields.length > 0 && (
              <DetailRow label="Changed Fields" value={log.changedFields.join(', ')} />
            )}
          </div>
          <div className="border-t border-gray-200 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-sm font-medium text-gray-500 w-32 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 break-all">{value}</span>
    </div>
  );
}

export default AuditLogViewer;
