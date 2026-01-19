'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ANY'] as const;
const AGGREGATION_STRATEGIES = [
  { value: 'priority_order', label: 'Priority Order', description: 'Try integrations in priority order, use first successful response' },
  { value: 'first_success', label: 'First Success', description: 'Return immediately when first integration succeeds' },
  { value: 'merge_results', label: 'Merge Results', description: 'Combine results from all integrations' },
  { value: 'all_parallel', label: 'All Parallel', description: 'Execute all integrations in parallel, aggregate responses' },
  { value: 'chain', label: 'Chain', description: 'Pass output of one integration as input to the next' },
] as const;

export default function NewRoutePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    routePath: '',
    routeMethod: 'GET' as (typeof HTTP_METHODS)[number],
    name: '',
    description: '',
    aggregationStrategy: 'priority_order' as string,
    timeoutMs: 30000,
    failOnAnyError: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/integrations/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create route');
      }

      // Redirect to the route detail page to add mappings
      router.push(`/admin/integrations/routes/${data.data.route.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/integrations/routes"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Route Binding</h1>
          <p className="text-sm text-gray-500">
            Create a new route to map to external integrations
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Route Path */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Route Path</label>
          <div className="mt-1 flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-cyan-500">
            <select
              value={formData.routeMethod}
              onChange={(e) => setFormData({ ...formData, routeMethod: e.target.value as (typeof HTTP_METHODS)[number] })}
              className="border-0 bg-gray-50 py-2 pl-3 pr-8 text-sm font-medium focus:ring-0"
            >
              {HTTP_METHODS.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
            <input
              type="text"
              value={formData.routePath}
              onChange={(e) => setFormData({ ...formData, routePath: e.target.value })}
              placeholder="/api/search/hospitals"
              className="flex-1 border-0 py-2 px-3 text-sm focus:ring-0"
              required
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            The internal route path that will be bound to external integrations
          </p>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Hospital Patient Search"
            className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Search for patients across connected hospital registries"
            rows={2}
            className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>

        {/* Aggregation Strategy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Aggregation Strategy</label>
          <div className="space-y-2">
            {AGGREGATION_STRATEGIES.map((strategy) => (
              <label
                key={strategy.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.aggregationStrategy === strategy.value
                    ? 'border-cyan-500 bg-cyan-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="aggregationStrategy"
                  value={strategy.value}
                  checked={formData.aggregationStrategy === strategy.value}
                  onChange={(e) => setFormData({ ...formData, aggregationStrategy: e.target.value })}
                  className="mt-0.5 h-4 w-4 text-cyan-600 focus:ring-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">{strategy.label}</span>
                  <p className="text-xs text-gray-500">{strategy.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Advanced Settings</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Timeout */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Timeout (ms)</label>
              <input
                type="number"
                value={formData.timeoutMs}
                onChange={(e) => setFormData({ ...formData, timeoutMs: parseInt(e.target.value) || 30000 })}
                min={1000}
                max={120000}
                step={1000}
                className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            {/* Fail on Any Error */}
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.failOnAnyError}
                  onChange={(e) => setFormData({ ...formData, failOnAnyError: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-700">Fail if any integration fails</span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
          <Link
            href="/admin/integrations/routes"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Route'}
          </button>
        </div>
      </form>

      {/* Help Text */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h4 className="text-sm font-medium text-gray-900">Next Steps</h4>
        <p className="mt-1 text-sm text-gray-600">
          After creating the route, you&apos;ll be able to add integration mappings to define which external APIs
          should be called and how their responses should be transformed and aggregated.
        </p>
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
