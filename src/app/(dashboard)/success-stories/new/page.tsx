"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { StorySubmissionForm } from "@/components/success-stories";
import type { CreateStoryInput } from "@/types/success-story.types";

interface ResolvedCase {
  id: string;
  caseNumber: string;
  firstName: string;
  lastName: string;
  disposition: string;
  resolutionDate: string;
}

function NewStoryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCaseId = searchParams.get("caseId");

  const [resolvedCases, setResolvedCases] = useState<ResolvedCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<ResolvedCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchResolvedCases();
  }, []);

  useEffect(() => {
    if (preselectedCaseId && resolvedCases.length > 0) {
      const caseData = resolvedCases.find((c) => c.id === preselectedCaseId);
      if (caseData) {
        setSelectedCase(caseData);
        setShowForm(true);
      }
    }
  }, [preselectedCaseId, resolvedCases]);

  const fetchResolvedCases = async () => {
    try {
      // Fetch resolved cases that don't have stories yet
      const response = await fetch("/api/v1/cases?status=resolved,closed&limit=100");
      const data = await response.json();

      // Transform data
      const cases = (data.cases || data.data || []).map((c: Record<string, unknown>) => ({
        id: c.id,
        caseNumber: c.case_number || c.caseNumber,
        firstName: c.first_name || c.firstName,
        lastName: c.last_name || c.lastName,
        disposition: c.disposition,
        resolutionDate: c.resolution_date || c.resolutionDate,
      }));

      setResolvedCases(cases);
    } catch (error) {
      console.error("Error fetching cases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: CreateStoryInput) => {
    const response = await fetch("/api/success-stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create story");
    }

    const story = await response.json();
    router.push(`/success-stories/${story.id}`);
  };

  const handleCancel = () => {
    if (showForm) {
      setShowForm(false);
      setSelectedCase(null);
    } else {
      router.push("/success-stories/manage");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
      </div>
    );
  }

  if (showForm && selectedCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setShowForm(false);
              setSelectedCase(null);
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Success Story</h1>
            <p className="text-sm text-gray-500">
              For case {selectedCase.caseNumber}
            </p>
          </div>
        </div>

        <StorySubmissionForm
          caseId={selectedCase.id}
          caseName={`${selectedCase.firstName} ${selectedCase.lastName}`}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Success Story</h1>
          <p className="text-sm text-gray-500">
            Select a resolved case to create a success story
          </p>
        </div>
        <Link
          href="/success-stories/manage"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Stories
        </Link>
      </div>

      {resolvedCases.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-gray-300">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No Resolved Cases
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Success stories can only be created for resolved or closed cases.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Found {resolvedCases.length} resolved case(s). Select one to create a
            success story:
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resolvedCases.map((caseItem) => (
              <button
                key={caseItem.id}
                onClick={() => {
                  setSelectedCase(caseItem);
                  setShowForm(true);
                }}
                className="rounded-lg border border-gray-200 bg-white p-4 text-left hover:border-cyan-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {caseItem.firstName} {caseItem.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{caseItem.caseNumber}</p>
                  </div>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    {formatDisposition(caseItem.disposition)}
                  </span>
                </div>
                {caseItem.resolutionDate && (
                  <p className="mt-2 text-xs text-gray-400">
                    Resolved: {new Date(caseItem.resolutionDate).toLocaleDateString()}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewSuccessStoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
        </div>
      }
    >
      <NewStoryForm />
    </Suspense>
  );
}

function formatDisposition(disposition: string): string {
  const labels: Record<string, string> = {
    found_alive_safe: "Found Safe",
    found_alive_injured: "Found (Injured)",
    returned_voluntarily: "Returned",
    located_runaway: "Located",
    other: "Resolved",
  };
  return labels[disposition] || disposition?.replace(/_/g, " ") || "Resolved";
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}
