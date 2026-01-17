"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  TrainingLesson,
  LessonSection,
  InteractiveStep,
} from "@/types/training.types";

interface LessonWithDetails extends TrainingLesson {
  progress?: { status: string; time_spent_seconds: number };
}

export default function LessonPage({
  params,
}: {
  params: Promise<{ trackId: string; moduleId: string; lessonId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    fetchLesson();
    startTimeRef.current = Date.now();

    // Mark as started
    markProgress("in_progress");

    return () => {
      // Save time spent when leaving
      saveTimeSpent();
    };
  }, [resolvedParams.lessonId]);

  const fetchLesson = async () => {
    try {
      // Fetch from module endpoint which includes lessons
      const response = await fetch(
        `/api/training/modules/${resolvedParams.moduleId}?includeProgress=true`
      );
      if (response.ok) {
        const result = await response.json();
        const foundLesson = result.data.lessons?.find(
          (l: TrainingLesson) => l.id === resolvedParams.lessonId
        );
        if (foundLesson) {
          setLesson(foundLesson);
        }
      }
    } catch (error) {
      console.error("Failed to fetch lesson:", error);
    } finally {
      setLoading(false);
    }
  };

  const markProgress = async (status: string) => {
    try {
      await fetch("/api/training/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: resolvedParams.lessonId,
          status,
        }),
      });
    } catch (error) {
      console.error("Failed to update progress:", error);
    }
  };

  const saveTimeSpent = async () => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      await fetch("/api/training/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: resolvedParams.lessonId,
          timeSpentSeconds: timeSpent,
        }),
      });
    } catch (error) {
      console.error("Failed to save time spent:", error);
    }
  };

  const completeLesson = async () => {
    setIsCompleting(true);
    await saveTimeSpent();
    await markProgress("completed");
    router.push(`/training/tracks/${resolvedParams.trackId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Lesson not found</h2>
        <Link
          href={`/training/tracks/${resolvedParams.trackId}`}
          className="mt-4 text-cyan-600 hover:text-cyan-700"
        >
          Return to Track
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/training" className="hover:text-gray-700">
          Training
        </Link>
        <ChevronRightIcon className="h-4 w-4" />
        <Link
          href={`/training/tracks/${resolvedParams.trackId}`}
          className="hover:text-gray-700"
        >
          Track
        </Link>
        <ChevronRightIcon className="h-4 w-4" />
        <span className="text-gray-900">{lesson.title}</span>
      </nav>

      {/* Lesson Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`px-3 py-1 text-xs rounded-full ${
              lesson.contentType === "video"
                ? "bg-red-100 text-red-700"
                : lesson.contentType === "interactive"
                ? "bg-purple-100 text-purple-700"
                : lesson.contentType === "walkthrough"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {lesson.contentType.replace("_", " ")}
          </span>
          <span className="text-sm text-gray-500">
            {lesson.estimatedDurationMinutes} min
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
      </div>

      {/* Lesson Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {lesson.contentType === "lesson" && (
          <LessonContent content={lesson.content as { sections: LessonSection[] }} />
        )}

        {lesson.contentType === "video" && (
          <VideoContent videoUrl={lesson.videoUrl} />
        )}

        {lesson.contentType === "interactive" && (
          <InteractiveContent
            content={lesson.content as { steps: InteractiveStep[] }}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
          />
        )}

        {lesson.contentType === "walkthrough" && (
          <WalkthroughContent
            content={lesson.content as { steps: InteractiveStep[] }}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/training/tracks/${resolvedParams.trackId}`}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Back to Track
        </Link>
        <button
          onClick={completeLesson}
          disabled={isCompleting}
          className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
        >
          {isCompleting ? "Saving..." : "Complete Lesson"}
        </button>
      </div>
    </div>
  );
}

function LessonContent({ content }: { content: { sections: LessonSection[] } }) {
  return (
    <div className="prose max-w-none">
      {content.sections?.map((section, index) => (
        <RenderSection key={index} section={section} />
      ))}
    </div>
  );
}

function RenderSection({ section }: { section: LessonSection }) {
  switch (section.type) {
    case "text":
      return <p className="text-gray-700 leading-relaxed mb-4">{section.content}</p>;

    case "heading":
      const HeadingTag = `h${section.level || 2}` as keyof JSX.IntrinsicElements;
      return (
        <HeadingTag className="font-semibold text-gray-900 mt-6 mb-3">
          {section.content}
        </HeadingTag>
      );

    case "list":
      return (
        <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700">
          {section.items?.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );

    case "callout":
      const colors = {
        info: "bg-blue-50 border-blue-200 text-blue-800",
        warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
        success: "bg-green-50 border-green-200 text-green-800",
        danger: "bg-red-50 border-red-200 text-red-800",
      };
      return (
        <div
          className={`p-4 rounded-lg border mb-4 ${
            colors[section.variant || "info"]
          }`}
        >
          {section.content}
        </div>
      );

    case "image":
      return (
        <figure className="mb-4">
          <img
            src={section.imageUrl}
            alt={section.caption || "Lesson image"}
            className="rounded-lg"
          />
          {section.caption && (
            <figcaption className="text-sm text-gray-500 mt-2 text-center">
              {section.caption}
            </figcaption>
          )}
        </figure>
      );

    default:
      return null;
  }
}

function VideoContent({ videoUrl }: { videoUrl?: string }) {
  if (!videoUrl) {
    return (
      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <PlayIcon className="h-16 w-16 mx-auto mb-4" />
          <p>Video placeholder</p>
          <p className="text-sm mt-2">Video content will be available soon</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden">
      <video src={videoUrl} controls className="w-full h-full" />
    </div>
  );
}

function InteractiveContent({
  content,
  currentStep,
  onStepChange,
}: {
  content: { steps: InteractiveStep[] };
  currentStep: number;
  onStepChange: (step: number) => void;
}) {
  const steps = content.steps || [];
  const step = steps[currentStep];

  if (!step) {
    return <p>No interactive content available.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`h-2 flex-1 rounded-full ${
              index < currentStep
                ? "bg-green-500"
                : index === currentStep
                ? "bg-cyan-500"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <div className="text-sm text-gray-500">
        Step {currentStep + 1} of {steps.length}
      </div>

      {/* Current Step */}
      <div className="p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
        <p className="text-gray-700">{step.content}</p>

        {/* Demo Area */}
        {step.action && (
          <div className="mt-6 p-8 bg-white border-2 border-dashed border-gray-300 rounded-lg text-center">
            <CursorIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              Interactive demonstration: {step.action.replace("-", " ")}
            </p>
            {step.target && (
              <p className="text-sm text-gray-400 mt-2">Target: {step.target}</p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onStepChange(currentStep - 1)}
          disabled={currentStep === 0}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => onStepChange(currentStep + 1)}
          disabled={currentStep >= steps.length - 1}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-gray-300"
        >
          {currentStep >= steps.length - 1 ? "Finished" : "Next Step"}
        </button>
      </div>
    </div>
  );
}

function WalkthroughContent({
  content,
  currentStep,
  onStepChange,
}: {
  content: { steps: InteractiveStep[] };
  currentStep: number;
  onStepChange: (step: number) => void;
}) {
  const steps = content.steps || [];
  const step = steps[currentStep];

  if (!step) {
    return <p>No walkthrough content available.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Steps Sidebar */}
      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Steps</h3>
          <div className="space-y-2">
            {steps.map((s, index) => (
              <button
                key={index}
                onClick={() => onStepChange(index)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  index === currentStep
                    ? "bg-cyan-50 border border-cyan-300"
                    : index < currentStep
                    ? "bg-green-50"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      index < currentStep
                        ? "bg-green-500 text-white"
                        : index === currentStep
                        ? "bg-cyan-500 text-white"
                        : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    {index < currentStep ? <CheckIcon className="h-3 w-3" /> : index + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {s.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{step.title}</h3>
            <p className="text-gray-700 mb-6">{step.content}</p>

            {/* Visual Demo */}
            <div className="aspect-video bg-white rounded-lg border border-gray-200 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <RouteIcon className="h-16 w-16 mx-auto mb-4" />
                <p>Walkthrough visualization</p>
                {step.action && (
                  <p className="text-sm mt-2">Action: {step.action.replace("-", " ")}</p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => onStepChange(currentStep - 1)}
              disabled={currentStep === 0}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => onStepChange(currentStep + 1)}
              disabled={currentStep >= steps.length - 1}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-gray-300"
            >
              {currentStep >= steps.length - 1 ? "Finished" : "Next Step"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icons
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
  );
}

function CursorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function RouteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
    </svg>
  );
}
