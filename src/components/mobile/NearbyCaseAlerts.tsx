"use client";

/**
 * Nearby Case Alerts Component
 * Geofencing-based alerts for missing person cases in user's area
 * LC-FEAT-031: Mobile App Companion
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { saveUserLocation, getLastLocation } from "@/lib/pwa/indexeddb";
import { updateLocationInSW } from "@/lib/pwa/service-worker";

export interface NearbyCase {
  id: string;
  personName: string;
  age?: number;
  lastSeenDate: string;
  lastSeenLocation: string;
  photoUrl?: string;
  distance: number; // in km
  priority: "critical" | "high" | "medium" | "low";
  type: "missing" | "endangered" | "amber_alert";
}

interface NearbyCaseAlertsProps {
  onCaseSelect?: (caseId: string) => void;
  onLocationUpdate?: (lat: number, lng: number) => void;
  maxDistance?: number; // in km
  refreshInterval?: number; // in ms
  className?: string;
}

export function NearbyCaseAlerts({
  onCaseSelect,
  onLocationUpdate,
  maxDistance = 50,
  refreshInterval = 300000, // 5 minutes
  className = "",
}: NearbyCaseAlertsProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [nearbyCases, setNearbyCases] = useState<NearbyCase[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check geolocation permission
  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          setPermissionStatus(result.state);
          result.onchange = () => setPermissionStatus(result.state);
        })
        .catch(() => {
          // Permissions API not supported
        });
    }
  }, []);

  // Load saved location on mount
  useEffect(() => {
    const loadSavedLocation = async () => {
      const saved = await getLastLocation();
      if (saved) {
        setCurrentLocation({
          lat: saved.latitude,
          lng: saved.longitude,
        });
      }
    };
    loadSavedLocation();
  }, []);

  // Fetch nearby cases
  const fetchNearbyCases = useCallback(
    async (lat: number, lng: number) => {
      try {
        const response = await fetch(
          `/api/v1/alerts/nearby?lat=${lat}&lng=${lng}&radius=${maxDistance}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch nearby cases");
        }

        const data = await response.json();
        setNearbyCases(data.cases || []);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Error fetching nearby cases:", err);
        // Don't set error for fetch failures - just keep existing data
      }
    },
    [maxDistance]
  );

  // Handle position update
  const handlePositionUpdate = useCallback(
    async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;

      setCurrentLocation({ lat: latitude, lng: longitude });

      // Save to IndexedDB
      await saveUserLocation(latitude, longitude, position.coords.accuracy);

      // Update service worker for background geofencing
      await updateLocationInSW(latitude, longitude);

      // Notify parent
      onLocationUpdate?.(latitude, longitude);

      // Fetch nearby cases
      await fetchNearbyCases(latitude, longitude);
    },
    [fetchNearbyCases, onLocationUpdate]
  );

  // Handle position error
  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    let errorMessage: string;
    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage = "Location permission denied";
        break;
      case err.POSITION_UNAVAILABLE:
        errorMessage = "Location unavailable";
        break;
      case err.TIMEOUT:
        errorMessage = "Location request timed out";
        break;
      default:
        errorMessage = "Failed to get location";
    }
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  // Enable location tracking
  const enableTracking = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get initial position
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        }
      );

      await handlePositionUpdate(position);

      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        handlePositionError,
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000, // 1 minute
        }
      );

      // Setup refresh timer
      refreshTimerRef.current = setInterval(() => {
        if (currentLocation) {
          fetchNearbyCases(currentLocation.lat, currentLocation.lng);
        }
      }, refreshInterval);

      setIsEnabled(true);
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        handlePositionError(err);
      } else {
        setError("Failed to enable location tracking");
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    currentLocation,
    fetchNearbyCases,
    handlePositionError,
    handlePositionUpdate,
    refreshInterval,
  ]);

  // Disable tracking
  const disableTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    setIsEnabled(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // Get priority styles
  const getPriorityStyles = (priority: NearbyCase["priority"]) => {
    switch (priority) {
      case "critical":
        return "border-red-500 bg-red-50 dark:bg-red-900/20";
      case "high":
        return "border-amber-500 bg-amber-50 dark:bg-amber-900/20";
      case "medium":
        return "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
      default:
        return "border-slate-300 bg-slate-50 dark:bg-slate-800/50";
    }
  };

  // Get type badge
  const getTypeBadge = (type: NearbyCase["type"]) => {
    switch (type) {
      case "amber_alert":
        return (
          <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
            AMBER ALERT
          </span>
        );
      case "endangered":
        return (
          <span className="px-2 py-0.5 bg-amber-600 text-white text-xs font-medium rounded">
            Endangered
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded">
            Missing
          </span>
        );
    }
  };

  // Format distance
  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m away`;
    }
    return `${km.toFixed(1)}km away`;
  };

  // Format time ago
  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Nearby Cases
          </h2>
        </div>

        {/* Toggle */}
        <button
          onClick={isEnabled ? disableTracking : enableTracking}
          disabled={isLoading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Status */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          {permissionStatus === "denied" && (
            <p className="text-xs text-red-500 mt-1">
              Please enable location access in your device settings.
            </p>
          )}
        </div>
      )}

      {!isEnabled && !error && (
        <div className="mb-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
          <svg
            className="w-12 h-12 text-slate-400 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
            Enable location to see missing person cases in your area
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Alerts for cases within {maxDistance}km radius
          </p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Location info */}
      {isEnabled && currentLocation && (
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Tracking active</span>
          </div>
          {lastUpdated && <span>Updated {formatTimeAgo(lastUpdated)}</span>}
        </div>
      )}

      {/* Cases list */}
      {isEnabled && nearbyCases.length > 0 && (
        <div className="space-y-3">
          {nearbyCases.map((nearbyCase) => (
            <button
              key={nearbyCase.id}
              onClick={() => onCaseSelect?.(nearbyCase.id)}
              className={`w-full p-3 border-l-4 rounded-lg text-left transition-colors hover:shadow-md ${getPriorityStyles(nearbyCase.priority)}`}
            >
              <div className="flex gap-3">
                {/* Photo */}
                {nearbyCase.photoUrl ? (
                  <img
                    src={nearbyCase.photoUrl}
                    alt={nearbyCase.personName}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-8 h-8 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getTypeBadge(nearbyCase.type)}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDistance(nearbyCase.distance)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                    {nearbyCase.personName}
                    {nearbyCase.age && (
                      <span className="font-normal text-slate-500 dark:text-slate-400 ml-1">
                        ({nearbyCase.age})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                    Last seen: {nearbyCase.lastSeenLocation}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {nearbyCase.lastSeenDate}
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 self-center">
                  <svg
                    className="w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No cases */}
      {isEnabled && !isLoading && nearbyCases.length === 0 && currentLocation && (
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 text-green-500 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <p className="text-slate-600 dark:text-slate-300">
            No active cases within {maxDistance}km
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            We&apos;ll notify you if any cases appear nearby
          </p>
        </div>
      )}

      {/* Privacy notice */}
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
        Location data is used to show relevant cases and is never shared with
        third parties.
      </p>
    </div>
  );
}
