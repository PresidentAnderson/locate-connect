'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type AuthType = 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'none';
type IntegrationCategory = 'hospital' | 'border' | 'transit' | 'morgue' | 'social_media' | 'custom';

interface FormData {
  name: string;
  description: string;
  category: IntegrationCategory;
  provider: string;
  base_url: string;
  auth_type: AuthType;
  timeout: number;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  retry_attempts: number;
  retry_delay_ms: number;
  is_enabled: boolean;
}

const categoryOptions: { value: IntegrationCategory; label: string; description: string }[] = [
  { value: 'hospital', label: 'Hospital Registry', description: 'Connect to hospital patient databases' },
  { value: 'border', label: 'Border Services', description: 'CBSA/ICE crossing alerts' },
  { value: 'transit', label: 'Transit Authority', description: 'Public transit sighting systems' },
  { value: 'morgue', label: 'Morgue/Coroner', description: 'Unidentified remains registries' },
  { value: 'social_media', label: 'Social Media', description: 'Social platform monitoring' },
  { value: 'custom', label: 'Custom API', description: 'Any other external API' },
];

const authTypeOptions: { value: AuthType; label: string; description: string }[] = [
  { value: 'api_key', label: 'API Key', description: 'Authentication via API key in header or query' },
  { value: 'oauth2', label: 'OAuth 2.0', description: 'OAuth 2.0 client credentials flow' },
  { value: 'basic', label: 'Basic Auth', description: 'HTTP Basic authentication' },
  { value: 'bearer', label: 'Bearer Token', description: 'Static bearer token' },
  { value: 'none', label: 'No Auth', description: 'Public API with no authentication' },
];

export default function NewIntegrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: 'custom',
    provider: '',
    base_url: '',
    auth_type: 'api_key',
    timeout: 30000,
    rate_limit_per_minute: 60,
    rate_limit_per_hour: 1000,
    retry_attempts: 3,
    retry_delay_ms: 1000,
    is_enabled: false,
  });

  const handleChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create integration');
      }

      router.push(`/admin/integrations/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/integrations"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Integration</h1>
          <p className="text-sm text-gray-500">
            Configure a new external API connection
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-red-500">⚠️</span>
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          <p className="mt-1 text-sm text-gray-500">General details about the integration</p>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Integration Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Montreal General Hospital API"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Brief description of what this integration does"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value as IntegrationCategory)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {categoryOptions.find((o) => o.value === formData.category)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Provider
              </label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => handleChange('provider', e.target.value)}
                placeholder="e.g., CIUSSS, CBSA"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Connection Settings */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Connection Settings</h2>
          <p className="mt-1 text-sm text-gray-500">API endpoint and authentication configuration</p>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Base URL *
              </label>
              <input
                type="url"
                required
                value={formData.base_url}
                onChange={(e) => handleChange('base_url', e.target.value)}
                placeholder="https://api.example.com/v1"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                The base URL for all API requests
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Authentication Type *
              </label>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {authTypeOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      'relative flex cursor-pointer rounded-lg border p-4 transition-colors',
                      formData.auth_type === opt.value
                        ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="auth_type"
                      value={opt.value}
                      checked={formData.auth_type === opt.value}
                      onChange={(e) => handleChange('auth_type', e.target.value as AuthType)}
                      className="sr-only"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Timeout (ms)
              </label>
              <input
                type="number"
                min={1000}
                max={120000}
                value={formData.timeout}
                onChange={(e) => handleChange('timeout', parseInt(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <p className="mt-1 text-xs text-gray-500">Request timeout in milliseconds</p>
            </div>
          </div>
        </div>

        {/* Rate Limiting */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Rate Limiting</h2>
          <p className="mt-1 text-sm text-gray-500">Configure request throttling to avoid API limits</p>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Requests per Minute
              </label>
              <input
                type="number"
                min={1}
                value={formData.rate_limit_per_minute}
                onChange={(e) => handleChange('rate_limit_per_minute', parseInt(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Requests per Hour
              </label>
              <input
                type="number"
                min={1}
                value={formData.rate_limit_per_hour}
                onChange={(e) => handleChange('rate_limit_per_hour', parseInt(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Retry Policy */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Retry Policy</h2>
          <p className="mt-1 text-sm text-gray-500">Configure automatic retry behavior for failed requests</p>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Max Retry Attempts
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={formData.retry_attempts}
                onChange={(e) => handleChange('retry_attempts', parseInt(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Retry Delay (ms)
              </label>
              <input
                type="number"
                min={100}
                max={30000}
                value={formData.retry_delay_ms}
                onChange={(e) => handleChange('retry_delay_ms', parseInt(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <p className="mt-1 text-xs text-gray-500">Base delay between retries (exponential backoff applied)</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Enable Integration</h2>
              <p className="mt-1 text-sm text-gray-500">
                Enable after configuring credentials. Disabled integrations won't make API calls.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('is_enabled', !formData.is_enabled)}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2',
                formData.is_enabled ? 'bg-cyan-600' : 'bg-gray-200'
              )}
            >
              <span
                className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition',
                  formData.is_enabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/admin/integrations"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              'Create Integration'
            )}
          </button>
        </div>
      </form>
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
