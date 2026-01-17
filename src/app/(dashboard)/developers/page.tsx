"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Application {
  id: string;
  name: string;
  description?: string;
  access_level: string;
  is_verified: boolean;
  created_at: string;
  rate_limit_requests_per_minute: number;
  quota_monthly: number;
}

interface UsageStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
}

export default function DeveloperPortalPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    try {
      const response = await fetch("/api/developer/applications");
      const data = await response.json();
      if (data.success) {
        setApplications(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developer Portal</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your API applications, keys, and webhooks
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Create Application
        </button>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLinkCard
          title="API Documentation"
          description="View complete API reference"
          href="/developers/docs"
          icon={<DocumentIcon className="h-6 w-6" />}
        />
        <QuickLinkCard
          title="API Explorer"
          description="Test API endpoints interactively"
          href="/developers/explorer"
          icon={<CodeBracketIcon className="h-6 w-6" />}
        />
        <QuickLinkCard
          title="Code Examples"
          description="Sample code and tutorials"
          href="/developers/examples"
          icon={<CommandLineIcon className="h-6 w-6" />}
        />
        <QuickLinkCard
          title="Support"
          description="Get help with the API"
          href="/developers/support"
          icon={<ChatBubbleIcon className="h-6 w-6" />}
        />
      </div>

      {/* Applications List */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Applications</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <CubeIcon className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">No applications yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first application to get started with the API
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              <PlusIcon className="h-4 w-4" />
              Create Application
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {applications.map((app) => (
              <ApplicationRow key={app.id} application={app} />
            ))}
          </div>
        )}
      </div>

      {/* API Access Levels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AccessLevelCard
          level="Public"
          description="Basic access for general developers"
          features={[
            "Read public case information",
            "Submit tips anonymously",
            "View active alerts",
            "Basic statistics",
          ]}
          limits="60 requests/min, 10K/day"
          isAvailable
        />
        <AccessLevelCard
          level="Partner"
          description="For verified partner organizations"
          features={[
            "All public features",
            "Detailed case information",
            "Read leads (anonymized)",
            "Detailed statistics",
            "Priority support",
          ]}
          limits="120 requests/min, 50K/day"
          requiresVerification
        />
        <AccessLevelCard
          level="Law Enforcement"
          description="Full access for verified LE agencies"
          features={[
            "All partner features",
            "Create and update cases",
            "Full lead access",
            "Tip management",
            "Real-time webhooks",
          ]}
          limits="300 requests/min, unlimited"
          requiresVerification
        />
      </div>

      {/* Create Application Modal */}
      {showCreateModal && (
        <CreateApplicationModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchApplications();
          }}
        />
      )}
    </div>
  );
}

function QuickLinkCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-cyan-300 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

function ApplicationRow({ application }: { application: Application }) {
  return (
    <Link
      href={`/developers/applications/${application.id}`}
      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
          <CubeIcon className="h-5 w-5 text-gray-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{application.name}</span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                application.access_level === "public" && "bg-gray-100 text-gray-700",
                application.access_level === "partner" && "bg-blue-100 text-blue-700",
                application.access_level === "law_enforcement" && "bg-purple-100 text-purple-700"
              )}
            >
              {application.access_level.replace("_", " ")}
            </span>
            {application.is_verified && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <CheckBadgeIcon className="h-4 w-4" />
                Verified
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{application.description || "No description"}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-xs text-gray-500">Rate Limit</p>
          <p className="text-sm font-medium text-gray-900">
            {application.rate_limit_requests_per_minute}/min
          </p>
        </div>
        <ChevronRightIcon className="h-5 w-5 text-gray-400" />
      </div>
    </Link>
  );
}

function AccessLevelCard({
  level,
  description,
  features,
  limits,
  isAvailable,
  requiresVerification,
}: {
  level: string;
  description: string;
  features: string[];
  limits: string;
  isAvailable?: boolean;
  requiresVerification?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{level}</h3>
        {isAvailable && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Available
          </span>
        )}
        {requiresVerification && (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
            Requires Verification
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
      <ul className="mt-4 space-y-2">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <CheckIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500">Limits: {limits}</p>
      </div>
    </div>
  );
}

function CreateApplicationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/developer/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          website_url: websiteUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || "Failed to create application");
        return;
      }

      onCreated();
    } catch (err) {
      setError("Failed to create application");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create Application</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Application Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="My Awesome App"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="What does your application do?"
            />
          </div>

          <div>
            <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">
              Website URL
            </label>
            <input
              type="url"
              id="websiteUrl"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="https://example.com"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Icon components
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function CodeBracketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  );
}

function CommandLineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  );
}

function CubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function CheckBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
