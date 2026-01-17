"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Application {
  id: string;
  name: string;
  description?: string;
  website_url?: string;
  access_level: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  rate_limit_requests_per_minute: number;
  rate_limit_requests_per_day: number;
  quota_monthly: number;
}

interface ApiKey {
  id: string;
  key_prefix: string;
  name?: string;
  status: string;
  access_level: string;
  last_used_at?: string;
  usage_count: number;
  created_at: string;
}

interface Webhook {
  id: string;
  name: string;
  endpoint_url: string;
  events: string[];
  status: string;
  success_count: number;
  failure_count: number;
  last_triggered_at?: string;
}

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"keys" | "webhooks" | "oauth" | "usage">("keys");
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [showCreateWebhookModal, setShowCreateWebhookModal] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    fetchApplication();
    fetchApiKeys();
    fetchWebhooks();
  }, [id]);

  async function fetchApplication() {
    try {
      const response = await fetch(`/api/developer/applications/${id}`);
      const data = await response.json();
      if (data.success) {
        setApplication(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch application:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchApiKeys() {
    try {
      const response = await fetch(`/api/developer/keys?application_id=${id}`);
      const data = await response.json();
      if (data.success) {
        setApiKeys(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    }
  }

  async function fetchWebhooks() {
    try {
      const response = await fetch(`/api/developer/webhooks?application_id=${id}`);
      const data = await response.json();
      if (data.success) {
        setWebhooks(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch webhooks:", error);
    }
  }

  async function createApiKey(name: string) {
    try {
      const response = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: id, name }),
      });
      const data = await response.json();
      if (data.success) {
        setNewKey(data.data.key);
        fetchApiKeys();
      }
    } catch (error) {
      console.error("Failed to create API key:", error);
    }
  }

  async function revokeApiKey(keyId: string) {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/developer/keys/${keyId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchApiKeys();
      }
    } catch (error) {
      console.error("Failed to revoke API key:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Application not found</h2>
        <Link href="/developers" className="mt-4 text-cyan-600 hover:text-cyan-700">
          Back to Developer Portal
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/developers" className="hover:text-gray-700">Developer Portal</Link>
        <span>/</span>
        <span className="text-gray-900">{application.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{application.name}</h1>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                application.access_level === "public" && "bg-gray-100 text-gray-700",
                application.access_level === "partner" && "bg-blue-100 text-blue-700",
                application.access_level === "law_enforcement" && "bg-purple-100 text-purple-700"
              )}
            >
              {application.access_level.replace("_", " ")}
            </span>
            {application.is_verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                <CheckIcon className="h-3.5 w-3.5" />
                Verified
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">{application.description || "No description"}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Edit Application
          </button>
          {!application.is_verified && (
            <button className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700">
              Request Verification
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Rate Limit" value={`${application.rate_limit_requests_per_minute}/min`} />
        <StatCard label="Daily Limit" value={`${application.rate_limit_requests_per_day.toLocaleString()}/day`} />
        <StatCard label="Monthly Quota" value={application.quota_monthly.toLocaleString()} />
        <StatCard label="API Keys" value={apiKeys.filter(k => k.status === "active").length.toString()} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: "keys" as const, label: "API Keys" },
            { key: "webhooks" as const, label: "Webhooks" },
            { key: "oauth" as const, label: "OAuth" },
            { key: "usage" as const, label: "Usage" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "border-b-2 py-4 px-1 text-sm font-medium",
                activeTab === tab.key
                  ? "border-cyan-600 text-cyan-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "keys" && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
            <button
              onClick={() => setShowCreateKeyModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              <PlusIcon className="h-4 w-4" />
              Create Key
            </button>
          </div>

          {newKey && (
            <div className="mx-6 mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <div className="flex items-start gap-3">
                <ExclamationIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">Save your API key</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    This key will only be shown once. Make sure to copy it now.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <code className="flex-1 rounded bg-yellow-100 px-3 py-2 font-mono text-sm text-yellow-900">
                      {newKey}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newKey);
                      }}
                      className="rounded-lg bg-yellow-200 px-3 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-300"
                    >
                      Copy
                    </button>
                  </div>
                  <button
                    onClick={() => setNewKey(null)}
                    className="mt-2 text-sm text-yellow-600 hover:text-yellow-800"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {apiKeys.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <KeyIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-sm font-medium text-gray-900">No API keys</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create an API key to start making requests
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      key.status === "active" ? "bg-green-100" : "bg-gray-100"
                    )}>
                      <KeyIcon className={cn(
                        "h-5 w-5",
                        key.status === "active" ? "text-green-600" : "text-gray-400"
                      )} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {key.name || `Key ${key.key_prefix}...`}
                        </span>
                        <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          lc_***{key.key_prefix}
                        </code>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          key.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        )}>
                          {key.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Created {new Date(key.created_at).toLocaleDateString()} |
                        Used {key.usage_count.toLocaleString()} times
                        {key.last_used_at && ` | Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  {key.status === "active" && (
                    <button
                      onClick={() => revokeApiKey(key.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "webhooks" && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Webhooks</h2>
            <button
              onClick={() => setShowCreateWebhookModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              <PlusIcon className="h-4 w-4" />
              Create Webhook
            </button>
          </div>

          {webhooks.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <BoltIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-sm font-medium text-gray-900">No webhooks</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create a webhook to receive real-time notifications
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      webhook.status === "active" ? "bg-green-100" : "bg-gray-100"
                    )}>
                      <BoltIcon className={cn(
                        "h-5 w-5",
                        webhook.status === "active" ? "text-green-600" : "text-gray-400"
                      )} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{webhook.name}</span>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          webhook.status === "active" ? "bg-green-100 text-green-700" :
                          webhook.status === "failed" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-600"
                        )}>
                          {webhook.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{webhook.endpoint_url}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {webhook.events.slice(0, 3).map((event) => (
                          <span key={event} className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                            {event}
                          </span>
                        ))}
                        {webhook.events.length > 3 && (
                          <span className="text-xs text-gray-500">+{webhook.events.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {webhook.success_count} successful, {webhook.failure_count} failed
                    </p>
                    <Link
                      href={`/developers/applications/${id}/webhooks/${webhook.id}`}
                      className="text-sm text-cyan-600 hover:text-cyan-700"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "oauth" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">OAuth 2.0</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure OAuth 2.0 for your application to authenticate users
          </p>
          <div className="mt-6">
            <Link
              href={`/developers/applications/${id}/oauth`}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              Configure OAuth
            </Link>
          </div>
        </div>
      )}

      {activeTab === "usage" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Usage Analytics</h2>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your API usage and performance
          </p>
          <div className="mt-6">
            <Link
              href={`/developers/applications/${id}/usage`}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              View Analytics
            </Link>
          </div>
        </div>
      )}

      {/* Create Key Modal */}
      {showCreateKeyModal && (
        <CreateKeyModal
          onClose={() => setShowCreateKeyModal(false)}
          onCreated={(key) => {
            setNewKey(key);
            setShowCreateKeyModal(false);
            fetchApiKeys();
          }}
          applicationId={id}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function CreateKeyModal({
  onClose,
  onCreated,
  applicationId,
}: {
  onClose: () => void;
  onCreated: (key: string) => void;
  applicationId: string;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId, name: name || undefined }),
      });
      const data = await response.json();
      if (data.success) {
        onCreated(data.data.key);
      }
    } catch (error) {
      console.error("Failed to create key:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Create API Key</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="keyName" className="block text-sm font-medium text-gray-700">
              Key Name (optional)
            </label>
            <input
              type="text"
              id="keyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="Production key"
            />
          </div>
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
              {loading ? "Creating..." : "Create Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
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

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  );
}
