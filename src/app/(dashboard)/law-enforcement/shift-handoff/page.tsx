"use client";

/**
 * LE Shift Handoff Reports (Issue #101)
 * Automated shift handoff documentation for law enforcement
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib";

export const dynamic = "force-dynamic";

interface ShiftReport {
  id: string;
  shiftDate: string;
  shiftType: "day" | "evening" | "night";
  generatedAt: string;
  generatedBy: string;
  signedOffBy?: string;
  signedOffAt?: string;
  criticalCases: number;
  newCases: number;
  pendingActions: number;
  status: "draft" | "pending_signoff" | "signed_off" | "archived";
}

interface ShiftSummary {
  criticalCases: Array<{
    id: string;
    caseNumber: string;
    name: string;
    priority: string;
    status: string;
    lastUpdate: string;
  }>;
  newCases: Array<{
    id: string;
    caseNumber: string;
    name: string;
    reportedAt: string;
  }>;
  newLeads: Array<{
    id: string;
    caseNumber: string;
    title: string;
    source: string;
    createdAt: string;
  }>;
  pendingActions: Array<{
    id: string;
    description: string;
    caseNumber?: string;
    dueBy?: string;
    assignedTo?: string;
  }>;
  officerAssignments: Array<{
    officerName: string;
    activeCases: number;
    zone?: string;
  }>;
}

export default function ShiftHandoffPage() {
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [currentSummary, setCurrentSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [summaryRes, reportsRes] = await Promise.all([
        fetch("/api/law-enforcement/shift-handoff/summary"),
        fetch("/api/law-enforcement/shift-handoff/reports"),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setCurrentSummary(data);
      }

      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error("Error loading shift handoff data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    setGenerating(true);
    try {
      const response = await fetch("/api/law-enforcement/shift-handoff/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        await loadData();
        setNotes("");
      }
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setGenerating(false);
    }
  }

  const getCurrentShift = (): string => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return "Day Shift (06:00 - 14:00)";
    if (hour >= 14 && hour < 22) return "Evening Shift (14:00 - 22:00)";
    return "Night Shift (22:00 - 06:00)";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="rounded-xl border border-gray-200 bg-white p-6 h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <nav className="text-sm text-gray-500 mb-2">
            <Link href="/law-enforcement" className="hover:text-cyan-600">
              Law Enforcement
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">Shift Handoff</span>
          </nav>
          <h1 className="text-2xl font-semibold text-gray-900">Shift Handoff Reports</h1>
          <p className="text-sm text-gray-500 mt-1">{getCurrentShift()}</p>
        </div>
        <button
          onClick={generateReport}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
        >
          {generating ? (
            <>
              <LoadingIcon className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <DocumentIcon className="h-4 w-4" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 -mb-px">
          <button
            onClick={() => setActiveTab("current")}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "current"
                ? "border-cyan-600 text-cyan-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            Current Shift Summary
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "history"
                ? "border-cyan-600 text-cyan-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            Report History ({reports.length})
          </button>
        </nav>
      </div>

      {activeTab === "current" && currentSummary && (
        <div className="space-y-6">
          {/* Critical Cases */}
          <div className="rounded-xl border border-red-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertIcon className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Critical Cases ({currentSummary.criticalCases.length})
              </h2>
            </div>
            {currentSummary.criticalCases.length === 0 ? (
              <p className="text-sm text-gray-500">No critical cases requiring attention.</p>
            ) : (
              <div className="space-y-3">
                {currentSummary.criticalCases.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-red-50"
                  >
                    <div>
                      <Link
                        href={`/cases/${c.id}`}
                        className="font-medium text-gray-900 hover:text-cyan-600"
                      >
                        {c.caseNumber}: {c.name}
                      </Link>
                      <p className="text-xs text-gray-500">Last update: {c.lastUpdate}</p>
                    </div>
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      {c.priority.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Cases */}
          <div className="rounded-xl border border-blue-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <PlusIcon className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                New Cases This Shift ({currentSummary.newCases.length})
              </h2>
            </div>
            {currentSummary.newCases.length === 0 ? (
              <p className="text-sm text-gray-500">No new cases reported this shift.</p>
            ) : (
              <div className="space-y-2">
                {currentSummary.newCases.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                    <Link href={`/cases/${c.id}`} className="font-medium text-gray-900 hover:text-cyan-600">
                      {c.caseNumber}: {c.name}
                    </Link>
                    <span className="text-xs text-gray-500">{c.reportedAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Leads */}
          <div className="rounded-xl border border-green-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <TargetIcon className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                New Leads ({currentSummary.newLeads.length})
              </h2>
            </div>
            {currentSummary.newLeads.length === 0 ? (
              <p className="text-sm text-gray-500">No new leads this shift.</p>
            ) : (
              <div className="space-y-2">
                {currentSummary.newLeads.map((lead) => (
                  <div key={lead.id} className="p-3 rounded-lg bg-green-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{lead.title}</span>
                      <span className="text-xs text-gray-500">{lead.caseNumber}</span>
                    </div>
                    <p className="text-xs text-gray-500">Source: {lead.source}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Actions */}
          <div className="rounded-xl border border-amber-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <ClockIcon className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Actions ({currentSummary.pendingActions.length})
              </h2>
            </div>
            {currentSummary.pendingActions.length === 0 ? (
              <p className="text-sm text-gray-500">No pending actions.</p>
            ) : (
              <div className="space-y-2">
                {currentSummary.pendingActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50">
                    <div>
                      <p className="font-medium text-gray-900">{action.description}</p>
                      {action.caseNumber && (
                        <p className="text-xs text-gray-500">Case: {action.caseNumber}</p>
                      )}
                    </div>
                    {action.dueBy && (
                      <span className="text-xs text-amber-700">Due: {action.dueBy}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shift Notes */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Shift Commander Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes for the incoming shift..."
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              rows={4}
            />
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="rounded-xl border border-gray-200 bg-white">
          {reports.length === 0 ? (
            <div className="p-6 text-center">
              <DocumentIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No shift reports generated yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {reports.map((report) => (
                <div key={report.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {new Date(report.shiftDate).toLocaleDateString()} - {report.shiftType} shift
                      </h3>
                      <p className="text-sm text-gray-500">
                        Generated by {report.generatedBy} at {new Date(report.generatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          report.status === "signed_off"
                            ? "bg-green-100 text-green-700"
                            : report.status === "pending_signoff"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-100 text-gray-700"
                        )}
                      >
                        {report.status.replace(/_/g, " ")}
                      </span>
                      <button className="text-sm text-cyan-600 hover:text-cyan-700">View</button>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span>Critical: {report.criticalCases}</span>
                    <span>New: {report.newCases}</span>
                    <span>Pending: {report.pendingActions}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Icons
function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function LoadingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
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

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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
