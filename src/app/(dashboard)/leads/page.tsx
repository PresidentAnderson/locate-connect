"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Lead, LeadStatus, LeadPriority, LeadSource } from "@/types/lead.types";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<LeadPriority | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, priorityFilter, search, page]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", "20");
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchLeads();
      }
    } catch (error) {
      console.error("Error updating lead:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage investigative leads
          </p>
        </div>
        <Link
          href="/leads/new"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Add Lead
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="investigating">Investigating</option>
          <option value="verified">Verified</option>
          <option value="dismissed">Dismissed</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as LeadPriority | "all")}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total Leads" value={leads.length} />
        <StatCard label="New" value={leads.filter(l => l.status === "new").length} color="blue" />
        <StatCard label="Investigating" value={leads.filter(l => l.status === "investigating").length} color="yellow" />
        <StatCard label="Verified" value={leads.filter(l => l.status === "verified").length} color="green" />
        <StatCard label="Dismissed" value={leads.filter(l => l.status === "dismissed").length} color="gray" />
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <LeadIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No leads found</h3>
          <p className="mt-2 text-sm text-gray-500">
            Leads will appear here when they are submitted
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Case
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium text-gray-900 hover:text-cyan-600"
                      >
                        {lead.title}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                        {lead.description}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {lead.caseNumber || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <SourceBadge source={lead.source} />
                  </td>
                  <td className="px-6 py-4">
                    <PriorityBadge priority={lead.priority} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {lead.assignedToName || "Unassigned"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {lead.status === "new" && (
                        <button
                          onClick={() => updateLeadStatus(lead.id, "investigating")}
                          className="text-xs text-cyan-600 hover:underline"
                        >
                          Investigate
                        </button>
                      )}
                      {lead.status === "investigating" && (
                        <>
                          <button
                            onClick={() => updateLeadStatus(lead.id, "verified")}
                            className="text-xs text-green-600 hover:underline"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => updateLeadStatus(lead.id, "dismissed")}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    green: "bg-green-50 text-green-700",
    gray: "bg-gray-50 text-gray-700",
  };

  return (
    <div className={cn("rounded-lg p-4", color ? colorClasses[color] : "bg-white border border-gray-200")}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const config: Record<LeadStatus, { bg: string; text: string; label: string }> = {
    new: { bg: "bg-blue-100", text: "text-blue-700", label: "New" },
    investigating: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Investigating" },
    verified: { bg: "bg-green-100", text: "text-green-700", label: "Verified" },
    dismissed: { bg: "bg-red-100", text: "text-red-700", label: "Dismissed" },
    archived: { bg: "bg-gray-100", text: "text-gray-700", label: "Archived" },
  };

  const c = config[status];
  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", c.bg, c.text)}>
      {c.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: LeadPriority }) {
  const config: Record<LeadPriority, { bg: string; text: string; label: string }> = {
    critical: { bg: "bg-red-100", text: "text-red-700", label: "Critical" },
    high: { bg: "bg-orange-100", text: "text-orange-700", label: "High" },
    medium: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Medium" },
    low: { bg: "bg-gray-100", text: "text-gray-700", label: "Low" },
  };

  const c = config[priority];
  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", c.bg, c.text)}>
      {c.label}
    </span>
  );
}

function SourceBadge({ source }: { source: LeadSource }) {
  const labels: Record<LeadSource, string> = {
    social_media: "Social Media",
    email_opened: "Email",
    location: "Location",
    witness: "Witness",
    hospital: "Hospital",
    detention: "Detention",
    tip: "Tip",
    surveillance: "Surveillance",
    other: "Other",
  };

  return (
    <span className="inline-flex rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
      {labels[source] || source}
    </span>
  );
}

function LeadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}
