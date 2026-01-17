"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SupportGroup {
  id: string;
  name: string;
  name_fr?: string;
  description?: string;
  group_type: "in_person" | "virtual" | "hybrid";
  category: string;
  organization_name?: string;
  facilitator_name?: string;
  facilitator_credentials?: string;
  meeting_frequency?: string;
  meeting_day?: string;
  meeting_time?: string;
  timezone?: string;
  location?: string;
  virtual_platform?: string;
  virtual_link?: string;
  max_participants?: number;
  current_participants?: number;
  is_open_enrollment: boolean;
  registration_required: boolean;
  registration_url?: string;
  contact_email?: string;
  contact_phone?: string;
  serves_provinces: string[];
  languages: string[];
  is_free: boolean;
  cost_info?: string;
}

const categoryLabels: Record<string, string> = {
  missing_persons_families: "Families of Missing Persons",
  grief_support: "Grief Support",
  trauma_survivors: "Trauma Survivors",
  general: "General Support",
};

const groupTypeLabels: Record<string, { label: string; color: string }> = {
  in_person: { label: "In-Person", color: "bg-green-100 text-green-800" },
  virtual: { label: "Virtual", color: "bg-purple-100 text-purple-800" },
  hybrid: { label: "Hybrid", color: "bg-blue-100 text-blue-800" },
};

export default function PeerSupportPage() {
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [selectedType, selectedCategory, showFreeOnly, showOpenOnly]);

  const fetchGroups = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedType) params.append("type", selectedType);
      if (selectedCategory) params.append("category", selectedCategory);
      if (showFreeOnly) params.append("free", "true");
      if (showOpenOnly) params.append("open", "true");

      const response = await fetch(`/api/family/support-groups?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSupportGroups(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch support groups:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <Link href="/family-support" className="hover:text-cyan-600">Family Support</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">Peer Support & Groups</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">Peer Support & Support Groups</h1>
          <p className="text-sm text-gray-500">
            Connect with others who understand what you are going through
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-cyan-800 flex items-center gap-2">
          <HeartIcon className="h-5 w-5" />
          Connect with Peer Support
        </h2>
        <p className="text-sm text-cyan-700 mt-2">
          Our peer support program connects families of active missing persons cases with families of
          resolved cases who have volunteered to provide support. This can be done via phone, email,
          or in person based on your preference.
        </p>
        <Link
          href="/family-support/request-peer-match"
          className="inline-block mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
        >
          Request Peer Support Match
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm"
            >
              <option value="">All Types</option>
              <option value="in_person">In-Person</option>
              <option value="virtual">Virtual</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm"
            >
              <option value="">All Categories</option>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFreeOnly}
                onChange={(e) => setShowFreeOnly(e.target.checked)}
                className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-700">Free groups only</span>
            </label>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOpenOnly}
                onChange={(e) => setShowOpenOnly(e.target.checked)}
                className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-700">Open enrollment only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Support Groups Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {supportGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded ${groupTypeLabels[group.group_type].color}`}>
                    {groupTypeLabels[group.group_type].label}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    {categoryLabels[group.category] || group.category}
                  </span>
                </div>
                {group.is_free && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Free</span>
                )}
              </div>

              <h3 className="font-semibold text-gray-900 text-lg">{group.name}</h3>
              {group.organization_name && (
                <p className="text-sm text-gray-500">{group.organization_name}</p>
              )}
              {group.description && (
                <p className="text-sm text-gray-600 mt-2">{group.description}</p>
              )}

              {/* Meeting Details */}
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                {group.meeting_frequency && (
                  <p className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    {group.meeting_frequency}
                    {group.meeting_day && ` - ${group.meeting_day}s`}
                    {group.meeting_time && ` at ${group.meeting_time}`}
                    {group.timezone && ` (${group.timezone})`}
                  </p>
                )}
                {group.location && (
                  <p className="flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4 text-gray-400" />
                    {group.location}
                  </p>
                )}
                {group.virtual_platform && (
                  <p className="flex items-center gap-2">
                    <VideoIcon className="h-4 w-4 text-gray-400" />
                    {group.virtual_platform}
                  </p>
                )}
                {group.facilitator_name && (
                  <p className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    Facilitated by {group.facilitator_name}
                    {group.facilitator_credentials && `, ${group.facilitator_credentials}`}
                  </p>
                )}
              </div>

              {/* Enrollment Status */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-1 ${group.is_open_enrollment ? "text-green-600" : "text-yellow-600"}`}>
                    {group.is_open_enrollment ? (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        Open enrollment
                      </>
                    ) : (
                      <>
                        <ClockIcon className="h-4 w-4" />
                        Registration required
                      </>
                    )}
                  </span>
                  {group.max_participants && group.current_participants !== undefined && (
                    <span className="text-gray-500">
                      {group.current_participants}/{group.max_participants} participants
                    </span>
                  )}
                </div>
                {group.languages.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Languages: {group.languages.map((l) => l === "en" ? "English" : l === "fr" ? "French" : l).join(", ")}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-3">
                {group.registration_url && (
                  <a
                    href={group.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 transition-colors"
                  >
                    Register
                  </a>
                )}
                {group.contact_email && (
                  <a
                    href={`mailto:${group.contact_email}`}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Contact
                  </a>
                )}
                {group.contact_phone && (
                  <a
                    href={`tel:${group.contact_phone}`}
                    className="text-sm text-cyan-600 hover:text-cyan-700"
                  >
                    {group.contact_phone}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {supportGroups.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          <p>No support groups found matching your criteria.</p>
          <button
            onClick={() => {
              setSelectedType("");
              setSelectedCategory("");
              setShowFreeOnly(false);
              setShowOpenOnly(false);
            }}
            className="mt-2 text-cyan-600 hover:text-cyan-700"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

// Icons
function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
