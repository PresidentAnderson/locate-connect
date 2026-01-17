import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ quizId: string }>;
}

interface QuizAnswer {
  questionId: string;
  selectedAnswers: number[];
}

/**
 * POST /api/training/quizzes/[quizId]/submit
 * Submit quiz answers and get results
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { quizId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { answers } = body as { answers: QuizAnswer[] };

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "answers array is required" },
        { status: 400 }
      );
    }

    // Get quiz details
    const { data: quiz, error: quizError } = await supabase
      .from("training_quizzes")
      .select(
        `
        *,
        questions:quiz_questions(*)
      `
      )
      .eq("id", quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Check attempt count
    const { data: existingAttempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select("id, attempt_number")
      .eq("user_id", user.id)
      .eq("quiz_id", quizId)
      .order("attempt_number", { ascending: false });

    if (attemptsError) {
      console.error("Error checking attempts:", attemptsError);
      return NextResponse.json(
        { error: attemptsError.message },
        { status: 500 }
      );
    }

    const currentAttemptNumber = (existingAttempts?.[0]?.attempt_number || 0) + 1;

    if (quiz.max_attempts > 0 && currentAttemptNumber > quiz.max_attempts) {
      return NextResponse.json(
        { error: "Maximum attempts reached" },
        { status: 400 }
      );
    }

    // Create the attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        attempt_number: currentAttemptNumber,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (attemptError) {
      console.error("Error creating attempt:", attemptError);
      return NextResponse.json(
        { error: attemptError.message },
        { status: 500 }
      );
    }

    // Grade answers
    const questions = quiz.questions as {
      id: string;
      correct_answers: number[];
      points: number;
    }[];
    let totalPoints = 0;
    let earnedPoints = 0;
    const gradedAnswers = [];
    const feedback = [];

    for (const question of questions) {
      totalPoints += question.points;

      const userAnswer = answers.find((a) => a.questionId === question.id);
      const selectedAnswers = userAnswer?.selectedAnswers || [];

      // Compare arrays
      const correctAnswers = question.correct_answers as number[];
      const isCorrect =
        JSON.stringify(selectedAnswers.sort()) ===
        JSON.stringify(correctAnswers.sort());

      const pointsEarned = isCorrect ? question.points : 0;
      earnedPoints += pointsEarned;

      gradedAnswers.push({
        attempt_id: attempt.id,
        question_id: question.id,
        selected_answers: selectedAnswers,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        answered_at: new Date().toISOString(),
      });

      feedback.push({
        questionId: question.id,
        isCorrect,
        correctAnswers: quiz.show_correct_answers ? correctAnswers : undefined,
        explanation: quiz.show_correct_answers
          ? (question as { explanation?: string }).explanation
          : undefined,
      });
    }

    // Insert all answers
    const { error: answersError } = await supabase
      .from("quiz_answers")
      .insert(gradedAnswers);

    if (answersError) {
      console.error("Error saving answers:", answersError);
      return NextResponse.json(
        { error: answersError.message },
        { status: 500 }
      );
    }

    // Calculate score
    const scorePercentage = Math.round((earnedPoints / totalPoints) * 100);
    const passed = scorePercentage >= quiz.pass_percentage;

    // Update attempt with results
    const { error: updateError } = await supabase
      .from("quiz_attempts")
      .update({
        score_percentage: scorePercentage,
        passed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", attempt.id);

    if (updateError) {
      console.error("Error updating attempt:", updateError);
    }

    // If passed, mark the module's quiz requirement as met
    if (passed) {
      // Update or create module progress to reflect quiz completion
      const { data: module } = await supabase
        .from("training_modules")
        .select("id, track_id")
        .eq("id", quiz.module_id)
        .single();

      if (module) {
        // Get current module progress
        const { data: moduleProgress } = await supabase
          .from("training_module_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("module_id", module.id)
          .single();

        // If module wasn't completed yet, check if quiz was the last requirement
        if (!moduleProgress?.completed_at) {
          // Check if all lessons are completed
          const { data: lessonsProgress } = await supabase
            .from("training_lesson_progress")
            .select("*")
            .eq("user_id", user.id);

          const { data: lessons } = await supabase
            .from("training_lessons")
            .select("id")
            .eq("module_id", module.id)
            .eq("is_required", true)
            .eq("status", "published");

          const allLessonsCompleted = lessons?.every((lesson) =>
            lessonsProgress?.some(
              (p) => p.lesson_id === lesson.id && p.status === "completed"
            )
          );

          if (allLessonsCompleted) {
            // Mark module as completed
            await supabase.from("training_module_progress").upsert(
              {
                user_id: user.id,
                module_id: module.id,
                status: "completed",
                progress_percentage: 100,
                completed_at: new Date().toISOString(),
                last_activity_at: new Date().toISOString(),
              },
              { onConflict: "user_id,module_id" }
            );
          }
        }
      }
    }

    return NextResponse.json({
      data: {
        attemptId: attempt.id,
        attemptNumber: currentAttemptNumber,
        scorePercentage,
        passed,
        correctCount: gradedAnswers.filter((a) => a.is_correct).length,
        totalQuestions: questions.length,
        pointsEarned: earnedPoints,
        totalPoints,
        feedback,
        canRetry:
          quiz.max_attempts === 0 ||
          currentAttemptNumber < quiz.max_attempts,
        attemptsRemaining:
          quiz.max_attempts > 0
            ? quiz.max_attempts - currentAttemptNumber
            : null,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
