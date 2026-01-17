"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ConsentManagement, ApprovalWorkflow } from "@/components/success-stories";
import type {
  SuccessStoryWithRelations,
  StoryStatus,
  ConsentWorkflowState,
  ApprovalWorkflowState,
  CreateConsentInput,
  CreateApprovalInput,
  SubmitApprovalInput,
} from "@/types/success-story.types";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_COLORS: Record<StoryStatus, { bg: string; text: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-700" },
  pending_family_approval: { bg: "bg-amber-100", text: "text-amber-700" },
  pending_admin_approval: { bg: "bg-blue-100", text: "text-blue-700" },
  approved: { bg: "bg-green-100", text: "text-green-700" },
  published: { bg: "bg-cyan-100", text: "text-cyan-700" },
  archived: { bg: "bg-gray-100", text: "text-gray-500" },
  rejected: { bg: "bg-red-100", text: "text-red-700" },
};

const STATUS_LABELS: Record<StoryStatus, string> = {
  draft: "Draft",
  pending_family_approval: "Pending Family Approval",
  pending_admin_approval: "Pending Admin Approval",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
  rejected: "Rejected",
};

export default function StoryDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [story, setStory] = useState<SuccessStoryWithRelations | null>(null);
  const [consentState, setConsentState] = useState<ConsentWorkflowState | null>(
    null
  );
  const [approvalState, setApprovalState] =
    useState<ApprovalWorkflowState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "preview" | "consent" | "approval" | "settings"
  >("preview");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    fetchStory();
  }, [id]);

  const fetchStory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/success-stories/${id}`);
      if (!response.ok) throw new Error("Failed to fetch story");
      const data = await response.json();
      setStory(data);

      // Also fetch consent and approval states
      await Promise.all([fetchConsentState(), fetchApprovalState()]);
    } catch (error) {
      console.error("Error fetching story:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConsentState = async () => {
    try {
      const response = await fetch(`/api/success-stories/${id}/consent`);
      if (response.ok) {
        const data = await response.json();
        setConsentState(data.workflowState);
      }
    } catch (error) {
      console.error("Error fetching consent state:", error);
    }
  };

  const fetchApprovalState = async () => {
    try {
      const response = await fetch(`/api/success-stories/${id}/approvals`);
      if (response.ok) {
        const data = await response.json();
        setApprovalState(data.workflowState);
      }
    } catch (error) {
      console.error("Error fetching approval state:", error);
    }
  };

  const handleAddConsent = async (
    data: Omit<CreateConsentInput, "storyId">
  ) => {
    const response = await fetch(`/api/success-stories/${id}/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, storyId: id }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to add consent");
    }
  };

  const handleUpdateConsent = async (
    consentId: string,
    data: {
      isGranted?: boolean;
      withdrawnAt?: string;
      withdrawalReason?: string;
    }
  ) => {
    const response = await fetch(
      `/api/success-stories/${id}/consent/${consentId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update consent");
    }
  };

  const handleRequestApproval = async (
    data: Omit<CreateApprovalInput, "storyId">
  ) => {
    const response = await fetch(`/api/success-stories/${id}/approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, storyId: id }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to request approval");
    }
  };

  const handleSubmitDecision = async (
    approvalId: string,
    data: SubmitApprovalInput
  ) => {
    const response = await fetch(
      `/api/success-stories/${id}/approvals/${approvalId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to submit decision");
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const response = await fetch(`/api/success-stories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to publish");
      }

      await fetchStory();
    } catch (error) {
      console.error("Error publishing:", error);
      alert(error instanceof Error ? error.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Story Not Found</h2>
        <Link
          href="/success-stories/manage"
          className="mt-4 text-cyan-600 hover:text-cyan-700"
        >
          Back to Stories
        </Link>
      </div>
    );
  }

  const canPublish =
    story.status === "approved" &&
    consentState?.canPublish &&
    approvalState?.canPublish;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/success-stories/manage"
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{story.title}</h1>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  STATUS_COLORS[story.status].bg,
                  STATUS_COLORS[story.status].text
                )}
              >
                {STATUS_LABELS[story.status]}
              </span>
            </div>
            {story.case && (
              <p className="text-sm text-gray-500">
                Case {story.case.caseNumber}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canPublish && (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium text-white",
                isPublishing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              )}
            >
              {isPublishing ? "Publishing..." : "Publish Story"}
            </button>
          )}
          <Link
            href={`/success-stories/${id}/edit`}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Edit Story
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: "preview", label: "Preview" },
            { key: "consent", label: "Consent", badge: consentState?.pendingConsents.length },
            { key: "approval", label: "Approvals" },
            { key: "settings", label: "Settings" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                setActiveTab(tab.key as typeof activeTab)
              }
              className={cn(
                "relative border-b-2 pb-3 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-cyan-600 text-cyan-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          {/* Story Preview */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            {story.featuredImageUrl && (
              <img
                src={story.featuredImageUrl}
                alt=""
                className="mb-6 h-64 w-full rounded-lg object-cover"
              />
            )}

            <h2 className="text-2xl font-bold text-gray-900">{story.title}</h2>
            {story.titleFr && (
              <p className="text-lg text-gray-600 italic">{story.titleFr}</p>
            )}

            <p className="mt-4 text-gray-600">{story.summary}</p>

            {story.fullStory && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Full Story
                </h3>
                <p className="whitespace-pre-wrap text-gray-700">
                  {story.fullStory}
                </p>
              </div>
            )}

            {/* Quotes */}
            {(story.familyQuote ||
              story.investigatorQuote ||
              story.volunteerQuote) && (
              <div className="mt-6 border-t pt-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  Testimonials
                </h3>
                {story.familyQuote && (
                  <blockquote className="border-l-4 border-cyan-200 pl-4 italic text-gray-600">
                    &quot;{story.familyQuote}&quot;
                    <span className="block text-sm not-italic text-gray-500">
                      - Family
                    </span>
                  </blockquote>
                )}
                {story.investigatorQuote && (
                  <blockquote className="border-l-4 border-teal-200 pl-4 italic text-gray-600">
                    &quot;{story.investigatorQuote}&quot;
                    <span className="block text-sm not-italic text-gray-500">
                      - Investigator
                    </span>
                  </blockquote>
                )}
                {story.volunteerQuote && (
                  <blockquote className="border-l-4 border-green-200 pl-4 italic text-gray-600">
                    &quot;{story.volunteerQuote}&quot;
                    <span className="block text-sm not-italic text-gray-500">
                      - Volunteer
                    </span>
                  </blockquote>
                )}
              </div>
            )}

            {/* Tags */}
            {story.tags && story.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {story.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Story Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-2xl font-bold text-gray-900">{story.viewCount}</p>
              <p className="text-sm text-gray-500">Views</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-2xl font-bold text-gray-900">{story.shareCount}</p>
              <p className="text-sm text-gray-500">Shares</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-2xl font-bold text-gray-900">
                {story.daysUntilResolution || "-"}
              </p>
              <p className="text-sm text-gray-500">Days to Resolution</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-2xl font-bold text-gray-900 capitalize">
                {story.anonymizationLevel}
              </p>
              <p className="text-sm text-gray-500">Anonymization</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "consent" && consentState && (
        <ConsentManagement
          storyId={id}
          consents={story.consents || []}
          workflowState={consentState}
          onAddConsent={handleAddConsent}
          onUpdateConsent={handleUpdateConsent}
          onRefresh={fetchConsentState}
        />
      )}

      {activeTab === "approval" && approvalState && (
        <ApprovalWorkflow
          storyId={id}
          approvals={story.approvals || []}
          workflowState={approvalState}
          onRequestApproval={handleRequestApproval}
          onSubmitDecision={handleSubmitDecision}
          onRefresh={fetchApprovalState}
          isStaff={true}
        />
      )}

      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Story Settings
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Visibility</p>
                <p className="text-sm text-gray-600 capitalize">
                  {story.visibility}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Anonymization Level
                </p>
                <p className="text-sm text-gray-600 capitalize">
                  {story.anonymizationLevel}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Display Name</p>
                <p className="text-sm text-gray-600">
                  {story.displayName || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Display Location
                </p>
                <p className="text-sm text-gray-600">
                  {story.displayLocation || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Featured</p>
                <p className="text-sm text-gray-600">
                  {story.featuredOnHomepage ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Slug</p>
                <p className="text-sm text-gray-600">{story.slug || "Auto-generated"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Metadata
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Created</p>
                <p className="text-gray-600">
                  {new Date(story.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Last Updated</p>
                <p className="text-gray-600">
                  {new Date(story.updatedAt).toLocaleString()}
                </p>
              </div>
              {story.publishedAt && (
                <div>
                  <p className="font-medium text-gray-700">Published</p>
                  <p className="text-gray-600">
                    {new Date(story.publishedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h3 className="text-sm font-semibold text-red-800 mb-2">
              Danger Zone
            </h3>
            <p className="text-sm text-red-700 mb-4">
              These actions are irreversible. Please proceed with caution.
            </p>
            <button
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to archive this story? It will no longer be visible to the public."
                  )
                ) {
                  // Handle archive
                  fetch(`/api/success-stories/${id}`, { method: "DELETE" });
                  router.push("/success-stories/manage");
                }
              }}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Archive Story
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
      />
    </svg>
  );
}
