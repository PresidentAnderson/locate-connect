"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TrainingQuiz, QuizQuestion, QuizResult } from "@/types/training.types";

interface QuizWithQuestions extends TrainingQuiz {
  questions: QuizQuestion[];
}

export default function QuizPage({
  params,
}: {
  params: Promise<{ trackId: string; moduleId: string; quizId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [resolvedParams.quizId]);

  const fetchQuiz = async () => {
    try {
      const response = await fetch(
        `/api/training/modules/${resolvedParams.moduleId}?includeProgress=true`
      );
      if (response.ok) {
        const data = await response.json();
        const foundQuiz = data.data.quizzes?.find(
          (q: TrainingQuiz) => q.id === resolvedParams.quizId
        );
        if (foundQuiz) {
          // Shuffle questions if enabled
          let questions = foundQuiz.questions || [];
          if (foundQuiz.shuffle_questions) {
            questions = [...questions].sort(() => Math.random() - 0.5);
          }
          setQuiz({ ...foundQuiz, questions });
        }
      }
    } catch (error) {
      console.error("Failed to fetch quiz:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId: string, optionIndex: number) => {
    const question = quiz?.questions.find((q) => q.id === questionId);
    if (!question) return;

    if (question.questionType === "multi_select") {
      const current = answers[questionId] || [];
      if (current.includes(optionIndex)) {
        setAnswers({
          ...answers,
          [questionId]: current.filter((i) => i !== optionIndex),
        });
      } else {
        setAnswers({
          ...answers,
          [questionId]: [...current, optionIndex],
        });
      }
    } else {
      setAnswers({
        ...answers,
        [questionId]: [optionIndex],
      });
    }
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, selectedAnswers]) => ({
        questionId,
        selectedAnswers,
      }));

      const response = await fetch(
        `/api/training/quizzes/${resolvedParams.quizId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: formattedAnswers }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResult(data.data);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Failed to submit quiz:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Quiz not found</h2>
        <Link
          href={`/training/tracks/${resolvedParams.trackId}`}
          className="mt-4 text-cyan-600 hover:text-cyan-700"
        >
          Return to Track
        </Link>
      </div>
    );
  }

  if (showResults && result) {
    return (
      <ResultsView
        result={result}
        quiz={quiz}
        onRetry={() => {
          setShowResults(false);
          setResult(null);
          setAnswers({});
          setCurrentQuestion(0);
        }}
        onContinue={() => router.push(`/training/tracks/${resolvedParams.trackId}`)}
      />
    );
  }

  const question = quiz.questions[currentQuestion];
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;
  const hasAnswered = answers[question.id]?.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-sm text-gray-500 mt-1">{quiz.description}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              Question {currentQuestion + 1} of {quiz.questions.length}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Pass with {quiz.passPercentage}%
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-600 transition-all"
            style={{
              width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          {question.question}
        </h2>

        {question.questionType === "multi_select" && (
          <p className="text-sm text-gray-500 mb-4">Select all that apply</p>
        )}

        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = answers[question.id]?.includes(index);
            return (
              <button
                key={index}
                onClick={() => handleSelectAnswer(question.id, index)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-6 h-6 rounded-${
                      question.questionType === "multi_select" ? "md" : "full"
                    } border-2 flex items-center justify-center ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-500"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && <CheckIcon className="h-4 w-4 text-white" />}
                  </div>
                  <span className="text-gray-900">{option.text}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentQuestion(currentQuestion - 1)}
          disabled={currentQuestion === 0}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          Previous
        </button>

        <div className="flex items-center gap-2">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={`w-8 h-8 rounded-full text-sm ${
                index === currentQuestion
                  ? "bg-cyan-600 text-white"
                  : answers[quiz.questions[index].id]?.length > 0
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {isLastQuestion ? (
          <button
            onClick={submitQuiz}
            disabled={!hasAnswered || submitting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Quiz"}
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestion(currentQuestion + 1)}
            disabled={!hasAnswered}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function ResultsView({
  result,
  quiz,
  onRetry,
  onContinue,
}: {
  result: QuizResult;
  quiz: QuizWithQuestions;
  onRetry: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Results Header */}
      <div
        className={`rounded-lg border-2 p-8 text-center ${
          result.passed
            ? "bg-green-50 border-green-300"
            : "bg-red-50 border-red-300"
        }`}
      >
        <div
          className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
            result.passed ? "bg-green-100" : "bg-red-100"
          }`}
        >
          {result.passed ? (
            <TrophyIcon className="h-10 w-10 text-green-600" />
          ) : (
            <XCircleIcon className="h-10 w-10 text-red-600" />
          )}
        </div>
        <h1
          className={`mt-4 text-2xl font-bold ${
            result.passed ? "text-green-800" : "text-red-800"
          }`}
        >
          {result.passed ? "Congratulations!" : "Not Quite"}
        </h1>
        <p className={result.passed ? "text-green-700" : "text-red-700"}>
          {result.passed
            ? "You passed the quiz!"
            : `You need ${quiz.passPercentage}% to pass. Try again!`}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg">
            <p className="text-3xl font-bold text-gray-900">{result.scorePercentage}%</p>
            <p className="text-sm text-gray-500">Score</p>
          </div>
          <div className="p-4 bg-white rounded-lg">
            <p className="text-3xl font-bold text-gray-900">
              {result.correctCount}/{result.totalQuestions}
            </p>
            <p className="text-sm text-gray-500">Correct</p>
          </div>
          <div className="p-4 bg-white rounded-lg">
            <p className="text-3xl font-bold text-gray-900">
              {result.pointsEarned}/{result.totalPoints}
            </p>
            <p className="text-sm text-gray-500">Points</p>
          </div>
        </div>
      </div>

      {/* Answer Review */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Answer Review</h2>
        <div className="space-y-4">
          {result.feedback.map((fb, index) => {
            const question = quiz.questions.find((q) => q.id === fb.questionId);
            if (!question) return null;

            return (
              <div
                key={fb.questionId}
                className={`p-4 rounded-lg border ${
                  fb.isCorrect
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      fb.isCorrect ? "bg-green-500" : "bg-red-500"
                    }`}
                  >
                    {fb.isCorrect ? (
                      <CheckIcon className="h-4 w-4 text-white" />
                    ) : (
                      <XIcon className="h-4 w-4 text-white" />
                    )}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {index + 1}. {question.question}
                    </p>
                    {fb.correctAnswers && !fb.isCorrect && (
                      <p className="text-sm text-green-700 mt-2">
                        Correct answer:{" "}
                        {fb.correctAnswers
                          .map((i) => question.options[i]?.text)
                          .join(", ")}
                      </p>
                    )}
                    {fb.explanation && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        {fb.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4">
        {result.canRetry && !result.passed && (
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
          >
            Try Again
          </button>
        )}
        <button
          onClick={onContinue}
          className={`px-6 py-2 rounded-lg ${
            result.passed
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {result.passed ? "Continue to Track" : "Return to Track"}
        </button>
      </div>
    </div>
  );
}

// Icons
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
