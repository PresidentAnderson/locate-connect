'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Integration {
  id: string;
  name: string;
  category: string;
  status: string;
  base_url: string;
}

interface RouteMapping {
  id: string;
  integrationId: string;
  endpointPath: string;
  endpointMethod: string;
  priority: number;
  isFallback: boolean;
  requestTransform?: string;
  responseTransform?: string;
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
  isEnabled: boolean;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgResponseTimeMs?: number;
  lastCalledAt?: string;
  lastError?: string;
  integration: Integration;
}

interface IntegrationRoute {
  id: string;
  routePath: string;
  routeMethod: string;
  name: string;
  description?: string;
  aggregationStrategy: string;
  timeoutMs: number;
  failOnAnyError: boolean;
  isEnabled: boolean;
  mappings: RouteMapping[];
}

interface AvailableIntegration {
  id: string;
  name: string;
  category: string;
  status: string;
  base_url: string;
}

export default function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [route, setRoute] = useState<IntegrationRoute | null>(null);
  const [availableIntegrations, setAvailableIntegrations] = useState<AvailableIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [addingMapping, setAddingMapping] = useState(false);

  const [newMapping, setNewMapping] = useState({
    integrationId: '',
    endpointPath: '',
    endpointMethod: 'GET',
    isFallback: false,
    cacheEnabled: false,
    cacheTtlSeconds: 300,
  });

  const fetchRoute = async () => {
    try {
      const response = await fetch(`/api/integrations/routes/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch route');
      }

      setRoute(data.data?.route);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations?status=active');
      const data = await response.json();
      setAvailableIntegrations(data.data?.integrations || []);
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
    }
  };

  useEffect(() => {
    fetchRoute();
    fetchIntegrations();
  }, [id]);

  const handleAddMapping = async () => {
    if (!newMapping.integrationId || !newMapping.endpointPath) return;

    setAddingMapping(true);
    try {
      const response = await fetch(`/api/integrations/routes/${id}/mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMapping),
      });

      if (response.ok) {
        setShowAddMapping(false);
        setNewMapping({
          integrationId: '',
          endpointPath: '',
          endpointMethod: 'GET',
          isFallback: false,
          cacheEnabled: false,
          cacheTtlSeconds: 300,
        });
        fetchRoute();
      }
    } catch (err) {
      console.error('Failed to add mapping:', err);
    } finally {
      setAddingMapping(false);
    }
  };

  const handleToggleMapping = async (mappingId: string, isEnabled: boolean) => {
    try {
      await fetch(`/api/integrations/routes/${id}/mappings/${mappingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !isEnabled }),
      });
      fetchRoute();
    } catch (err) {
      console.error('Failed to toggle mapping:', err);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to remove this integration from the route?')) return;

    try {
      await fetch(`/api/integrations/routes/${id}/mappings/${mappingId}`, {
        method: 'DELETE',
      });
      fetchRoute();
    } catch (err) {
      console.error('Failed to delete mapping:', err);
    }
  };

  const handleDeleteRoute = async () => {
    if (!confirm('Are you sure you want to delete this route? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/integrations/routes/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/admin/integrations/routes');
      }
    } catch (err) {
      console.error('Failed to delete route:', err);
    }
  };

  const handleMovePriority = async (mappingId: string, direction: 'up' | 'down') => {
    if (!route) return;

    const currentIndex = route.mappings.findIndex(m => m.id === mappingId);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === route.mappings.length - 1) return;

    const newOrder = route.mappings.map((m, idx) => {
      if (idx === currentIndex) {
        return { mappingId: m.id, priority: direction === 'up' ? idx : idx + 2 };
      }
      if (direction === 'up' && idx === currentIndex - 1) {
        return { mappingId: m.id, priority: idx + 2 };
      }
      if (direction === 'down' && idx === currentIndex + 1) {
        return { mappingId: m.id, priority: idx };
      }
      return { mappingId: m.id, priority: idx + 1 };
    });

    try {
      await fetch(`/api/integrations/routes/${id}/mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
      });
      fetchRoute();
    } catch (err) {
      console.error('Failed to reorder mappings:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{error || 'Route not found'}</p>
        <Link href="/admin/integrations/routes" className="mt-2 text-sm font-medium text-red-600 hover:text-red-500">
          Back to routes
        </Link>
      </div>
    );
  }

  const unmappedIntegrations = availableIntegrations.filter(
    i => !route.mappings.some(m => m.integrationId === i.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/integrations/routes"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn(
                'inline-flex items-center rounded px-2 py-0.5 text-xs font-bold',
                route.routeMethod === 'GET' && 'bg-green-100 text-green-700',
                route.routeMethod === 'POST' && 'bg-blue-100 text-blue-700',
                route.routeMethod === 'PUT' && 'bg-yellow-100 text-yellow-700',
                route.routeMethod === 'DELETE' && 'bg-red-100 text-red-700',
                !['GET', 'POST', 'PUT', 'DELETE'].includes(route.routeMethod) && 'bg-gray-100 text-gray-700'
              )}>
                {route.routeMethod}
              </span>
              <code className="text-lg font-mono text-gray-900">{route.routePath}</code>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{route.name}</h1>
          </div>
        </div>
        <button
          onClick={handleDeleteRoute}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <TrashIcon className="h-4 w-4" />
          Delete Route
        </button>
      </div>

      {/* Route Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Strategy</p>
            <p className="text-sm font-medium text-gray-900 capitalize">{route.aggregationStrategy.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Timeout</p>
            <p className="text-sm font-medium text-gray-900">{route.timeoutMs}ms</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Fail on Error</p>
            <p className="text-sm font-medium text-gray-900">{route.failOnAnyError ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <p className={cn('text-sm font-medium', route.isEnabled ? 'text-green-600' : 'text-gray-500')}>
              {route.isEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
        {route.description && (
          <p className="mt-4 text-sm text-gray-600 border-t border-gray-100 pt-4">{route.description}</p>
        )}
      </div>

      {/* Integration Mappings */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Integration Mappings</h2>
          <button
            onClick={() => setShowAddMapping(true)}
            disabled={unmappedIntegrations.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Integration
          </button>
        </div>

        {/* Add Mapping Form */}
        {showAddMapping && (
          <div className="p-5 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Integration</label>
                <select
                  value={newMapping.integrationId}
                  onChange={(e) => setNewMapping({ ...newMapping, integrationId: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Select an integration</option>
                  {unmappedIntegrations.map((integration) => (
                    <option key={integration.id} value={integration.id}>
                      {integration.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Endpoint Path</label>
                <div className="mt-1 flex rounded-lg border border-gray-300 overflow-hidden">
                  <select
                    value={newMapping.endpointMethod}
                    onChange={(e) => setNewMapping({ ...newMapping, endpointMethod: e.target.value })}
                    className="border-0 bg-gray-50 py-2 pl-2 pr-6 text-xs font-medium focus:ring-0"
                  >
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>DELETE</option>
                  </select>
                  <input
                    type="text"
                    value={newMapping.endpointPath}
                    onChange={(e) => setNewMapping({ ...newMapping, endpointPath: e.target.value })}
                    placeholder="/patients/search"
                    className="flex-1 border-0 py-2 px-3 text-sm focus:ring-0"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newMapping.cacheEnabled}
                  onChange={(e) => setNewMapping({ ...newMapping, cacheEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-cyan-600"
                />
                <span className="text-sm text-gray-700">Enable caching</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddMapping(false)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMapping}
                  disabled={addingMapping || !newMapping.integrationId || !newMapping.endpointPath}
                  className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {addingMapping ? 'Adding...' : 'Add Mapping'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mappings List */}
        <div className="divide-y divide-gray-200">
          {route.mappings.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">No integrations mapped to this route yet.</p>
            </div>
          ) : (
            route.mappings.map((mapping, index) => (
              <div key={mapping.id} className={cn('p-4', !mapping.isEnabled && 'opacity-50')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Priority Controls */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMovePriority(mapping.id, 'up')}
                        disabled={index === 0}
                        className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronUpIcon className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-bold text-gray-400 text-center">{mapping.priority}</span>
                      <button
                        onClick={() => handleMovePriority(mapping.id, 'down')}
                        disabled={index === route.mappings.length - 1}
                        className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Integration Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{mapping.integration.name}</span>
                        <span className={cn(
                          'inline-flex h-2 w-2 rounded-full',
                          mapping.integration.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                        )} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-medium text-gray-500">{mapping.endpointMethod}</span>
                        <code className="text-xs text-gray-600">{mapping.endpointPath}</code>
                      </div>
                    </div>
                  </div>

                  {/* Metrics & Actions */}
                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs text-gray-500">
                      <p>{mapping.totalCalls.toLocaleString()} calls</p>
                      {mapping.avgResponseTimeMs && <p>{mapping.avgResponseTimeMs}ms avg</p>}
                    </div>
                    <button
                      onClick={() => handleToggleMapping(mapping.id, mapping.isEnabled)}
                      className={cn(
                        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                        mapping.isEnabled ? 'bg-cyan-600' : 'bg-gray-200'
                      )}
                    >
                      <span className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition',
                        mapping.isEnabled ? 'translate-x-4' : 'translate-x-0'
                      )} />
                    </button>
                    <button
                      onClick={() => handleDeleteMapping(mapping.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Error Display */}
                {mapping.lastError && (
                  <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                    Last error: {mapping.lastError}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
