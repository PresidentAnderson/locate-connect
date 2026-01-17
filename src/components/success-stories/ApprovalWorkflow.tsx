"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type {
  StoryApproval,
  ApprovalWorkflowState,
  ApprovalStage,
  ApprovalStatus,
  ReviewerType,
  CreateApprovalInput,
  SubmitApprovalInput,
} from "@/types/success-story.types";

interface ApprovalWorkflowProps {
  storyId: string;
  approvals: StoryApproval[];
  workflowState: ApprovalWorkflowState;
  onRequestApproval: (data: Omit<CreateApprovalInput, "storyId">) => Promise<void>;
  onSubmitDecision: (approvalId: string, data: SubmitApprovalInput) => Promise<void>;
  onRefresh: () => void;
  currentUserId?: string;
  isStaff?: boolean;
}

const STAGES: { value: ApprovalStage; label: string; description: string }[] = [
  {
    value: "family_review",
    label: "Family Review",
    description: "Family members review and approve the story content",
  },
  {
    value: "content_review",
    label: "Content Review",
    description: "Staff reviews for accuracy and appropriateness",
  },
  {
    value: "legal_review",
    label: "Legal Review",
    description: "Ensure compliance with privacy regulations",
  },
  {
    value: "final_approval",
    label: "Final Approval",
    description: "Administrator gives final approval for publication",
  },
];

const REVIEWER_TYPES: { value: ReviewerType; label: string }[] = [
  { value: "family_member", label: "Family Member" },
  { value: "case_manager", label: "Case Manager" },
  { value: "legal_team", label: "Legal Team" },
  { value: "admin", label: "Administrator" },
];

export function ApprovalWorkflow({
  storyId,
  approvals,
  workflowState,
  onRequestApproval,
  onSubmitDecision,
  onRefresh,
  currentUserId,
  isStaff = false,
}: ApprovalWorkflowProps) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedStage, setSelectedStage] = useState<ApprovalStage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewingApprovalId, setReviewingApprovalId] = useState<string | null>(null);

  const [newApproval, setNewApproval] = useState({
    reviewerType: "" as ReviewerType,
    reviewerId: "",
    reviewerEmail: "",
    reviewerName: "",
    deadlineDays: 7,
  });

  const [decision, setDecision] = useState({
    status: "approved" as ApprovalStatus,
    feedback: "",
    requestedChanges: [] as Array<{
      field: string;
      suggestion: string;
      priority: "low" | "medium" | "high";
    }>,
  });

  const handleRequestApproval = async () => {
    if (!selectedStage || !newApproval.reviewerType) return;

    setIsSubmitting(true);
    try {
      const deadlineAt = new Date();
      deadlineAt.setDate(deadlineAt.getDate() + newApproval.deadlineDays);

      await onRequestApproval({
        approvalStage: selectedStage,
        reviewerType: newApproval.reviewerType,
        reviewerId: newApproval.reviewerId || undefined,
        reviewerEmail: newApproval.reviewerEmail || undefined,
        reviewerName: newApproval.reviewerName || undefined,
        deadlineAt: deadlineAt.toISOString(),
      });

      setShowRequestForm(false);
      setSelectedStage(null);
      setNewApproval({
        reviewerType: "" as ReviewerType,
        reviewerId: "",
        reviewerEmail: "",
        reviewerName: "",
        deadlineDays: 7,
      });
      onRefresh();
    } catch (error) {
      console.error("Error requesting approval:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDecision = async () => {
    if (!reviewingApprovalId) return;

    setIsSubmitting(true);
    try {
      await onSubmitDecision(reviewingApprovalId, {
        status: decision.status,
        feedback: decision.feedback || undefined,
        requestedChanges:
          decision.status === "changes_requested"
            ? decision.requestedChanges
            : undefined,
      });

      setReviewingApprovalId(null);
      setDecision({
        status: "approved",
        feedback: "",
        requestedChanges: [],
      });
      onRefresh();
    } catch (error) {
      console.error("Error submitting decision:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStageStatus = (stage: ApprovalStage) => {
    const stageData = workflowState.stages.find((s) => s.stage === stage);
    return stageData?.status || "not_started";
  };

  const getApprovalForStage = (stage: ApprovalStage) => {
    return approvals.find((a) => a.approvalStage === stage);
  };

  const canReview = (approval: StoryApproval) => {
    if (approval.status !== "pending") return false;
    if (isStaff) return true;
    return approval.reviewerId === currentUserId;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case "rejected":
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case "changes_requested":
        return <ExclamationCircleIcon className="h-6 w-6 text-amber-500" />;
      case "pending":
        return <ClockIcon className="h-6 w-6 text-blue-500" />;
      default:
        return <CircleIcon className="h-6 w-6 text-gray-300" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Status */}
      <div
        className={cn(
          "rounded-lg p-4",
          workflowState.canPublish
            ? "bg-green-50 border border-green-200"
            : "bg-blue-50 border border-blue-200"
        )}
      >
        <div className="flex items-start">
          {workflowState.canPublish ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          ) : (
            <ClockIcon className="h-5 w-5 text-blue-500" />
          )}
          <div className="ml-3">
            <h3
              className={cn(
                "text-sm font-medium",
                workflowState.canPublish ? "text-green-800" : "text-blue-800"
              )}
            >
              {workflowState.canPublish
                ? "All Approvals Complete - Ready to Publish"
                : `Current Stage: ${
                    STAGES.find((s) => s.value === workflowState.currentStage)
                      ?.label || workflowState.currentStage
                  }`}
            </h3>
            {!workflowState.canPublish && workflowState.blockedReasons.length > 0 && (
              <p className="mt-1 text-sm text-blue-700">
                {workflowState.blockedReasons[0]}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Approval Timeline */}
      <div className="relative">
        <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {STAGES.map((stage, index) => {
            const status = getStageStatus(stage.value);
            const approval = getApprovalForStage(stage.value);
            const isActive = workflowState.currentStage === stage.value;

            return (
              <div key={stage.value} className="relative flex items-start">
                <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white">
                  {getStatusIcon(status)}
                </div>

                <div className="ml-4 flex-1">
                  <div
                    className={cn(
                      "rounded-lg border p-4",
                      isActive
                        ? "border-cyan-200 bg-cyan-50"
                        : "border-gray-200 bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{stage.label}</h4>
                        <p className="text-sm text-gray-500">{stage.description}</p>
                      </div>

                      {status === "not_started" && isStaff && (
                        <button
                          onClick={() => {
                            setSelectedStage(stage.value);
                            setShowRequestForm(true);
                          }}
                          className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
                        >
                          Request Approval
                        </button>
                      )}
                    </div>

                    {approval && (
                      <div className="mt-3 border-t pt-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <p className="text-gray-700">
                              Reviewer:{" "}
                              <span className="font-medium">
                                {approval.reviewerName ||
                                  approval.reviewerEmail ||
                                  "Pending assignment"}
                              </span>
                            </p>
                            {approval.deadlineAt && (
                              <p className="text-gray-500">
                                Deadline:{" "}
                                {new Date(approval.deadlineAt).toLocaleDateString()}
                              </p>
                            )}
                            {approval.respondedAt && (
                              <p className="text-gray-500">
                                Responded:{" "}
                                {new Date(approval.respondedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>

                          {canReview(approval) && (
                            <button
                              onClick={() => setReviewingApprovalId(approval.id)}
                              className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700"
                            >
                              Review Now
                            </button>
                          )}
                        </div>

                        {approval.feedback && (
                          <div className="mt-2 rounded-lg bg-gray-50 p-3">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Feedback:</span>{" "}
                              {approval.feedback}
                            </p>
                          </div>
                        )}

                        {approval.requestedChanges &&
                          approval.requestedChanges.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-700">
                                Requested Changes:
                              </p>
                              <ul className="mt-1 space-y-1">
                                {approval.requestedChanges.map((change, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm"
                                  >
                                    <span
                                      className={cn(
                                        "mt-0.5 h-2 w-2 rounded-full",
                                        change.priority === "high"
                                          ? "bg-red-500"
                                          : change.priority === "medium"
                                          ? "bg-amber-500"
                                          : "bg-gray-400"
                                      )}
                                    />
                                    <span className="text-gray-600">
                                      <span className="font-medium">
                                        {change.field}:
                                      </span>{" "}
                                      {change.suggestion}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Request Approval Modal */}
      {showRequestForm && selectedStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Request {STAGES.find((s) => s.value === selectedStage)?.label}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reviewer Type *
                </label>
                <select
                  value={newApproval.reviewerType}
                  onChange={(e) =>
                    setNewApproval({
                      ...newApproval,
                      reviewerType: e.target.value as ReviewerType,
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select reviewer type</option>
                  {REVIEWER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reviewer Name
                </label>
                <input
                  type="text"
                  value={newApproval.reviewerName}
                  onChange={(e) =>
                    setNewApproval({ ...newApproval, reviewerName: e.target.value })
                  }
                  placeholder="Name of the reviewer"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reviewer Email
                </label>
                <input
                  type="email"
                  value={newApproval.reviewerEmail}
                  onChange={(e) =>
                    setNewApproval({ ...newApproval, reviewerEmail: e.target.value })
                  }
                  placeholder="reviewer@example.com"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Deadline (days from now)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={newApproval.deadlineDays}
                  onChange={(e) =>
                    setNewApproval({
                      ...newApproval,
                      deadlineDays: parseInt(e.target.value) || 7,
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRequestForm(false);
                  setSelectedStage(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestApproval}
                disabled={isSubmitting || !newApproval.reviewerType}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium text-white",
                  isSubmitting || !newApproval.reviewerType
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-cyan-600 hover:bg-cyan-700"
                )}
              >
                {isSubmitting ? "Requesting..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Decision Modal */}
      {reviewingApprovalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Submit Review Decision
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decision *
                </label>
                <div className="space-y-2">
                  {[
                    {
                      value: "approved" as ApprovalStatus,
                      label: "Approve",
                      description: "Content is acceptable as-is",
                      color: "green",
                    },
                    {
                      value: "changes_requested" as ApprovalStatus,
                      label: "Request Changes",
                      description: "Content needs modifications",
                      color: "amber",
                    },
                    {
                      value: "rejected" as ApprovalStatus,
                      label: "Reject",
                      description: "Content cannot be published",
                      color: "red",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-start rounded-lg border p-3 transition-colors",
                        decision.status === option.value
                          ? `border-${option.color}-500 bg-${option.color}-50`
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <input
                        type="radio"
                        name="decision"
                        value={option.value}
                        checked={decision.status === option.value}
                        onChange={(e) =>
                          setDecision({
                            ...decision,
                            status: e.target.value as ApprovalStatus,
                          })
                        }
                        className="mt-1 h-4 w-4 border-gray-300"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {option.label}
                        </p>
                        <p className="text-sm text-gray-500">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Feedback
                </label>
                <textarea
                  value={decision.feedback}
                  onChange={(e) =>
                    setDecision({ ...decision, feedback: e.target.value })
                  }
                  placeholder="Provide feedback or explanation for your decision..."
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              {decision.status === "changes_requested" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specific Changes Required
                  </label>
                  <button
                    onClick={() =>
                      setDecision({
                        ...decision,
                        requestedChanges: [
                          ...decision.requestedChanges,
                          { field: "", suggestion: "", priority: "medium" },
                        ],
                      })
                    }
                    className="text-sm text-cyan-600 hover:text-cyan-700"
                  >
                    + Add Change Request
                  </button>
                  <div className="mt-2 space-y-2">
                    {decision.requestedChanges.map((change, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-gray-200 p-3"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Field/Section"
                            value={change.field}
                            onChange={(e) => {
                              const updated = [...decision.requestedChanges];
                              updated[index].field = e.target.value;
                              setDecision({ ...decision, requestedChanges: updated });
                            }}
                            className="rounded border border-gray-300 px-2 py-1 text-sm"
                          />
                          <select
                            value={change.priority}
                            onChange={(e) => {
                              const updated = [...decision.requestedChanges];
                              updated[index].priority = e.target.value as
                                | "low"
                                | "medium"
                                | "high";
                              setDecision({ ...decision, requestedChanges: updated });
                            }}
                            className="rounded border border-gray-300 px-2 py-1 text-sm"
                          >
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                          </select>
                        </div>
                        <textarea
                          placeholder="Suggested change..."
                          value={change.suggestion}
                          onChange={(e) => {
                            const updated = [...decision.requestedChanges];
                            updated[index].suggestion = e.target.value;
                            setDecision({ ...decision, requestedChanges: updated });
                          }}
                          rows={2}
                          className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setReviewingApprovalId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDecision}
                disabled={isSubmitting}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium text-white",
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : decision.status === "approved"
                    ? "bg-green-600 hover:bg-green-700"
                    : decision.status === "rejected"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700"
                )}
              >
                {isSubmitting ? "Submitting..." : `Submit ${decision.status}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon components
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ExclamationCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
