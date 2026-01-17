"use client";

import { useCallback, useEffect, useState } from "react";

interface WeatherResponse {
  location: { city: string | null; province: string | null };
  current: {
    observedAt: string;
    temperatureC: number;
    windKph: number;
    precipitationChance: number;
    condition: string;
  };
  forecast: Array<{
    date: string;
    highC: number;
    lowC: number;
    windKph: number;
    precipitationChance: number;
    condition: string;
  }>;
  alerts: Array<{
    title: string;
    severity: "moderate" | "severe" | "extreme";
    description: string;
    startsAt: string;
    endsAt: string;
  }>;
  risk: {
    weatherPoints: number;
    weatherReasons: string[];
    exposureScore: number;
    exposureExplanation: string;
  };
}

interface CaseWeatherPanelProps {
  caseId: string;
}

export default function CaseWeatherPanel({ caseId }: CaseWeatherPanelProps) {
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [shelterAccess, setShelterAccess] = useState(false);

  const loadWeather = useCallback(async () => {
    const response = await fetch(
      `/api/cases/${caseId}/weather?shelterAccess=${shelterAccess}`
    );
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as WeatherResponse;
    setData(payload);
  }, [caseId, shelterAccess]);

  useEffect(() => {
    void loadWeather();
  }, [loadWeather]);

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Weather risk</h2>
        <p className="mt-2 text-sm text-gray-500">Loading weather overview...</p>
      </div>
    );
  }

  const locationLabel = [data.location.city, data.location.province]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Weather risk</h2>
          <p className="text-sm text-gray-500">
            {locationLabel || "Last known area"}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={shelterAccess}
            onChange={(event) => setShelterAccess(event.target.checked)}
          />
          Shelter access confirmed
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs uppercase text-gray-400">Current</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {data.current.temperatureC}°C
          </p>
          <p className="text-sm text-gray-500">{data.current.condition}</p>
          <p className="mt-2 text-xs text-gray-500">
            Wind {data.current.windKph} km/h • Precip {Math.round(data.current.precipitationChance * 100)}%
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs uppercase text-gray-400">Risk contribution</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">
            {data.risk.weatherPoints} / 10
          </p>
          <p className="text-sm text-gray-500">
            {data.risk.weatherReasons.length > 0
              ? data.risk.weatherReasons.join(", ")
              : "No critical alerts"}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Exposure score {data.risk.exposureScore}/100
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs uppercase text-gray-400">Alerts</p>
          {data.alerts.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No active alerts.</p>
          ) : (
            data.alerts.map((alert) => (
              <div key={alert.title} className="mt-2">
                <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                <p className="text-xs text-gray-500">{alert.description}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-600">7-day outlook</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data.forecast.slice(0, 4).map((day) => (
            <div key={day.date} className="rounded-lg border border-gray-100 p-3">
              <p className="text-xs text-gray-500">{day.date}</p>
              <p className="text-sm font-medium text-gray-900">
                {day.lowC}° / {day.highC}°
              </p>
              <p className="text-xs text-gray-500">{day.condition}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">{data.risk.exposureExplanation}</p>
      </div>
    </div>
  );
}
