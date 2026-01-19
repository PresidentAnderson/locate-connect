'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface RouteMapping {
  id: string;
  integrationId: string;
  priority: number;
  isEnabled: boolean;
  integration: {
    id: string;
    name: string;
    category: string;
    status: string;
  };
}

interface IntegrationRoute {
  id: string;
  routePath: string;
  routeMethod: string;
  name: string;
  description?: string;
  aggregationStrategy: string;
  timeoutMs: number;
  isEnabled: boolean;
  mappings: RouteMapping[];
}

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
  ANY: 'bg-purple-100 text-purple-700',
};

const strategyLabels: Record<string, string> = {
  first_success: 'First Success',
  merge_results: 'Merge Results',
  priority_order: 'Priority Order',
  all_parallel: 'All Parallel',
  chain: 'Chain',
};

export default function RouteBindingsPage() {
  const [routes, setRoutes] = useState<IntegrationRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/integrations/routes');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch routes');
      }

      setRoutes(data.data?.routes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleToggleRoute = async (id: string, currentEnabled: boolean) => {
    try {
      const response = await fetch(`/api/integrations/routes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !currentEnabled }),
      });

      if (response.ok) {
        fetchRoutes();
      }
    } catch (err) {
      console.error('Failed to toggle route:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
        <button onClick={fetchRoutes} className="mt-2 text-sm font-medium text-red-600 hover:text-red-500">
          Try again
        </button>
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
            <h1 className="text-2xl font-bold text-gray-900">Route Bindings</h1>
            <p className="text-sm text-gray-500">
              Map internal routes to external API integrations
            </p>
          </div>
        </div>
        <Link
          href="/admin/integrations/routes/new"
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          New Route
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Routes</p>
          <p className="text-2xl font-bold text-gray-900">{routes.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Active Routes</p>
          <p className="text-2xl font-bold text-green-600">
            {routes.filter(r => r.isEnabled).length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Mappings</p>
          <p className="text-2xl font-bold text-gray-900">
            {routes.reduce((sum, r) => sum + r.mappings.length, 0)}
          </p>
        </div>
      </div>

      {/* Routes List */}
      {routes.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <RouteIcon className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No routes configured</h3>
          <p className="mt-2 text-sm text-gray-500">
            Create your first route binding to connect internal routes to external APIs.
          </p>
          <Link
            href="/admin/integrations/routes/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Create Route
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              onToggle={() => handleToggleRoute(route.id, route.isEnabled)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RouteCard({
  route,
  onToggle,
}: {
  route: IntegrationRoute;
  onToggle: () => void;
}) {
  const enabledMappings = route.mappings.filter(m => m.isEnabled);
  const primaryMapping = route.mappings.find(m => m.priority === 1);
  const fallbackMappings = route.mappings.filter(m => m.priority > 1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        {/* Route Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className={cn(
              'inline-flex items-center rounded px-2 py-0.5 text-xs font-bold',
              methodColors[route.routeMethod] || 'bg-gray-100 text-gray-700'
            )}>
              {route.routeMethod}
            </span>
            <code className="text-sm font-mono text-gray-900">{route.routePath}</code>
            {!route.isEnabled && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                Disabled
              </span>
            )}
          </div>
          <h3 className="mt-2 font-semibold text-gray-900">{route.name}</h3>
          {route.description && (
            <p className="mt-1 text-sm text-gray-500">{route.description}</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className={cn(
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              route.isEnabled ? 'bg-cyan-600' : 'bg-gray-200'
            )}
          >
            <span className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
              route.isEnabled ? 'translate-x-5' : 'translate-x-0'
            )} />
          </button>
          <Link
            href={`/admin/integrations/routes/${route.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Configure
          </Link>
        </div>
      </div>

      {/* Mappings Preview */}
      <div className="mt-4 border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-500">
              Strategy: <span className="font-medium text-gray-700">{strategyLabels[route.aggregationStrategy]}</span>
            </span>
            <span className="text-gray-500">
              Timeout: <span className="font-medium text-gray-700">{route.timeoutMs}ms</span>
            </span>
          </div>
          <span className="text-gray-500">
            {enabledMappings.length} of {route.mappings.length} mappings active
          </span>
        </div>

        {/* Integration Flow Visualization */}
        {route.mappings.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {primaryMapping && (
              <div className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm',
                primaryMapping.isEnabled
                  ? 'bg-cyan-50 border border-cyan-200'
                  : 'bg-gray-50 border border-gray-200 opacity-50'
              )}>
                <span className="text-xs font-medium text-gray-500">1</span>
                <span className="font-medium text-gray-700">{primaryMapping.integration.name}</span>
                {primaryMapping.integration.status === 'active' && (
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                )}
              </div>
            )}

            {fallbackMappings.length > 0 && (
              <>
                <ArrowRightIcon className="h-4 w-4 text-gray-300" />
                <div className="flex items-center gap-1">
                  {fallbackMappings.slice(0, 2).map((mapping, idx) => (
                    <div
                      key={mapping.id}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2 py-1 text-xs',
                        mapping.isEnabled
                          ? 'bg-gray-50 border border-gray-200'
                          : 'bg-gray-50 border border-gray-200 opacity-50'
                      )}
                    >
                      <span className="font-medium text-gray-500">{mapping.priority}</span>
                      <span className="text-gray-600">{mapping.integration.name}</span>
                    </div>
                  ))}
                  {fallbackMappings.length > 2 && (
                    <span className="text-xs text-gray-500">+{fallbackMappings.length - 2} more</span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {route.mappings.length === 0 && (
          <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
            <p className="text-sm text-yellow-700">
              No integrations mapped. Add at least one integration to make this route functional.
            </p>
          </div>
        )}
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

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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

function RouteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
