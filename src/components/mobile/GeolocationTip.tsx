"use client";

/**
 * GPS-Tagged Tip Submission Component
 * Captures location data with tip submissions
 * LC-FEAT-031: Mobile App Companion
 */

import { useState, useCallback, useEffect } from "react";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
  address?: string;
}

interface GeolocationTipProps {
  onLocationCapture: (location: LocationData) => void;
  onError?: (error: string) => void;
  enableAddressLookup?: boolean;
  highAccuracy?: boolean;
  showMap?: boolean;
  className?: string;
}

export function GeolocationTip({
  onLocationCapture,
  onError,
  enableAddressLookup = true,
  highAccuracy = true,
  showMap = false,
  className = "",
}: GeolocationTipProps) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Check if geolocation is supported
  const isGeolocationSupported = typeof navigator !== "undefined" && "geolocation" in navigator;

  // Position options
  const positionOptions: PositionOptions = {
    enableHighAccuracy: highAccuracy,
    timeout: 10000,
    maximumAge: 0,
  };

  // Process position
  const processPosition = useCallback(
    async (position: GeolocationPosition) => {
      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      };

      // Reverse geocode if enabled
      if (enableAddressLookup) {
        try {
          const address = await reverseGeocode(
            locationData.latitude,
            locationData.longitude
          );
          locationData.address = address;
        } catch {
          // Address lookup failed, continue without it
        }
      }

      setLocation(locationData);
      onLocationCapture(locationData);
    },
    [enableAddressLookup, onLocationCapture]
  );

  // Handle position error
  const handlePositionError = useCallback(
    (err: GeolocationPositionError) => {
      let errorMessage: string;

      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = "Location permission denied. Please enable location access.";
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = "Location information unavailable.";
          break;
        case err.TIMEOUT:
          errorMessage = "Location request timed out. Please try again.";
          break;
        default:
          errorMessage = "An unknown error occurred while getting location.";
      }

      setError(errorMessage);
      onError?.(errorMessage);
    },
    [onError]
  );

  // Get current location once
  const getCurrentLocation = useCallback(async () => {
    if (!isGeolocationSupported) {
      const errorMsg = "Geolocation is not supported by your browser";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            positionOptions
          );
        }
      );

      await processPosition(position);
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        handlePositionError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    isGeolocationSupported,
    positionOptions,
    processPosition,
    handlePositionError,
    onError,
  ]);

  // Start watching location
  const startWatchingLocation = useCallback(() => {
    if (!isGeolocationSupported) {
      const errorMsg = "Geolocation is not supported by your browser";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setError(null);
    setIsWatching(true);

    const id = navigator.geolocation.watchPosition(
      processPosition,
      handlePositionError,
      positionOptions
    );

    setWatchId(id);
  }, [
    isGeolocationSupported,
    positionOptions,
    processPosition,
    handlePositionError,
    onError,
  ]);

  // Stop watching location
  const stopWatchingLocation = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsWatching(false);
  }, [watchId]);

  // Clear location
  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    stopWatchingLocation();
  }, [stopWatchingLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Format accuracy
  const formatAccuracy = (meters: number): string => {
    if (meters < 10) return "High accuracy";
    if (meters < 50) return "Good accuracy";
    if (meters < 100) return "Moderate accuracy";
    return "Low accuracy";
  };

  // Format coordinates
  const formatCoordinate = (coord: number, isLatitude: boolean): string => {
    const direction = isLatitude
      ? coord >= 0
        ? "N"
        : "S"
      : coord >= 0
        ? "E"
        : "W";
    return `${Math.abs(coord).toFixed(6)}${direction}`;
  };

  if (!isGeolocationSupported) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-6 bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`}
      >
        <svg
          className="w-12 h-12 text-amber-500 mb-3"
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
        <p className="text-slate-600 dark:text-slate-300 text-center">
          Geolocation is not supported by your browser
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Location status */}
      {location ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-green-500"
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
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
                Location Captured
              </h4>
              <div className="text-xs text-green-700 dark:text-green-400 space-y-1">
                <p className="font-mono">
                  {formatCoordinate(location.latitude, true)},{" "}
                  {formatCoordinate(location.longitude, false)}
                </p>
                <p>{formatAccuracy(location.accuracy)} ({Math.round(location.accuracy)}m)</p>
                {location.address && (
                  <p className="text-green-600 dark:text-green-500">
                    {location.address}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={clearLocation}
              className="text-green-600 dark:text-green-400 hover:text-green-800"
              aria-label="Clear location"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Map preview placeholder */}
          {showMap && (
            <div className="mt-3 h-32 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Map preview
              </p>
            </div>
          )}
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-red-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-300">
                Location Error
              </h4>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        {!location && (
          <>
            {/* Get current location button */}
            <button
              onClick={getCurrentLocation}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {isLoading ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Getting Location...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
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
                  <span>Get Current Location</span>
                </>
              )}
            </button>

            {/* Live tracking toggle */}
            <button
              onClick={isWatching ? stopWatchingLocation : startWatchingLocation}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                isWatching
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
              }`}
            >
              {isWatching ? (
                <>
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span>Stop Live Tracking</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Enable Live Tracking</span>
                </>
              )}
            </button>
          </>
        )}

        {location && (
          <button
            onClick={getCurrentLocation}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Refresh Location</span>
          </button>
        )}
      </div>

      {/* Privacy notice */}
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
        Your location helps verify tip accuracy. Location data is encrypted and
        only shared with authorized investigators.
      </p>
    </div>
  );
}

/**
 * Reverse geocode coordinates to address
 * Uses Nominatim (OpenStreetMap) for free geocoding
 */
async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          "User-Agent": "LocateConnect/1.0",
        },
      }
    );

    if (!response.ok) {
      return undefined;
    }

    const data = await response.json();
    return data.display_name;
  } catch {
    return undefined;
  }
}
