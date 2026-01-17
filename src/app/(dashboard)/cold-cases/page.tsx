"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ColdCaseDashboardStats, ColdCaseProfile, ColdCaseReview } from "@/types/cold-case.types";

export default function ColdCasesPage() {
  const [stats, setStats] = useState<ColdCaseDashboardStats | null>(null);
  const [coldCases, setColdCases] = useState<ColdCaseProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "cases" | "reviews" | "campaigns">("overview");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, casesRes] = await Promise.all([
        fetch("/api/cold-cases/metrics"),
        fetch("/api/cold-cases?pageSize=10&sortBy=revival_priority_score&sortOrder=desc"),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (casesRes.ok) {
        const casesData = await casesRes.json();
        setColdCases(casesData.data || []);
      }
    } catch (error) {
      console.error("Error fetching cold case data:", error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cold Case Revival System</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and revive cold cases with new investigative techniques
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/cold-cases/classify"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Classify Case
          </Link>
          <Link
            href="/cold-cases/new-review"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Start Review
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "overview", label: "Overview" },
            { id: "cases", label: "Cold Cases" },
            { id: "reviews", label: "Reviews" },
            { id: "campaigns", label: "Campaigns" },
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
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && stats && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Cold Cases"
              value={stats.totalColdCases}
              icon={<SnowflakeIcon className="h-5 w-5 text-blue-500" />}
            />
            <StatCard
              label="Under Review"
              value={stats.casesUnderReview}
              icon={<SearchIcon className="h-5 w-5 text-cyan-500" />}
              trend="neutral"
            />
            <StatCard
              label="Overdue Reviews"
              value={stats.overdueReviews}
              icon={<ExclamationIcon className="h-5 w-5 text-red-500" />}
              trend={stats.overdueReviews > 0 ? "down" : "up"}
            />
            <StatCard
              label="Revived This Year"
              value={stats.revivedThisYear}
              icon={<SparklesIcon className="h-5 w-5 text-green-500" />}
              trend="up"
            />
          </div>

          {/* Action Items */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Urgent Actions */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900">Action Required</h3>
              <div className="mt-4 space-y-3">
                {stats.overdueReviews > 0 && (
                  <ActionItem
                    icon={<ClockIcon className="h-5 w-5 text-red-500" />}
                    label={`${stats.overdueReviews} overdue review${stats.overdueReviews !== 1 ? "s" : ""}`}
                    link="/cold-cases?hasOverdueReview=true"
                    priority="high"
                  />
                )}
                {stats.upcomingAnniversaries > 0 && (
                  <ActionItem
                    icon={<CalendarIcon className="h-5 w-5 text-orange-500" />}
                    label={`${stats.upcomingAnniversaries} upcoming anniversary${stats.upcomingAnniversaries !== 1 ? "ies" : ""}`}
                    link="/cold-cases?hasUpcomingAnniversary=true"
                    priority="medium"
                  />
                )}
                {stats.pendingDNASubmissions > 0 && (
                  <ActionItem
                    icon={<DNAIcon className="h-5 w-5 text-purple-500" />}
                    label={`${stats.pendingDNASubmissions} pending DNA submission${stats.pendingDNASubmissions !== 1 ? "s" : ""}`}
                    link="/cold-cases?dnaSubmissionStatus=pending_submission"
                    priority="medium"
                  />
                )}
                {stats.unprocessedEvidence > 0 && (
                  <ActionItem
                    icon={<DocumentIcon className="h-5 w-5 text-blue-500" />}
                    label={`${stats.unprocessedEvidence} unprocessed evidence item${stats.unprocessedEvidence !== 1 ? "s" : ""}`}
                    link="/cold-cases/evidence?processed=false"
                    priority="medium"
                  />
                )}
                {stats.unreviewedPatternMatches > 0 && (
                  <ActionItem
                    icon={<PatternIcon className="h-5 w-5 text-indigo-500" />}
                    label={`${stats.unreviewedPatternMatches} unreviewed pattern match${stats.unreviewedPatternMatches !== 1 ? "es" : ""}`}
                    link="/cold-cases/patterns?reviewed=false"
                    priority="low"
                  />
                )}
                {stats.overdueReviews === 0 &&
                  stats.upcomingAnniversaries === 0 &&
                  stats.pendingDNASubmissions === 0 &&
                  stats.unprocessedEvidence === 0 &&
                  stats.unreviewedPatternMatches === 0 && (
                    <p className="text-sm text-gray-500">No urgent actions required</p>
                  )}
              </div>
            </div>

            {/* Age Distribution */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900">Case Age Distribution</h3>
              <div className="mt-4 space-y-3">
                <AgeDistributionBar
                  label="1-2 Years"
                  count={stats.ageDistribution.oneToTwoYears}
                  total={stats.totalColdCases}
                  color="bg-blue-400"
                />
                <AgeDistributionBar
                  label="2-5 Years"
                  count={stats.ageDistribution.twoToFiveYears}
                  total={stats.totalColdCases}
                  color="bg-blue-500"
                />
                <AgeDistributionBar
                  label="5-10 Years"
                  count={stats.ageDistribution.fiveToTenYears}
                  total={stats.totalColdCases}
                  color="bg-blue-600"
                />
                <AgeDistributionBar
                  label="10+ Years"
                  count={stats.ageDistribution.tenPlusYears}
                  total={stats.totalColdCases}
                  color="bg-blue-800"
                />
              </div>
            </div>
          </div>

          {/* Revival Success Rate */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Revival Success Rate</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Percentage of revival attempts that resulted in case resolution or significant progress
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-cyan-600">{stats.revivalSuccessRate}%</p>
                <p className="text-sm text-gray-500">success rate</p>
              </div>
            </div>
            <div className="mt-4 h-3 w-full rounded-full bg-gray-200">
              <div
                className="h-3 rounded-full bg-cyan-500"
                style={{ width: `${stats.revivalSuccessRate}%` }}
              />
            </div>
          </div>

          {/* Recent Revivals */}
          {stats.recentRevivals.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Revivals</h3>
              <div className="mt-4 divide-y divide-gray-100">
                {stats.recentRevivals.map((revival) => (
                  <div key={revival.caseId} className="flex items-center justify-between py-3">
                    <div>
                      <Link
                        href={`/cold-cases/${revival.caseId}`}
                        className="font-medium text-gray-900 hover:text-cyan-600"
                      >
                        {revival.caseNumber}
                      </Link>
                      <p className="text-sm text-gray-500">
                        Was cold for {revival.daysCold} days
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Revived
                      </span>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(revival.revivedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cases Tab */}
      {activeTab === "cases" && (
        <ColdCasesList cases={coldCases} />
      )}

      {/* Reviews Tab */}
      {activeTab === "reviews" && (
        <ReviewsList />
      )}

      {/* Campaigns Tab */}
      {activeTab === "campaigns" && (
        <CampaignsList />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  trend,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-gray-100 p-2">{icon}</div>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend === "up" && "text-green-600",
              trend === "down" && "text-red-600",
              trend === "neutral" && "text-gray-500"
            )}
          >
            {trend === "up" && "+"}
            {trend === "down" && "-"}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

// Action Item Component
function ActionItem({
  icon,
  label,
  link,
  priority,
}: {
  icon: React.ReactNode;
  label: string;
  link: string;
  priority: "high" | "medium" | "low";
}) {
  return (
    <Link
      href={link}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        priority === "high" && "border-red-200 bg-red-50 hover:bg-red-100",
        priority === "medium" && "border-orange-200 bg-orange-50 hover:bg-orange-100",
        priority === "low" && "border-gray-200 bg-gray-50 hover:bg-gray-100"
      )}
    >
      {icon}
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <ChevronRightIcon className="ml-auto h-4 w-4 text-gray-400" />
    </Link>
  );
}

// Age Distribution Bar Component
function AgeDistributionBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{count} cases</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
        <div
          className={cn("h-2 rounded-full", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Cold Cases List Component
function ColdCasesList({ cases }: { cases: ColdCaseProfile[] }) {
  if (cases.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <SnowflakeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No cold cases found</h3>
        <p className="mt-2 text-sm text-gray-500">
          Cases will appear here when they are classified as cold
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Case
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Days Cold
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Classification
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Priority Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Next Review
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                DNA Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {cases.map((coldCase) => {
              const caseData = coldCase.case as {
                case_number: string;
                first_name: string;
                last_name: string;
                primary_photo_url?: string;
              };

              return (
                <tr key={coldCase.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-gray-200" />
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">
                          {caseData?.first_name} {caseData?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {caseData?.case_number}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {coldCase.daysSinceCold || 0} days
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <ClassificationBadge classification={coldCase.classification} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <PriorityScoreBadge score={coldCase.revivalPriorityScore || 0} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {coldCase.nextReviewDate
                      ? new Date(coldCase.nextReviewDate).toLocaleDateString()
                      : "Not scheduled"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <DNAStatusBadge status={coldCase.dnaSubmissionStatus} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <Link
                      href={`/cold-cases/${coldCase.id}`}
                      className="text-cyan-600 hover:text-cyan-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Reviews List Component
type ReviewQueueItem = ColdCaseReview & {
  case?: {
    id: string;
    case_number: string;
    first_name: string;
    last_name: string;
    last_seen_date?: string;
    primary_photo_url?: string;
  };
  reviewer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  cold_case_profile?: {
    id: string;
    classification: string;
    revival_priority_score: number;
  };
};

function ReviewsList() {
  const [reviews, setReviews] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/cold-cases/review-queue?pageSize=20");
      if (res.ok) {
        const data = await res.json();
        setReviews(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <SearchIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No reviews found</h3>
        <p className="mt-2 text-sm text-gray-500">
          Start a new review to begin the cold case revival process
        </p>
        <Link
          href="/cold-cases/new-review"
          className="mt-4 inline-flex items-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Start Review
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="space-y-4">
        {reviews.map((review) => {
          const caseLabel = review.case
            ? `${review.case.first_name} ${review.case.last_name}`.trim()
            : "Case";
          const caseNumber = review.case?.case_number || review.caseId;
          const reviewerName = review.reviewer
            ? `${review.reviewer.first_name} ${review.reviewer.last_name}`.trim()
            : "Unassigned";
          return (
            <div
              key={review.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 p-4"
            >
              <div>
                <Link
                  href={`/cold-cases/reviews/${review.id}`}
                  className="text-sm font-semibold text-gray-900 hover:text-cyan-600"
                >
                  {caseNumber} · {caseLabel}
                </Link>
                <p className="mt-1 text-xs text-gray-500">
                  {review.status.replace("_", " ")} · Reviewer: {reviewerName}
                </p>
              </div>
              <div className="text-right text-xs text-gray-500">
                {review.dueDate && (
                  <div>Due {new Date(review.dueDate).toLocaleDateString()}</div>
                )}
                <div>Review #{review.reviewNumber}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Campaigns List Component
function CampaignsList() {
  const [campaigns, setCampaigns] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/cold-cases/campaigns?pageSize=20");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <MegaphoneIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No campaigns found</h3>
        <p className="mt-2 text-sm text-gray-500">
          Create a campaign to re-engage the public on a cold case
        </p>
        <Link
          href="/cold-cases/new-campaign"
          className="mt-4 inline-flex items-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Create Campaign
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-sm text-gray-500">Campaigns list coming soon...</p>
    </div>
  );
}

// Badge Components
function ClassificationBadge({ classification }: { classification: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    auto_classified: { bg: "bg-blue-100", text: "text-blue-700", label: "Auto" },
    manually_classified: { bg: "bg-purple-100", text: "text-purple-700", label: "Manual" },
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

function PriorityScoreBadge({ score }: { score: number }) {
  let color = "bg-gray-100 text-gray-700";
  if (score >= 80) color = "bg-red-100 text-red-700";
  else if (score >= 60) color = "bg-orange-100 text-orange-700";
  else if (score >= 40) color = "bg-yellow-100 text-yellow-700";
  else if (score >= 20) color = "bg-blue-100 text-blue-700";

  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-bold", color)}>
      {score}
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

// Icon Components
function SnowflakeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m0-18l-3 3m3-3l3 3m-3 15l-3-3m3 3l3-3M3 12h18M3 12l3-3m-3 3l3 3m15-3l-3-3m3 3l-3 3" />
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

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
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

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function DNAIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
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

function PatternIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
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

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
    </svg>
  );
}
