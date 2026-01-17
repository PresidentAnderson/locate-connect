"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  TrainingTrack,
  TrainingModule,
  TrainingLesson,
  TrainingModuleProgress,
  TrainingLessonProgress,
} from "@/types/training.types";

interface ModuleWithProgress extends TrainingModule {
  progress?: TrainingModuleProgress;
  lessons?: (TrainingLesson & { progress?: TrainingLessonProgress })[];
}

interface TrackWithDetails extends TrainingTrack {
  progress?: { status: string; progress_percentage: number };
  certification?: { id: string; certificate_number: string };
  modules?: ModuleWithProgress[];
}

export default function TrackDetailPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [track, setTrack] = useState<TrackWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  useEffect(() => {
    fetchTrack();
  }, [resolvedParams.trackId]);

  const fetchTrack = async () => {
    try {
      const response = await fetch(
        `/api/training/tracks/${resolvedParams.trackId}?includeModules=true&includeLessons=true&includeProgress=true`
      );
      if (response.ok) {
        const result = await response.json();
        setTrack(result.data);
        // Auto-select first incomplete module or first module
        if (result.data.modules?.length > 0) {
          const firstIncomplete = result.data.modules.find(
            (m: ModuleWithProgress) =>
              !m.progress || m.progress.status !== "completed"
          );
          setActiveModuleId(firstIncomplete?.id || result.data.modules[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch track:", error);
    } finally {
      setLoading(false);
    }
  };

  const startLesson = (moduleId: string, lessonId: string) => {
    router.push(`/training/tracks/${resolvedParams.trackId}/modules/${moduleId}/lessons/${lessonId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Track not found</h2>
        <Link href="/training" className="mt-4 text-cyan-600 hover:text-cyan-700">
          Return to Training
        </Link>
      </div>
    );
  }

  const activeModule = track.modules?.find((m) => m.id === activeModuleId);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/training" className="hover:text-gray-700">
          Training
        </Link>
        <ChevronRightIcon className="h-4 w-4" />
        <span className="text-gray-900">{track.title}</span>
      </nav>

      {/* Track Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: track.color ? `${track.color}20` : "#06b6d420" }}
            >
              <AcademicCapIcon
                className="h-8 w-8"
                style={{ color: track.color || "#0891b2" }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{track.title}</h1>
              {track.description && (
                <p className="mt-1 text-gray-500">{track.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <ClockIcon className="h-4 w-4" />
                  {track.estimatedDurationMinutes} minutes
                </span>
                <span className="flex items-center gap-1">
                  <BookOpenIcon className="h-4 w-4" />
                  {track.modules?.length || 0} modules
                </span>
                {track.isCertificationTrack && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CertificateIcon className="h-4 w-4" />
                    Certification included
                  </span>
                )}
              </div>
            </div>
          </div>
          {track.progress?.status === "completed" && track.certification && (
            <button className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
              View Certificate
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {track.progress && (
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Overall Progress</span>
              <span>{track.progress.progress_percentage}% Complete</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-600 transition-all"
                style={{ width: `${track.progress.progress_percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Module List */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modules</h2>
          {track.modules?.map((module, index) => (
            <button
              key={module.id}
              onClick={() => setActiveModuleId(module.id)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                activeModuleId === module.id
                  ? "bg-cyan-50 border-cyan-300"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium ${
                    module.progress?.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : module.progress?.status === "in_progress"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {module.progress?.status === "completed" ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{module.title}</h3>
                  <p className="text-xs text-gray-500">{module.estimatedDurationMinutes} min</p>
                </div>
              </div>
              {module.progress && module.progress.progressPercentage > 0 && module.progress.status !== "completed" && (
                <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-600"
                    style={{ width: `${module.progress.progressPercentage}%` }}
                  />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Module Content */}
        <div className="lg:col-span-3">
          {activeModule ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{activeModule.title}</h2>
                  {activeModule.description && (
                    <p className="mt-1 text-gray-500">{activeModule.description}</p>
                  )}
                </div>
                {activeModule.progress?.status === "completed" && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    Completed
                  </span>
                )}
              </div>

              {/* Lessons */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Lessons
                </h3>
                {activeModule.lessons?.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      lesson.progress?.status === "completed"
                        ? "bg-green-50 border-green-200"
                        : lesson.progress?.status === "in_progress"
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                        lesson.progress?.status === "completed"
                          ? "bg-green-500 text-white"
                          : lesson.progress?.status === "in_progress"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      {lesson.progress?.status === "completed" ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{lesson.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          {getLessonTypeIcon(lesson.contentType)}
                          {lesson.contentType.replace("_", " ")}
                        </span>
                        <span>{lesson.estimatedDurationMinutes} min</span>
                      </div>
                    </div>
                    <button
                      onClick={() => startLesson(activeModule.id, lesson.id)}
                      className={`px-4 py-2 text-sm rounded-lg ${
                        lesson.progress?.status === "completed"
                          ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          : "bg-cyan-600 text-white hover:bg-cyan-700"
                      }`}
                    >
                      {lesson.progress?.status === "completed"
                        ? "Review"
                        : lesson.progress?.status === "in_progress"
                        ? "Continue"
                        : "Start"}
                    </button>
                  </div>
                ))}
              </div>

              {/* Quiz (if module has one) */}
              {activeModule.quizzes && activeModule.quizzes.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    Assessment
                  </h3>
                  {activeModule.quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <QuizIcon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{quiz.title}</h4>
                        <p className="text-sm text-gray-500">
                          Pass with {quiz.passPercentage}% to complete this module
                        </p>
                      </div>
                      <Link
                        href={`/training/tracks/${resolvedParams.trackId}/modules/${activeModule.id}/quiz/${quiz.id}`}
                        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                      >
                        Take Quiz
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">Select a module to view its content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getLessonTypeIcon(type: string) {
  switch (type) {
    case "video":
      return <VideoIcon className="h-4 w-4" />;
    case "interactive":
      return <CursorIcon className="h-4 w-4" />;
    case "quiz":
      return <QuizIcon className="h-4 w-4" />;
    case "walkthrough":
      return <RouteIcon className="h-4 w-4" />;
    default:
      return <BookOpenIcon className="h-4 w-4" />;
  }
}

// Icons
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function AcademicCapIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function CertificateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
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

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
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

function QuizIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
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
