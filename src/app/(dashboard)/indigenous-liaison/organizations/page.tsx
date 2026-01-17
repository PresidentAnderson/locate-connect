"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib";

interface Organization {
  id: string;
  name: string;
  name_fr: string | null;
  acronym: string | null;
  org_type: string;
  description: string | null;
  scope: string | null;
  provinces_served: string[];
  primary_phone: string | null;
  toll_free_phone: string | null;
  crisis_line: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  province: string | null;
  is_verified_partner: boolean;
}

const ORG_TYPE_LABELS: Record<string, string> = {
  national_organization: "National Organization",
  provincial_territorial_organization: "Provincial/Territorial",
  tribal_council: "Tribal Council",
  band_council: "Band Council",
  metis_organization: "Metis Organization",
  inuit_organization: "Inuit Organization",
  urban_indigenous_organization: "Urban Indigenous",
  womens_organization: "Women's Organization",
  youth_organization: "Youth Organization",
  health_services: "Health Services",
  legal_services: "Legal Services",
  victim_services: "Victim Services",
  friendship_centre: "Friendship Centre",
  other: "Other",
};

const SCOPE_LABELS: Record<string, string> = {
  national: "National",
  provincial: "Provincial",
  regional: "Regional",
  local: "Local",
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "",
    scope: "",
    province: "",
    partnersOnly: false,
    search: "",
  });

  useEffect(() => {
    async function fetchOrganizations() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.type) params.set("type", filters.type);
        if (filters.scope) params.set("scope", filters.scope);
        if (filters.province) params.set("province", filters.province);
        if (filters.partnersOnly) params.set("partners", "true");
        if (filters.search) params.set("search", filters.search);

        const res = await fetch(`/api/indigenous/organizations?${params}`);
        if (res.ok) {
          const data = await res.json();
          setOrganizations(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrganizations();
  }, [filters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Indigenous Partner Organizations
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          National and regional Indigenous organizations for case support and collaboration
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              placeholder="Search organizations..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              {Object.entries(ORG_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Scope
            </label>
            <select
              value={filters.scope}
              onChange={(e) =>
                setFilters({ ...filters, scope: e.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Scopes</option>
              {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Province
            </label>
            <select
              value={filters.province}
              onChange={(e) =>
                setFilters({ ...filters, province: e.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Provinces</option>
              <option value="AB">Alberta</option>
              <option value="BC">British Columbia</option>
              <option value="MB">Manitoba</option>
              <option value="NB">New Brunswick</option>
              <option value="NL">Newfoundland and Labrador</option>
              <option value="NS">Nova Scotia</option>
              <option value="NT">Northwest Territories</option>
              <option value="NU">Nunavut</option>
              <option value="ON">Ontario</option>
              <option value="PE">Prince Edward Island</option>
              <option value="QC">Quebec</option>
              <option value="SK">Saskatchewan</option>
              <option value="YT">Yukon</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.partnersOnly}
                onChange={(e) =>
                  setFilters({ ...filters, partnersOnly: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-cyan-600"
              />
              <span className="text-sm text-gray-700">Verified Partners Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl bg-gray-100"
            />
          ))}
        </div>
      ) : organizations.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {organizations.map((org) => (
            <OrganizationCard key={org.id} organization={org} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No organizations found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}

function OrganizationCard({ organization }: { organization: Organization }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {organization.acronym
                ? `${organization.acronym}`
                : organization.name}
            </h3>
            {organization.is_verified_partner && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Verified Partner
              </span>
            )}
          </div>
          {organization.acronym && (
            <p className="text-sm text-gray-600">{organization.name}</p>
          )}
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {SCOPE_LABELS[organization.scope || ""] || organization.scope}
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-500">
        {ORG_TYPE_LABELS[organization.org_type] || organization.org_type}
      </p>

      {organization.description && (
        <p className="mt-3 text-sm text-gray-600 line-clamp-2">
          {organization.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-1">
        {organization.provinces_served?.slice(0, 5).map((prov) => (
          <span
            key={prov}
            className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
          >
            {prov}
          </span>
        ))}
        {organization.provinces_served?.length > 5 && (
          <span className="text-xs text-gray-400">
            +{organization.provinces_served.length - 5} more
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-4 text-sm">
        {organization.toll_free_phone && (
          <a
            href={`tel:${organization.toll_free_phone}`}
            className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700"
          >
            <PhoneIcon className="h-4 w-4" />
            {organization.toll_free_phone}
          </a>
        )}
        {organization.crisis_line && (
          <a
            href={`tel:${organization.crisis_line}`}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            <PhoneIcon className="h-4 w-4" />
            Crisis: {organization.crisis_line}
          </a>
        )}
        {organization.website && (
          <a
            href={organization.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700"
          >
            <GlobeIcon className="h-4 w-4" />
            Website
          </a>
        )}
        {organization.email && (
          <a
            href={`mailto:${organization.email}`}
            className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700"
          >
            <EmailIcon className="h-4 w-4" />
            Email
          </a>
        )}
      </div>
    </div>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}
