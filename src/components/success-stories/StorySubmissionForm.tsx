"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type {
  CreateStoryInput,
  AnonymizationLevel,
  StoryVisibility,
} from "@/types/success-story.types";

interface StorySubmissionFormProps {
  caseId: string;
  caseName?: string;
  onSubmit: (data: CreateStoryInput) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateStoryInput>;
}

const OUTCOME_CATEGORIES = [
  { value: "reunion", label: "Family Reunion" },
  { value: "safe_recovery", label: "Safe Recovery" },
  { value: "community_effort", label: "Community Effort" },
  { value: "volunteer_success", label: "Volunteer Success" },
  { value: "law_enforcement", label: "Law Enforcement Success" },
  { value: "quick_resolution", label: "Quick Resolution" },
  { value: "cold_case_solved", label: "Cold Case Solved" },
];

const COMMON_TAGS = [
  "Reunion",
  "Volunteer",
  "Community",
  "Law Enforcement",
  "Tip Line",
  "Social Media",
  "Amber Alert",
  "Quick Find",
  "Cross-Border",
  "Indigenous",
];

export function StorySubmissionForm({
  caseId,
  caseName,
  onSubmit,
  onCancel,
  initialData,
}: StorySubmissionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<CreateStoryInput>({
    caseId,
    title: initialData?.title || "",
    titleFr: initialData?.titleFr || "",
    summary: initialData?.summary || "",
    summaryFr: initialData?.summaryFr || "",
    fullStory: initialData?.fullStory || "",
    fullStoryFr: initialData?.fullStoryFr || "",
    anonymizationLevel: initialData?.anonymizationLevel || "partial",
    displayName: initialData?.displayName || "",
    displayLocation: initialData?.displayLocation || "",
    featuredImageUrl: initialData?.featuredImageUrl || "",
    galleryImages: initialData?.galleryImages || [],
    videoUrl: initialData?.videoUrl || "",
    familyQuote: initialData?.familyQuote || "",
    familyQuoteFr: initialData?.familyQuoteFr || "",
    investigatorQuote: initialData?.investigatorQuote || "",
    investigatorQuoteFr: initialData?.investigatorQuoteFr || "",
    volunteerQuote: initialData?.volunteerQuote || "",
    volunteerQuoteFr: initialData?.volunteerQuoteFr || "",
    tags: initialData?.tags || [],
    outcomeCategory: initialData?.outcomeCategory || "",
    visibility: initialData?.visibility || "private",
  });

  const updateField = <K extends keyof CreateStoryInput>(
    field: K,
    value: CreateStoryInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleTag = (tag: string) => {
    const currentTags = formData.tags || [];
    if (currentTags.includes(tag)) {
      updateField(
        "tags",
        currentTags.filter((t) => t !== tag)
      );
    } else {
      updateField("tags", [...currentTags, tag]);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.title.trim()) {
        newErrors.title = "Title is required";
      }
      if (!formData.summary.trim()) {
        newErrors.summary = "Summary is required";
      }
      if (formData.summary.length > 500) {
        newErrors.summary = "Summary must be 500 characters or less";
      }
    }

    if (step === 2) {
      if (formData.anonymizationLevel === "none" && !formData.displayName) {
        newErrors.displayName = "Display name is required when not anonymizing";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting story:", error);
      setErrors({ submit: "Failed to submit story. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Basic Information" },
    { number: 2, title: "Privacy Settings" },
    { number: 3, title: "Quotes & Media" },
    { number: 4, title: "Review & Submit" },
  ];

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6">
      {/* Progress Steps */}
      <nav className="mb-8">
        <ol className="flex items-center">
          {steps.map((step, index) => (
            <li
              key={step.number}
              className={cn(
                "flex items-center",
                index < steps.length - 1 && "flex-1"
              )}
            >
              <div className="flex items-center">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                    currentStep === step.number
                      ? "bg-cyan-600 text-white"
                      : currentStep > step.number
                      ? "bg-cyan-100 text-cyan-700"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {currentStep > step.number ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </span>
                <span className="ml-2 hidden text-sm font-medium text-gray-700 sm:inline">
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "ml-4 h-0.5 flex-1",
                    currentStep > step.number ? "bg-cyan-600" : "bg-gray-200"
                  )}
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step Content */}
      <div className="space-y-6">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Tell Your Story
            </h2>
            {caseName && (
              <p className="text-sm text-gray-600">
                Creating success story for:{" "}
                <span className="font-medium">{caseName}</span>
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Story Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="e.g., 'A Community United: Sarah's Safe Return'"
                className={cn(
                  "mt-1 block w-full rounded-lg border px-4 py-2 text-sm",
                  errors.title
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
                )}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Title (French)
              </label>
              <input
                type="text"
                value={formData.titleFr || ""}
                onChange={(e) => updateField("titleFr", e.target.value)}
                placeholder="Optional French translation"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Summary * <span className="text-gray-500">(max 500 chars)</span>
              </label>
              <textarea
                value={formData.summary}
                onChange={(e) => updateField("summary", e.target.value)}
                placeholder="A brief summary that captures the essence of this success story..."
                rows={3}
                maxLength={500}
                className={cn(
                  "mt-1 block w-full rounded-lg border px-4 py-2 text-sm",
                  errors.summary
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
                )}
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.summary.length}/500 characters
              </p>
              {errors.summary && (
                <p className="mt-1 text-sm text-red-600">{errors.summary}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Story
              </label>
              <textarea
                value={formData.fullStory || ""}
                onChange={(e) => updateField("fullStory", e.target.value)}
                placeholder="Share the complete story of how this case was resolved..."
                rows={6}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Outcome Category
              </label>
              <select
                value={formData.outcomeCategory || ""}
                onChange={(e) => updateField("outcomeCategory", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
              >
                <option value="">Select a category</option>
                {OUTCOME_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tags
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {COMMON_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                      (formData.tags || []).includes(tag)
                        ? "bg-cyan-100 text-cyan-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Privacy & Anonymization
            </h2>
            <p className="text-sm text-gray-600">
              Control how personal information appears in the published story.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Anonymization Level
              </label>
              <div className="mt-2 space-y-2">
                {[
                  {
                    value: "full" as AnonymizationLevel,
                    label: "Full Anonymization",
                    description:
                      "All identifying information will be removed. Names will be replaced with initials or generic terms.",
                  },
                  {
                    value: "partial" as AnonymizationLevel,
                    label: "Partial Anonymization",
                    description:
                      "First names and general locations only. Last names and specific addresses hidden.",
                  },
                  {
                    value: "none" as AnonymizationLevel,
                    label: "No Anonymization",
                    description:
                      "Real names and details will be used (requires explicit consent).",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-start rounded-lg border p-4 transition-colors",
                      formData.anonymizationLevel === option.value
                        ? "border-cyan-500 bg-cyan-50"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="anonymizationLevel"
                      value={option.value}
                      checked={formData.anonymizationLevel === option.value}
                      onChange={(e) =>
                        updateField(
                          "anonymizationLevel",
                          e.target.value as AnonymizationLevel
                        )
                      }
                      className="mt-1 h-4 w-4 border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {option.label}
                      </p>
                      <p className="text-sm text-gray-500">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Display Name
                {formData.anonymizationLevel === "none" && " *"}
              </label>
              <input
                type="text"
                value={formData.displayName || ""}
                onChange={(e) => updateField("displayName", e.target.value)}
                placeholder={
                  formData.anonymizationLevel === "full"
                    ? "e.g., 'A Local Family' or 'J.S.'"
                    : "e.g., 'The Smith Family' or 'Sarah'"
                }
                className={cn(
                  "mt-1 block w-full rounded-lg border px-4 py-2 text-sm",
                  errors.displayName
                    ? "border-red-300"
                    : "border-gray-300 focus:border-cyan-500"
                )}
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                How the person/family will be referred to in the story
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Display Location
              </label>
              <input
                type="text"
                value={formData.displayLocation || ""}
                onChange={(e) => updateField("displayLocation", e.target.value)}
                placeholder={
                  formData.anonymizationLevel === "full"
                    ? "e.g., 'Southern Quebec' or 'Ontario'"
                    : "e.g., 'Montreal' or 'Greater Toronto Area'"
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                How specific the location reference will be
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Initial Visibility
              </label>
              <select
                value={formData.visibility || "private"}
                onChange={(e) =>
                  updateField("visibility", e.target.value as StoryVisibility)
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
              >
                <option value="private">Private (Draft)</option>
                <option value="internal">Internal (Staff Only)</option>
                <option value="public">Public (After Approval)</option>
              </select>
            </div>

            <div className="rounded-lg bg-amber-50 p-4">
              <div className="flex">
                <WarningIcon className="h-5 w-5 text-amber-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Consent Requirement
                  </h3>
                  <p className="mt-1 text-sm text-amber-700">
                    Before this story can be published, explicit consent must be
                    obtained from all parties mentioned. The consent management
                    workflow will be available after creating the draft.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Quotes & Media
            </h2>
            <p className="text-sm text-gray-600">
              Add testimonials and media to bring the story to life.
            </p>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Testimonials
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Family Quote
                </label>
                <textarea
                  value={formData.familyQuote || ""}
                  onChange={(e) => updateField("familyQuote", e.target.value)}
                  placeholder='"We are so grateful to everyone who helped bring our loved one home safely..."'
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Investigator/Agency Quote
                </label>
                <textarea
                  value={formData.investigatorQuote || ""}
                  onChange={(e) =>
                    updateField("investigatorQuote", e.target.value)
                  }
                  placeholder='"This case demonstrates the power of community collaboration..."'
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Volunteer Quote
                </label>
                <textarea
                  value={formData.volunteerQuote || ""}
                  onChange={(e) => updateField("volunteerQuote", e.target.value)}
                  placeholder='"Being part of this search effort reminded me how much our community cares..."'
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700">Media</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Featured Image URL
                </label>
                <input
                  type="url"
                  value={formData.featuredImageUrl || ""}
                  onChange={(e) =>
                    updateField("featuredImageUrl", e.target.value)
                  }
                  placeholder="https://..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Main image for the story (ensure you have permission to use)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Video URL
                </label>
                <input
                  type="url"
                  value={formData.videoUrl || ""}
                  onChange={(e) => updateField("videoUrl", e.target.value)}
                  placeholder="https://youtube.com/... or https://vimeo.com/..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-cyan-500 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Review Your Story
            </h2>

            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-xl font-bold text-gray-900">
                {formData.title}
              </h3>
              {formData.titleFr && (
                <p className="text-sm text-gray-500 italic">{formData.titleFr}</p>
              )}
              <p className="mt-2 text-gray-600">{formData.summary}</p>

              {formData.fullStory && (
                <div className="mt-4 border-t pt-4">
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {formData.fullStory}
                  </p>
                </div>
              )}

              {(formData.tags || []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1">
                  {(formData.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-medium text-gray-700">Anonymization</p>
                <p className="text-gray-600 capitalize">
                  {formData.anonymizationLevel?.replace("_", " ")}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-medium text-gray-700">Visibility</p>
                <p className="text-gray-600 capitalize">{formData.visibility}</p>
              </div>
              {formData.displayName && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="font-medium text-gray-700">Display Name</p>
                  <p className="text-gray-600">{formData.displayName}</p>
                </div>
              )}
              {formData.outcomeCategory && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="font-medium text-gray-700">Category</p>
                  <p className="text-gray-600 capitalize">
                    {formData.outcomeCategory.replace("_", " ")}
                  </p>
                </div>
              )}
            </div>

            {(formData.familyQuote ||
              formData.investigatorQuote ||
              formData.volunteerQuote) && (
              <div className="space-y-2">
                <p className="font-medium text-gray-700">Testimonials</p>
                {formData.familyQuote && (
                  <blockquote className="border-l-4 border-cyan-200 pl-4 italic text-gray-600">
                    &quot;{formData.familyQuote}&quot;
                    <span className="block text-sm not-italic">- Family</span>
                  </blockquote>
                )}
                {formData.investigatorQuote && (
                  <blockquote className="border-l-4 border-cyan-200 pl-4 italic text-gray-600">
                    &quot;{formData.investigatorQuote}&quot;
                    <span className="block text-sm not-italic">
                      - Investigator
                    </span>
                  </blockquote>
                )}
              </div>
            )}

            {errors.submit && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                {errors.submit}
              </div>
            )}

            <div className="rounded-lg bg-cyan-50 p-4">
              <p className="text-sm text-cyan-800">
                <strong>Next Steps:</strong> After creating this draft, you will
                be able to:
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm text-cyan-700">
                <li>Request consent from all parties involved</li>
                <li>Submit for family and administrative review</li>
                <li>Generate media-ready templates</li>
                <li>Publish once all approvals are complete</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between border-t pt-6">
        <button
          type="button"
          onClick={currentStep === 1 ? onCancel : handleBack}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {currentStep === 1 ? "Cancel" : "Back"}
        </button>
        <button
          type="button"
          onClick={currentStep === 4 ? handleSubmit : handleNext}
          disabled={isSubmitting}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium text-white",
            isSubmitting
              ? "cursor-not-allowed bg-gray-400"
              : "bg-cyan-600 hover:bg-cyan-700"
          )}
        >
          {isSubmitting
            ? "Creating..."
            : currentStep === 4
            ? "Create Story Draft"
            : "Next"}
        </button>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}
