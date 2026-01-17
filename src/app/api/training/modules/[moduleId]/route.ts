import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ moduleId: string }>;
}

/**
 * GET /api/training/modules/[moduleId]
 * Get a single training module with lessons
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { moduleId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const includeProgress = searchParams.get("includeProgress") === "true";

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: module, error } = await supabase
      .from("training_modules")
      .select(
        `
        *,
        track:training_tracks(*),
        lessons:training_lessons(*),
        quizzes:training_quizzes(
          *,
          questions:quiz_questions(*)
        )
      `
      )
      .eq("id", moduleId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Module not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching module:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort lessons and quizzes by display_order
    if (module.lessons) {
      module.lessons.sort(
        (a: { display_order: number }, b: { display_order: number }) =>
          a.display_order - b.display_order
      );
    }
    if (module.quizzes) {
      module.quizzes.sort(
        (a: { display_order: number }, b: { display_order: number }) =>
          a.display_order - b.display_order
      );
      module.quizzes.forEach(
        (quiz: { questions?: { display_order: number }[] }) => {
          if (quiz.questions) {
            quiz.questions.sort((a, b) => a.display_order - b.display_order);
          }
        }
      );
    }

    // Include progress if requested
    if (includeProgress && user) {
      const { data: moduleProgress } = await supabase
        .from("training_module_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("module_id", moduleId)
        .single();

      const { data: lessonProgress } = await supabase
        .from("training_lesson_progress")
        .select("*")
        .eq("user_id", user.id);

      const { data: quizAttempts } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("user_id", user.id)
        .order("attempt_number", { ascending: false });

      const moduleWithProgress = {
        ...module,
        progress: moduleProgress,
        lessons: module.lessons?.map((lesson: { id: string }) => ({
          ...lesson,
          progress: lessonProgress?.find((p) => p.lesson_id === lesson.id),
        })),
        quizzes: module.quizzes?.map((quiz: { id: string }) => ({
          ...quiz,
          attempts: quizAttempts?.filter((a) => a.quiz_id === quiz.id),
          lastAttempt: quizAttempts?.find((a) => a.quiz_id === quiz.id),
        })),
      };

      return NextResponse.json({ data: moduleWithProgress });
    }

    return NextResponse.json({ data: module });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/training/modules/[moduleId]
 * Update a training module (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { moduleId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permissions
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.titleFr !== undefined) updateData.title_fr = body.titleFr;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.descriptionFr !== undefined)
      updateData.description_fr = body.descriptionFr;
    if (body.estimatedDurationMinutes !== undefined)
      updateData.estimated_duration_minutes = body.estimatedDurationMinutes;
    if (body.displayOrder !== undefined)
      updateData.display_order = body.displayOrder;
    if (body.isRequired !== undefined) updateData.is_required = body.isRequired;
    if (body.prerequisites !== undefined)
      updateData.prerequisites = body.prerequisites;
    if (body.status !== undefined) updateData.status = body.status;

    const { data, error } = await supabase
      .from("training_modules")
      .update(updateData)
      .eq("id", moduleId)
      .select()
      .single();

    if (error) {
      console.error("Error updating module:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/training/modules/[moduleId]
 * Delete a training module (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { moduleId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permissions
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("training_modules")
      .delete()
      .eq("id", moduleId);

    if (error) {
      console.error("Error deleting module:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
