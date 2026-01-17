"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { CaseOutcomeReport, type CaseOutcomeData } from "@/components/reports/CaseOutcomeReport";
import type { CaseOutcomeReportWithRelations } from "@/types/outcome-report.types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function OutcomeReportViewPage({ params }: Props) {
  const { id } = use(params);
  const [report, setReport] = useState<CaseOutcomeReportWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [id]);

  async function fetchReport() {
    try {
      setLoading(true);
      const response = await fetch(`/api/outcome-reports/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Report not found");
        }
        throw new Error("Failed to fetch report");
      }
      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    if (!report) return;
    setExporting(true);
    try {
      // Trigger PDF download via export API
      window.open(`/api/outcome-reports/${id}/export?format=pdf`, "_blank");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportExcel() {
    if (!report) return;
    setExporting(true);
    try {
      // Trigger CSV/Excel download
      const response = await fetch(`/api/outcome-reports/${id}/export?format=csv`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `outcome-report-${report.reportNumber}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-4">
        <Link
          href="/reports/outcome"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Reports
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || "Report not found"}</p>
        </div>
      </div>
    );
  }

  // Transform report data for CaseOutcomeReport component
  const reportData: CaseOutcomeData = {
    caseId: report.caseId,
    caseNumber: report.case?.caseNumber || report.reportNumber,
    subjectName: report.case
      ? `${report.case.firstName} ${report.case.lastName}`
      : "Unknown",
    subjectAge: report.case?.ageAtDisappearance || 0,
    reportedDate: report.caseReportedAt || report.createdAt,
    resolvedDate: report.caseResolvedAt || "",
    totalDurationHours: report.totalDurationHours,
    disposition: report.case?.disposition || "",
    dispositionLabel: formatDisposition(report.case?.disposition),

    resolution: {
      location: report.locationFound || "",
      city: report.locationFoundCity || "",
      province: report.locationFoundProvince || "",
      howFound: formatDiscoveryMethod(report.discoveryMethod),
      whoFound: report.foundByName || report.foundByType || "Unknown",
      conditionAtResolution: report.conditionAtResolution || "Not specified",
      notes: report.conditionNotes,
    },

    leadAnalysis: {
      totalLeads: report.totalLeadsGenerated,
      verifiedLeads: report.leadsVerified,
      dismissedLeads: report.leadsDismissed,
      solvingLeadId: report.solvingLeadId,
      solvingLeadSource: report.solvingLeadSource,
      falsePositiveRate: report.falsePositiveRate || 0,
      avgLeadResponseHours: report.avgLeadResponseHours || 0,
    },

    tipAnalysis: {
      totalTips: report.totalTipsReceived,
      verifiedTips: report.tipsVerified,
      hoaxTips: report.tipsHoax,
      duplicateTips: report.tipsDuplicate,
      tipsConvertedToLeads: report.tipsConvertedToLeads,
    },

    timeline: report.timeline?.map((tm) => ({
      timestamp: tm.timestamp,
      event: tm.title,
      type: tm.milestoneType as any,
      actor: tm.actorName,
      details: tm.description,
    })) || [],

    resources: {
      totalAssignedOfficers: report.totalAssignedOfficers,
      totalVolunteers: 0, // Derived from volunteer hours
      partnerOrganizations: report.partnerOrganizationsInvolved || [],
      mediaOutlets: report.mediaOutletsEngaged,
      socialMediaReach: report.socialMediaReach,
      estimatedCost: report.estimatedCost,
    },

    recommendations: report.recommendations?.map((rec) => ({
      id: rec.id,
      category: rec.category as "process" | "resource" | "communication" | "technology" | "training" | "policy",
      title: rec.title,
      description: rec.description,
      priority: rec.priority as "high" | "medium" | "low" | "critical",
    })) || [],

    similarCases: report.similarCases?.map((sc) => ({
      caseId: sc.similarCaseId,
      caseNumber: sc.similarCaseId.substring(0, 8), // Would need actual case number
      similarity: sc.similarityScore,
      resolution: sc.resolutionComparison || "",
      durationHours: sc.durationDifferenceHours || 0,
    })),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link
            href="/reports/outcome"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Reports
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{report.reportNumber}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Case: {report.case?.caseNumber} | Version {report.version}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusStyle(report.status)}`}>
            {formatStatus(report.status)}
          </span>
        </div>
      </div>

      {/* Report Metadata */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-600">
          <div>
            <span className="text-gray-500">Created by: </span>
            {report.createdByUser
              ? `${report.createdByUser.firstName} ${report.createdByUser.lastName}`
              : "Unknown"}
          </div>
          <div>
            <span className="text-gray-500">Created: </span>
            {new Date(report.createdAt).toLocaleDateString()}
          </div>
          {report.approvedBy && (
            <div>
              <span className="text-gray-500">Approved: </span>
              {new Date(report.approvedAt!).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* What Worked / What Didn't Work Summary */}
      {(report.whatWorked?.length > 0 || report.whatDidntWork?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.whatWorked && report.whatWorked.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-3">What Worked</h3>
              <ul className="space-y-1">
                {report.whatWorked.map((item, i) => (
                  <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                    <span className="text-green-500">+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.whatDidntWork && report.whatDidntWork.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-3">What Didn't Work</h3>
              <ul className="space-y-1">
                {report.whatDidntWork.map((item, i) => (
                  <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                    <span className="text-red-500">-</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Lessons Learned */}
      {report.lessonsLearned && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-2">Lessons Learned</h3>
          <p className="text-sm text-amber-700">{report.lessonsLearned}</p>
        </div>
      )}

      {/* Main Report Component */}
      <CaseOutcomeReport
        data={reportData}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
      />

      {/* API Access Information */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-2">API Access</h3>
        <p className="text-sm text-gray-600 mb-3">
          Access this report programmatically via the API:
        </p>
        <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
          <code className="text-sm text-green-400">
            GET /api/outcome-reports/{report.id}
          </code>
        </div>
        <div className="mt-2 flex gap-4 text-sm">
          <a
            href={`/api/outcome-reports/${report.id}/export?format=json`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-600 hover:text-cyan-800"
          >
            JSON Export
          </a>
          <a
            href={`/api/outcome-reports/${report.id}/export?format=csv`}
            className="text-cyan-600 hover:text-cyan-800"
          >
            CSV Export
          </a>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    draft: "Draft",
    pending_review: "Pending Review",
    approved: "Approved",
    archived: "Archived",
  };
  return labels[status] || status;
}

function getStatusStyle(status: string): string {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending_review: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    archived: "bg-gray-100 text-gray-500",
  };
  return styles[status] || "bg-gray-100 text-gray-700";
}

function formatDisposition(disposition: string | undefined): string {
  const labels: Record<string, string> = {
    found_alive_safe: "Found Alive - Safe",
    found_alive_injured: "Found Alive - Injured",
    found_deceased: "Found Deceased",
    returned_voluntarily: "Returned Voluntarily",
    located_runaway: "Located - Runaway",
    located_custody: "Located - In Custody",
    located_medical_facility: "Located - Medical Facility",
    located_shelter: "Located - Shelter",
    located_incarcerated: "Located - Incarcerated",
    false_report: "False Report",
    other: "Other",
  };
  return labels[disposition || ""] || disposition || "Unknown";
}

function formatDiscoveryMethod(method: string | undefined): string {
  const labels: Record<string, string> = {
    lead_from_public: "Lead from Public",
    lead_from_law_enforcement: "Lead from Law Enforcement",
    tip_anonymous: "Anonymous Tip",
    tip_identified: "Identified Tip",
    social_media_monitoring: "Social Media Monitoring",
    surveillance: "Surveillance",
    patrol_encounter: "Patrol Encounter",
    self_return: "Self Return",
    hospital_report: "Hospital Report",
    shelter_report: "Shelter Report",
    cross_border_alert: "Cross-Border Alert",
    amber_alert_response: "AMBER Alert Response",
    volunteer_search: "Volunteer Search",
    ai_facial_recognition: "AI/Facial Recognition",
    financial_tracking: "Financial Tracking",
    phone_tracking: "Phone Tracking",
    other: "Other",
  };
  return labels[method || ""] || method || "Unknown";
}
