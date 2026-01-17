// AMBER Alert Status Tracker Component
// LC-FEAT-026: AMBER Alert Integration
// Real-time status tracking for AMBER alerts

"use client";

import { useState, useEffect } from "react";
import type {
  AmberAlertRequest,
  AmberAlertStatusHistory,
  AmberAlertDistributionLog,
  AmberAlertMetrics,
} from "@/types/amber-alert.types";
import { getAlertStatusInfo, getChannelDisplayName } from "@/lib/services/amber-alert-service";

interface AlertStatusTrackerProps {
  alertId: string;
  refreshInterval?: number; // milliseconds, default 30000 (30s)
}

interface StatusData {
  current_status: string;
  status_history: AmberAlertStatusHistory[];
  distribution_logs: AmberAlertDistributionLog[];
  metrics: AmberAlertMetrics | null;
}

/**
 * Alert Status Tracker - Real-time monitoring component
 */
export function AlertStatusTracker({
  alertId,
  refreshInterval = 30000,
}: AlertStatusTrackerProps) {
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/amber-alerts/${alertId}/status`);
        if (!response.ok) {
          throw new Error("Failed to fetch status");
        }
        const data = await response.json();
        setStatusData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up polling
    const interval = setInterval(fetchStatus, refreshInterval);

    return () => clearInterval(interval);
  }, [alertId, refreshInterval]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading status: {error}</p>
      </div>
    );
  }

  if (!statusData) {
    return null;
  }

  const currentStatusInfo = getAlertStatusInfo(statusData.current_status as any);

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Current Status
        </h3>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentStatusInfo.color === "blue"
                ? "bg-blue-100 text-blue-800"
                : currentStatusInfo.color === "green"
                ? "bg-green-100 text-green-800"
                : currentStatusInfo.color === "yellow"
                ? "bg-yellow-100 text-yellow-800"
                : currentStatusInfo.color === "red"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {currentStatusInfo.label}
          </span>
          <span className="text-sm text-gray-600">
            {currentStatusInfo.description}
          </span>
        </div>
      </div>

      {/* Metrics (if active) */}
      {statusData.metrics && statusData.current_status === "active" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Alert Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">
                {statusData.metrics.views_count.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">Views</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">
                {statusData.metrics.shares_count.toLocaleString()}
              </div>
              <div className="text-sm text-green-700">Shares</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-900">
                {statusData.metrics.tips_received_count.toLocaleString()}
              </div>
              <div className="text-sm text-purple-700">Tips Received</div>
            </div>
          </div>
        </div>
      )}

      {/* Distribution Status */}
      {statusData.distribution_logs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribution Status
          </h3>
          <div className="space-y-3">
            {statusData.distribution_logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      log.status === "success"
                        ? "bg-green-500"
                        : log.status === "failed"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                  />
                  <span className="font-medium text-gray-900">
                    {getChannelDisplayName(log.channel)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {log.status === "success"
                    ? "Distributed"
                    : log.status === "failed"
                    ? "Failed"
                    : "Pending"}
                  {log.estimated_reach && (
                    <span className="ml-2 text-gray-500">
                      ({log.estimated_reach.toLocaleString()} reach)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status History */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Status History
        </h3>
        <div className="space-y-4">
          {statusData.status_history.map((history, index) => {
            const statusInfo = getAlertStatusInfo(history.status);
            return (
              <div key={history.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      index === 0 ? "bg-blue-500" : "bg-gray-300"
                    }`}
                  />
                  {index < statusData.status_history.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {statusInfo.label}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(history.changed_at).toLocaleString()}
                    </span>
                  </div>
                  {history.notes && (
                    <p className="text-sm text-gray-600">{history.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
