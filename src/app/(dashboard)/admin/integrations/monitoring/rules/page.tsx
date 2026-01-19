'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AlertRule {
  id: string;
  integrationId: string | null;
  integrationName: string;
  name: string;
  description: string | null;
  enabled: boolean;
  metric: 'error_rate' | 'response_time' | 'availability' | 'rate_limit';
  operator: 'gt' | 'lt' | 'eq';
  threshold: number;
  durationSeconds: number;
  alertSeverity: 'low' | 'medium' | 'high' | 'critical';
  notificationChannels: string[];
  createdAt: string;
  updatedAt: string;
}

interface Integration {
  id: string;
  name: string;
}

const metricLabels: Record<string, string> = {
  error_rate: 'Error Rate (%)',
  response_time: 'Response Time (ms)',
  availability: 'Availability (%)',
  rate_limit: 'Request Rate',
};

const operatorLabels: Record<string, string> = {
  gt: 'Greater than',
  lt: 'Less than',
  eq: 'Equals',
};

const severityConfig = {
  low: { color: 'text-blue-700', bg: 'bg-blue-100' },
  medium: { color: 'text-yellow-700', bg: 'bg-yellow-100' },
  high: { color: 'text-orange-700', bg: 'bg-orange-100' },
  critical: { color: 'text-red-700', bg: 'bg-red-100' },
};

export default function AlertRulesPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    integrationId: string;
    name: string;
    description: string;
    metric: 'error_rate' | 'response_time' | 'availability' | 'rate_limit';
    operator: 'gt' | 'lt' | 'eq';
    threshold: number;
    durationSeconds: number;
    alertSeverity: 'low' | 'medium' | 'high' | 'critical';
    enabled: boolean;
  }>({
    integrationId: '',
    name: '',
    description: '',
    metric: 'error_rate',
    operator: 'gt',
    threshold: 5,
    durationSeconds: 60,
    alertSeverity: 'medium',
    enabled: true,
  });

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/integrations/monitoring/rules');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch rules');
      }

      setRules(result.data?.rules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations?status=active');
      const result = await response.json();

      if (response.ok) {
        setIntegrations(result.data?.integrations?.map((i: { id: string; name: string }) => ({ id: i.id, name: i.name })) || []);
      }
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchIntegrations();
  }, [fetchRules, fetchIntegrations]);

  const handleOpenModal = (rule?: AlertRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        integrationId: rule.integrationId || '',
        name: rule.name,
        description: rule.description || '',
        metric: rule.metric,
        operator: rule.operator,
        threshold: rule.threshold,
        durationSeconds: rule.durationSeconds,
        alertSeverity: rule.alertSeverity,
        enabled: rule.enabled,
      });
    } else {
      setEditingRule(null);
      setFormData({
        integrationId: '',
        name: '',
        description: '',
        metric: 'error_rate',
        operator: 'gt',
        threshold: 5,
        durationSeconds: 60,
        alertSeverity: 'medium',
        enabled: true,
      });
    }
    setShowModal(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRule(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Rule name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const method = editingRule ? 'PATCH' : 'POST';
      const body = editingRule
        ? { ruleId: editingRule.id, ...formData }
        : formData;

      const response = await fetch('/api/integrations/monitoring/rules', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to save rule');
      }

      handleCloseModal();
      fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) {
      return;
    }

    setDeleting(ruleId);
    try {
      const response = await fetch(`/api/integrations/monitoring/rules?ruleId=${ruleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleEnabled = async (rule: AlertRule) => {
    try {
      const response = await fetch('/api/integrations/monitoring/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId: rule.id, enabled: !rule.enabled }),
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Alert Rules</h1>
            <p className="text-sm text-gray-500">Configure automated alerts for integration health</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          New Rule
        </button>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <BellIcon className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No alert rules configured</h3>
          <p className="mt-2 text-sm text-gray-500">
            Create rules to automatically alert on integration health issues
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            <PlusIcon className="h-5 w-5" />
            Create First Rule
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="divide-y divide-gray-100">
            {rules.map((rule) => {
              const severity = severityConfig[rule.alertSeverity] || severityConfig.medium;
              return (
                <div key={rule.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => handleToggleEnabled(rule)}
                        className={cn(
                          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-1',
                          rule.enabled ? 'bg-cyan-600' : 'bg-gray-200'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition',
                            rule.enabled ? 'translate-x-5' : 'translate-x-0'
                          )}
                        />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{rule.name}</h3>
                          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', severity.bg, severity.color)}>
                            {rule.alertSeverity}
                          </span>
                          {!rule.enabled && (
                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                              Disabled
                            </span>
                          )}
                        </div>
                        {rule.description && (
                          <p className="mt-1 text-sm text-gray-500">{rule.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <span className="text-gray-400">Target:</span>
                            {rule.integrationName}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-gray-400">Condition:</span>
                            {metricLabels[rule.metric]} {operatorLabels[rule.operator]} {rule.threshold}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-gray-400">Duration:</span>
                            {rule.durationSeconds}s
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(rule)}
                        className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        disabled={deleting === rule.id}
                        className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Rule Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
                  placeholder="High Error Rate Alert"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
                  placeholder="Alert when error rate exceeds threshold"
                />
              </div>

              {/* Integration */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Apply to Integration</label>
                <select
                  value={formData.integrationId}
                  onChange={(e) => setFormData({ ...formData, integrationId: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">All Integrations (Global)</option>
                  {integrations.map((int) => (
                    <option key={int.id} value={int.id}>{int.name}</option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Metric</label>
                  <select
                    value={formData.metric}
                    onChange={(e) => setFormData({ ...formData, metric: e.target.value as typeof formData.metric })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="error_rate">Error Rate</option>
                    <option value="response_time">Response Time</option>
                    <option value="availability">Availability</option>
                    <option value="rate_limit">Request Rate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Operator</label>
                  <select
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value as typeof formData.operator })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                    <option value="eq">Equals</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Threshold</label>
                  <input
                    type="number"
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Duration and Severity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration (seconds)</label>
                  <input
                    type="number"
                    value={formData.durationSeconds}
                    onChange={(e) => setFormData({ ...formData, durationSeconds: parseInt(e.target.value) || 60 })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Alert if condition persists for this duration</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Alert Severity</label>
                  <select
                    value={formData.alertSeverity}
                    onChange={(e) => setFormData({ ...formData, alertSeverity: e.target.value as typeof formData.alertSeverity })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Enabled */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-700">Enable this rule</span>
              </label>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingRule ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
