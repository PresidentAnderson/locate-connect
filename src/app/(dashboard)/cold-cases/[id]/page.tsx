"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Local type for cold case data from API
interface ColdCaseData {
  id: string;
  case_id: string;
  classification: string;
  days_since_cold: number;
  revival_priority_score: number;
  reviews_completed: number;
  revival_attempts: number;
  digitization_progress: number;
  dna_submission_status: string;
  current_reviewer_id?: string;
  review_due_date?: string;
  classified_at?: string;
  classification_reason?: string;
  review_frequency?: string;
  next_review_date?: string;
  criteria_no_leads_90_days?: boolean;
  criteria_no_tips_60_days?: boolean;
  criteria_no_activity_180_days?: boolean;
  criteria_manually_marked?: boolean;
  criteria_resource_constraints?: boolean;
  dna_samples_available?: boolean;
  dna_database_checked?: string[];
  anniversary_date?: string;
  last_anniversary_campaign?: string;
  family_notified_of_cold_status?: boolean;
  family_opted_out_notifications?: boolean;
  family_last_contact_date?: string;
  case?: {
    id: string;
    case_number: string;
    first_name: string;
    last_name: string;
    age_at_disappearance?: string;
    last_seen_date?: string;
    last_seen_location?: string;
    last_seen_city?: string;
    last_seen_province?: string;
    primary_photo_url?: string;
    status?: string;
    priority_level?: string;
    circumstances?: string;
    is_minor?: boolean;
    is_elderly?: boolean;
    is_indigenous?: boolean;
    has_dementia?: boolean;
    has_autism?: boolean;
    is_suicidal_risk?: boolean;
    suspected_abduction?: boolean;
    suspected_foul_play?: boolean;
    is_medication_dependent?: boolean;
  };
  current_reviewer?: {
    first_name: string;
    last_name: string;
  };
  unreviewedPatternMatches?: unknown[];
  unprocessedEvidence?: unknown[];
  dnaSubmissions?: unknown[];
  recentCampaigns?: unknown[];
  recentReviews?: unknown[];
  revival_priority_factors?: { factor: string; weight: number }[];
}

interface ColdCaseDetailProps {
  params: Promise<{ id: string }>;
}

export default function ColdCaseDetailPage({ params }: ColdCaseDetailProps) {
  const { id } = use(params);
  const [coldCase, setColdCase] = useState<ColdCaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "reviews" | "evidence" | "dna" | "campaigns" | "patterns">("overview");

  useEffect(() => {
    fetchColdCase();
  }, [id]);

  const fetchColdCase = async () => {
    try {
      const res = await fetch(`/api/cold-cases/${id}`);
      if (res.ok) {
        const data = await res.json();
        setColdCase(data.data);
      }
    } catch (error) {
      console.error("Error fetching cold case:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (!coldCase) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Cold case not found</h2>
        <Link href="/cold-cases" className="mt-4 text-cyan-600 hover:text-cyan-700">
          Back to Cold Cases
        </Link>
      </div>
    );
  }

  const caseData = coldCase.case;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/cold-cases"
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {caseData?.first_name || ''} {caseData?.last_name || ''}
            </h1>
            <ClassificationBadge classification={coldCase.classification} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {`${caseData?.case_number || ''} | Cold for ${coldCase.days_since_cold || 0} days`}
          </p>
        </div>
        <div className="flex gap-3">
          {!coldCase.current_reviewer_id && (
            <button
              onClick={() => startReview()}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              Start Review
            </button>
          )}
          <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Edit Profile
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <QuickStat
          label="Priority Score"
          value={coldCase.revival_priority_score || 0}
          icon={<ChartIcon className="h-4 w-4 text-cyan-500" />}
        />
        <QuickStat
          label="Reviews"
          value={coldCase.reviews_completed || 0}
          icon={<SearchIcon className="h-4 w-4 text-blue-500" />}
        />
        <QuickStat
          label="Revival Attempts"
          value={coldCase.revival_attempts || 0}
          icon={<SparklesIcon className="h-4 w-4 text-green-500" />}
        />
        <QuickStat
          label="Digitization"
          value={`${coldCase.digitization_progress || 0}%`}
          icon={<DocumentIcon className="h-4 w-4 text-purple-500" />}
        />
        <QuickStat
          label="DNA Status"
          value={formatDNAStatus(coldCase.dna_submission_status || '')}
          icon={<DNAIcon className="h-4 w-4 text-indigo-500" />}
        />
        <QuickStat
          label="Pattern Matches"
          value={coldCase.unreviewedPatternMatches?.length || 0}
          icon={<PatternIcon className="h-4 w-4 text-orange-500" />}
        />
      </div>

      {/* Current Review Alert */}
      {coldCase.current_reviewer_id && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-3">
            <SearchIcon className="h-5 w-5 text-yellow-600" />
            <div className="flex-1">
              <p className="font-medium text-yellow-800">Review In Progress</p>
              <p className="text-sm text-yellow-700">
                Assigned to {String(coldCase.current_reviewer?.first_name ?? '')} {String(coldCase.current_reviewer?.last_name ?? '')}
                {coldCase.review_due_date && ` | Due: ${new Date(String(coldCase.review_due_date)).toLocaleDateString()}`}
              </p>
            </div>
            <Link
              href={`/cold-cases/${id}/review`}
              className="rounded-lg bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-700"
            >
              View Review
            </Link>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "overview", label: "Overview" },
            { id: "reviews", label: "Reviews", count: coldCase.reviews_completed as number },
            { id: "evidence", label: "Evidence", count: (coldCase.unprocessedEvidence as unknown[])?.length },
            { id: "dna", label: "DNA", count: (coldCase.dnaSubmissions as unknown[])?.length },
            { id: "campaigns", label: "Campaigns", count: (coldCase.recentCampaigns as unknown[])?.length },
            { id: "patterns", label: "Patterns", count: (coldCase.unreviewedPatternMatches as unknown[])?.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium",
                activeTab === tab.id
                  ? "border-cyan-500 text-cyan-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab coldCase={coldCase} caseData={caseData} />
      )}

      {activeTab === "reviews" && (
        <ReviewsTab reviews={(coldCase.recentReviews as unknown[]) || []} coldCaseId={id} />
      )}

      {activeTab === "evidence" && (
        <EvidenceTab evidence={(coldCase.unprocessedEvidence as unknown[]) || []} coldCaseId={id} />
      )}

      {activeTab === "dna" && (
        <DNATab submissions={(coldCase.dnaSubmissions as unknown[]) || []} coldCaseId={id} caseId={caseData?.id as string} />
      )}

      {activeTab === "campaigns" && (
        <CampaignsTab campaigns={(coldCase.recentCampaigns as unknown[]) || []} coldCaseId={id} caseId={caseData?.id as string} />
      )}

      {activeTab === "patterns" && (
        <PatternsTab matches={(coldCase.unreviewedPatternMatches as unknown[]) || []} />
      )}
    </div>
  );

  async function startReview() {
    try {
      const res = await fetch("/api/cold-cases/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coldCaseProfileId: id }),
      });

      if (res.ok) {
        fetchColdCase();
      } else {
        const error = await res.json();
        alert(error.error?.message || "Failed to start review");
      }
    } catch (error) {
      console.error("Error starting review:", error);
    }
  }
}

// Case data type for Overview tab
interface CaseDataForOverview {
  first_name?: string;
  last_name?: string;
  age_at_disappearance?: string;
  last_seen_date?: string;
  last_seen_city?: string;
  last_seen_province?: string;
  status?: string;
  priority_level?: string;
  circumstances?: string;
  is_minor?: boolean;
  is_elderly?: boolean;
  is_indigenous?: boolean;
  has_dementia?: boolean;
  has_autism?: boolean;
  is_suicidal_risk?: boolean;
  suspected_abduction?: boolean;
  suspected_foul_play?: boolean;
  is_medication_dependent?: boolean;
}

// Overview Tab
function OverviewTab({
  coldCase,
  caseData,
}: {
  coldCase: ColdCaseData;
  caseData: CaseDataForOverview | undefined;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Case Info */}
      <div className="lg:col-span-2 space-y-6">
        {/* Missing Person Details */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Missing Person</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <InfoItem label="Name" value={`${caseData?.first_name || ''} ${caseData?.last_name || ''}`} />
            <InfoItem label="Age at Disappearance" value={caseData?.age_at_disappearance || 'Unknown'} />
            <InfoItem label="Last Seen" value={caseData?.last_seen_date ? new Date(caseData.last_seen_date).toLocaleDateString() : "Unknown"} />
            <InfoItem label="Location" value={`${caseData?.last_seen_city || ""}, ${caseData?.last_seen_province || ""}`} />
            <InfoItem label="Status" value={caseData?.status || 'Unknown'} />
            <InfoItem label="Priority" value={caseData?.priority_level || 'Unknown'} />
          </div>
          {caseData?.circumstances ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">Circumstances</p>
              <p className="mt-1 text-sm text-gray-900">{caseData.circumstances}</p>
            </div>
          ) : null}
        </div>

        {/* Risk Factors */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Risk Factors</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {caseData?.is_minor && <RiskBadge label="Minor" color="red" />}
            {caseData?.is_elderly && <RiskBadge label="Elderly" color="orange" />}
            {caseData?.is_indigenous && <RiskBadge label="Indigenous" color="purple" />}
            {caseData?.has_dementia && <RiskBadge label="Dementia" color="red" />}
            {caseData?.has_autism && <RiskBadge label="Autism" color="blue" />}
            {caseData?.is_suicidal_risk && <RiskBadge label="Suicidal Risk" color="red" />}
            {caseData?.suspected_abduction && <RiskBadge label="Suspected Abduction" color="red" />}
            {caseData?.suspected_foul_play && <RiskBadge label="Suspected Foul Play" color="red" />}
            {caseData?.is_medication_dependent && <RiskBadge label="Medication Dependent" color="orange" />}
            {!caseData?.is_minor &&
              !caseData?.is_elderly &&
              !caseData?.is_indigenous &&
              !caseData?.has_dementia &&
              !caseData?.has_autism &&
              !caseData?.is_suicidal_risk &&
              !caseData?.suspected_abduction &&
              !caseData?.suspected_foul_play &&
              !caseData?.is_medication_dependent && (
                <span className="text-sm text-gray-500">No specific risk factors identified</span>
              )}
          </div>
        </div>

        {/* Cold Case Classification */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Cold Case Classification</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <InfoItem label="Classified" value={new Date(coldCase.classified_at as string).toLocaleDateString()} />
            <InfoItem label="Reason" value={coldCase.classification_reason as string} />
            <InfoItem label="Review Frequency" value={formatFrequency(coldCase.review_frequency as string)} />
            <InfoItem label="Next Review" value={coldCase.next_review_date ? new Date(coldCase.next_review_date as string).toLocaleDateString() : "Not scheduled"} />
          </div>

          <h4 className="mt-6 font-medium text-gray-900">Classification Criteria Met</h4>
          <div className="mt-2 space-y-2">
            <CriteriaItem checked={coldCase.criteria_no_leads_90_days as boolean} label="No leads in 90 days" />
            <CriteriaItem checked={coldCase.criteria_no_tips_60_days as boolean} label="No tips in 60 days" />
            <CriteriaItem checked={coldCase.criteria_no_activity_180_days as boolean} label="No activity in 180 days" />
            <CriteriaItem checked={coldCase.criteria_manually_marked as boolean} label="Manually classified" />
            <CriteriaItem checked={coldCase.criteria_resource_constraints as boolean} label="Resource constraints" />
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Priority Factors */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Revival Priority</h3>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Score</span>
              <span className="text-2xl font-bold text-cyan-600">{coldCase.revival_priority_score || 0}</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-cyan-500"
                style={{ width: `${Math.min((coldCase.revival_priority_score as number || 0) / 100 * 100, 100)}%` }}
              />
            </div>
          </div>
          {(coldCase.revival_priority_factors as unknown[])?.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Contributing Factors</p>
              {(coldCase.revival_priority_factors as Array<{ factor: string; weight: number }>).map((factor, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{formatFactor(factor.factor)}</span>
                  <span className="font-medium text-gray-900">+{factor.weight}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DNA Status */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">DNA Status</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Samples Available</span>
              <span className={cn("font-medium", coldCase.dna_samples_available ? "text-green-600" : "text-red-600")}>
                {coldCase.dna_samples_available ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <DNAStatusBadge status={coldCase.dna_submission_status as string} />
            </div>
            {(coldCase.dna_database_checked as string[])?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500">Databases Checked</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(coldCase.dna_database_checked as string[]).map((db, i) => (
                    <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                      {db}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Anniversary */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Anniversary Tracking</h3>
          <div className="mt-4 space-y-3">
            <InfoItem
              label="Date of Disappearance"
              value={coldCase.anniversary_date ? new Date(coldCase.anniversary_date as string).toLocaleDateString() : "Unknown"}
            />
            <InfoItem
              label="Last Campaign"
              value={coldCase.last_anniversary_campaign ? new Date(coldCase.last_anniversary_campaign as string).toLocaleDateString() : "None"}
            />
          </div>
        </div>

        {/* Family Contact */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Family Contact</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Notified of Cold Status</span>
              <span className={cn("font-medium", coldCase.family_notified_of_cold_status ? "text-green-600" : "text-gray-600")}>
                {coldCase.family_notified_of_cold_status ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Opted Out</span>
              <span className={cn("font-medium", coldCase.family_opted_out_notifications ? "text-red-600" : "text-green-600")}>
                {coldCase.family_opted_out_notifications ? "Yes" : "No"}
              </span>
            </div>
            <InfoItem
              label="Last Contact"
              value={coldCase.family_last_contact_date ? new Date(coldCase.family_last_contact_date as string).toLocaleDateString() : "None"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Reviews Tab
function ReviewsTab({ reviews, coldCaseId }: { reviews: unknown[]; coldCaseId: string }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <SearchIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No reviews yet</h3>
        <p className="mt-2 text-sm text-gray-500">
          Start a review to begin the cold case revival process
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const r = review as Record<string, unknown>;
        const reviewer = r.reviewer as Record<string, unknown> | undefined;
        return (
          <div key={String(r.id)} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Review #{String(r.review_number || '')}</h4>
                <p className="text-sm text-gray-500">
                  {String(r.review_type || '')} review by {String(reviewer?.first_name || '')} {String(reviewer?.last_name || '')}
                </p>
              </div>
              <StatusBadge status={r.status as string} />
            </div>
            {r.summary ? (
              <p className="mt-4 text-sm text-gray-700">{String(r.summary)}</p>
            ) : null}
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
              <span>Started: {r.started_at ? new Date(r.started_at as string).toLocaleDateString() : "Not started"}</span>
              {r.completed_at ? (
                <span>Completed: {new Date(String(r.completed_at)).toLocaleDateString()}</span>
              ) : null}
              {r.revival_recommended !== undefined ? (
                <span className={cn("font-medium", r.revival_recommended ? "text-green-600" : "text-gray-600")}>
                  Revival {r.revival_recommended ? "Recommended" : "Not Recommended"}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Evidence Tab
function EvidenceTab({ evidence, coldCaseId }: { evidence: unknown[]; coldCaseId: string }) {
  if (evidence.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No new evidence</h3>
        <p className="mt-2 text-sm text-gray-500">
          New evidence will appear here when flagged
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {evidence.map((item) => {
        const e = item as Record<string, unknown>;
        return (
          <div key={e.id as string} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{e.evidence_type as string}</h4>
                <p className="text-sm text-gray-500">Source: {e.evidence_source as string}</p>
              </div>
              <SignificanceBadge level={e.significance_level as string} />
            </div>
            <p className="mt-4 text-sm text-gray-700">{e.evidence_description as string}</p>
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
              <span>Discovered: {new Date(e.discovered_at as string).toLocaleDateString()}</span>
              <span>Status: {e.verification_status as string}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// DNA Tab
function DNATab({ submissions, coldCaseId, caseId }: { submissions: unknown[]; coldCaseId: string; caseId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href={`/cold-cases/${coldCaseId}/dna/new`}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          New Submission
        </Link>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <DNAIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No DNA submissions</h3>
          <p className="mt-2 text-sm text-gray-500">
            Create a DNA submission to track database queries
          </p>
        </div>
      ) : (
        submissions.map((sub) => {
          const s = sub as Record<string, unknown>;
          return (
            <div key={s.id as string} className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{s.database_name as string}</h4>
                  <p className="text-sm text-gray-500">Type: {s.submission_type as string}</p>
                </div>
                <DNAStatusBadge status={s.status as string} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Sample Type:</span>{" "}
                  <span className="text-gray-900">{s.sample_type as string || "Not specified"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Submitted:</span>{" "}
                  <span className="text-gray-900">
                    {s.submitted_at ? new Date(s.submitted_at as string).toLocaleDateString() : "Pending"}
                  </span>
                </div>
              </div>
              {s.match_found ? (
                <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                  Match Found: {String(s.match_details || '')}
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}

// Campaigns Tab
function CampaignsTab({ campaigns, coldCaseId, caseId }: { campaigns: unknown[]; coldCaseId: string; caseId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href={`/cold-cases/${coldCaseId}/campaigns/new`}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <MegaphoneIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No campaigns</h3>
          <p className="mt-2 text-sm text-gray-500">
            Create a campaign to re-engage the public
          </p>
        </div>
      ) : (
        campaigns.map((camp) => {
          const c = camp as Record<string, unknown>;
          return (
            <div key={c.id as string} className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{c.campaign_name as string}</h4>
                  <p className="text-sm text-gray-500">Type: {c.campaign_type as string}</p>
                </div>
                <CampaignStatusBadge status={c.status as string} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Reach:</span>{" "}
                  <span className="text-gray-900">{Number(c.actual_reach) || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Tips:</span>{" "}
                  <span className="text-gray-900">{Number(c.actual_tips_generated) || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Leads:</span>{" "}
                  <span className="text-gray-900">{Number(c.actual_leads_generated) || 0}</span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// Patterns Tab
function PatternsTab({ matches }: { matches: unknown[] }) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <PatternIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No pattern matches</h3>
        <p className="mt-2 text-sm text-gray-500">
          AI pattern matching will identify potentially related cases
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => {
        const m = match as Record<string, unknown>;
        const matchedCase = m.matched_case as Record<string, unknown> | undefined;
        return (
          <div key={m.id as string} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">
                  {String(matchedCase?.first_name ?? '')} {String(matchedCase?.last_name ?? '')}
                </h4>
                <p className="text-sm text-gray-500">
                  {String(matchedCase?.case_number ?? '')} | {m.match_type as string} match
                </p>
              </div>
              <ConfidenceBadge level={m.confidence_level as string} score={m.confidence_score as number} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(m.matching_factors as Array<{ factor: string }>)?.map((f, i) => (
                <span key={i} className="rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                  {f.factor}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4">
              <button className="text-sm font-medium text-cyan-600 hover:text-cyan-700">
                Review Match
              </button>
              <button className="text-sm font-medium text-gray-600 hover:text-gray-700">
                View Case
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper Components
function QuickStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value || "—"}</p>
    </div>
  );
}

function RiskBadge({ label, color }: { label: string; color: "red" | "orange" | "blue" | "purple" }) {
  const colors = {
    red: "bg-red-100 text-red-700",
    orange: "bg-orange-100 text-orange-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-medium", colors[color])}>
      {label}
    </span>
  );
}

function CriteriaItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-4 w-4 rounded-full", checked ? "bg-cyan-500" : "bg-gray-200")} />
      <span className={cn("text-sm", checked ? "text-gray-900" : "text-gray-500")}>{label}</span>
    </div>
  );
}

function ClassificationBadge({ classification }: { classification: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    auto_classified: { bg: "bg-blue-100", text: "text-blue-700", label: "Auto Classified" },
    manually_classified: { bg: "bg-purple-100", text: "text-purple-700", label: "Manually Classified" },
    reclassified_active: { bg: "bg-green-100", text: "text-green-700", label: "Revived" },
    under_review: { bg: "bg-orange-100", text: "text-orange-700", label: "Under Review" },
  };

  const c = config[classification] || { bg: "bg-gray-100", text: "text-gray-700", label: classification };

  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", c.bg, c.text)}>
      {c.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    pending: { bg: "bg-gray-100", text: "text-gray-700" },
    in_progress: { bg: "bg-yellow-100", text: "text-yellow-700" },
    completed: { bg: "bg-green-100", text: "text-green-700" },
    deferred: { bg: "bg-orange-100", text: "text-orange-700" },
  };

  const c = config[status] || { bg: "bg-gray-100", text: "text-gray-700" };

  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize", c.bg, c.text)}>
      {status.replace("_", " ")}
    </span>
  );
}

function SignificanceBadge({ level }: { level: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    low: { bg: "bg-gray-100", text: "text-gray-700" },
    medium: { bg: "bg-blue-100", text: "text-blue-700" },
    high: { bg: "bg-orange-100", text: "text-orange-700" },
    critical: { bg: "bg-red-100", text: "text-red-700" },
  };

  const c = config[level] || { bg: "bg-gray-100", text: "text-gray-700" };

  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize", c.bg, c.text)}>
      {level}
    </span>
  );
}

function DNAStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    not_submitted: { bg: "bg-gray-100", text: "text-gray-700", label: "Not Submitted" },
    pending_submission: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
    submitted: { bg: "bg-blue-100", text: "text-blue-700", label: "Submitted" },
    match_found: { bg: "bg-green-100", text: "text-green-700", label: "Match Found" },
    no_match: { bg: "bg-gray-100", text: "text-gray-700", label: "No Match" },
    resubmission_pending: { bg: "bg-orange-100", text: "text-orange-700", label: "Resubmit" },
    resubmitted: { bg: "bg-purple-100", text: "text-purple-700", label: "Resubmitted" },
  };

  const c = config[status] || { bg: "bg-gray-100", text: "text-gray-700", label: status };

  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", c.bg, c.text)}>
      {c.label}
    </span>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    draft: { bg: "bg-gray-100", text: "text-gray-700" },
    scheduled: { bg: "bg-blue-100", text: "text-blue-700" },
    active: { bg: "bg-green-100", text: "text-green-700" },
    completed: { bg: "bg-purple-100", text: "text-purple-700" },
    cancelled: { bg: "bg-red-100", text: "text-red-700" },
  };

  const c = config[status] || { bg: "bg-gray-100", text: "text-gray-700" };

  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize", c.bg, c.text)}>
      {status}
    </span>
  );
}

function ConfidenceBadge({ level, score }: { level: string; score: number }) {
  const config: Record<string, { bg: string; text: string }> = {
    low: { bg: "bg-gray-100", text: "text-gray-700" },
    medium: { bg: "bg-yellow-100", text: "text-yellow-700" },
    high: { bg: "bg-orange-100", text: "text-orange-700" },
    very_high: { bg: "bg-red-100", text: "text-red-700" },
  };

  const c = config[level] || { bg: "bg-gray-100", text: "text-gray-700" };

  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", c.bg, c.text)}>
      {Math.round(score * 100)}% confidence
    </span>
  );
}

// Helper Functions
function formatDNAStatus(status: string): string {
  const labels: Record<string, string> = {
    not_submitted: "Not Submitted",
    pending_submission: "Pending",
    submitted: "Submitted",
    match_found: "Match Found",
    no_match: "No Match",
    resubmission_pending: "Resubmit",
    resubmitted: "Resubmitted",
  };
  return labels[status] || status;
}

function formatFrequency(frequency: string): string {
  const labels: Record<string, string> = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    semi_annual: "Semi-Annual",
    annual: "Annual",
    biennial: "Biennial",
  };
  return labels[frequency] || frequency;
}

function formatFactor(factor: string): string {
  return factor
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

// Icons
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
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

function DNAIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Z" />
    </svg>
  );
}

function PatternIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
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
