"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib";

interface Community {
  id: string;
  name: string;
  band_number: string | null;
  nation: string;
  treaty_number: string | null;
  province: string;
  region: string | null;
  population: number | null;
  primary_language: string | null;
  secondary_language: string | null;
  chief_name: string | null;
  council_email: string | null;
  council_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  is_remote: boolean;
  has_road_access: boolean;
  nearest_police_detachment: string | null;
  distance_to_detachment_km: number | null;
}

interface Territory {
  id: string;
  name: string;
  name_traditional: string | null;
  nation: string;
  treaty_number: string | null;
  treaty_name: string | null;
  treaty_year: number | null;
}

const PROVINCE_LABELS: Record<string, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

const LANGUAGE_LABELS: Record<string, string> = {
  cree: "Cree",
  ojibwe: "Ojibwe",
  inuktitut: "Inuktitut",
  dene: "Dene",
  blackfoot: "Blackfoot",
  michif: "Michif",
  mohawk: "Mohawk",
  mikmaq: "Mi'kmaq",
  salish: "Salish",
  haida: "Haida",
  english: "English",
  french: "French",
  other: "Other",
};

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"communities" | "territories">("communities");
  const [filters, setFilters] = useState({
    province: "",
    nation: "",
    treaty: "",
    remote: false,
    search: "",
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.province) params.set("province", filters.province);
        if (filters.nation) params.set("nation", filters.nation);
        if (filters.treaty) params.set("treaty", filters.treaty);
        if (filters.remote) params.set("remote", "true");
        if (filters.search) params.set("search", filters.search);

        const [communitiesRes, territoriesRes] = await Promise.all([
          fetch(`/api/indigenous/communities?${params}`),
          fetch(`/api/indigenous/territories?${params}`),
        ]);

        if (communitiesRes.ok) {
          const data = await communitiesRes.json();
          setCommunities(data.data || []);
        }

        if (territoriesRes.ok) {
          const data = await territoriesRes.json();
          setTerritories(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [filters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Indigenous Communities & Territories
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          First Nations, Metis, and Inuit communities and traditional territories across Canada
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          <button
            onClick={() => setActiveTab("communities")}
            className={cn(
              "pb-3 px-1 text-sm font-medium border-b-2 transition-colors",
              activeTab === "communities"
                ? "border-cyan-600 text-cyan-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            Communities ({communities.length})
          </button>
          <button
            onClick={() => setActiveTab("territories")}
            className={cn(
              "pb-3 px-1 text-sm font-medium border-b-2 transition-colors",
              activeTab === "territories"
                ? "border-cyan-600 text-cyan-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            Traditional Territories ({territories.length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search communities..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Province</label>
            <select
              value={filters.province}
              onChange={(e) => setFilters({ ...filters, province: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Provinces</option>
              {Object.entries(PROVINCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nation</label>
            <input
              type="text"
              value={filters.nation}
              onChange={(e) => setFilters({ ...filters, nation: e.target.value })}
              placeholder="Filter by nation..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Treaty</label>
            <input
              type="text"
              value={filters.treaty}
              onChange={(e) => setFilters({ ...filters, treaty: e.target.value })}
              placeholder="Treaty number..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.remote}
                onChange={(e) => setFilters({ ...filters, remote: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-cyan-600"
              />
              <span className="text-sm text-gray-700">Remote Communities Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : activeTab === "communities" ? (
        communities.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {communities.map((community) => (
              <CommunityCard key={community.id} community={community} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-500">No communities found matching your criteria.</p>
          </div>
        )
      ) : territories.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {territories.map((territory) => (
            <TerritoryCard key={territory.id} territory={territory} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No territories found matching your criteria.</p>
        </div>
      )}

      {/* Land Acknowledgment */}
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
        <h3 className="font-semibold text-amber-900">Land Acknowledgment</h3>
        <p className="mt-2 text-sm text-amber-800">
          We acknowledge that the lands across Canada are the traditional territories of Indigenous peoples.
          We recognize the enduring presence of First Nations, Metis, and Inuit peoples and their ongoing
          connection to these lands and waters.
        </p>
        <Link
          href="/indigenous-liaison/resources?category=cultural_protocol"
          className="mt-3 inline-block text-sm font-medium text-amber-700 hover:text-amber-800"
        >
          Learn more about cultural protocols
        </Link>
      </div>
    </div>
  );
}

function CommunityCard({ community }: { community: Community }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{community.name}</h3>
            {community.is_remote && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Remote
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{community.nation}</p>
          {community.band_number && (
            <p className="text-xs text-gray-500">Band #{community.band_number}</p>
          )}
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {PROVINCE_LABELS[community.province] || community.province}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        {community.treaty_number && (
          <div>
            <span className="text-gray-500">Treaty:</span>
            <span className="ml-1 font-medium">{community.treaty_number}</span>
          </div>
        )}
        {community.population && (
          <div>
            <span className="text-gray-500">Population:</span>
            <span className="ml-1 font-medium">{community.population.toLocaleString()}</span>
          </div>
        )}
        {community.primary_language && (
          <div>
            <span className="text-gray-500">Language:</span>
            <span className="ml-1 font-medium">
              {LANGUAGE_LABELS[community.primary_language] || community.primary_language}
            </span>
          </div>
        )}
        {community.chief_name && (
          <div>
            <span className="text-gray-500">Chief:</span>
            <span className="ml-1 font-medium">{community.chief_name}</span>
          </div>
        )}
      </div>

      {(community.council_phone || community.emergency_contact_phone) && (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
          {community.council_phone && (
            <a
              href={`tel:${community.council_phone}`}
              className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
            >
              <PhoneIcon className="h-4 w-4" />
              Council: {community.council_phone}
            </a>
          )}
          {community.emergency_contact_phone && (
            <a
              href={`tel:${community.emergency_contact_phone}`}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
            >
              <PhoneIcon className="h-4 w-4" />
              Emergency: {community.emergency_contact_phone}
            </a>
          )}
        </div>
      )}

      {community.nearest_police_detachment && (
        <div className="mt-3 text-xs text-gray-500">
          Nearest detachment: {community.nearest_police_detachment}
          {community.distance_to_detachment_km && (
            <span> ({community.distance_to_detachment_km} km)</span>
          )}
        </div>
      )}
    </div>
  );
}

function TerritoryCard({ territory }: { territory: Territory }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{territory.name}</h3>
        {territory.name_traditional && (
          <p className="text-sm italic text-gray-600">{territory.name_traditional}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">{territory.nation}</p>
      </div>

      {(territory.treaty_number || territory.treaty_name) && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <p className="text-sm font-medium text-gray-700">Treaty Information</p>
          <div className="mt-1 text-sm text-gray-600">
            {territory.treaty_name && <p>{territory.treaty_name}</p>}
            {territory.treaty_number && <p>Treaty {territory.treaty_number}</p>}
            {territory.treaty_year && <p>Signed: {territory.treaty_year}</p>}
          </div>
        </div>
      )}
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
