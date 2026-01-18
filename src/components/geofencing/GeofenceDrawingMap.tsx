"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import type { LatLng, LeafletMouseEvent, Map as LeafletMap } from "leaflet";

// =============================================================================
// Types
// =============================================================================

export type GeofenceType = "circle" | "polygon" | "corridor";

export interface GeofenceGeometry {
  type: GeofenceType;
  center?: { lat: number; lng: number };
  radius?: number;
  points?: Array<{ lat: number; lng: number }>;
  bufferWidth?: number;
}

interface GeofenceDrawingMapProps {
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  existingGeofences?: Array<{
    id: string;
    name: string;
    geometry: GeofenceGeometry;
    isActive: boolean;
  }>;
  onGeometryChange?: (geometry: GeofenceGeometry | null) => void;
  drawingMode?: GeofenceType | null;
  className?: string;
}

// =============================================================================
// Dynamic Imports (avoid SSR issues with Leaflet)
// =============================================================================

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);
const Polygon = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polygon),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
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
const useMapEvents = dynamic(
  () => import("react-leaflet").then((mod) => mod.useMapEvents),
  { ssr: false }
) as unknown as typeof import("react-leaflet").useMapEvents;

// =============================================================================
// Map Click Handler Component
// =============================================================================

interface MapClickHandlerProps {
  drawingMode: GeofenceType | null;
  onMapClick: (latlng: { lat: number; lng: number }) => void;
  onMapRef: (map: LeafletMap) => void;
}

function MapClickHandler({ drawingMode, onMapClick, onMapRef }: MapClickHandlerProps) {
  const MapEventsComponent = dynamic(
    () => import("react-leaflet").then((mod) => {
      const { useMapEvents } = mod;
      return function MapEvents() {
        const map = useMapEvents({
          click: (e: LeafletMouseEvent) => {
            if (drawingMode) {
              onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
            }
          },
        });
        useEffect(() => {
          onMapRef(map);
        }, [map]);
        return null;
      };
    }),
    { ssr: false }
  );

  return <MapEventsComponent />;
}

// =============================================================================
// Main Component
// =============================================================================

export function GeofenceDrawingMap({
  initialCenter = { lat: 53.5461, lng: -113.4938 }, // Default to Edmonton
  initialZoom = 12,
  existingGeofences = [],
  onGeometryChange,
  drawingMode = null,
  className = "",
}: GeofenceDrawingMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [currentGeometry, setCurrentGeometry] = useState<GeofenceGeometry | null>(null);
  const [tempPoints, setTempPoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [circleRadius, setCircleRadius] = useState<number>(500);
  const [corridorWidth, setCorridorWidth] = useState<number>(100);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Reset when drawing mode changes
  useEffect(() => {
    setCurrentGeometry(null);
    setTempPoints([]);
    if (onGeometryChange) {
      onGeometryChange(null);
    }
  }, [drawingMode]);

  const handleMapClick = useCallback(
    (latlng: { lat: number; lng: number }) => {
      if (!drawingMode) return;

      if (drawingMode === "circle") {
        // For circle, first click sets center
        const geometry: GeofenceGeometry = {
          type: "circle",
          center: latlng,
          radius: circleRadius,
        };
        setCurrentGeometry(geometry);
        if (onGeometryChange) {
          onGeometryChange(geometry);
        }
      } else if (drawingMode === "polygon" || drawingMode === "corridor") {
        const newPoints = [...tempPoints, latlng];
        setTempPoints(newPoints);

        if (drawingMode === "polygon" && newPoints.length >= 3) {
          const geometry: GeofenceGeometry = {
            type: "polygon",
            points: newPoints,
          };
          setCurrentGeometry(geometry);
          if (onGeometryChange) {
            onGeometryChange(geometry);
          }
        } else if (drawingMode === "corridor" && newPoints.length >= 2) {
          const geometry: GeofenceGeometry = {
            type: "corridor",
            points: newPoints,
            bufferWidth: corridorWidth,
          };
          setCurrentGeometry(geometry);
          if (onGeometryChange) {
            onGeometryChange(geometry);
          }
        }
      }
    },
    [drawingMode, tempPoints, circleRadius, corridorWidth, onGeometryChange]
  );

  const handleRadiusChange = useCallback(
    (newRadius: number) => {
      setCircleRadius(newRadius);
      if (currentGeometry?.type === "circle" && currentGeometry.center) {
        const updatedGeometry: GeofenceGeometry = {
          ...currentGeometry,
          radius: newRadius,
        };
        setCurrentGeometry(updatedGeometry);
        if (onGeometryChange) {
          onGeometryChange(updatedGeometry);
        }
      }
    },
    [currentGeometry, onGeometryChange]
  );

  const handleCorridorWidthChange = useCallback(
    (newWidth: number) => {
      setCorridorWidth(newWidth);
      if (currentGeometry?.type === "corridor" && currentGeometry.points) {
        const updatedGeometry: GeofenceGeometry = {
          ...currentGeometry,
          bufferWidth: newWidth,
        };
        setCurrentGeometry(updatedGeometry);
        if (onGeometryChange) {
          onGeometryChange(updatedGeometry);
        }
      }
    },
    [currentGeometry, onGeometryChange]
  );

  const handleUndo = useCallback(() => {
    if (tempPoints.length > 0) {
      const newPoints = tempPoints.slice(0, -1);
      setTempPoints(newPoints);

      if (drawingMode === "polygon" && newPoints.length >= 3) {
        const geometry: GeofenceGeometry = {
          type: "polygon",
          points: newPoints,
        };
        setCurrentGeometry(geometry);
        if (onGeometryChange) {
          onGeometryChange(geometry);
        }
      } else if (drawingMode === "corridor" && newPoints.length >= 2) {
        const geometry: GeofenceGeometry = {
          type: "corridor",
          points: newPoints,
          bufferWidth: corridorWidth,
        };
        setCurrentGeometry(geometry);
        if (onGeometryChange) {
          onGeometryChange(geometry);
        }
      } else {
        setCurrentGeometry(null);
        if (onGeometryChange) {
          onGeometryChange(null);
        }
      }
    }
  }, [tempPoints, drawingMode, corridorWidth, onGeometryChange]);

  const handleClear = useCallback(() => {
    setCurrentGeometry(null);
    setTempPoints([]);
    if (onGeometryChange) {
      onGeometryChange(null);
    }
  }, [onGeometryChange]);

  const handleMapRef = useCallback((map: LeafletMap) => {
    mapRef.current = map;
  }, []);

  if (!isClient) {
    return (
      <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} style={{ height: "400px" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Drawing Controls */}
      {drawingMode && (
        <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 space-y-3">
          <div className="text-sm font-medium text-gray-700">
            Drawing: <span className="capitalize text-blue-600">{drawingMode}</span>
          </div>

          {drawingMode === "circle" && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Radius (meters)</label>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={circleRadius}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-center">{circleRadius}m</div>
            </div>
          )}

          {drawingMode === "corridor" && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Width (meters)</label>
              <input
                type="range"
                min="50"
                max="500"
                step="50"
                value={corridorWidth}
                onChange={(e) => handleCorridorWidthChange(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-center">{corridorWidth}m</div>
            </div>
          )}

          {(drawingMode === "polygon" || drawingMode === "corridor") && (
            <div className="text-xs text-gray-600">
              Points: {tempPoints.length}
              {drawingMode === "polygon" && tempPoints.length < 3 && (
                <span className="text-orange-500 ml-1">(min 3)</span>
              )}
              {drawingMode === "corridor" && tempPoints.length < 2 && (
                <span className="text-orange-500 ml-1">(min 2)</span>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              disabled={tempPoints.length === 0 && !currentGeometry}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Undo
            </button>
            <button
              onClick={handleClear}
              disabled={tempPoints.length === 0 && !currentGeometry}
              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
            >
              Clear
            </button>
          </div>

          <div className="text-xs text-gray-500 border-t pt-2">
            {drawingMode === "circle"
              ? "Click to place center"
              : "Click to add points"}
          </div>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={initialZoom}
        className="h-full w-full rounded-lg"
        style={{ height: "400px", cursor: drawingMode ? "crosshair" : "grab" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler
          drawingMode={drawingMode}
          onMapClick={handleMapClick}
          onMapRef={handleMapRef}
        />

        {/* Existing Geofences */}
        {existingGeofences.map((geofence) => {
          const { geometry } = geofence;
          const color = geofence.isActive ? "#3b82f6" : "#9ca3af";

          if (geometry.type === "circle" && geometry.center && geometry.radius) {
            return (
              <Circle
                key={geofence.id}
                center={[geometry.center.lat, geometry.center.lng]}
                radius={geometry.radius}
                pathOptions={{ color, fillOpacity: 0.2 }}
              >
                <Popup>{geofence.name}</Popup>
              </Circle>
            );
          }

          if (geometry.type === "polygon" && geometry.points) {
            return (
              <Polygon
                key={geofence.id}
                positions={geometry.points.map((p) => [p.lat, p.lng])}
                pathOptions={{ color, fillOpacity: 0.2 }}
              >
                <Popup>{geofence.name}</Popup>
              </Polygon>
            );
          }

          if (geometry.type === "corridor" && geometry.points) {
            return (
              <Polyline
                key={geofence.id}
                positions={geometry.points.map((p) => [p.lat, p.lng])}
                pathOptions={{ color, weight: (geometry.bufferWidth || 100) / 10, opacity: 0.5 }}
              >
                <Popup>{geofence.name}</Popup>
              </Polyline>
            );
          }

          return null;
        })}

        {/* Current Drawing */}
        {currentGeometry?.type === "circle" && currentGeometry.center && currentGeometry.radius && (
          <Circle
            center={[currentGeometry.center.lat, currentGeometry.center.lng]}
            radius={currentGeometry.radius}
            pathOptions={{ color: "#22c55e", fillOpacity: 0.3, dashArray: "5, 5" }}
          />
        )}

        {currentGeometry?.type === "polygon" && currentGeometry.points && currentGeometry.points.length >= 3 && (
          <Polygon
            positions={currentGeometry.points.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: "#22c55e", fillOpacity: 0.3, dashArray: "5, 5" }}
          />
        )}

        {currentGeometry?.type === "corridor" && currentGeometry.points && currentGeometry.points.length >= 2 && (
          <Polyline
            positions={currentGeometry.points.map((p) => [p.lat, p.lng])}
            pathOptions={{
              color: "#22c55e",
              weight: (currentGeometry.bufferWidth || 100) / 10,
              opacity: 0.5,
              dashArray: "10, 10",
            }}
          />
        )}

        {/* Temp Points Markers */}
        {tempPoints.map((point, index) => (
          <Marker key={index} position={[point.lat, point.lng]}>
            <Popup>Point {index + 1}</Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Instructions */}
      {drawingMode && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white/90 rounded-lg px-4 py-2 text-center text-sm text-gray-600">
          {drawingMode === "circle" && "Click on the map to set the geofence center, then adjust the radius."}
          {drawingMode === "polygon" && "Click to add points. Minimum 3 points required to create a polygon."}
          {drawingMode === "corridor" && "Click to add waypoints along the corridor. Minimum 2 points required."}
        </div>
      )}
    </div>
  );
}

export default GeofenceDrawingMap;
