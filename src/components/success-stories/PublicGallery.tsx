"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { StoryGalleryItem, SuccessMetrics } from "@/types/success-story.types";

interface PublicGalleryProps {
  initialStories?: StoryGalleryItem[];
  initialMetrics?: Partial<SuccessMetrics>;
  initialFilters?: {
    categories: string[];
    popularTags: string[];
  };
}

export function PublicGallery({
  initialStories = [],
  initialMetrics,
  initialFilters,
}: PublicGalleryProps) {
  const [stories, setStories] = useState<StoryGalleryItem[]>(initialStories);
  const [metrics, setMetrics] = useState<Partial<SuccessMetrics> | undefined>(
    initialMetrics
  );
  const [filters, setFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(!initialStories.length);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFeatured, setShowFeatured] = useState(false);

  useEffect(() => {
    if (!initialStories.length) {
      fetchStories();
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchStories(true);
  }, [selectedCategory, selectedTags, showFeatured]);

  const fetchStories = async (reset = false) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", reset ? "1" : page.toString());
      params.set("pageSize", "12");

      if (selectedCategory) {
        params.set("outcomeCategory", selectedCategory);
      }
      if (selectedTags.length > 0) {
        params.set("tags", selectedTags.join(","));
      }
      if (showFeatured) {
        params.set("featured", "true");
      }

      const response = await fetch(`/api/success-stories/gallery?${params}`);
      const data = await response.json();

      if (reset) {
        setStories(data.stories);
      } else {
        setStories((prev) => [...prev, ...data.stories]);
      }

      setMetrics(data.metrics);
      setFilters(data.filters);
      setHasMore(data.hasMore);
      if (reset) setPage(1);
    } catch (error) {
      console.error("Error fetching stories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    setPage((prev) => prev + 1);
    fetchStories();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedTags([]);
    setShowFeatured(false);
  };

  const hasActiveFilters =
    selectedCategory || selectedTags.length > 0 || showFeatured;

  return (
    <div className="space-y-8">
      {/* Hero Metrics Section */}
      {metrics && (
        <div className="rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-600 p-8 text-white">
          <h2 className="text-2xl font-bold mb-6">Together, We Make a Difference</h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <MetricCard
              value={metrics.totalCasesResolved || 0}
              label="Cases Resolved"
              icon={<CheckIcon className="h-6 w-6" />}
            />
            <MetricCard
              value={metrics.foundAliveSafe || 0}
              label="Found Safe"
              icon={<HeartIcon className="h-6 w-6" />}
            />
            <MetricCard
              value={metrics.reunitedWithFamily || 0}
              label="Family Reunions"
              icon={<UsersIcon className="h-6 w-6" />}
            />
            <MetricCard
              value={metrics.storiesPublished || 0}
              label="Stories Shared"
              icon={<BookIcon className="h-6 w-6" />}
            />
          </div>
          {metrics.averageResolutionDays !== undefined && (
            <p className="mt-6 text-cyan-100 text-sm text-center">
              Average resolution time:{" "}
              <span className="font-semibold text-white">
                {Math.round(metrics.averageResolutionDays)} days
              </span>
            </p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Category:</label>
            <select
              value={selectedCategory || ""}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="">All Categories</option>
              {filters?.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {formatCategory(cat)}
                </option>
              ))}
            </select>
          </div>

          {/* Featured Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFeatured}
              onChange={(e) => setShowFeatured(e.target.checked)}
              className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-sm text-gray-700">Featured Only</span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-cyan-600 hover:text-cyan-700"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Tag Filters */}
        {filters?.popularTags && filters.popularTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.popularTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                  selectedTags.includes(tag)
                    ? "bg-cyan-100 text-cyan-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Story Grid */}
      {isLoading && stories.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-12">
          <BookIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No Stories Yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {hasActiveFilters
              ? "No stories match your current filters."
              : "Check back soon for inspiring success stories."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className={cn(
                  "rounded-lg px-6 py-2 font-medium transition-colors",
                  isLoading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-cyan-600 text-white hover:bg-cyan-700"
                )}
              >
                {isLoading ? "Loading..." : "Load More Stories"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Call to Action */}
      <div className="rounded-xl bg-gray-50 p-8 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Have a Success Story to Share?
        </h3>
        <p className="text-gray-600 mb-4 max-w-2xl mx-auto">
          If your case has been resolved and you would like to share your story to
          help raise awareness and inspire hope, we would love to hear from you.
        </p>
        <Link
          href="/success-stories/share"
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 font-medium text-white hover:bg-cyan-700"
        >
          Share Your Story
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

interface StoryCardProps {
  story: StoryGalleryItem;
}

function StoryCard({ story }: StoryCardProps) {
  return (
    <Link
      href={`/success-stories/${story.slug}`}
      className="group block rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-cyan-200 hover:shadow-lg transition-all"
    >
      {story.featuredImageUrl ? (
        <div className="relative h-48 bg-gray-100">
          <img
            src={story.featuredImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-cyan-100 to-teal-100 flex items-center justify-center">
          <HeartIcon className="h-16 w-16 text-cyan-300" />
        </div>
      )}

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 line-clamp-2">
          {story.title}
        </h3>

        <p className="mt-2 text-sm text-gray-600 line-clamp-3">{story.summary}</p>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>{story.displayLocation || "Location hidden"}</span>
          <span>
            {story.publishedAt
              ? new Date(story.publishedAt).toLocaleDateString()
              : ""}
          </span>
        </div>

        {story.tags && story.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {story.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                {tag}
              </span>
            ))}
            {story.tags.length > 3 && (
              <span className="text-xs text-gray-400">+{story.tags.length - 3}</span>
            )}
          </div>
        )}

        {story.daysUntilResolution !== undefined && (
          <div className="mt-3 flex items-center gap-1 text-xs text-cyan-600">
            <ClockIcon className="h-3.5 w-3.5" />
            <span>Resolved in {story.daysUntilResolution} days</span>
          </div>
        )}
      </div>
    </Link>
  );
}

interface MetricCardProps {
  value: number;
  label: string;
  icon: React.ReactNode;
}

function MetricCard({ value, label, icon }: MetricCardProps) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
        {icon}
      </div>
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
      <p className="text-sm text-cyan-100">{label}</p>
    </div>
  );
}

function formatCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Icon components
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
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
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
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
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
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
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
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
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
      />
    </svg>
  );
}
