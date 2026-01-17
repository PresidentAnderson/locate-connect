"use client";

import { useState, ReactNode } from "react";

export interface CaseOutcomeData {
  // Case Summary
  caseId: string;
  caseNumber: string;
  subjectName: string;
  subjectAge: number;
  reportedDate: string;
  resolvedDate: string;
  totalDurationHours: number;
  disposition: string;
  dispositionLabel: string;

  // Resolution Details
  resolution: {
    location: string;
    city: string;
    province: string;
    howFound: string;
    whoFound: string;
    conditionAtResolution: string;
    notes?: string;
  };

  // Lead Analysis
  leadAnalysis: {
    totalLeads: number;
    verifiedLeads: number;
    dismissedLeads: number;
    solvingLeadId?: string;
    solvingLeadSource?: string;
    falsePositiveRate: number;
    avgLeadResponseHours: number;
  };

  // Tip Analysis
  tipAnalysis: {
    totalTips: number;
    verifiedTips: number;
    hoaxTips: number;
    duplicateTips: number;
    tipsConvertedToLeads: number;
  };

  // Timeline
  timeline: {
    timestamp: string;
    event: string;
    type: "report" | "update" | "lead" | "tip" | "action" | "resolution";
    actor?: string;
    details?: string;
  }[];

  // Resource Utilization
  resources: {
    totalAssignedOfficers: number;
    totalVolunteers: number;
    partnerOrganizations: string[];
    mediaOutlets: number;
    socialMediaReach: number;
    estimatedCost?: number;
  };

  // Recommendations
  recommendations: {
    id: string;
    category: "process" | "resource" | "communication" | "technology";
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
  }[];

  // Similar Cases
  similarCases?: {
    caseId: string;
    caseNumber: string;
    similarity: number;
    resolution: string;
    durationHours: number;
  }[];
}

interface CaseOutcomeReportProps {
  data: CaseOutcomeData;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
}

export function CaseOutcomeReport({
  data,
  onExportPDF,
  onExportExcel,
}: CaseOutcomeReportProps) {
  const [activeSection, setActiveSection] = useState<string>("summary");

  const sections = [
    { id: "summary", label: "Case Summary" },
    { id: "resolution", label: "Resolution Details" },
    { id: "leads", label: "Lead Analysis" },
    { id: "timeline", label: "Timeline" },
    { id: "resources", label: "Resources" },
    { id: "recommendations", label: "Recommendations" },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Case Outcome Report
            </h2>
            <p className="text-sm text-gray-600">
              {data.caseNumber} - {data.subjectName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onExportPDF && (
              <button
                onClick={onExportPDF}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <PDFIcon />
                  Export PDF
                </span>
              </button>
            )}
            {onExportExcel && (
              <button
                onClick={onExportExcel}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <ExcelIcon />
                  Export Excel
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex -mb-px px-6">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? "border-cyan-500 text-cyan-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeSection === "summary" && (
          <div className="space-y-6">
            {/* Outcome Banner */}
            <div
              className={`p-4 rounded-lg ${getDispositionStyle(data.disposition)}`}
            >
              <div className="flex items-center gap-3">
                {getDispositionIcon(data.disposition)}
                <div>
                  <div className="font-semibold text-lg">
                    {data.dispositionLabel}
                  </div>
                  <div className="text-sm opacity-80">
                    Resolved on {formatDate(data.resolvedDate)}
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Total Duration"
                value={formatDuration(data.totalDurationHours)}
                icon={<ClockIcon />}
              />
              <MetricCard
                label="Total Leads"
                value={data.leadAnalysis.totalLeads.toString()}
                subvalue={`${data.leadAnalysis.verifiedLeads} verified`}
                icon={<LeadIcon />}
              />
              <MetricCard
                label="Total Tips"
                value={data.tipAnalysis.totalTips.toString()}
                subvalue={`${data.tipAnalysis.verifiedTips} verified`}
                icon={<TipIcon />}
              />
              <MetricCard
                label="Team Size"
                value={data.resources.totalAssignedOfficers.toString()}
                subvalue="officers assigned"
                icon={<TeamIcon />}
              />
            </div>

            {/* Case Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Case Details</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Subject</dt>
                    <dd className="font-medium">{data.subjectName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Age at Disappearance</dt>
                    <dd className="font-medium">{data.subjectAge} years</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Reported Date</dt>
                    <dd className="font-medium">{formatDate(data.reportedDate)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Resolved Date</dt>
                    <dd className="font-medium">{formatDate(data.resolvedDate)}</dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Resolution Summary</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Location Found</dt>
                    <dd className="font-medium">
                      {data.resolution.city}, {data.resolution.province}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Found By</dt>
                    <dd className="font-medium">{data.resolution.whoFound}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">How Found</dt>
                    <dd className="font-medium">{data.resolution.howFound}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Condition</dt>
                    <dd className="font-medium">{data.resolution.conditionAtResolution}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {activeSection === "resolution" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900">Resolution Details</h3>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Location Found
                  </h4>
                  <p className="text-gray-900">{data.resolution.location}</p>
                  <p className="text-sm text-gray-600">
                    {data.resolution.city}, {data.resolution.province}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Discovery Method
                  </h4>
                  <p className="text-gray-900">{data.resolution.howFound}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Found By
                  </h4>
                  <p className="text-gray-900">{data.resolution.whoFound}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Condition at Resolution
                  </h4>
                  <p className="text-gray-900">
                    {data.resolution.conditionAtResolution}
                  </p>
                </div>
              </div>

              {data.resolution.notes && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Additional Notes
                  </h4>
                  <p className="text-gray-900">{data.resolution.notes}</p>
                </div>
              )}
            </div>

            {/* Solving Lead */}
            {data.leadAnalysis.solvingLeadId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">
                  Lead That Solved the Case
                </h4>
                <p className="text-sm text-green-700">
                  Source: {data.leadAnalysis.solvingLeadSource || "Unknown"}
                </p>
              </div>
            )}
          </div>
        )}

        {activeSection === "leads" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900">Lead Analysis</h3>

            {/* Lead Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {data.leadAnalysis.totalLeads}
                </div>
                <div className="text-sm text-gray-500">Total Leads</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">
                  {data.leadAnalysis.verifiedLeads}
                </div>
                <div className="text-sm text-green-600">Verified</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-700">
                  {data.leadAnalysis.dismissedLeads}
                </div>
                <div className="text-sm text-red-600">Dismissed</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-700">
                  {data.leadAnalysis.falsePositiveRate}%
                </div>
                <div className="text-sm text-amber-600">False Positive Rate</div>
              </div>
            </div>

            {/* Lead Effectiveness */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4">
                Lead Effectiveness
              </h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Verification Rate</span>
                    <span className="font-medium">
                      {Math.round(
                        (data.leadAnalysis.verifiedLeads /
                          data.leadAnalysis.totalLeads) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: `${
                          (data.leadAnalysis.verifiedLeads /
                            data.leadAnalysis.totalLeads) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Average Response Time</span>
                  <span className="font-medium">
                    {data.leadAnalysis.avgLeadResponseHours} hours
                  </span>
                </div>
              </div>
            </div>

            {/* Tip Analysis */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Tip Analysis</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold">{data.tipAnalysis.totalTips}</div>
                  <div className="text-xs text-gray-500">Total Tips</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-700">
                    {data.tipAnalysis.verifiedTips}
                  </div>
                  <div className="text-xs text-green-600">Verified</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-xl font-bold text-red-700">
                    {data.tipAnalysis.hoaxTips}
                  </div>
                  <div className="text-xs text-red-600">Hoax</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-xl font-bold">{data.tipAnalysis.duplicateTips}</div>
                  <div className="text-xs text-gray-500">Duplicates</div>
                </div>
                <div className="text-center p-3 bg-cyan-50 rounded-lg">
                  <div className="text-xl font-bold text-cyan-700">
                    {data.tipAnalysis.tipsConvertedToLeads}
                  </div>
                  <div className="text-xs text-cyan-600">Converted to Leads</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "timeline" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900">Case Timeline</h3>

            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {data.timeline.map((event, index) => (
                  <div key={index} className="relative pl-10">
                    <div
                      className={`absolute left-2 w-4 h-4 rounded-full border-2 border-white ${getTimelineEventColor(
                        event.type
                      )}`}
                    />
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">
                          {event.event}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(event.timestamp)}
                        </span>
                      </div>
                      {event.details && (
                        <p className="text-sm text-gray-600">{event.details}</p>
                      )}
                      {event.actor && (
                        <p className="text-xs text-gray-500 mt-1">
                          By: {event.actor}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === "resources" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900">Resource Utilization</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {data.resources.totalAssignedOfficers}
                </div>
                <div className="text-sm text-gray-500">Officers Assigned</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {data.resources.totalVolunteers}
                </div>
                <div className="text-sm text-gray-500">Volunteers</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {data.resources.mediaOutlets}
                </div>
                <div className="text-sm text-gray-500">Media Outlets</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatNumber(data.resources.socialMediaReach)}
                </div>
                <div className="text-sm text-gray-500">Social Reach</div>
              </div>
            </div>

            {data.resources.partnerOrganizations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Partner Organizations
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.resources.partnerOrganizations.map((org, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {org}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.resources.estimatedCost && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-800">Estimated Cost</h4>
                <p className="text-2xl font-bold text-amber-900">
                  ${data.resources.estimatedCost.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}

        {activeSection === "recommendations" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900">
              Recommendations & Lessons Learned
            </h3>

            <div className="space-y-4">
              {data.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryStyle(
                            rec.category
                          )}`}
                        >
                          {rec.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityStyle(
                            rec.priority
                          )}`}
                        >
                          {rec.priority}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900">{rec.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {rec.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Similar Cases */}
            {data.similarCases && data.similarCases.length > 0 && (
              <div className="pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-4">Similar Cases</h4>
                <div className="space-y-2">
                  {data.similarCases.map((c) => (
                    <div
                      key={c.caseId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <span className="font-medium">{c.caseNumber}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {c.resolution}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-600">
                          {formatDuration(c.durationHours)}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {c.similarity}% similar
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper components and functions
function MetricCard({
  label,
  value,
  subvalue,
  icon,
}: {
  label: string;
  value: string;
  subvalue?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="text-gray-400">{icon}</div>
        <div>
          <div className="text-xl font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
          {subvalue && (
            <div className="text-xs text-gray-400">{subvalue}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getDispositionStyle(disposition: string): string {
  const styles: Record<string, string> = {
    found_alive_safe: "bg-green-100 text-green-800",
    found_alive_injured: "bg-amber-100 text-amber-800",
    found_deceased: "bg-gray-100 text-gray-800",
    returned_voluntarily: "bg-blue-100 text-blue-800",
    located_runaway: "bg-cyan-100 text-cyan-800",
    default: "bg-gray-100 text-gray-800",
  };
  return styles[disposition] || styles.default;
}

function getDispositionIcon(disposition: string): ReactNode {
  if (disposition.includes("alive") || disposition.includes("returned")) {
    return (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  );
}

function getTimelineEventColor(type: string): string {
  const colors: Record<string, string> = {
    report: "bg-blue-500",
    update: "bg-gray-500",
    lead: "bg-cyan-500",
    tip: "bg-amber-500",
    action: "bg-purple-500",
    resolution: "bg-green-500",
  };
  return colors[type] || "bg-gray-500";
}

function getCategoryStyle(category: string): string {
  const styles: Record<string, string> = {
    process: "bg-blue-100 text-blue-700",
    resource: "bg-green-100 text-green-700",
    communication: "bg-purple-100 text-purple-700",
    technology: "bg-cyan-100 text-cyan-700",
  };
  return styles[category] || "bg-gray-100 text-gray-700";
}

function getPriorityStyle(priority: string): string {
  const styles: Record<string, string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-green-100 text-green-700",
  };
  return styles[priority] || "bg-gray-100 text-gray-700";
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function LeadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function TipIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function PDFIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
    </svg>
  );
}

function ExcelIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
    </svg>
  );
}

export default CaseOutcomeReport;
