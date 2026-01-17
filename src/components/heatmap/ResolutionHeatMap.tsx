"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  ResolutionLocationCluster,
  HeatMapPoint,
  ClusterMarker,
  MapSettings,
  LayerVisibility,
} from "@/types/heatmap.types";

// Leaflet will be loaded dynamically to avoid SSR issues
interface LeafletMap {
  setView: (center: [number, number], zoom: number) => void;
  remove: () => void;
  on: (event: string, callback: () => void) => void;
  getBounds: () => {
    getNorth: () => number;
    getSouth: () => number;
    getEast: () => number;
    getWest: () => number;
  };
  getZoom: () => number;
}

interface HeatLayer {
  addTo: (map: LeafletMap) => void;
  setLatLngs: (points: [number, number, number][]) => void;
  remove: () => void;
}

interface ResolutionHeatMapProps {
  clusters: ResolutionLocationCluster[];
  settings: MapSettings;
  visibleLayers: LayerVisibility;
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  onClusterClick?: (cluster: ResolutionLocationCluster) => void;
  className?: string;
}

export function ResolutionHeatMap({
  clusters,
  settings,
  visibleLayers,
  onBoundsChange,
  onClusterClick,
  className = "",
}: ResolutionHeatMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const heatLayerRef = useRef<HeatLayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initMap = async () => {
      try {
        // Dynamically import Leaflet
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");

        // Try to import heat layer plugin
        let HeatLayer: unknown;
        try {
          const heatModule = await import("leaflet.heat");
          HeatLayer = heatModule.default;
        } catch {
          console.warn("leaflet.heat not available, using fallback visualization");
        }

        // Create map
        const map = L.map(mapContainerRef.current!, {
          center: [settings.centerLat, settings.centerLng],
          zoom: settings.zoomLevel,
          zoomControl: true,
          attributionControl: true,
        });

        // Add tile layer based on style
        const tileUrl = getTileUrl(settings.mapStyle);
        L.tileLayer(tileUrl, {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map);

        mapRef.current = map as unknown as LeafletMap;

        // Setup event listeners
        map.on("moveend", () => {
          if (onBoundsChange && mapRef.current) {
            const bounds = mapRef.current.getBounds();
            onBoundsChange({
              north: bounds.getNorth(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              west: bounds.getWest(),
            });
          }
        });

        setIsLoading(false);
      } catch (err) {
        console.error("Error initializing map:", err);
        setError("Failed to initialize map. Please refresh the page.");
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [settings.centerLat, settings.centerLng, settings.zoomLevel, settings.mapStyle, onBoundsChange]);

  // Update heat layer when clusters change
  useEffect(() => {
    if (!mapRef.current || isLoading) return;

    updateHeatLayer();
  }, [clusters, visibleLayers, settings.heatMapIntensity, settings.heatMapRadius, isLoading]);

  const updateHeatLayer = useCallback(async () => {
    if (!mapRef.current) return;

    try {
      const L = await import("leaflet");

      // Remove existing heat layer
      if (heatLayerRef.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
      }

      // Generate heat points based on visible layers
      const heatPoints = generateHeatPoints(clusters, visibleLayers);

      if (heatPoints.length === 0) return;

      // Try to use leaflet.heat, fallback to circle markers
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const heat = (L as any).heatLayer(
          heatPoints.map(p => [p.lat, p.lng, p.intensity]),
          {
            radius: settings.heatMapRadius,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {
              0.0: "#3388ff",
              0.25: "#00ff00",
              0.5: "#ffff00",
              0.75: "#ff8800",
              1.0: "#ff0000",
            },
          }
        );

        heat.addTo(mapRef.current);
        heatLayerRef.current = heat;
      } catch {
        // Fallback: Use circle markers
        addCircleMarkers(L, heatPoints);
      }

      // Add cluster markers if enabled
      if (settings.showClusters) {
        addClusterMarkers(L, clusters);
      }
    } catch (err) {
      console.error("Error updating heat layer:", err);
    }
  }, [clusters, visibleLayers, settings]);

  const addCircleMarkers = async (
    L: typeof import("leaflet"),
    points: HeatMapPoint[]
  ) => {
    if (!mapRef.current) return;

    // Create a layer group for circle markers
    const layerGroup = L.layerGroup();

    for (const point of points) {
      const color = getIntensityColor(point.intensity);
      const circle = L.circleMarker([point.lat, point.lng], {
        radius: Math.max(5, point.intensity * 20),
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.6,
      });

      circle.addTo(layerGroup);
    }

    layerGroup.addTo(mapRef.current as unknown as L.Map);
  };

  const addClusterMarkers = async (
    L: typeof import("leaflet"),
    clusters: ResolutionLocationCluster[]
  ) => {
    if (!mapRef.current) return;

    for (const cluster of clusters) {
      const marker = L.marker(
        [cluster.clusterCenterLat, cluster.clusterCenterLng],
        {
          icon: createClusterIcon(L, cluster.totalResolutions),
        }
      );

      marker.bindPopup(createClusterPopup(cluster));

      marker.on("click", () => {
        if (onClusterClick) {
          onClusterClick(cluster);
        }
      });

      marker.addTo(mapRef.current as unknown as L.Map);
    }
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <div className="text-red-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[400px] rounded-lg"
        style={{ zIndex: 0 }}
      />
      <MapLegend />
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function MapLegend() {
  return (
    <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
      <h4 className="text-xs font-semibold text-gray-700 mb-2">Resolution Density</h4>
      <div className="flex items-center gap-1">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: "#3388ff" }}></div>
        <span className="text-xs text-gray-600">Low</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: "#00ff00" }}></div>
        <span className="text-xs text-gray-600">Medium-Low</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: "#ffff00" }}></div>
        <span className="text-xs text-gray-600">Medium</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: "#ff8800" }}></div>
        <span className="text-xs text-gray-600">Medium-High</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: "#ff0000" }}></div>
        <span className="text-xs text-gray-600">High</span>
      </div>
    </div>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function getTileUrl(style: string): string {
  switch (style) {
    case "satellite":
      return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    case "dark":
      return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
    case "hybrid":
      return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    case "streets":
    default:
      return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  }
}

function generateHeatPoints(
  clusters: ResolutionLocationCluster[],
  visibleLayers: LayerVisibility
): HeatMapPoint[] {
  const points: HeatMapPoint[] = [];
  const maxResolutions = Math.max(...clusters.map(c => c.totalResolutions), 1);

  for (const cluster of clusters) {
    let intensity = 0;

    if (visibleLayers.allResolutions) {
      intensity = cluster.totalResolutions / maxResolutions;
    } else {
      // Calculate intensity based on visible layers
      if (visibleLayers.byDisposition) {
        const safeCount = cluster.dispositionCounts.foundAliveSafe +
                          cluster.dispositionCounts.returnedVoluntarily +
                          cluster.dispositionCounts.locatedRunaway;
        intensity = safeCount / maxResolutions;
      }

      if (visibleLayers.bySource) {
        const mainSources = cluster.sourceCounts.hospital +
                            cluster.sourceCounts.shelter +
                            cluster.sourceCounts.home;
        intensity = Math.max(intensity, mainSources / maxResolutions);
      }

      if (visibleLayers.byTimePattern) {
        const eveningMorning = cluster.timeOfDayCounts.evening +
                               cluster.timeOfDayCounts.morning;
        intensity = Math.max(intensity, eveningMorning / maxResolutions);
      }

      if (visibleLayers.byDemographic) {
        const teenChild = cluster.ageGroupCounts.teen + cluster.ageGroupCounts.child;
        intensity = Math.max(intensity, teenChild / maxResolutions);
      }
    }

    if (intensity > 0) {
      points.push({
        lat: cluster.clusterCenterLat,
        lng: cluster.clusterCenterLng,
        intensity: Math.min(1, Math.max(0.1, intensity)),
        data: cluster,
      });
    }
  }

  return points;
}

function getIntensityColor(intensity: number): string {
  if (intensity <= 0.2) return "#3388ff";
  if (intensity <= 0.4) return "#00ff00";
  if (intensity <= 0.6) return "#ffff00";
  if (intensity <= 0.8) return "#ff8800";
  return "#ff0000";
}

function createClusterIcon(L: typeof import("leaflet"), count: number) {
  const size = Math.min(40, Math.max(24, 20 + Math.log10(count + 1) * 10));

  return L.divIcon({
    html: `
      <div class="flex items-center justify-center rounded-full bg-cyan-600 text-white font-bold shadow-lg"
           style="width: ${size}px; height: ${size}px; font-size: ${Math.max(10, size / 3)}px;">
        ${count}
      </div>
    `,
    className: "cluster-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createClusterPopup(cluster: ResolutionLocationCluster): string {
  return `
    <div class="p-2 min-w-[200px]">
      <h3 class="font-bold text-gray-900 mb-2">
        ${cluster.city || cluster.province}
      </h3>
      <div class="space-y-1 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-600">Total Resolutions:</span>
          <span class="font-medium">${cluster.totalResolutions}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Found Safe:</span>
          <span class="font-medium text-green-600">${cluster.dispositionCounts.foundAliveSafe}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Avg Resolution Time:</span>
          <span class="font-medium">${formatHours(cluster.avgResolutionHours)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Avg Distance:</span>
          <span class="font-medium">${cluster.avgDistanceFromLastSeenKm?.toFixed(1) || "N/A"} km</span>
        </div>
      </div>
      <div class="mt-3 pt-2 border-t border-gray-200">
        <div class="text-xs text-gray-500">
          Click for detailed analysis
        </div>
      </div>
    </div>
  `;
}

function formatHours(hours?: number): string {
  if (!hours) return "N/A";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export default ResolutionHeatMap;
