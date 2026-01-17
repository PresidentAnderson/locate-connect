"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PublicGallery } from "@/components/success-stories";
import type { StoryGalleryItem, SuccessMetrics } from "@/types/success-story.types";

export default function SuccessStoriesPage() {
  const [stories, setStories] = useState<StoryGalleryItem[]>([]);
  const [metrics, setMetrics] = useState<Partial<SuccessMetrics> | undefined>();
  const [filters, setFilters] = useState<{
    categories: string[];
    popularTags: string[];
  }>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const response = await fetch("/api/success-stories/gallery");
      const data = await response.json();
      setStories(data.stories || []);
      setMetrics(data.metrics);
      setFilters(data.filters);
    } catch (error) {
      console.error("Error fetching stories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Success Stories</h1>
          <p className="text-sm text-gray-500">
            Celebrating successful case resolutions and community impact
          </p>
        </div>
        <Link
          href="/success-stories/manage"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Manage Stories
        </Link>
      </div>

      {/* Gallery */}
      {isLoading ? (
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
      ) : (
        <PublicGallery
          initialStories={stories}
          initialMetrics={metrics}
          initialFilters={filters}
        />
      )}
    </div>
  );
}
