'use client';

/**
 * Data Subject Request Manager Component (LC-FEAT-037)
 * Manage GDPR/PIPEDA data subject requests
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib';
import {
  DataSubjectRequest,
  DataRequestType,
  DataRequestStatus,
  DATA_REQUEST_TYPE_LABELS,
  VIOLATION_SEVERITY_CONFIG,
} from '@/types/audit.types';

const STATUS_CONFIG: Record<
  DataRequestStatus,
  { label: string; color: string; bgColor: string }
> = {
  submitted: { label: 'Submitted', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  under_review: { label: 'Under Review', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  denied: { label: 'Denied', color: 'text-red-700', bgColor: 'bg-red-100' },
  partially_completed: { label: 'Partial', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  cancelled: { label: 'Cancelled', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

interface DataRequestFilters {
  status?: DataRequestStatus;
  requestType?: DataRequestType;
  overdue?: boolean;
}

export function DataRequestManager() {
  const [requests, setRequests] = useState<DataSubjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DataRequestFilters>({});
  const [selectedRequest, setSelectedRequest] = useState<DataSubjectRequest | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.requestType) params.set('requestType', filters.requestType);

      const response = await fetch(`/api/compliance/data-requests?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.data || []);
      }
    } catch (error) {
      console.error('Error loading data requests:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const pendingCount = requests.filter(
    (r) => !['completed', 'denied', 'cancelled'].includes(r.status)
  ).length;
  const overdueCount = requests.filter(
    (r) =>
      r.dueDate &&
      new Date(r.dueDate) < new Date() &&
      !['completed', 'denied', 'cancelled'].includes(r.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Total Requests" value={requests.length} />
        <StatCard title="Pending" value={pendingCount} highlight={pendingCount > 0} />
        <StatCard
          title="Overdue"
          value={overdueCount}
          highlight={overdueCount > 0}
          danger={overdueCount > 0}
        />
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={filters.status || ''}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value as DataRequestStatus || undefined })
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
          <select
            value={filters.requestType || ''}
            onChange={(e) =>
              setFilters({ ...filters, requestType: e.target.value as DataRequestType || undefined })
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            {Object.entries(DATA_REQUEST_TYPE_LABELS).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New Request
        </button>
      </div>

      {/* Requests Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Request #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Requestor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Due Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto" />
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No data requests found
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  onView={() => setSelectedRequest(request)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={loadRequests}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateRequestModal
          onClose={() => setShowCreateModal(false)}
          onCreate={loadRequests}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  highlight = false,
  danger = false,
}: {
  title: string;
  value: number;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-5',
        danger
          ? 'border-red-200 bg-red-50'
          : highlight
          ? 'border-amber-200 bg-amber-50'
          : 'border-gray-200 bg-white'
      )}
    >
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p
        className={cn(
          'text-3xl font-bold mt-1',
          danger ? 'text-red-600' : highlight ? 'text-amber-600' : 'text-gray-900'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function RequestRow({
  request,
  onView,
}: {
  request: DataSubjectRequest;
  onView: () => void;
}) {
  const statusConfig = STATUS_CONFIG[request.status];
  const typeConfig = DATA_REQUEST_TYPE_LABELS[request.requestType];
  const priorityConfig = VIOLATION_SEVERITY_CONFIG[request.priority];

  const isOverdue =
    request.dueDate &&
    new Date(request.dueDate) < new Date() &&
    !['completed', 'denied', 'cancelled'].includes(request.status);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
        {request.requestNumber || request.id.slice(0, 8)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
        {typeConfig?.label || request.requestType}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div>
          <p className="text-sm text-gray-900">{request.requestorEmail}</p>
          {request.requestorName && (
            <p className="text-xs text-gray-500">{request.requestorName}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            statusConfig.bgColor,
            statusConfig.color
          )}
        >
          {statusConfig.label}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {request.dueDate && (
          <span
            className={cn(
              'text-sm',
              isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
            )}
          >
            {new Date(request.dueDate).toLocaleDateString()}
            {isOverdue && ' (Overdue)'}
          </span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            priorityConfig.bgColor,
            priorityConfig.color
          )}
        >
          {priorityConfig.label}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <button
          onClick={onView}
          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
        >
          View
        </button>
      </td>
    </tr>
  );
}

function RequestDetailModal({
  request,
  onClose,
  onUpdate,
}: {
  request: DataSubjectRequest;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState(request.status);
  const [statusNotes, setStatusNotes] = useState('');

  const handleUpdateStatus = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/compliance/data-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: newStatus,
          statusNotes,
        }),
      });

      if (response.ok) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Error updating request:', error);
    } finally {
      setUpdating(false);
    }
  };

  const statusConfig = STATUS_CONFIG[request.status];
  const typeConfig = DATA_REQUEST_TYPE_LABELS[request.requestType];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
        <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Data Request Details
                </h3>
                <p className="text-sm text-gray-500">
                  {request.requestNumber || request.id.slice(0, 8)}
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Request Type</p>
                <p className="text-sm text-gray-900">{typeConfig?.label}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Current Status</p>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    statusConfig.bgColor,
                    statusConfig.color
                  )}
                >
                  {statusConfig.label}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Requestor</p>
                <p className="text-sm text-gray-900">{request.requestorEmail}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Due Date</p>
                <p className="text-sm text-gray-900">
                  {request.dueDate ? new Date(request.dueDate).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Submitted</p>
                <p className="text-sm text-gray-900">
                  {new Date(request.submittedAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Identity Verified</p>
                <p className="text-sm text-gray-900">
                  {request.identityVerified ? 'Yes' : 'No'}
                </p>
              </div>
            </div>

            {request.requestDescription && (
              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="text-sm text-gray-900 mt-1">{request.requestDescription}</p>
              </div>
            )}

            {request.processingLog && request.processingLog.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Processing Log</p>
                <div className="space-y-2">
                  {request.processingLog.map((log, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{log.action}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {log.notes && (
                        <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">By: {log.performedBy}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Update Status */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-900 mb-3">Update Status</p>
              <div className="space-y-3">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as DataRequestStatus)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add notes about this status change..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateStatus}
              disabled={updating}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Update Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateRequestModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [requestType, setRequestType] = useState<DataRequestType>('access');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/compliance/data-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType,
          requestDescription: description,
          applicableFramework: 'pipeda',
        }),
      });

      if (response.ok) {
        onCreate();
        onClose();
      }
    } catch (error) {
      console.error('Error creating request:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">New Data Request</h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request Type
              </label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as DataRequestType)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {Object.entries(DATA_REQUEST_TYPE_LABELS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label} - {config.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your request..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={4}
              />
            </div>
          </div>
          <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataRequestManager;
