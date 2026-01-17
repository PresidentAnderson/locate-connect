"use client";

import { useState, useEffect, useCallback } from "react";
import { ResolutionHeatMap, HeatMapFiltersPanel, InsightsPanel } from "@/components/heatmap";
import type {
  HeatMapDataResponse,
  HeatMapFilters,
  MapSettings,
  LayerVisibility,
  HeatMapQueryParams,
} from "@/types/heatmap.types";

const DEFAULT_FILTERS: HeatMapFilters = {
  caseTypes: [],
  ageGroups: [],
  timeFrame: "all",
  dispositions: [],
  sources: [],
};

const DEFAULT_MAP_SETTINGS: MapSettings = {
  centerLat: 46.8139, // Quebec City
  centerLng: -71.2082,
  zoomLevel: 6,
  mapStyle: "streets",
  heatMapIntensity: 0.7,
  heatMapRadius: 30,
  showClusters: true,
  showPatterns: true,
};

const DEFAULT_LAYERS: LayerVisibility = {
  allResolutions: true,
  byDisposition: false,
  bySource: false,
  byTimePattern: false,
  byDemographic: false,
};

export default function ResolutionHeatMapPage() {
  const [data, setData] = useState<HeatMapDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<HeatMapFilters>(DEFAULT_FILTERS);
  const [mapSettings, setMapSettings] = useState<MapSettings>(DEFAULT_MAP_SETTINGS);
  const [visibleLayers, setVisibleLayers] = useState<LayerVisibility>(DEFAULT_LAYERS);

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = buildQueryParams(filters);
      const queryString = new URLSearchParams(params as Record<string, string>).toString();

      const response = await fetch(`/api/heatmap?${queryString}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch heat map data");
      }

      const result: HeatMapDataResponse = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching heat map data:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyFilters = () => {
    fetchData();
    setShowMobileFilters(false);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setVisibleLayers(DEFAULT_LAYERS);
  };

  const handleBoundsChange = (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => {
    // Could use this for lazy loading more data as the user pans
    console.log("Map bounds changed:", bounds);
  };

  const handleClusterClick = (cluster: HeatMapDataResponse["clusters"][0]) => {
    console.log("Cluster clicked:", cluster);
    // Could open a detailed view or zoom in
  };

  if (error && !data) {
    return (
      <div className="p-6">
        <ErrorState error={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 lg:p-6 border-b border-gray-200 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Resolution Location Heat Map
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Analyze patterns in where missing persons are typically found
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <FilterIcon className="w-4 h-4" />
                Filters
              </span>
            </button>

            {/* Map style selector */}
            <select
              value={mapSettings.mapStyle}
              onChange={(e) => setMapSettings({
                ...mapSettings,
                mapStyle: e.target.value as MapSettings["mapStyle"],
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="streets">Streets</option>
              <option value="satellite">Satellite</option>
              <option value="dark">Dark</option>
            </select>

            {/* Export button */}
            <button
              onClick={() => alert("Export functionality coming soon")}
              className="px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700"
            >
              Export Report
            </button>
          </div>
        </div>

        {/* Privacy notice */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-3">
          <InfoIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            This heat map displays aggregated, privacy-compliant data only. Individual case locations are never shown.
            All clusters require a minimum of 10 cases to be displayed.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar - Filters & Insights */}
        <div className={`
          lg:w-96 lg:flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50
          ${showMobileFilters ? "block" : "hidden lg:block"}
        `}>
          <div className="p-4 space-y-4">
            <HeatMapFiltersPanel
              filters={filters}
              visibleLayers={visibleLayers}
              onFiltersChange={setFilters}
              onLayersChange={setVisibleLayers}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
              isLoading={isLoading}
            />

            {data && (
              <InsightsPanel
                insights={data.insights}
                patterns={data.patterns}
                suggestions={data.suggestions}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading heat map data...</p>
              </div>
            </div>
          )}

          <ResolutionHeatMap
            clusters={data?.clusters || []}
            settings={mapSettings}
            visibleLayers={visibleLayers}
            onBoundsChange={handleBoundsChange}
            onClusterClick={handleClusterClick}
            className="w-full h-full min-h-[500px]"
          />

          {/* Quick stats overlay */}
          {data && (
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
              <div className="text-sm text-gray-600">Total Resolutions</div>
              <div className="text-2xl font-bold text-gray-900">
                {data.insights.totalResolutions.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {data.metadata.totalClusters} clusters shown
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Unable to Load Heat Map
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function buildQueryParams(filters: HeatMapFilters): HeatMapQueryParams {
  const params: HeatMapQueryParams = {};

  if (filters.dateRange?.startDate) {
    params.startDate = filters.dateRange.startDate;
  }
  if (filters.dateRange?.endDate) {
    params.endDate = filters.dateRange.endDate;
  }
  if (filters.caseTypes.length > 0) {
    params.caseTypes = filters.caseTypes;
  }
  if (filters.ageGroups.length > 0) {
    params.ageGroups = filters.ageGroups;
  }
  if (filters.dispositions.length > 0) {
    params.dispositions = filters.dispositions;
  }
  if (filters.sources.length > 0) {
    params.sources = filters.sources;
  }
  if (filters.jurisdictionId) {
    params.jurisdictionId = filters.jurisdictionId;
  }
  if (filters.province) {
    params.province = filters.province;
  }

  return params;
}
