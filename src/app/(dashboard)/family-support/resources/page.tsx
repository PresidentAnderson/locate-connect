"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SupportResource {
  id: string;
  name: string;
  name_fr?: string;
  category: string;
  subcategory?: string;
  description: string;
  description_fr?: string;
  organization_name?: string;
  website?: string;
  phone?: string;
  toll_free_phone?: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  serves_nationally: boolean;
  serves_provinces: string[];
  is_available_24_7: boolean;
  operating_hours?: string;
  languages: string[];
  is_free: boolean;
  cost_info?: string;
  tags: string[];
}

const categoryLabels: Record<string, string> = {
  mental_health: "Mental Health",
  financial: "Financial Assistance",
  legal: "Legal Aid",
  media: "Media & Communication",
  peer_support: "Peer Support",
  grief: "Grief Counseling",
  practical: "Practical Support",
};

const provinceLabels: Record<string, string> = {
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

export default function ResourcesPage() {
  const [resources, setResources] = useState<SupportResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [show24_7Only, setShow24_7Only] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchResources();
  }, [selectedCategory, selectedProvince, showFreeOnly, show24_7Only]);

  const fetchResources = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);
      if (selectedProvince) params.append("province", selectedProvince);
      if (showFreeOnly) params.append("free", "true");
      if (show24_7Only) params.append("24_7", "true");

      const response = await fetch(`/api/family/resources?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setResources(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = searchQuery
    ? resources.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.organization_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : resources;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <Link href="/family-support" className="hover:text-cyan-600">Family Support</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">Resources Directory</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">Support Resources Directory</h1>
          <p className="text-sm text-gray-500">
            Find mental health, financial, legal, and practical support services
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm"
            />
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm"
            >
              <option value="">All Provinces</option>
              {Object.entries(provinceLabels).map(([key, label]) => (
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
              <span className="text-sm text-gray-700">Free services only</span>
            </label>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={show24_7Only}
                onChange={(e) => setShow24_7Only(e.target.checked)}
                className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-700">24/7 available only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        Showing {filteredResources.length} resources
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource) => (
            <div
              key={resource.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded capitalize">
                  {categoryLabels[resource.category] || resource.category}
                </span>
                <div className="flex items-center gap-1">
                  {resource.is_free && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Free</span>
                  )}
                  {resource.is_available_24_7 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">24/7</span>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 text-lg">{resource.name}</h3>
              {resource.organization_name && (
                <p className="text-sm text-gray-500">{resource.organization_name}</p>
              )}
              <p className="text-sm text-gray-600 mt-2 line-clamp-3">{resource.description}</p>

              {/* Contact Info */}
              <div className="mt-4 space-y-2">
                {resource.toll_free_phone && (
                  <a
                    href={`tel:${resource.toll_free_phone}`}
                    className="flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    {resource.toll_free_phone}
                    <span className="text-xs text-gray-400">(Toll-free)</span>
                  </a>
                )}
                {resource.phone && !resource.toll_free_phone && (
                  <a
                    href={`tel:${resource.phone}`}
                    className="flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    {resource.phone}
                  </a>
                )}
                {resource.email && (
                  <a
                    href={`mailto:${resource.email}`}
                    className="flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700"
                  >
                    <EmailIcon className="h-4 w-4" />
                    {resource.email}
                  </a>
                )}
                {resource.website && (
                  <a
                    href={resource.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700"
                  >
                    <GlobeIcon className="h-4 w-4" />
                    Visit Website
                  </a>
                )}
              </div>

              {/* Coverage */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  {resource.serves_nationally ? (
                    <span className="flex items-center gap-1">
                      <MapIcon className="h-3 w-3" />
                      Available nationally
                    </span>
                  ) : resource.serves_provinces.length > 0 ? (
                    <span className="flex items-center gap-1">
                      <MapIcon className="h-3 w-3" />
                      {resource.serves_provinces.map((p) => provinceLabels[p] || p).join(", ")}
                    </span>
                  ) : null}
                </p>
                {resource.languages.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Languages: {resource.languages.map((l) => l === "en" ? "English" : l === "fr" ? "French" : l).join(", ")}
                  </p>
                )}
                {resource.operating_hours && (
                  <p className="text-xs text-gray-500 mt-1">
                    Hours: {resource.operating_hours}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredResources.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          <p>No resources found matching your criteria.</p>
          <button
            onClick={() => {
              setSelectedCategory("");
              setSelectedProvince("");
              setShowFreeOnly(false);
              setShow24_7Only(false);
              setSearchQuery("");
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
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
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

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
    </svg>
  );
}
