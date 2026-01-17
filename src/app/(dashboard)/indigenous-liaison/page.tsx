"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib";

interface Organization {
  id: string;
  name: string;
  acronym: string | null;
  org_type: string;
  toll_free_phone: string | null;
  website: string | null;
}

interface Resource {
  id: string;
  title: string;
  category: string;
  is_public: boolean;
}

interface MMIWGStats {
  totalCases: number;
  activeCases: number;
  resolvedCases: number;
  historicalCases: number;
  consultationsCompleted: number;
  consultationsPending: number;
}

export default function IndigenousLiaisonDashboard() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [stats, setStats] = useState<MMIWGStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [orgsRes, resourcesRes] = await Promise.all([
          fetch("/api/indigenous/organizations?scope=national&limit=6"),
          fetch("/api/indigenous/resources?public=true&limit=5"),
        ]);

        if (orgsRes.ok) {
          const orgsData = await orgsRes.json();
          setOrganizations(orgsData.data || []);
        }

        if (resourcesRes.ok) {
          const resourcesData = await resourcesRes.json();
          setResources(resourcesData.data || []);
        }

        // Try to fetch MMIWG stats (will fail for non-LE users)
        const statsRes = await fetch("/api/indigenous/mmiwg/statistics");
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Indigenous Community Liaison Program
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Specialized support for Indigenous communities and MMIWG cases
          </p>
        </div>
      </div>

      {/* Quick Stats (Law Enforcement Only) */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active MMIWG Cases"
            value={stats.activeCases}
            color="red"
          />
          <StatCard
            label="Historical Cases"
            value={stats.historicalCases}
            color="yellow"
          />
          <StatCard
            label="Consultations Pending"
            value={stats.consultationsPending}
            color="blue"
          />
          <StatCard
            label="Consultations Completed"
            value={stats.consultationsCompleted}
            color="green"
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Partner Organizations */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Partner Organizations
            </h2>
            <Link
              href="/indigenous-liaison/organizations"
              className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              View All
            </Link>
          </div>

          {loading ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : organizations.length > 0 ? (
            <div className="mt-4 space-y-3">
              {organizations.map((org) => (
                <OrganizationCard key={org.id} organization={org} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">No organizations found.</p>
          )}
        </div>

        {/* Cultural Resources */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Cultural Sensitivity Resources
            </h2>
            <Link
              href="/indigenous-liaison/resources"
              className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              View All
            </Link>
          </div>

          {loading ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : resources.length > 0 ? (
            <div className="mt-4 space-y-2">
              {resources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">No resources found.</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            icon={<CommunityIcon className="h-6 w-6" />}
            title="Find Community"
            description="Search Indigenous communities"
            href="/indigenous-liaison/communities"
          />
          <QuickActionCard
            icon={<LiaisonIcon className="h-6 w-6" />}
            title="Contact Liaison"
            description="Find liaison officers"
            href="/indigenous-liaison/contacts"
          />
          <QuickActionCard
            icon={<ConsultationIcon className="h-6 w-6" />}
            title="Schedule Consultation"
            description="Arrange community meeting"
            href="/indigenous-liaison/consultations"
          />
          <QuickActionCard
            icon={<TerritoryIcon className="h-6 w-6" />}
            title="Territory Map"
            description="View traditional territories"
            href="/indigenous-liaison/territories"
          />
        </div>
      </div>

      {/* OCAP Principles Reminder */}
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
            <InfoIcon className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900">
              Indigenous Data Sovereignty - OCAP Principles
            </h3>
            <p className="mt-1 text-sm text-amber-800">
              When working with Indigenous case data, always adhere to OCAP principles:
              <strong> Ownership, Control, Access, and Possession</strong>. Ensure informed
              consent is obtained, minimize data collection, and respect community decisions
              regarding data sharing and withdrawal of consent.
            </p>
            <Link
              href="/indigenous-liaison/resources?category=protocol"
              className="mt-2 inline-block text-sm font-medium text-amber-700 hover:text-amber-800"
            >
              Learn more about OCAP principles
            </Link>
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          National Emergency Resources
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <EmergencyContact
            name="NWAC Crisis Line"
            description="Native Women's Association of Canada"
            phone="1-800-461-4043"
          />
          <EmergencyContact
            name="Assembly of First Nations"
            description="National advocacy organization"
            phone="1-866-869-6789"
          />
          <EmergencyContact
            name="Inuit Tapiriit Kanatami"
            description="National Inuit organization"
            phone="1-855-489-1680"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "red" | "yellow" | "blue" | "green";
}) {
  const colorStyles = {
    red: "text-red-600",
    yellow: "text-yellow-600",
    blue: "text-cyan-600",
    green: "text-green-600",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={cn("mt-1 text-3xl font-bold", colorStyles[color])}>
        {value}
      </p>
    </div>
  );
}

function OrganizationCard({ organization }: { organization: Organization }) {
  const typeLabels: Record<string, string> = {
    national_organization: "National",
    womens_organization: "Women's Organization",
    inuit_organization: "Inuit Organization",
    metis_organization: "Metis Organization",
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-gray-900">
            {organization.acronym
              ? `${organization.acronym} - ${organization.name}`
              : organization.name}
          </h3>
          <p className="text-sm text-gray-500">
            {typeLabels[organization.org_type] || organization.org_type}
          </p>
        </div>
        {organization.toll_free_phone && (
          <a
            href={`tel:${organization.toll_free_phone}`}
            className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
          >
            {organization.toll_free_phone}
          </a>
        )}
      </div>
    </div>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const categoryLabels: Record<string, string> = {
    protocol: "Protocol",
    investigation: "Investigation",
    communication: "Communication",
    ceremony: "Ceremony",
    family_support: "Family Support",
  };

  return (
    <Link
      href={`/indigenous-liaison/resources/${resource.id}`}
      className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
    >
      <span className="font-medium text-gray-900">{resource.title}</span>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
        {categoryLabels[resource.category] || resource.category}
      </span>
    </Link>
  );
}

function QuickActionCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:border-cyan-200 hover:bg-cyan-50"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

function EmergencyContact({
  name,
  description,
  phone,
}: {
  name: string;
  description: string;
  phone: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="font-medium text-gray-900">{name}</h3>
      <p className="text-sm text-gray-500">{description}</p>
      <a
        href={`tel:${phone}`}
        className="mt-2 inline-block text-lg font-semibold text-cyan-600 hover:text-cyan-700"
      >
        {phone}
      </a>
    </div>
  );
}

// Icon Components
function CommunityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  );
}

function LiaisonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function ConsultationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function TerritoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  );
}
