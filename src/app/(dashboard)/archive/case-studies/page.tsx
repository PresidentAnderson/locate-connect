"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface CaseStudySection {
  id: string;
  section_type: string;
  title: string;
  content: string;
  order_index: number;
}

interface CaseStudy {
  id: string;
  study_number: string;
  title: string;
  summary: string;
  study_type: string;
  difficulty_level: string;
  target_audience: string[];
  learning_objectives: string[];
  tags: string[];
  status: string;
  view_count: number;
  created_at: string;
  published_at: string | null;
  sections?: CaseStudySection[];
}

type StudyType = "all" | "training" | "educational" | "research" | "best_practice";
type DifficultyLevel = "all" | "beginner" | "intermediate" | "advanced" | "expert";

export default function CaseStudiesPage() {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [studyType, setStudyType] = useState<StudyType>("all");
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedStudy, setSelectedStudy] = useState<CaseStudy | null>(null);
  const pageSize = 12;

  const fetchCaseStudies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (searchQuery) params.append("search", searchQuery);
      if (studyType !== "all") params.append("studyType", studyType);
      if (difficultyLevel !== "all") params.append("difficulty", difficultyLevel);

      const response = await fetch(`/api/archive/case-studies?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch case studies");
      }

      setCaseStudies(data.caseStudies || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, studyType, difficultyLevel]);

  useEffect(() => {
    fetchCaseStudies();
  }, [fetchCaseStudies]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-blue-100 text-blue-800";
      case "advanced":
        return "bg-orange-100 text-orange-800";
      case "expert":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStudyTypeLabel = (type: string) => {
    switch (type) {
      case "training":
        return "Training Module";
      case "educational":
        return "Educational";
      case "research":
        return "Research Paper";
      case "best_practice":
        return "Best Practice";
      default:
        return type;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not published";
    return new Date(dateString).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Case Studies</h1>
          <p className="mt-1 text-sm text-gray-600">
            Educational case studies and training materials derived from anonymized historical cases
          </p>
        </div>
        <Link
          href="/archive"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Archive
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search
            </label>
            <div className="relative mt-1">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by title, summary, or tags..."
                className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Study Type */}
          <div>
            <label htmlFor="studyType" className="block text-sm font-medium text-gray-700">
              Study Type
            </label>
            <select
              id="studyType"
              value={studyType}
              onChange={(e) => {
                setStudyType(e.target.value as StudyType);
                setPage(1);
              }}
              className="mt-1 block w-full rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="all">All Types</option>
              <option value="training">Training Modules</option>
              <option value="educational">Educational</option>
              <option value="research">Research Papers</option>
              <option value="best_practice">Best Practices</option>
            </select>
          </div>

          {/* Difficulty Level */}
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
              Difficulty
            </label>
            <select
              id="difficulty"
              value={difficultyLevel}
              onChange={(e) => {
                setDifficultyLevel(e.target.value as DifficultyLevel);
                setPage(1);
              }}
              className="mt-1 block w-full rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {totalCount} case {totalCount === 1 ? "study" : "studies"} found
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded bg-gray-200" />
                <div className="h-3 w-5/6 rounded bg-gray-200" />
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-6 w-16 rounded bg-gray-200" />
                <div className="h-6 w-20 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : caseStudies.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No case studies found</h3>
          <p className="mt-2 text-sm text-gray-600">
            Try adjusting your search filters or check back later for new content.
          </p>
        </div>
      ) : (
        <>
          {/* Case Studies Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {caseStudies.map((study) => (
              <article
                key={study.id}
                className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex-1 p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-gray-500">{study.study_number}</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getDifficultyColor(study.difficulty_level)}`}>
                      {study.difficulty_level}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="mt-2 text-lg font-semibold text-gray-900 line-clamp-2">
                    {study.title}
                  </h3>

                  {/* Type */}
                  <p className="mt-1 text-sm text-cyan-600">{getStudyTypeLabel(study.study_type)}</p>

                  {/* Summary */}
                  <p className="mt-3 text-sm text-gray-600 line-clamp-3">{study.summary}</p>

                  {/* Learning Objectives */}
                  {study.learning_objectives && study.learning_objectives.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-500">Learning Objectives:</p>
                      <ul className="mt-1 space-y-1">
                        {study.learning_objectives.slice(0, 2).map((objective, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <svg className="mt-0.5 h-3 w-3 flex-shrink-0 text-cyan-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                            <span className="line-clamp-1">{objective}</span>
                          </li>
                        ))}
                        {study.learning_objectives.length > 2 && (
                          <li className="text-xs text-gray-500">
                            +{study.learning_objectives.length - 2} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Tags */}
                  {study.tags && study.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {study.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                      {study.tags.length > 3 && (
                        <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          +{study.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                        {study.view_count}
                      </span>
                      <span>{formatDate(study.published_at)}</span>
                    </div>
                    <button
                      onClick={() => setSelectedStudy(study)}
                      className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
                    >
                      View Study
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      {/* Case Study Detail Modal */}
      {selectedStudy && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setSelectedStudy(null)}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl">
              {/* Close Button */}
              <button
                onClick={() => setSelectedStudy(null)}
                className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Content */}
              <div className="max-h-[85vh] overflow-y-auto p-6">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">{selectedStudy.study_number}</span>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getDifficultyColor(selectedStudy.difficulty_level)}`}>
                      {selectedStudy.difficulty_level}
                    </span>
                    <span className="inline-flex rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-medium text-cyan-800">
                      {getStudyTypeLabel(selectedStudy.study_type)}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-bold text-gray-900">{selectedStudy.title}</h2>
                  <p className="mt-2 text-gray-600">{selectedStudy.summary}</p>
                </div>

                {/* Target Audience */}
                {selectedStudy.target_audience && selectedStudy.target_audience.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900">Target Audience</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedStudy.target_audience.map((audience) => (
                        <span
                          key={audience}
                          className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800"
                        >
                          {audience}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Learning Objectives */}
                {selectedStudy.learning_objectives && selectedStudy.learning_objectives.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900">Learning Objectives</h3>
                    <ul className="mt-2 space-y-2">
                      {selectedStudy.learning_objectives.map((objective, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                          {objective}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tags */}
                {selectedStudy.tags && selectedStudy.tags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900">Tags</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedStudy.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex rounded bg-gray-100 px-2.5 py-1 text-sm text-gray-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Published:</span>{" "}
                      <span className="font-medium text-gray-900">{formatDate(selectedStudy.published_at)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Views:</span>{" "}
                      <span className="font-medium text-gray-900">{selectedStudy.view_count}</span>
                    </div>
                  </div>
                </div>

                {/* Note about full content */}
                <div className="mt-6 rounded-lg bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <svg className="h-5 w-5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-800">Research Access Required</p>
                      <p className="mt-1 text-sm text-amber-700">
                        Full case study content including detailed sections, analysis, and source materials requires approved research access.
                        Visit the <Link href="/research-portal/access-request" className="font-medium underline hover:no-underline">Research Portal</Link> to request access.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
