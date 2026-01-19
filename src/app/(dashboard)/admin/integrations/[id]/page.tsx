'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type AuthType = 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'none';
type IntegrationCategory = 'hospital' | 'border' | 'transit' | 'morgue' | 'social_media' | 'custom';
type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending' | 'configuring';

interface Integration {
  id: string;
  name: string;
  description: string | null;
  category: IntegrationCategory;
  provider: string | null;
  status: IntegrationStatus;
  base_url: string;
  auth_type: AuthType;
  timeout: number;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  connector?: {
    state: string;
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    avg_response_time_ms: number;
    circuit_breaker_state: string;
    retry_attempts: number;
    retry_delay_ms: number;
  };
  credential?: {
    id: string;
    name: string;
    type: string;
    status: string;
    expires_at: string | null;
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

export default function IntegrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'credentials' | 'health'>('overview');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_url: '',
    timeout: 30000,
    rate_limit_per_minute: 60,
    rate_limit_per_hour: 1000,
    is_enabled: false,
  });

  useEffect(() => {
    const fetchIntegration = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/integrations/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to fetch integration');
        }

        const int = data.data;
        setIntegration(int);
        setFormData({
          name: int.name,
          description: int.description || '',
          base_url: int.base_url,
          timeout: int.timeout,
          rate_limit_per_minute: int.rate_limit_per_minute,
          rate_limit_per_hour: int.rate_limit_per_hour,
          is_enabled: int.is_enabled,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchIntegration();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update integration');
      }

      setIntegration(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this integration? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to delete integration');
      }

      router.push('/admin/integrations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setDeleting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
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
        success: isSuccess,
        message: isSuccess
          ? `Connection successful (${totalDuration}ms)`
          : failedStep?.message || data.error?.message || 'Connection failed',
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !integration) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
        <Link
          href="/admin/integrations"
          className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
        >
          Back to integrations
        </Link>
      </div>
    );
  }

  if (!integration) return null;

  const connector = integration.connector;
  const errorRate = connector && connector.total_requests > 0
    ? ((connector.failed_requests / connector.total_requests) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/integrations"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{integration.name}</h1>
            <p className="text-sm text-gray-500">{categoryLabels[integration.category]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {testing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                Testing...
              </>
            ) : (
              <>🔗 Test Connection</>
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting...' : '🗑️ Delete'}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <StatusBadge status={integration.status} />
        <div className="h-6 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Enabled:</span>
          <button
            onClick={() => {
              setFormData(prev => ({ ...prev, is_enabled: !prev.is_enabled }));
              handleSave();
            }}
            className={cn(
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              formData.is_enabled ? 'bg-cyan-600' : 'bg-gray-200'
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
                formData.is_enabled ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>
        {connector?.circuit_breaker_state === 'open' && (
          <>
            <div className="h-6 w-px bg-gray-200" />
            <span className="flex items-center gap-2 text-sm text-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Circuit Breaker Open
            </span>
          </>
        )}
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={cn(
          'rounded-lg px-4 py-3 text-sm',
          testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        )}>
          {testResult.message}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(['overview', 'settings', 'credentials', 'health'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'border-b-2 pb-3 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'border-cyan-500 text-cyan-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Metrics */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="font-semibold text-gray-900">Performance Metrics</h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <MetricCard label="Total Requests" value={connector?.total_requests?.toLocaleString() || '0'} />
              <MetricCard label="Successful" value={connector?.successful_requests?.toLocaleString() || '0'} color="green" />
              <MetricCard label="Failed" value={connector?.failed_requests?.toLocaleString() || '0'} color="red" />
              <MetricCard label="Error Rate" value={`${errorRate}%`} color={parseFloat(errorRate) > 5 ? 'red' : undefined} />
              <MetricCard label="Avg Response" value={connector?.avg_response_time_ms ? `${connector.avg_response_time_ms}ms` : '--'} />
              <MetricCard label="Connector State" value={connector?.state || 'Not initialized'} />
            </div>
          </div>

          {/* Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="font-semibold text-gray-900">Integration Details</h3>
            <dl className="mt-4 space-y-3">
              <DetailRow label="Base URL" value={integration.base_url} mono />
              <DetailRow label="Auth Type" value={integration.auth_type} />
              <DetailRow label="Timeout" value={`${integration.timeout}ms`} />
              <DetailRow label="Rate Limit" value={`${integration.rate_limit_per_minute}/min, ${integration.rate_limit_per_hour}/hr`} />
              <DetailRow label="Created" value={new Date(integration.created_at).toLocaleString()} />
              <DetailRow label="Updated" value={new Date(integration.updated_at).toLocaleString()} />
            </dl>
          </div>

          {/* Credential Status */}
          {integration.credential && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Linked Credential</h3>
                <Link
                  href={`/admin/integrations/credentials/${integration.credential.id}`}
                  className="text-sm font-medium text-cyan-600 hover:text-cyan-500"
                >
                  Manage →
                </Link>
              </div>
              <div className="mt-4 flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <span className="text-xl">🔑</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{integration.credential.name}</p>
                    <p className="text-sm text-gray-500">{integration.credential.type}</p>
                  </div>
                </div>
                <CredentialStatusBadge status={integration.credential.status} />
                {integration.credential.expires_at && (
                  <span className="text-sm text-gray-500">
                    Expires: {new Date(integration.credential.expires_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="font-semibold text-gray-900">Edit Settings</h3>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Base URL</label>
              <input
                type="url"
                value={formData.base_url}
                onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Timeout (ms)</label>
              <input
                type="number"
                value={formData.timeout}
                onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rate Limit (per minute)</label>
              <input
                type="number"
                value={formData.rate_limit_per_minute}
                onChange={(e) => setFormData(prev => ({ ...prev, rate_limit_per_minute: parseInt(e.target.value) }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rate Limit (per hour)</label>
              <input
                type="number"
                value={formData.rate_limit_per_hour}
                onChange={(e) => setFormData(prev => ({ ...prev, rate_limit_per_hour: parseInt(e.target.value) }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'credentials' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">API Credentials</h3>
              <p className="mt-1 text-sm text-gray-500">Manage authentication credentials for this integration</p>
            </div>
            <Link
              href={`/admin/integrations/credentials/new?integration_id=${id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 transition-colors"
            >
              Add Credential
            </Link>
          </div>
          {integration.credential ? (
            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔑</span>
                  <div>
                    <p className="font-medium text-gray-900">{integration.credential.name}</p>
                    <p className="text-sm text-gray-500">{integration.credential.type}</p>
                  </div>
                </div>
                <CredentialStatusBadge status={integration.credential.status} />
              </div>
            </div>
          ) : (
            <div className="mt-6 text-center py-8">
              <span className="text-4xl">🔐</span>
              <p className="mt-2 text-sm text-gray-500">No credentials configured</p>
              <Link
                href={`/admin/integrations/credentials/new?integration_id=${id}`}
                className="mt-4 inline-flex items-center text-sm font-medium text-cyan-600 hover:text-cyan-500"
              >
                Add credentials →
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'health' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="font-semibold text-gray-900">Health Monitoring</h3>
          <p className="mt-1 text-sm text-gray-500">Real-time health status and historical data</p>
          <div className="mt-6 text-center py-12 text-gray-500">
            <span className="text-4xl">📊</span>
            <p className="mt-2">Health monitoring dashboard coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const config: Record<IntegrationStatus, { color: string; bg: string; label: string }> = {
    active: { color: 'text-green-700', bg: 'bg-green-100', label: 'Active' },
    inactive: { color: 'text-gray-700', bg: 'bg-gray-100', label: 'Inactive' },
    error: { color: 'text-red-700', bg: 'bg-red-100', label: 'Error' },
    pending: { color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Pending' },
    configuring: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'Configuring' },
  };

  const c = config[status];
  return (
    <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-sm font-medium', c.bg, c.color)}>
      {c.label}
    </span>
  );
}

function CredentialStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string }> = {
    active: { color: 'text-green-700', bg: 'bg-green-100' },
    expired: { color: 'text-red-700', bg: 'bg-red-100' },
    revoked: { color: 'text-gray-700', bg: 'bg-gray-100' },
    rotating: { color: 'text-yellow-700', bg: 'bg-yellow-100' },
  };

  const c = config[status] || config.active;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', c.bg, c.color)}>
      {status}
    </span>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color?: 'green' | 'red' }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn(
        'mt-1 text-lg font-semibold',
        color === 'green' && 'text-green-600',
        color === 'red' && 'text-red-600',
        !color && 'text-gray-900'
      )}>
        {value}
      </p>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className={cn('text-sm text-gray-900', mono && 'font-mono')}>{value}</dd>
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
