"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

// Types for the search map
interface Coordinates {
  lat: number;
  lng: number;
}

interface Sighting {
  id: string;
  coordinates: Coordinates;
  reportedAt: string;
  description?: string;
  confidence: "high" | "medium" | "low" | "unverified";
  status: "pending" | "verified" | "dismissed";
}

interface SearchArea {
  id: string;
  name: string;
  type: "primary" | "secondary" | "expanded";
  priority: "critical" | "high" | "medium" | "low";
  status: "planned" | "in_progress" | "completed";
  coordinates: Coordinates[];
  coverage?: number;
}

interface ResourceMarker {
  id: string;
  type: "hospital" | "police_station" | "shelter" | "transit_hub";
  name: string;
  coordinates: Coordinates;
  address?: string;
  phone?: string;
}

interface AssociateLocation {
  id: string;
  name: string;
  relationship: string;
  coordinates: Coordinates;
  isPersonOfInterest: boolean;
}

interface ActivityPoint {
  coordinates: Coordinates;
  intensity: number;
  type: "sighting" | "tip" | "lead" | "search";
}

interface MapLayerVisibility {
  lastSeenLocation: boolean;
  sightings: boolean;
  searchAreas: boolean;
  resources: boolean;
  associates: boolean;
  activityHeat: boolean;
}

interface CaseSearchMapProps {
  caseId: string;
  lastSeenLocation?: Coordinates;
  lastSeenAddress?: string;
  initialCenter?: Coordinates;
  initialZoom?: number;
}

// Dynamically import the Map component to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Polygon = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polygon),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);

const LAYER_CONFIG = [
  { id: "lastSeenLocation" as const, label: "Last Seen Location", color: "#ef4444" },
  { id: "sightings" as const, label: "Sightings", color: "#f97316" },
  { id: "searchAreas" as const, label: "Search Areas", color: "#3b82f6" },
  { id: "resources" as const, label: "Nearby Resources", color: "#22c55e" },
  { id: "associates" as const, label: "Known Associates", color: "#a855f7" },
  { id: "activityHeat" as const, label: "Activity Heat Map", color: "#ec4899" },
];

const SIGHTING_COLORS = {
  high: "#22c55e",
  medium: "#f97316",
  low: "#eab308",
  unverified: "#9ca3af",
};

const SEARCH_AREA_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return "< 1 hour ago";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function CaseSearchMap({
  caseId,
  lastSeenLocation,
  lastSeenAddress,
  initialCenter,
  initialZoom = 12,
}: CaseSearchMapProps) {
  const [layers, setLayers] = useState<MapLayerVisibility>({
    lastSeenLocation: true,
    sightings: true,
    searchAreas: true,
    resources: false,
    associates: false,
    activityHeat: false,
  });
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [searchAreas, setSearchAreas] = useState<SearchArea[]>([]);
  const [resources, setResources] = useState<ResourceMarker[]>([]);
  const [associates, setAssociates] = useState<AssociateLocation[]>([]);
  const [activityPoints, setActivityPoints] = useState<ActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<{ start?: string; end?: string }>({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const center = initialCenter || lastSeenLocation || { lat: 53.5461, lng: -113.4938 }; // Default to Edmonton

  // Fetch map data
  const fetchMapData = useCallback(async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/map`);
      if (response.ok) {
        const data = await response.json();
        setSightings(data.sightings || []);
        setSearchAreas(data.searchAreas || []);
        setResources(data.resources || []);
        setAssociates(data.associates || []);
        setActivityPoints(data.activityPoints || []);
      }
    } catch (error) {
      console.error("Failed to fetch map data:", error);
      // Use mock data for demo
      setSightings([
        {
          id: "1",
          coordinates: { lat: center.lat + 0.01, lng: center.lng - 0.02 },
          reportedAt: new Date(Date.now() - 3600000).toISOString(),
          description: "Spotted near downtown transit station",
          confidence: "high",
          status: "verified",
        },
        {
          id: "2",
          coordinates: { lat: center.lat - 0.015, lng: center.lng + 0.01 },
          reportedAt: new Date(Date.now() - 7200000).toISOString(),
          description: "Possible sighting at local coffee shop",
          confidence: "medium",
          status: "pending",
        },
      ]);
      setSearchAreas([
        {
          id: "1",
          name: "Primary Search Zone",
          type: "primary",
          priority: "critical",
          status: "in_progress",
          coordinates: [
            { lat: center.lat + 0.02, lng: center.lng - 0.03 },
            { lat: center.lat + 0.02, lng: center.lng + 0.03 },
            { lat: center.lat - 0.02, lng: center.lng + 0.03 },
            { lat: center.lat - 0.02, lng: center.lng - 0.03 },
          ],
          coverage: 45,
        },
      ]);
      setResources([
        {
          id: "1",
          type: "hospital",
          name: "Royal Alexandra Hospital",
          coordinates: { lat: center.lat + 0.025, lng: center.lng - 0.01 },
          address: "10240 Kingsway NW, Edmonton",
          phone: "780-735-4111",
        },
        {
          id: "2",
          type: "police_station",
          name: "Edmonton Police Service - Downtown",
          coordinates: { lat: center.lat - 0.01, lng: center.lng + 0.02 },
          address: "9620 103A Ave NW, Edmonton",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [caseId, center.lat, center.lng]);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  const toggleLayer = (layerId: keyof MapLayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  const filteredSightings = sightings.filter((s) => {
    if (dateFilter.start && new Date(s.reportedAt) < new Date(dateFilter.start)) return false;
    if (dateFilter.end && new Date(s.reportedAt) > new Date(dateFilter.end)) return false;
    return true;
  });

  if (!isClient) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Search Map</h3>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFilter.start || ""}
            onChange={(e) => setDateFilter((prev) => ({ ...prev, start: e.target.value }))}
            className="text-sm border border-gray-300 rounded px-2 py-1"
            placeholder="From"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={dateFilter.end || ""}
            onChange={(e) => setDateFilter((prev) => ({ ...prev, end: e.target.value }))}
            className="text-sm border border-gray-300 rounded px-2 py-1"
            placeholder="To"
          />
        </div>
      </div>

      {/* Layer Controls */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-2">
        {LAYER_CONFIG.map((layer) => (
          <button
            key={layer.id}
            onClick={() => toggleLayer(layer.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-colors ${
              layers[layer.id]
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-gray-100 text-gray-500 border border-gray-200"
            }`}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: layers[layer.id] ? layer.color : "#d1d5db" }}
            />
            {layer.label}
          </button>
        ))}
      </div>

      {/* Map Container */}
      <div className="relative h-[500px]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={initialZoom}
            className="h-full w-full z-0"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Last Seen Location */}
            {layers.lastSeenLocation && lastSeenLocation && (
              <>
                <Marker position={[lastSeenLocation.lat, lastSeenLocation.lng]}>
                  <Popup>
                    <div className="font-medium text-red-600">Last Known Location</div>
                    {lastSeenAddress && <p className="text-sm">{lastSeenAddress}</p>}
                  </Popup>
                </Marker>
                <Circle
                  center={[lastSeenLocation.lat, lastSeenLocation.lng]}
                  radius={500}
                  pathOptions={{ color: "#ef4444", fillOpacity: 0.1 }}
                />
              </>
            )}

            {/* Sightings */}
            {layers.sightings &&
              filteredSightings.map((sighting) => (
                <Marker
                  key={sighting.id}
                  position={[sighting.coordinates.lat, sighting.coordinates.lng]}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: SIGHTING_COLORS[sighting.confidence] }}
                        />
                        <span className="font-medium capitalize">{sighting.confidence} Confidence</span>
                      </div>
                      <p className="text-sm text-gray-600">{sighting.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimeAgo(sighting.reportedAt)}
                      </p>
                      <span
                        className={`inline-block mt-2 px-2 py-0.5 text-xs rounded ${
                          sighting.status === "verified"
                            ? "bg-green-100 text-green-800"
                            : sighting.status === "dismissed"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {sighting.status}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Search Areas */}
            {layers.searchAreas &&
              searchAreas.map((area) => (
                <Polygon
                  key={area.id}
                  positions={area.coordinates.map((c) => [c.lat, c.lng])}
                  pathOptions={{
                    color: SEARCH_AREA_COLORS[area.priority],
                    fillOpacity: 0.2,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      <div className="font-medium">{area.name}</div>
                      <div className="text-sm text-gray-600 capitalize">{area.type} Zone</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-2 py-0.5 text-xs rounded capitalize ${
                            area.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : area.status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {area.status.replace("_", " ")}
                        </span>
                        {area.coverage !== undefined && (
                          <span className="text-xs text-gray-500">{area.coverage}% covered</span>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              ))}

            {/* Resources */}
            {layers.resources &&
              resources.map((resource) => (
                <Marker
                  key={resource.id}
                  position={[resource.coordinates.lat, resource.coordinates.lng]}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      <div className="font-medium">{resource.name}</div>
                      <div className="text-sm text-gray-600 capitalize">
                        {resource.type.replace("_", " ")}
                      </div>
                      {resource.address && (
                        <p className="text-xs text-gray-500 mt-1">{resource.address}</p>
                      )}
                      {resource.phone && (
                        <a
                          href={`tel:${resource.phone}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {resource.phone}
                        </a>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Associates */}
            {layers.associates &&
              associates.map((associate) => (
                <Marker
                  key={associate.id}
                  position={[associate.coordinates.lat, associate.coordinates.lng]}
                >
                  <Popup>
                    <div className="min-w-[150px]">
                      <div className="font-medium">{associate.name}</div>
                      <div className="text-sm text-gray-600">{associate.relationship}</div>
                      {associate.isPersonOfInterest && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                          Person of Interest
                        </span>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>Last Seen</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span>High Confidence</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-gray-400" />
            <span>Unverified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
