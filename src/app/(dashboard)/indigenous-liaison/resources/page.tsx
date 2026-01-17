"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib";

interface Resource {
  id: string;
  title: string;
  title_fr: string | null;
  description: string | null;
  description_fr: string | null;
  category: string;
  content_type: string;
  file_url: string | null;
  external_url: string | null;
  is_public: boolean;
  nations_applicable: string[];
  keywords: string[];
  created_at: string;
}

const CATEGORY_LABELS: Record<string, { label: string; description: string; color: string; bg: string }> = {
  cultural_protocol: {
    label: "Cultural Protocol",
    description: "Guidelines for respectful engagement with Indigenous communities",
    color: "text-purple-700",
    bg: "bg-purple-100",
  },
  trauma_informed: {
    label: "Trauma-Informed Practice",
    description: "Resources for trauma-informed approaches in case handling",
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
  language_support: {
    label: "Language Support",
    description: "Indigenous language resources and translation guides",
    color: "text-green-700",
    bg: "bg-green-100",
  },
  community_engagement: {
    label: "Community Engagement",
    description: "Best practices for working with Indigenous communities",
    color: "text-cyan-700",
    bg: "bg-cyan-100",
  },
  legal_framework: {
    label: "Legal Framework",
    description: "Legal resources and jurisdictional information",
    color: "text-gray-700",
    bg: "bg-gray-100",
  },
  mmiwg_specific: {
    label: "MMIWG-Specific",
    description: "Resources specific to MMIWG case handling",
    color: "text-red-700",
    bg: "bg-red-100",
  },
  investigation: {
    label: "Investigation Resources",
    description: "Investigation protocols and procedures",
    color: "text-amber-700",
    bg: "bg-amber-100",
  },
  family_support: {
    label: "Family Support",
    description: "Resources for supporting families of missing persons",
    color: "text-pink-700",
    bg: "bg-pink-100",
  },
  data_sovereignty: {
    label: "Data Sovereignty",
    description: "OCAP principles and data governance resources",
    color: "text-indigo-700",
    bg: "bg-indigo-100",
  },
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  document: "Document",
  video: "Video",
  audio: "Audio",
  website: "Website",
  guide: "Guide",
  training: "Training Material",
  template: "Template",
  checklist: "Checklist",
};

export default function ResourcesPage() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "";

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: initialCategory,
    contentType: "",
    search: "",
  });

  useEffect(() => {
    async function fetchResources() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.category) params.set("category", filters.category);
        if (filters.contentType) params.set("contentType", filters.contentType);
        if (filters.search) params.set("search", filters.search);

        const res = await fetch(`/api/indigenous/resources?${params}`);
        if (res.ok) {
          const data = await res.json();
          setResources(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching resources:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchResources();
  }, [filters]);

  // Group resources by category
  const resourcesByCategory = resources.reduce((acc, resource) => {
    const cat = resource.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(resource);
    return acc;
  }, {} as Record<string, Resource[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Cultural Sensitivity Resources
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Resources for trauma-informed, culturally sensitive case handling
        </p>
      </div>

      {/* OCAP Principles Banner */}
      <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-6">
        <h3 className="font-semibold text-indigo-900">OCAP Principles</h3>
        <p className="mt-1 text-sm text-indigo-700">
          All resources and data handling follow the OCAP principles: Ownership, Control, Access, and Possession.
          These principles ensure Indigenous data sovereignty and community rights over their information.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-white p-3">
            <p className="font-medium text-indigo-900">Ownership</p>
            <p className="text-xs text-indigo-700">Communities own their data collectively</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="font-medium text-indigo-900">Control</p>
            <p className="text-xs text-indigo-700">Communities control data collection and use</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="font-medium text-indigo-900">Access</p>
            <p className="text-xs text-indigo-700">Communities manage access to their data</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="font-medium text-indigo-900">Possession</p>
            <p className="text-xs text-indigo-700">Data is physically held by communities</p>
          </div>
        </div>
      </div>

      {/* Category Quick Links */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilters({ ...filters, category: "" })}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            !filters.category
              ? "bg-cyan-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          All Resources
        </button>
        {Object.entries(CATEGORY_LABELS).map(([value, { label, bg, color }]) => (
          <button
            key={value}
            onClick={() => setFilters({ ...filters, category: value })}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              filters.category === value
                ? "bg-cyan-600 text-white"
                : cn(bg, color, "hover:opacity-80")
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search resources..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Content Type</label>
            <select
              value={filters.contentType}
              onChange={(e) => setFilters({ ...filters, contentType: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resources */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : filters.category ? (
        // Show flat list when filtered
        resources.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-500">No resources found matching your criteria.</p>
          </div>
        )
      ) : (
        // Show grouped by category when no filter
        Object.entries(resourcesByCategory).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(resourcesByCategory).map(([category, categoryResources]) => {
              const categoryInfo = CATEGORY_LABELS[category] || {
                label: category,
                description: "",
                color: "text-gray-700",
                bg: "bg-gray-100",
              };
              return (
                <div key={category}>
                  <div className="mb-4 flex items-center gap-3">
                    <span className={cn("rounded-full px-3 py-1 text-sm font-medium", categoryInfo.bg, categoryInfo.color)}>
                      {categoryInfo.label}
                    </span>
                    <span className="text-sm text-gray-500">{categoryResources.length} resources</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {categoryResources.map((resource) => (
                      <ResourceCard key={resource.id} resource={resource} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-500">No resources available.</p>
          </div>
        )
      )}

      {/* Additional Help */}
      <div className="rounded-xl border-2 border-cyan-200 bg-cyan-50 p-6">
        <h3 className="font-semibold text-cyan-900">Need Additional Resources?</h3>
        <p className="mt-1 text-sm text-cyan-700">
          If you need specific cultural guidance or resources not available here, please contact your
          regional Indigenous liaison officer or the Indigenous Community Liaison Program coordinator.
        </p>
        <div className="mt-4 flex gap-3">
          <a
            href="/indigenous-liaison/contacts"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Contact Liaison Officers
          </a>
          <a
            href="/indigenous-liaison/organizations"
            className="rounded-lg border border-cyan-600 px-4 py-2 text-sm font-medium text-cyan-600 hover:bg-cyan-100"
          >
            Partner Organizations
          </a>
        </div>
      </div>
    </div>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const categoryInfo = CATEGORY_LABELS[resource.category] || {
    label: resource.category,
    color: "text-gray-700",
    bg: "bg-gray-100",
  };

  const getResourceLink = () => {
    if (resource.external_url) return resource.external_url;
    if (resource.file_url) return resource.file_url;
    return "#";
  };

  const isExternal = !!resource.external_url;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", categoryInfo.bg, categoryInfo.color)}>
              {categoryInfo.label}
            </span>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
              {CONTENT_TYPE_LABELS[resource.content_type] || resource.content_type}
            </span>
            {!resource.is_public && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                Internal Only
              </span>
            )}
          </div>
          <h3 className="mt-2 font-semibold text-gray-900">{resource.title}</h3>
          {resource.title_fr && (
            <p className="text-sm italic text-gray-500">{resource.title_fr}</p>
          )}
          {resource.description && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{resource.description}</p>
          )}
        </div>
        <ContentTypeIcon type={resource.content_type} />
      </div>

      {resource.nations_applicable && resource.nations_applicable.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {resource.nations_applicable.map((nation) => (
            <span key={nation} className="rounded bg-purple-50 px-1.5 py-0.5 text-xs text-purple-600">
              {nation}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <span className="text-xs text-gray-500">
          Added {new Date(resource.created_at).toLocaleDateString()}
        </span>
        <a
          href={getResourceLink()}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700"
        >
          {isExternal ? "View External" : "Access Resource"}
          {isExternal && <ExternalLinkIcon className="h-4 w-4" />}
        </a>
      </div>
    </div>
  );
}

function ContentTypeIcon({ type }: { type: string }) {
  const iconClass = "h-8 w-8 text-gray-400";

  switch (type) {
    case "video":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      );
    case "audio":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
        </svg>
      );
    case "website":
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      );
  }
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}
