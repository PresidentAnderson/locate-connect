"use client";

/**
 * Community Awareness Campaigns (Issue #97)
 * Tools for creating and managing awareness campaigns
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib";

export const dynamic = "force-dynamic";

type CampaignType = "social_media" | "poster" | "press" | "search" | "vigil" | "other";
type CampaignStatus = "draft" | "active" | "paused" | "completed";

interface Campaign {
  id: string;
  caseId: string;
  caseName: string;
  caseNumber: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  startDate: string;
  endDate?: string;
  reach: number;
  engagement: number;
  tipsGenerated: number;
  createdAt: string;
}

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalReach: number;
  totalTips: number;
}

const campaignTypeLabels: Record<CampaignType, { label: string; icon: React.ReactNode; color: string }> = {
  social_media: { label: "Social Media", icon: <ShareIcon className="h-4 w-4" />, color: "bg-blue-100 text-blue-700" },
  poster: { label: "Poster Campaign", icon: <DocumentIcon className="h-4 w-4" />, color: "bg-amber-100 text-amber-700" },
  press: { label: "Press Release", icon: <MegaphoneIcon className="h-4 w-4" />, color: "bg-purple-100 text-purple-700" },
  search: { label: "Community Search", icon: <UsersIcon className="h-4 w-4" />, color: "bg-green-100 text-green-700" },
  vigil: { label: "Vigil/Event", icon: <HeartIcon className="h-4 w-4" />, color: "bg-pink-100 text-pink-700" },
  other: { label: "Other", icon: <StarIcon className="h-4 w-4" />, color: "bg-gray-100 text-gray-700" },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | "all">("all");

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      const response = await fetch("/api/community/campaigns");
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error("Error loading campaigns:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCampaigns = filterStatus === "all"
    ? campaigns
    : campaigns.filter((c) => c.status === filterStatus);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <Link href="/community" className="hover:text-cyan-600">Community</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">Campaigns</span>
          </nav>
          <h1 className="text-2xl font-semibold text-gray-900">Awareness Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage community awareness campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          <PlusIcon className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Campaigns" value={stats.totalCampaigns} icon={<FolderIcon className="h-5 w-5" />} />
          <StatCard label="Active Now" value={stats.activeCampaigns} icon={<PlayIcon className="h-5 w-5" />} color="green" />
          <StatCard label="Total Reach" value={formatNumber(stats.totalReach)} icon={<EyeIcon className="h-5 w-5" />} color="blue" />
          <StatCard label="Tips Generated" value={stats.totalTips} icon={<LightbulbIcon className="h-5 w-5" />} color="amber" />
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Status:</span>
        {(["all", "active", "draft", "paused", "completed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={cn(
              "px-3 py-1 rounded-full text-sm font-medium transition-colors",
              filterStatus === status
                ? "bg-cyan-100 text-cyan-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Campaign List */}
      {filteredCampaigns.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <MegaphoneIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No campaigns found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {filterStatus === "all"
              ? "Create your first awareness campaign to get started."
              : `No ${filterStatus} campaigns.`}
          </p>
          {filterStatus === "all" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              <PlusIcon className="h-4 w-4" />
              Create Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateCampaignModal onClose={() => setShowCreateModal(false)} onCreated={loadCampaigns} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color = "gray",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "gray" | "green" | "blue" | "amber";
}) {
  const colorClasses = {
    gray: "bg-gray-100 text-gray-600",
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>{icon}</div>
        <div>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const typeConfig = campaignTypeLabels[campaign.type];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 hover:border-cyan-200 transition-colors">
      <div className="flex items-start justify-between">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", typeConfig.color)}>
          {typeConfig.icon}
          {typeConfig.label}
        </span>
        <StatusBadge status={campaign.status} />
      </div>

      <h3 className="mt-3 font-semibold text-gray-900">{campaign.name}</h3>
      <p className="text-sm text-gray-500">
        Case: {campaign.caseNumber} - {campaign.caseName}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-semibold text-gray-900">{formatNumber(campaign.reach)}</p>
          <p className="text-xs text-gray-500">Reach</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{formatNumber(campaign.engagement)}</p>
          <p className="text-xs text-gray-500">Engagement</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{campaign.tipsGenerated}</p>
          <p className="text-xs text-gray-500">Tips</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Started {new Date(campaign.startDate).toLocaleDateString()}
        </span>
        <Link
          href={`/community/campaigns/${campaign.id}`}
          className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const config: Record<CampaignStatus, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
    active: { label: "Active", className: "bg-green-100 text-green-700" },
    paused: { label: "Paused", className: "bg-amber-100 text-amber-700" },
    completed: { label: "Completed", className: "bg-blue-100 text-blue-700" },
  };

  const { label, className } = config[status];
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>{label}</span>;
}

function CreateCampaignModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CampaignType>("social_media");
  const [caseNumber, setCaseNumber] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name || !caseNumber) return;
    setCreating(true);

    try {
      const response = await fetch("/api/community/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, caseNumber }),
      });

      if (response.ok) {
        onCreated();
        onClose();
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900">Create Campaign</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Social Media Blitz for John Doe"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Case Number</label>
            <input
              type="text"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="e.g., LC-2024-001"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Campaign Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CampaignType)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {Object.entries(campaignTypeLabels).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name || !caseNumber || creating}
            className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// Icons
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}
