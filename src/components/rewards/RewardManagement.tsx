"use client";

import { useState, useEffect, ReactNode } from "react";
import type {
  RewardDashboard,
  Reward,
  RewardClaim,
  RewardTransaction,
  FraudIndicator,
  REWARD_STATUS_LABELS,
  CLAIM_STATUS_LABELS,
  FUNDING_SOURCE_LABELS,
  REWARD_STATUS_COLORS,
  CLAIM_STATUS_COLORS,
} from "@/types/reward.types";

interface RewardManagementProps {
  caseId?: string;
  initialData?: RewardDashboard;
}

export function RewardManagement({ caseId, initialData }: RewardManagementProps) {
  const [data, setData] = useState<RewardDashboard | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [activeTab, setActiveTab] = useState<"overview" | "rewards" | "claims" | "transactions" | "fraud">("overview");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [caseId, initialData]);

  const fetchData = async () => {
    try {
      const url = caseId ? `/api/rewards?caseId=${caseId}` : "/api/rewards";
      const response = await fetch(url);
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error("Failed to fetch reward data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        Unable to load reward data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fraud Alerts */}
      {data.fraudAlerts.length > 0 && (
        <FraudAlertsBanner alerts={data.fraudAlerts} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reward Management</h1>
          <p className="text-sm text-gray-500">
            Manage rewards and process claims
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Create Reward
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Rewards"
          value={data.stats.totalActiveRewards}
          icon={<GiftIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Total Amount"
          value={formatCurrency(data.stats.totalRewardAmount)}
          icon={<CurrencyIcon className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Pending Claims"
          value={data.pendingClaims.length}
          icon={<ClockIcon className="h-5 w-5" />}
          color="yellow"
        />
        <StatCard
          label="Total Paid"
          value={formatCurrency(data.stats.totalAmountPaid)}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          color="cyan"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          {[
            { id: "overview", label: "Overview" },
            { id: "rewards", label: "Active Rewards" },
            { id: "claims", label: "Claims" },
            { id: "transactions", label: "Transactions" },
            { id: "fraud", label: "Fraud Detection" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-cyan-600 text-cyan-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tab.id === "claims" && data.pendingClaims.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  {data.pendingClaims.length}
                </span>
              )}
              {tab.id === "fraud" && data.fraudAlerts.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                  {data.fraudAlerts.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab data={data} />}
      {activeTab === "rewards" && <RewardsTab rewards={data.activeRewards} />}
      {activeTab === "claims" && <ClaimsTab claims={data.pendingClaims} />}
      {activeTab === "transactions" && <TransactionsTab transactions={data.recentTransactions} />}
      {activeTab === "fraud" && <FraudTab alerts={data.fraudAlerts} />}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateRewardModal onClose={() => setShowCreateModal(false)} caseId={caseId} />
      )}
    </div>
  );
}

function FraudAlertsBanner({ alerts }: { alerts: FraudIndicator[] }) {
  const highSeverity = alerts.filter((a) => a.severity === "high").length;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <ShieldExclamationIcon className="h-6 w-6 text-red-600" />
        <div>
          <p className="font-medium text-red-800">
            {alerts.length} fraud indicator(s) detected
          </p>
          {highSeverity > 0 && (
            <p className="text-sm text-red-600">
              {highSeverity} high severity alert(s) require immediate attention
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: "green" | "yellow" | "cyan" | "red";
}) {
  const colors = {
    green: "text-green-600 bg-green-50",
    yellow: "text-yellow-600 bg-yellow-50",
    cyan: "text-cyan-600 bg-cyan-50",
    red: "text-red-600 bg-red-50",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color ? colors[color] : "bg-gray-50 text-gray-600"}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ data }: { data: RewardDashboard }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Top Rewards */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Rewards</h2>
          <div className="space-y-3">
            {data.activeRewards.slice(0, 5).map((reward) => (
              <div
                key={reward.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{reward.title}</p>
                  <p className="text-sm text-gray-500">{reward.description.slice(0, 60)}...</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(reward.amount, reward.currency)}
                  </p>
                  <RewardStatusBadge status={reward.status} />
                </div>
              </div>
            ))}
            {data.activeRewards.length === 0 && (
              <p className="text-center text-gray-500 py-4">No active rewards</p>
            )}
          </div>
        </div>

        {/* Recent Claims */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Claims</h2>
          <div className="space-y-3">
            {data.pendingClaims.slice(0, 5).map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {claim.claimantName || "Anonymous"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Submitted: {new Date(claim.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <ClaimStatusBadge status={claim.status} />
              </div>
            ))}
            {data.pendingClaims.length === 0 && (
              <p className="text-center text-gray-500 py-4">No pending claims</p>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Stats Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Claims Submitted</span>
              <span className="font-medium">{data.stats.totalClaimsSubmitted}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Claims Approved</span>
              <span className="font-medium text-green-600">{data.stats.totalClaimsApproved}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Approval Rate</span>
              <span className="font-medium">
                {(data.stats.claimApprovalRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Avg Processing</span>
              <span className="font-medium">
                {data.stats.averageClaimProcessingDays.toFixed(1)} days
              </span>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>
          <div className="space-y-3">
            {data.recentTransactions.slice(0, 5).map((txn) => (
              <div key={txn.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {txn.transactionType}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(txn.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`font-medium ${
                    txn.transactionType === "deposit" || txn.transactionType === "refund"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {txn.transactionType === "deposit" || txn.transactionType === "refund"
                    ? "+"
                    : "-"}
                  {formatCurrency(txn.amount, txn.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RewardsTab({ rewards }: { rewards: Reward[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Reward
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Source
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Expires
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rewards.map((reward) => (
            <tr key={reward.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900">{reward.title}</p>
                  <p className="text-sm text-gray-500 line-clamp-1">
                    {reward.description}
                  </p>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(reward.amount, reward.currency)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                {reward.fundingSource.replace("_", " ")}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <RewardStatusBadge status={reward.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {reward.expirationDate
                  ? new Date(reward.expirationDate).toLocaleDateString()
                  : "No expiry"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <button className="text-cyan-600 hover:text-cyan-700 text-sm">
                  Manage
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RewardStatusBadge({ status }: { status: Reward["status"] }) {
  const colors: Record<Reward["status"], string> = {
    draft: "bg-gray-100 text-gray-800",
    pending_approval: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    claimed: "bg-blue-100 text-blue-800",
    paid: "bg-cyan-100 text-cyan-800",
    expired: "bg-orange-100 text-orange-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const labels: Record<Reward["status"], string> = {
    draft: "Draft",
    pending_approval: "Pending",
    active: "Active",
    claimed: "Claimed",
    paid: "Paid",
    expired: "Expired",
    cancelled: "Cancelled",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function ClaimsTab({ claims }: { claims: RewardClaim[] }) {
  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <div
          key={claim.id}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-medium text-gray-900">
                  {claim.claimantName || "Anonymous Claimant"}
                </h3>
                <ClaimStatusBadge status={claim.status} />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Submitted: {new Date(claim.submittedAt).toLocaleString()}
              </p>
            </div>
            {claim.paymentAmount && (
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(claim.paymentAmount)}
                </p>
                <p className="text-xs text-gray-500">Claim Amount</p>
              </div>
            )}
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-700">{claim.claimDescription}</p>
          </div>

          {/* Verification Status */}
          <div className="mt-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              {claim.identityVerified ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-sm text-gray-600">Identity Verified</span>
            </div>
            <div className="flex items-center gap-2">
              {claim.leVerified ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-sm text-gray-600">LE Verified</span>
            </div>
          </div>

          {/* Evidence */}
          {claim.evidenceAttachments.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Evidence Attachments</p>
              <div className="flex flex-wrap gap-2">
                {claim.evidenceAttachments.map((attachment, idx) => (
                  <a
                    key={idx}
                    href={attachment.fileUrl}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    <DocumentIcon className="h-4 w-4 text-gray-500" />
                    {attachment.fileName}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center gap-3">
            {claim.status === "submitted" && (
              <>
                <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                  Start Review
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Request Info
                </button>
              </>
            )}
            {claim.status === "under_review" && (
              <>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Approve
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  Reject
                </button>
              </>
            )}
            {claim.status === "approved" && (
              <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                Process Payment
              </button>
            )}
          </div>
        </div>
      ))}
      {claims.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No pending claims
        </div>
      )}
    </div>
  );
}

function ClaimStatusBadge({ status }: { status: RewardClaim["status"] }) {
  const colors: Record<RewardClaim["status"], string> = {
    submitted: "bg-gray-100 text-gray-800",
    under_review: "bg-yellow-100 text-yellow-800",
    verified: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    paid: "bg-cyan-100 text-cyan-800",
  };

  const labels: Record<RewardClaim["status"], string> = {
    submitted: "Submitted",
    under_review: "Under Review",
    verified: "Verified",
    approved: "Approved",
    rejected: "Rejected",
    paid: "Paid",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function TransactionsTab({ transactions }: { transactions: RewardTransaction[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {transactions.map((txn) => (
            <tr key={txn.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(txn.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded capitalize">
                  {txn.transactionType}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {txn.description}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    txn.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : txn.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {txn.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <span
                  className={`font-medium ${
                    txn.transactionType === "deposit" || txn.transactionType === "refund"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {txn.transactionType === "deposit" || txn.transactionType === "refund"
                    ? "+"
                    : "-"}
                  {formatCurrency(txn.amount, txn.currency)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FraudTab({ alerts }: { alerts: FraudIndicator[] }) {
  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`rounded-lg border p-6 ${
            alert.severity === "high"
              ? "bg-red-50 border-red-200"
              : alert.severity === "medium"
              ? "bg-yellow-50 border-yellow-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <ShieldExclamationIcon
                className={`h-6 w-6 ${
                  alert.severity === "high"
                    ? "text-red-600"
                    : alert.severity === "medium"
                    ? "text-yellow-600"
                    : "text-gray-600"
                }`}
              />
              <div>
                <p className="font-medium text-gray-900 capitalize">
                  {alert.indicatorType.replace(/_/g, " ")}
                </p>
                <p className="text-sm text-gray-500">
                  Detected: {new Date(alert.detectedAt).toLocaleString()}
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                alert.severity === "high"
                  ? "bg-red-100 text-red-800"
                  : alert.severity === "medium"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {alert.severity}
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-700">{alert.description}</p>
          <div className="mt-4 flex items-center gap-3">
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Investigate
            </button>
            <button className="px-4 py-2 text-gray-500 hover:text-gray-700">
              Mark as False Positive
            </button>
          </div>
        </div>
      ))}
      {alerts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <ShieldCheckIcon className="h-12 w-12 mx-auto text-green-500 mb-2" />
          <p>No fraud indicators detected</p>
        </div>
      )}
    </div>
  );
}

function CreateRewardModal({
  onClose,
  caseId,
}: {
  onClose: () => void;
  caseId?: string;
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    fundingSource: "family",
    termsAndConditions: "",
    expirationDate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Submit logic here
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-lg w-full max-w-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create Reward</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (CAD)
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Funding Source
              </label>
              <select
                value={formData.fundingSource}
                onChange={(e) => setFormData({ ...formData, fundingSource: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="family">Family</option>
                <option value="organization">Organization</option>
                <option value="crowdfunded">Crowdfunded</option>
                <option value="government">Government</option>
                <option value="anonymous">Anonymous</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-cyan-500"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date (optional)
              </label>
              <input
                type="date"
                value={formData.expirationDate}
                onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                Create Reward
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(amount: number, currency: string = "CAD"): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(amount);
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  );
}

function CurrencyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ShieldExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
    </svg>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}
