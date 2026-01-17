"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { SuccessMetrics, StoryDashboardStats } from "@/types/success-story.types";

interface SuccessMetricsDashboardProps {
  initialMetrics?: SuccessMetrics[];
  initialStats?: StoryDashboardStats;
}

export function SuccessMetricsDashboard({
  initialMetrics,
  initialStats,
}: SuccessMetricsDashboardProps) {
  const [metrics, setMetrics] = useState<SuccessMetrics[]>(initialMetrics || []);
  const [stats, setStats] = useState<StoryDashboardStats | undefined>(initialStats);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all_time");
  const [isLoading, setIsLoading] = useState(!initialMetrics);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (!initialMetrics) {
      fetchMetrics();
    }
  }, [selectedPeriod]);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/success-stories/metrics?period=${selectedPeriod}`
      );
      const data = await response.json();
      setMetrics(data.metrics || []);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = async () => {
    setIsCalculating(true);
    try {
      const response = await fetch("/api/success-stories/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: selectedPeriod }),
      });
      const data = await response.json();
      if (data.success) {
        fetchMetrics();
      }
    } catch (error) {
      console.error("Error calculating metrics:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  const latestMetrics = metrics.find((m) => m.metricPeriod === selectedPeriod) ||
    metrics[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Success Metrics</h2>
          <p className="text-sm text-gray-500">
            Anonymous aggregate statistics on case resolutions
          </p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all_time">All Time</option>
            <option value="yearly">This Year</option>
            <option value="monthly">This Month</option>
            <option value="weekly">This Week</option>
          </select>

          <button
            onClick={calculateMetrics}
            disabled={isCalculating}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium",
              isCalculating
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-cyan-600 text-white hover:bg-cyan-700"
            )}
          >
            {isCalculating ? "Calculating..." : "Recalculate"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-8 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : latestMetrics ? (
        <>
          {/* Main Metrics Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Cases Resolved"
              value={latestMetrics.totalCasesResolved}
              icon={<CheckIcon className="h-5 w-5" />}
              color="cyan"
            />
            <MetricCard
              label="Found Alive & Safe"
              value={latestMetrics.foundAliveSafe}
              icon={<HeartIcon className="h-5 w-5" />}
              color="green"
              percentage={calculatePercentage(
                latestMetrics.foundAliveSafe,
                latestMetrics.totalCasesResolved
              )}
            />
            <MetricCard
              label="Reunited with Family"
              value={latestMetrics.reunitedWithFamily}
              icon={<UsersIcon className="h-5 w-5" />}
              color="teal"
            />
            <MetricCard
              label="Stories Published"
              value={latestMetrics.storiesPublished}
              icon={<BookIcon className="h-5 w-5" />}
              color="purple"
            />
          </div>

          {/* Resolution Time Metrics */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Resolution Time Metrics
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="text-center">
                <p className="text-3xl font-bold text-cyan-600">
                  {latestMetrics.averageResolutionDays !== undefined
                    ? Math.round(latestMetrics.averageResolutionDays)
                    : "-"}
                </p>
                <p className="text-sm text-gray-500">Average Days to Resolution</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-teal-600">
                  {latestMetrics.medianResolutionDays !== undefined
                    ? Math.round(latestMetrics.medianResolutionDays)
                    : "-"}
                </p>
                <p className="text-sm text-gray-500">Median Days to Resolution</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {latestMetrics.fastestResolutionHours !== undefined
                    ? latestMetrics.fastestResolutionHours
                    : "-"}
                </p>
                <p className="text-sm text-gray-500">Fastest Resolution (Hours)</p>
              </div>
            </div>
          </div>

          {/* Demographics */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Cases by Age Group
              </h3>
              <div className="space-y-3">
                <ProgressBar
                  label="Minors (Under 18)"
                  value={latestMetrics.minorsFound}
                  total={latestMetrics.totalCasesResolved}
                  color="amber"
                />
                <ProgressBar
                  label="Adults (18-64)"
                  value={latestMetrics.adultsFound}
                  total={latestMetrics.totalCasesResolved}
                  color="blue"
                />
                <ProgressBar
                  label="Seniors (65+)"
                  value={latestMetrics.seniorsFound}
                  total={latestMetrics.totalCasesResolved}
                  color="purple"
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Resolution Outcomes
              </h3>
              <div className="space-y-3">
                <ProgressBar
                  label="Found Alive & Safe"
                  value={latestMetrics.foundAliveSafe}
                  total={latestMetrics.totalCasesResolved}
                  color="green"
                />
                <ProgressBar
                  label="Found Alive (Injured)"
                  value={latestMetrics.foundAliveInjured}
                  total={latestMetrics.totalCasesResolved}
                  color="amber"
                />
                <ProgressBar
                  label="Voluntary Return"
                  value={latestMetrics.voluntaryReturn}
                  total={latestMetrics.totalCasesResolved}
                  color="cyan"
                />
              </div>
            </div>
          </div>

          {/* Community & Engagement */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Tips Received"
              value={latestMetrics.totalTipsReceived}
              icon={<LightbulbIcon className="h-5 w-5" />}
              color="amber"
            />
            <MetricCard
              label="Verified Tips"
              value={latestMetrics.verifiedTips}
              icon={<CheckBadgeIcon className="h-5 w-5" />}
              color="green"
              percentage={calculatePercentage(
                latestMetrics.verifiedTips,
                latestMetrics.totalTipsReceived
              )}
            />
            <MetricCard
              label="Story Views"
              value={latestMetrics.totalStoryViews}
              icon={<EyeIcon className="h-5 w-5" />}
              color="blue"
            />
            <MetricCard
              label="Story Shares"
              value={latestMetrics.totalStoryShares}
              icon={<ShareIcon className="h-5 w-5" />}
              color="purple"
            />
          </div>

          {/* Special Categories */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Special Categories
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-2xl font-bold text-gray-900">
                  {latestMetrics.indigenousCasesResolved}
                </p>
                <p className="text-sm text-gray-600">Indigenous Cases Resolved</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-2xl font-bold text-gray-900">
                  {latestMetrics.agenciesInvolved}
                </p>
                <p className="text-sm text-gray-600">Partner Agencies</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-2xl font-bold text-gray-900">
                  {latestMetrics.crossJurisdictionCases}
                </p>
                <p className="text-sm text-gray-600">Cross-Jurisdiction Cases</p>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          {latestMetrics.calculatedAt && (
            <p className="text-xs text-gray-400 text-center">
              Last calculated:{" "}
              {new Date(latestMetrics.calculatedAt).toLocaleString()}
            </p>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <ChartIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No Metrics Available
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Click "Recalculate" to generate metrics for this period.
          </p>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "cyan" | "green" | "teal" | "purple" | "amber" | "blue";
  percentage?: number;
}

function MetricCard({ label, value, icon, color, percentage }: MetricCardProps) {
  const colorClasses = {
    cyan: "bg-cyan-50 text-cyan-600",
    green: "bg-green-50 text-green-600",
    teal: "bg-teal-50 text-teal-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            colorClasses[color]
          )}
        >
          {icon}
        </div>
        {percentage !== undefined && (
          <span className="text-xs font-medium text-gray-500">{percentage}%</span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
  color: "green" | "amber" | "blue" | "purple" | "cyan";
}

function ProgressBar({ label, value, total, color }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  const colorClasses = {
    green: "bg-green-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    cyan: "bg-cyan-500",
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-900 font-medium">
          {value} ({percentage}%)
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div
          className={cn("h-2 rounded-full", colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Icon components
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

function CheckBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
