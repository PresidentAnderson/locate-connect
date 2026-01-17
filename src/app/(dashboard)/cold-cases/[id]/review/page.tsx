"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ChecklistStatus, CampaignType, RevivalDecision } from "@/types/cold-case.types";

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default function ColdCaseReviewPage({ params }: ReviewPageProps) {
  const { id: coldCaseId } = use(params);
  const [review, setReview] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("checklist");

  // Completion form state
  const [completionForm, setCompletionForm] = useState({
    revivalRecommended: false,
    revivalDecision: "maintain_cold" as RevivalDecision,
    summary: "",
    recommendations: "",
    nextSteps: "",
    newLeadsIdentified: 0,
    newEvidenceFound: false,
    newEvidenceDescription: "",
    dnaResubmissionRecommended: false,
    campaignRecommended: false,
    recommendedCampaignType: "anniversary_push" as CampaignType,
    escalationRecommended: false,
    escalationReason: "",
    revivalJustification: "",
    familyNotified: false,
    familyNotificationMethod: "",
    familyResponse: "",
  });

  useEffect(() => {
    fetchReview();
  }, [coldCaseId]);

  const fetchReview = async () => {
    try {
      // First get the cold case profile to find the current review
      const profileRes = await fetch(`/api/cold-cases/${coldCaseId}`);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const coldCaseProfile = profileData.data;

        // Find the current review from recent reviews
        const currentReview = (coldCaseProfile.recentReviews as unknown[])?.find(
          (r: unknown) => (r as Record<string, unknown>).status !== "completed"
        ) as Record<string, unknown> | undefined;

        if (currentReview) {
          // Fetch full review details
          const reviewRes = await fetch(`/api/cold-cases/reviews/${currentReview.id}`);
          if (reviewRes.ok) {
            const reviewData = await reviewRes.json();
            setReview(reviewData.data);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching review:", error);
    } finally {
      setLoading(false);
    }
  };

  const startReview = async () => {
    if (!review) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/cold-cases/reviews/${review.id}?action=start`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        fetchReview();
      }
    } catch (error) {
      console.error("Error starting review:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateChecklistItem = async (itemId: string, status: ChecklistStatus, data?: Record<string, unknown>) => {
    if (!review) return;

    try {
      const res = await fetch(`/api/cold-cases/reviews/${review.id}/checklist?itemId=${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...data }),
      });

      if (res.ok) {
        fetchReview();
      }
    } catch (error) {
      console.error("Error updating checklist item:", error);
    }
  };

  const completeReview = async () => {
    if (!review) return;

    if (!completionForm.summary) {
      alert("Please provide a summary before completing the review.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/cold-cases/reviews/${review.id}?action=complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completionForm),
      });

      if (res.ok) {
        window.location.href = `/cold-cases/${coldCaseId}`;
      } else {
        const error = await res.json();
        alert(error.error?.message || "Failed to complete review");
      }
    } catch (error) {
      console.error("Error completing review:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">No active review found</h2>
        <p className="mt-2 text-gray-500">Start a review from the cold case detail page.</p>
        <Link href={`/cold-cases/${coldCaseId}`} className="mt-4 inline-block text-cyan-600 hover:text-cyan-700">
          Back to Cold Case
        </Link>
      </div>
    );
  }

  const caseData = review.case as Record<string, unknown> | undefined;
  const checklistItems = (review.checklistItems as unknown[]) || [];
  const checklistStats = review.checklistStats as Record<string, number> | undefined;

  // Group checklist items by category
  const categories = ["evidence", "witnesses", "technology", "databases", "family", "media", "crossref", "admin"];
  const itemsByCategory: Record<string, unknown[]> = {};
  categories.forEach((cat) => {
    itemsByCategory[cat] = checklistItems.filter(
      (item) => (item as Record<string, unknown>).category === cat
    );
  });

  const completedItems = checklistItems.filter(
    (item) => (item as Record<string, unknown>).status === "completed"
  ).length;
  const totalItems = checklistItems.length;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href={`/cold-cases/${coldCaseId}`} className="text-gray-500 hover:text-gray-700">
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Cold Case Review #{review.review_number}
            </h1>
            <StatusBadge status={review.status as string} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {caseData?.first_name} {caseData?.last_name} - {caseData?.case_number}
          </p>
        </div>
        <div className="flex gap-3">
          {review.status === "pending" && (
            <button
              onClick={startReview}
              disabled={saving}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              Start Review
            </button>
          )}
          {review.status === "in_progress" && (
            <button
              onClick={() => setActiveSection("complete")}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Complete Review
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">Review Progress</h3>
          <span className="text-sm text-gray-500">{completedItems} of {totalItems} items completed</span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-200">
          <div
            className="h-3 rounded-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-4 text-center text-sm">
          <div>
            <p className="font-medium text-gray-900">{completedItems}</p>
            <p className="text-gray-500">Completed</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {checklistItems.filter((i) => (i as Record<string, unknown>).status === "in_progress").length}
            </p>
            <p className="text-gray-500">In Progress</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {checklistItems.filter((i) => (i as Record<string, unknown>).status === "pending").length}
            </p>
            <p className="text-gray-500">Pending</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {checklistItems.filter((i) => ["skipped", "not_applicable"].includes((i as Record<string, unknown>).status as string)).length}
            </p>
            <p className="text-gray-500">Skipped</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "checklist", label: "Checklist" },
            { id: "patterns", label: "Pattern Matches" },
            { id: "leads", label: "Recent Leads" },
            { id: "tips", label: "Recent Tips" },
            { id: "complete", label: "Complete Review" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={cn(
                "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium",
                activeSection === tab.id
                  ? "border-cyan-500 text-cyan-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Checklist Section */}
      {activeSection === "checklist" && (
        <div className="space-y-6">
          {categories.map((category) => {
            const items = itemsByCategory[category];
            if (!items || items.length === 0) return null;

            return (
              <div key={category} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900 capitalize">{category}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const i = item as Record<string, unknown>;
                    return (
                      <ChecklistItemRow
                        key={i.id as string}
                        item={i}
                        onUpdateStatus={(status, data) => updateChecklistItem(i.id as string, status, data)}
                        disabled={review.status !== "in_progress"}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pattern Matches Section */}
      {activeSection === "patterns" && (
        <PatternMatchesSection matches={(review.patternMatches as unknown[]) || []} />
      )}

      {/* Recent Leads Section */}
      {activeSection === "leads" && (
        <LeadsSection leads={(review.recentLeads as unknown[]) || []} />
      )}

      {/* Recent Tips Section */}
      {activeSection === "tips" && (
        <TipsSection tips={(review.recentTips as unknown[]) || []} />
      )}

      {/* Complete Review Section */}
      {activeSection === "complete" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Complete Review</h3>

          {/* Revival Decision */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={completionForm.revivalRecommended}
                  onChange={(e) => setCompletionForm({ ...completionForm, revivalRecommended: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="font-medium text-gray-900">Recommend Revival</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Decision</label>
              <select
                value={completionForm.revivalDecision}
                onChange={(e) => setCompletionForm({ ...completionForm, revivalDecision: e.target.value as RevivalDecision })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="revive">Revive Case (Make Active)</option>
                <option value="maintain_cold">Maintain Cold Status</option>
                <option value="archive">Archive Case</option>
              </select>
            </div>

            {completionForm.revivalRecommended && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Revival Justification</label>
                <textarea
                  value={completionForm.revivalJustification}
                  onChange={(e) => setCompletionForm({ ...completionForm, revivalJustification: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="Explain why this case should be revived..."
                />
              </div>
            )}
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Summary *</label>
            <textarea
              value={completionForm.summary}
              onChange={(e) => setCompletionForm({ ...completionForm, summary: e.target.value })}
              rows={4}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="Summarize the review findings..."
            />
          </div>

          {/* Recommendations */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Recommendations</label>
            <textarea
              value={completionForm.recommendations}
              onChange={(e) => setCompletionForm({ ...completionForm, recommendations: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="What actions should be taken?"
            />
          </div>

          {/* Next Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Next Steps</label>
            <textarea
              value={completionForm.nextSteps}
              onChange={(e) => setCompletionForm({ ...completionForm, nextSteps: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="Outline the next steps..."
            />
          </div>

          {/* Findings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">New Leads Identified</label>
              <input
                type="number"
                min="0"
                value={completionForm.newLeadsIdentified}
                onChange={(e) => setCompletionForm({ ...completionForm, newLeadsIdentified: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={completionForm.newEvidenceFound}
                  onChange={(e) => setCompletionForm({ ...completionForm, newEvidenceFound: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm font-medium text-gray-700">New Evidence Found</span>
              </label>
            </div>
          </div>

          {completionForm.newEvidenceFound && (
            <div>
              <label className="block text-sm font-medium text-gray-700">New Evidence Description</label>
              <textarea
                value={completionForm.newEvidenceDescription}
                onChange={(e) => setCompletionForm({ ...completionForm, newEvidenceDescription: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          )}

          {/* Recommendations Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={completionForm.dnaResubmissionRecommended}
                onChange={(e) => setCompletionForm({ ...completionForm, dnaResubmissionRecommended: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm font-medium text-gray-700">Recommend DNA Re-submission</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={completionForm.campaignRecommended}
                onChange={(e) => setCompletionForm({ ...completionForm, campaignRecommended: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm font-medium text-gray-700">Recommend Publicity Campaign</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={completionForm.escalationRecommended}
                onChange={(e) => setCompletionForm({ ...completionForm, escalationRecommended: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm font-medium text-gray-700">Recommend Escalation</span>
            </label>
          </div>

          {completionForm.escalationRecommended && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Escalation Reason</label>
              <textarea
                value={completionForm.escalationReason}
                onChange={(e) => setCompletionForm({ ...completionForm, escalationReason: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          )}

          {/* Family Notification */}
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <h4 className="font-medium text-gray-900">Family Notification</h4>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={completionForm.familyNotified}
                onChange={(e) => setCompletionForm({ ...completionForm, familyNotified: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm font-medium text-gray-700">Family has been notified of review</span>
            </label>

            {completionForm.familyNotified && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notification Method</label>
                  <select
                    value={completionForm.familyNotificationMethod}
                    onChange={(e) => setCompletionForm({ ...completionForm, familyNotificationMethod: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">Select method...</option>
                    <option value="phone">Phone Call</option>
                    <option value="email">Email</option>
                    <option value="in_person">In Person</option>
                    <option value="letter">Letter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Family Response</label>
                  <input
                    type="text"
                    value={completionForm.familyResponse}
                    onChange={(e) => setCompletionForm({ ...completionForm, familyResponse: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    placeholder="Brief summary of response..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setActiveSection("checklist")}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Checklist
            </button>
            <button
              onClick={completeReview}
              disabled={saving || !completionForm.summary}
              className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Completing..." : "Complete Review"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Checklist Item Row Component
function ChecklistItemRow({
  item,
  onUpdateStatus,
  disabled,
}: {
  item: Record<string, unknown>;
  onUpdateStatus: (status: ChecklistStatus, data?: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [findings, setFindings] = useState(item.findings as string || "");
  const [notes, setNotes] = useState(item.notes as string || "");

  const statusConfig: Record<string, { bg: string; text: string }> = {
    pending: { bg: "bg-gray-100", text: "text-gray-700" },
    in_progress: { bg: "bg-yellow-100", text: "text-yellow-700" },
    completed: { bg: "bg-green-100", text: "text-green-700" },
    skipped: { bg: "bg-orange-100", text: "text-orange-700" },
    not_applicable: { bg: "bg-gray-100", text: "text-gray-500" },
  };

  const config = statusConfig[item.status as string] || statusConfig.pending;

  return (
    <div className="px-6 py-4">
      <div className="flex items-start gap-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1"
          disabled={disabled}
        >
          <ChevronIcon className={cn("h-5 w-5 text-gray-400 transition-transform", expanded && "rotate-90")} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h4 className="font-medium text-gray-900">{item.item_name as string}</h4>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", config.bg, config.text)}>
              {(item.status as string).replace("_", " ")}
            </span>
          </div>
          {item.item_description && (
            <p className="mt-1 text-sm text-gray-500">{item.item_description as string}</p>
          )}
        </div>
        {!disabled && (
          <div className="flex gap-2">
            {item.status === "pending" && (
              <button
                onClick={() => onUpdateStatus("in_progress")}
                className="rounded px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
              >
                Start
              </button>
            )}
            {item.status === "in_progress" && (
              <button
                onClick={() => onUpdateStatus("completed", { findings, notes })}
                className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200"
              >
                Complete
              </button>
            )}
            {["pending", "in_progress"].includes(item.status as string) && (
              <button
                onClick={() => onUpdateStatus("skipped")}
                className="rounded px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Skip
              </button>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="mt-4 ml-9 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Findings</label>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={2}
              disabled={disabled || item.status === "completed"}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:bg-gray-50"
              placeholder="Document your findings..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={disabled || item.status === "completed"}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:bg-gray-50"
              placeholder="Additional notes..."
            />
          </div>
          {item.result_summary && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-700">Result Summary</p>
              <p className="mt-1 text-sm text-gray-600">{item.result_summary as string}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Pattern Matches Section
function PatternMatchesSection({ matches }: { matches: unknown[] }) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <PatternIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No pattern matches</h3>
        <p className="mt-2 text-sm text-gray-500">AI pattern matching has not found related cases</p>
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
                  {matchedCase?.first_name} {matchedCase?.last_name}
                </h4>
                <p className="text-sm text-gray-500">{matchedCase?.case_number}</p>
              </div>
              <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                {Math.round((m.confidence_score as number) * 100)}% confidence
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Match type: {m.match_type as string}</p>
          </div>
        );
      })}
    </div>
  );
}

// Leads Section
function LeadsSection({ leads }: { leads: unknown[] }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900">No recent leads</h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {leads.map((lead) => {
        const l = lead as Record<string, unknown>;
        return (
          <div key={l.id as string} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{l.title as string}</h4>
                <p className="text-sm text-gray-500">{l.source as string}</p>
              </div>
              <StatusBadge status={l.status as string} />
            </div>
            {l.description && (
              <p className="mt-2 text-sm text-gray-600">{l.description as string}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Tips Section
function TipsSection({ tips }: { tips: unknown[] }) {
  if (tips.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900">No recent tips</h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tips.map((tip) => {
        const t = tip as Record<string, unknown>;
        return (
          <div key={t.id as string} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">
                  {t.is_anonymous ? "Anonymous Tip" : (t.tipster_name as string)}
                </h4>
                <p className="text-sm text-gray-500">
                  {new Date(t.created_at as string).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={t.status as string} />
            </div>
            <p className="mt-2 text-sm text-gray-600">{t.content as string}</p>
          </div>
        );
      })}
    </div>
  );
}

// Helper Components
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    pending: { bg: "bg-gray-100", text: "text-gray-700" },
    in_progress: { bg: "bg-yellow-100", text: "text-yellow-700" },
    completed: { bg: "bg-green-100", text: "text-green-700" },
    new: { bg: "bg-blue-100", text: "text-blue-700" },
    investigating: { bg: "bg-yellow-100", text: "text-yellow-700" },
    verified: { bg: "bg-green-100", text: "text-green-700" },
    dismissed: { bg: "bg-gray-100", text: "text-gray-500" },
    reviewing: { bg: "bg-yellow-100", text: "text-yellow-700" },
    hoax: { bg: "bg-red-100", text: "text-red-700" },
  };

  const c = config[status] || { bg: "bg-gray-100", text: "text-gray-700" };

  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize", c.bg, c.text)}>
      {status.replace("_", " ")}
    </span>
  );
}

// Icons
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
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
