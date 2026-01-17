"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib";
import type { JurisdictionProfile } from "@/types";

export default function JurisdictionsPage() {
  const [profiles, setProfiles] = useState<JurisdictionProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<JurisdictionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/jurisdictions");
      if (!response.ok) {
        throw new Error("Failed to fetch jurisdiction profiles");
      }
      const data = await response.json();
      setProfiles(data.profiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading jurisdiction profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Jurisdiction Profiles</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage jurisdiction-specific configurations for priority scoring, integrations, and legal requirements
        </p>
      </div>

      {/* Profile List */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Profile List */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900">Available Profiles</h2>
              <p className="mt-1 text-xs text-gray-500">{profiles.length} profiles</p>
            </div>
            <div className="divide-y divide-gray-200">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setSelectedProfile(profile)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors",
                    selectedProfile?.id === profile.id
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  )}
                >
                  <div className="font-medium text-gray-900">{profile.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className="rounded bg-gray-100 px-2 py-0.5 font-mono">
                      {profile.id}
                    </span>
                    <span>•</span>
                    <span>{profile.region}, {profile.country}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Profile Details */}
        <div className="lg:col-span-2">
          {selectedProfile ? (
            <ProfileDetails profile={selectedProfile} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-gray-200 bg-white p-12">
              <div className="text-center">
                <div className="text-4xl">📋</div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  Select a Profile
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Choose a jurisdiction profile from the list to view its configuration
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileDetails({ profile }: { profile: JurisdictionProfile }) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <InfoField label="ID" value={profile.id} mono />
          <InfoField label="Name" value={profile.name} />
          <InfoField label="Region" value={profile.region} />
          <InfoField label="Country" value={profile.country} />
          <InfoField label="Language" value={profile.language.toUpperCase()} />
        </div>
      </div>

      {/* Priority Weights */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Priority Weights</h3>
        <div className="mt-4 space-y-3">
          <WeightCategory title="Age-Based">
            <WeightBar label="Under 12" value={profile.priorityWeights.ageUnder12} />
            <WeightBar label="12-17" value={profile.priorityWeights.age12to17} />
            <WeightBar label="Over 65" value={profile.priorityWeights.ageOver65} />
          </WeightCategory>

          <WeightCategory title="Medical/Mental Health">
            <WeightBar label="Mental Health" value={profile.priorityWeights.mentalHealthCondition} />
            <WeightBar label="Medical Dependency" value={profile.priorityWeights.medicalDependency} />
            <WeightBar label="Suicidal Risk" value={profile.priorityWeights.suicidalRisk} />
          </WeightCategory>

          <WeightCategory title="Circumstances">
            <WeightBar label="Suspected Abduction" value={profile.priorityWeights.suspectedAbduction} />
            <WeightBar label="Domestic Violence" value={profile.priorityWeights.domesticViolenceHistory} />
            <WeightBar label="Out of Character" value={profile.priorityWeights.outOfCharacter} />
          </WeightCategory>

          <WeightCategory title="Time-Based">
            <WeightBar label="24+ Hours" value={profile.priorityWeights.missingOver24Hours} />
            <WeightBar label="48+ Hours" value={profile.priorityWeights.missingOver48Hours} />
            <WeightBar label="72+ Hours" value={profile.priorityWeights.missingOver72Hours} />
          </WeightCategory>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h4 className="text-sm font-medium text-gray-700">Priority Thresholds</h4>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              <ThresholdBadge level={0} value={profile.priorityWeights.thresholds.priority0} />
              <ThresholdBadge level={1} value={profile.priorityWeights.thresholds.priority1} />
              <ThresholdBadge level={2} value={profile.priorityWeights.thresholds.priority2} />
              <ThresholdBadge level={3} value={profile.priorityWeights.thresholds.priority3} />
            </div>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Integrations</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <IntegrationToggle label="Hospital Registry" enabled={profile.integrations.hospitalRegistry} />
          <IntegrationToggle label="Morgue Registry" enabled={profile.integrations.morgueRegistry} />
          <IntegrationToggle label="Border Services" enabled={profile.integrations.borderServices} />
          <IntegrationToggle label="Detention Facilities" enabled={profile.integrations.detentionFacilities} />
          <IntegrationToggle label="Social Services" enabled={profile.integrations.socialServices} />
          <IntegrationToggle label="Transit Authority" enabled={profile.integrations.transitAuthority} />
        </div>
      </div>

      {/* Legal Requirements */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Legal Requirements</h3>
        <div className="mt-4 space-y-3">
          <InfoField
            label="Waiting Period"
            value={`${profile.legalRequirements.waitingPeriodHours} hours`}
          />
          <InfoField
            label="Parental Consent Required"
            value={profile.legalRequirements.parentalConsentRequired ? "Yes" : "No"}
          />
          <InfoField
            label="Data Retention"
            value={`${profile.legalRequirements.dataRetentionDays} days`}
          />
          <InfoField
            label="Privacy Law Reference"
            value={profile.legalRequirements.privacyLawReference}
          />
          {profile.legalRequirements.mandatoryReporting.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">
                Mandatory Reporting
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                {profile.legalRequirements.mandatoryReporting.map((entity) => (
                  <span
                    key={entity}
                    className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
                  >
                    {entity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
        <div className="mt-4 space-y-3">
          <InfoField label="Emergency Line" value={profile.contacts.emergencyLine} />
          <InfoField label="Non-Emergency Line" value={profile.contacts.nonEmergencyLine || "—"} />
          <InfoField label="Missing Persons Unit" value={profile.contacts.missingPersonsUnit || "—"} />
          <InfoField label="Email" value={profile.contacts.email || "—"} />
          <InfoField label="Address" value={profile.contacts.address || "—"} />
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <p className={cn("mt-1 text-sm text-gray-900", mono && "font-mono")}>{value}</p>
    </div>
  );
}

function WeightCategory({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function WeightBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-blue-600"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ThresholdBadge({ level, value }: { level: number; value: number }) {
  const colors = {
    0: "bg-red-100 text-red-700",
    1: "bg-orange-100 text-orange-700",
    2: "bg-yellow-100 text-yellow-700",
    3: "bg-green-100 text-green-700",
  };

  const labels = {
    0: "Critical",
    1: "High",
    2: "Medium",
    3: "Low",
  };

  return (
    <div className={cn("rounded-lg p-2", colors[level as keyof typeof colors])}>
      <div className="text-xs font-medium">{labels[level as keyof typeof labels]}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function IntegrationToggle({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-medium",
          enabled
            ? "bg-green-100 text-green-700"
            : "bg-gray-200 text-gray-600"
        )}
      >
        {enabled ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}
