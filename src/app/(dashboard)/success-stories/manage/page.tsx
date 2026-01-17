"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SuccessStoryWithRelations, StoryStatus } from "@/types/success-story.types";

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

export default function ManageStoriesPage() {
  const [stories, setStories] = useState<SuccessStoryWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StoryStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchStories();
  }, [statusFilter]);

  const fetchStories = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const response = await fetch(`/api/success-stories?${params}`);
      const data = await response.json();
      setStories(data.stories || []);
    } catch (error) {
      console.error("Error fetching stories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStories = stories.filter((story) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      story.title.toLowerCase().includes(query) ||
      story.summary.toLowerCase().includes(query) ||
      story.case?.caseNumber?.toLowerCase().includes(query)
    );
  });

  const statusCounts = stories.reduce(
    (acc, story) => {
      acc[story.status] = (acc[story.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Success Stories</h1>
          <p className="text-sm text-gray-500">
            Create, edit, and publish success stories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/success-stories/metrics"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View Metrics
          </Link>
          <Link
            href="/success-stories/new"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Create New Story
          </Link>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {(Object.keys(STATUS_LABELS) as StoryStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "rounded-lg border p-3 text-left transition-all",
              statusFilter === status
                ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500"
                : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            <p className="text-2xl font-bold text-gray-900">
              {statusCounts[status] || 0}
            </p>
            <p className="text-xs text-gray-500">{STATUS_LABELS[status]}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stories..."
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm"
          />
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {statusFilter !== "all" && (
          <button
            onClick={() => setStatusFilter("all")}
            className="text-sm text-cyan-600 hover:text-cyan-700"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Stories List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                </div>
                <div className="h-6 w-20 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-gray-300">
          <BookIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No Stories Found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery
              ? "No stories match your search."
              : statusFilter !== "all"
              ? `No ${STATUS_LABELS[statusFilter].toLowerCase()} stories.`
              : "Get started by creating your first success story."}
          </p>
          {!searchQuery && statusFilter === "all" && (
            <Link
              href="/success-stories/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              <PlusIcon className="h-4 w-4" />
              Create Story
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStories.map((story) => (
            <div
              key={story.id}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/success-stories/${story.id}`}
                      className="font-medium text-gray-900 hover:text-cyan-600 truncate"
                    >
                      {story.title}
                    </Link>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                        STATUS_COLORS[story.status].bg,
                        STATUS_COLORS[story.status].text
                      )}
                    >
                      {STATUS_LABELS[story.status]}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {story.summary}
                  </p>

                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    {story.case?.caseNumber && (
                      <span>Case: {story.case.caseNumber}</span>
                    )}
                    <span>
                      Created: {new Date(story.createdAt).toLocaleDateString()}
                    </span>
                    {story.publishedAt && (
                      <span>
                        Published: {new Date(story.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                    <span>Views: {story.viewCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/success-stories/${story.id}`}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    View
                  </Link>
                  <Link
                    href={`/success-stories/${story.id}/edit`}
                    className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700"
                  >
                    Edit
                  </Link>
                </div>
              </div>

              {/* Quick stats */}
              {(story.consents || story.approvals) && (
                <div className="mt-3 flex items-center gap-4 border-t pt-3">
                  {story.consents && (
                    <div className="flex items-center gap-1 text-xs">
                      <ShieldIcon className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-500">
                        {story.consents.filter((c) => c.isGranted && !c.withdrawnAt)
                          .length}{" "}
                        / {story.consents.length} consents
                      </span>
                    </div>
                  )}
                  {story.approvals && (
                    <div className="flex items-center gap-1 text-xs">
                      <CheckIcon className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-500">
                        {story.approvals.filter((a) => a.status === "approved")
                          .length}{" "}
                        / {story.approvals.length} approvals
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Icon components
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
