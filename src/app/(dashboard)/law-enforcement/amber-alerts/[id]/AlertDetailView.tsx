// AMBER Alert Detail View Component
// LC-FEAT-026: AMBER Alert Integration

"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertStatusTracker } from "@/components/amber-alerts";
import { getAlertStatusInfo } from "@/lib/services/amber-alert-service";
import type { AmberAlertRequest } from "@/types/amber-alert.types";

interface AlertDetailViewProps {
  alert: AmberAlertRequest & { cases?: any };
  userId: string;
}

export function AlertDetailView({ alert, userId }: AlertDetailViewProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const statusInfo = getAlertStatusInfo(alert.status);

  const handleApprove = async () => {
    setIsUpdating(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/amber-alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          notes: "Alert approved for activation",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve alert");
      }

      window.location.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt("Reason for rejection:");
    if (!reason) return;

    setIsUpdating(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/amber-alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          rejection_reason: reason,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject alert");
      }

      window.location.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleActivate = async () => {
    if (!confirm("Are you sure you want to activate this AMBER Alert?")) {
      return;
    }

    setIsUpdating(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/amber-alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alert_id: `AMBER-${alert.case_id.substring(0, 8).toUpperCase()}`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to activate alert");
      }

      window.location.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt("Reason for cancellation:");
    if (!reason) return;

    setIsUpdating(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/amber-alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          deactivation_reason: reason,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel alert");
      }

      window.location.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/law-enforcement/amber-alerts"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Back to Alerts
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            AMBER Alert Details
          </h1>
          <p className="text-gray-600 mt-1">
            Case #{alert.cases?.case_number || "Unknown"}
          </p>
        </div>
        <span
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            statusInfo.color === "blue"
              ? "bg-blue-100 text-blue-800"
              : statusInfo.color === "green"
              ? "bg-green-100 text-green-800"
              : statusInfo.color === "yellow"
              ? "bg-yellow-100 text-yellow-800"
              : statusInfo.color === "red"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Action Error */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{actionError}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {alert.status === "pending_review" && (
          <>
            <button
              onClick={handleApprove}
              disabled={isUpdating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={handleReject}
              disabled={isUpdating}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}
        {alert.status === "approved" && (
          <button
            onClick={handleActivate}
            disabled={isUpdating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Activate Alert
          </button>
        )}
        {alert.status === "active" && (
          <button
            onClick={handleCancel}
            disabled={isUpdating}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
          >
            Cancel Alert
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Child Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Child Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900">
                  {alert.child_first_name} {alert.child_last_name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Age</label>
                <p className="text-gray-900">{alert.child_age}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Sex</label>
                <p className="text-gray-900">{alert.child_sex}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Date of Birth
                </label>
                <p className="text-gray-900">
                  {new Date(alert.child_date_of_birth).toLocaleDateString()}
                </p>
              </div>
              {alert.child_height_cm && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Height
                  </label>
                  <p className="text-gray-900">{alert.child_height_cm} cm</p>
                </div>
              )}
              {alert.child_weight_kg && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Weight
                  </label>
                  <p className="text-gray-900">{alert.child_weight_kg} kg</p>
                </div>
              )}
              {alert.child_hair_color && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Hair Color
                  </label>
                  <p className="text-gray-900">{alert.child_hair_color}</p>
                </div>
              )}
              {alert.child_eye_color && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Eye Color
                  </label>
                  <p className="text-gray-900">{alert.child_eye_color}</p>
                </div>
              )}
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-500">
                Description
              </label>
              <p className="text-gray-900 mt-1">{alert.child_description}</p>
            </div>
          </div>

          {/* Abduction Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Abduction Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Date & Time
                </label>
                <p className="text-gray-900">
                  {new Date(alert.abduction_date).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Location
                </label>
                <p className="text-gray-900">{alert.abduction_location}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Circumstances
                </label>
                <p className="text-gray-900">{alert.abduction_circumstances}</p>
              </div>
            </div>
          </div>

          {/* Suspect & Vehicle Info */}
          {(alert.suspect_name || alert.vehicle_make) && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Suspect & Vehicle Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {alert.suspect_name && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">
                      Suspect
                    </label>
                    <p className="text-gray-900">{alert.suspect_name}</p>
                    {alert.suspect_description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {alert.suspect_description}
                      </p>
                    )}
                  </div>
                )}
                {alert.vehicle_make && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">
                      Vehicle
                    </label>
                    <p className="text-gray-900">
                      {alert.vehicle_year} {alert.vehicle_make}{" "}
                      {alert.vehicle_model}
                      {alert.vehicle_color && ` (${alert.vehicle_color})`}
                    </p>
                    {alert.vehicle_license_plate && (
                      <p className="text-sm text-gray-600 mt-1">
                        License: {alert.vehicle_license_plate}
                        {alert.vehicle_license_province &&
                          ` - ${alert.vehicle_license_province}`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Tracker */}
          <AlertStatusTracker alertId={alert.id} />

          {/* LE Contact */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Law Enforcement Contact
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="font-medium text-gray-500">Agency</label>
                <p className="text-gray-900">{alert.requesting_agency}</p>
              </div>
              <div>
                <label className="font-medium text-gray-500">Contact</label>
                <p className="text-gray-900">{alert.le_contact_name}</p>
              </div>
              <div>
                <label className="font-medium text-gray-500">Phone</label>
                <p className="text-gray-900">{alert.le_contact_phone}</p>
              </div>
              <div>
                <label className="font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{alert.le_contact_email}</p>
              </div>
            </div>
          </div>

          {/* Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Distribution Settings
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="font-medium text-gray-500">
                  Geographic Scope
                </label>
                <p className="text-gray-900">
                  {alert.geographic_scope.join(", ")}
                </p>
              </div>
              <div>
                <label className="font-medium text-gray-500">
                  Target Radius
                </label>
                <p className="text-gray-900">{alert.target_radius_km} km</p>
              </div>
              <div>
                <label className="font-medium text-gray-500">Channels</label>
                <div className="mt-1 space-y-1">
                  {alert.distribution_channels.map((channel) => (
                    <div key={channel} className="text-gray-900">
                      • {channel}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
