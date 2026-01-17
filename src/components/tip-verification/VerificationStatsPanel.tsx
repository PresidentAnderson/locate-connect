"use client";

interface QueueStats {
  totalPending: number;
  criticalPending: number;
  highPriorityPending: number;
  standardPending: number;
  lowPriorityPending: number;
  slaBreached: number;
}

interface TipVerificationStats {
  totalTips: number;
  verifiedTips: number;
  pendingReviewTips: number;
  rejectedTips: number;
  spamTips: number;
  duplicateTips: number;
  averageCredibilityScore: number;
  averageVerificationTime: string;
  tipsLeadingToLeads: number;
  tipsLeadingToResolutions: number;
}

interface TipsterStats {
  totalTipsters: number;
  verifiedSourceTipsters: number;
  blockedTipsters: number;
  averageReliabilityScore: number;
}

interface StatsData {
  tipVerificationStats: TipVerificationStats;
  queueStats: QueueStats;
  tipsterStats: TipsterStats;
  trends: {
    tipsChange: number;
    credibilityChange: number;
    verificationRateChange: number;
    spamRateChange: number;
  };
}

interface VerificationStatsPanelProps {
  stats?: StatsData | null;
  isLoading?: boolean;
}

export function VerificationStatsPanel({ stats, isLoading }: VerificationStatsPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Verification Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500 text-center">No statistics available</p>
      </div>
    );
  }

  const { tipVerificationStats, queueStats, tipsterStats, trends } = stats;

  const verificationRate = tipVerificationStats.totalTips > 0
    ? (tipVerificationStats.verifiedTips / tipVerificationStats.totalTips) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Tip Verification Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tip Verification</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Tips" value={tipVerificationStats.totalTips} />
          <StatCard label="Verified" value={tipVerificationStats.verifiedTips} color="text-green-600" />
          <StatCard label="Pending Review" value={tipVerificationStats.pendingReviewTips} color="text-yellow-600" />
          <StatCard label="Rejected" value={tipVerificationStats.rejectedTips} color="text-red-600" />
          <StatCard label="Spam" value={tipVerificationStats.spamTips} color="text-orange-600" />
          <StatCard label="Duplicates" value={tipVerificationStats.duplicateTips} color="text-gray-600" />
          <StatCard label="Avg Credibility" value={tipVerificationStats.averageCredibilityScore.toFixed(1)} color="text-blue-600" />
          <StatCard label="Avg Verification Time" value={tipVerificationStats.averageVerificationTime} color="text-cyan-600" />
          <StatCard label="Led to Leads" value={tipVerificationStats.tipsLeadingToLeads} color="text-indigo-600" />
          <StatCard label="Led to Resolution" value={tipVerificationStats.tipsLeadingToResolutions} color="text-emerald-600" />
        </div>
      </div>

      {/* Queue Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Queue Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Pending" value={queueStats.totalPending} />
          <StatCard label="Critical" value={queueStats.criticalPending} color="text-red-600" />
          <StatCard label="High Priority" value={queueStats.highPriorityPending} color="text-orange-600" />
          <StatCard label="Standard" value={queueStats.standardPending} color="text-yellow-600" />
          <StatCard label="Low Priority" value={queueStats.lowPriorityPending} color="text-gray-600" />
          <StatCard label="SLA Breached" value={queueStats.slaBreached} color="text-red-700" />
        </div>
      </div>

      {/* Tipster Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tipster Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Tipsters" value={tipsterStats.totalTipsters} />
          <StatCard label="Verified Sources" value={tipsterStats.verifiedSourceTipsters} color="text-green-600" />
          <StatCard label="Blocked" value={tipsterStats.blockedTipsters} color="text-red-600" />
          <StatCard label="Avg Reliability" value={tipsterStats.averageReliabilityScore.toFixed(1)} color="text-blue-600" />
        </div>
      </div>

      {/* Trends */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Trends (vs Last Period)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TrendCard label="Tips" value={trends.tipsChange} />
          <TrendCard label="Credibility" value={trends.credibilityChange} />
          <TrendCard label="Verification Rate" value={trends.verificationRateChange} />
          <TrendCard label="Spam Rate" value={trends.spamRateChange} invertColor />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-gray-900" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function TrendCard({ label, value, invertColor = false }: { label: string; value: number; invertColor?: boolean }) {
  const isPositive = value >= 0;
  const color = invertColor
    ? (isPositive ? "text-red-600" : "text-green-600")
    : (isPositive ? "text-green-600" : "text-red-600");

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {isPositive ? "+" : ""}{value.toFixed(1)}%
      </p>
    </div>
  );
}
