import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/training/progress
 * Get user's training progress across all tracks
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get("trackId");

    // Get track progress
    let trackProgressQuery = supabase
      .from("training_track_progress")
      .select(
        `
        *,
        track:training_tracks(*)
      `
      )
      .eq("user_id", user.id)
      .order("last_activity_at", { ascending: false });

    if (trackId) {
      trackProgressQuery = trackProgressQuery.eq("track_id", trackId);
    }

    const { data: trackProgress, error: trackError } = await trackProgressQuery;

    if (trackError) {
      console.error("Error fetching track progress:", trackError);
      return NextResponse.json({ error: trackError.message }, { status: 500 });
    }

    // Get module progress
    const { data: moduleProgress, error: moduleError } = await supabase
      .from("training_module_progress")
      .select(
        `
        *,
        module:training_modules(
          *,
          track:training_tracks(id, title)
        )
      `
      )
      .eq("user_id", user.id)
      .order("last_activity_at", { ascending: false });

    if (moduleError) {
      console.error("Error fetching module progress:", moduleError);
      return NextResponse.json({ error: moduleError.message }, { status: 500 });
    }

    // Get lesson progress
    const { data: lessonProgress, error: lessonError } = await supabase
      .from("training_lesson_progress")
      .select(
        `
        *,
        lesson:training_lessons(
          id, title, module_id
        )
      `
      )
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false });

    if (lessonError) {
      console.error("Error fetching lesson progress:", lessonError);
      return NextResponse.json({ error: lessonError.message }, { status: 500 });
    }

    // Calculate stats
    const stats = {
      totalTracksStarted: trackProgress?.filter(
        (p) => p.status !== "not_started"
      ).length,
      totalTracksCompleted: trackProgress?.filter(
        (p) => p.status === "completed"
      ).length,
      totalModulesCompleted: moduleProgress?.filter(
        (p) => p.status === "completed"
      ).length,
      totalLessonsCompleted: lessonProgress?.filter(
        (p) => p.status === "completed"
      ).length,
      totalTimeSpentSeconds: lessonProgress?.reduce(
        (sum, p) => sum + (p.time_spent_seconds || 0),
        0
      ),
      recentActivity: trackProgress?.slice(0, 5),
    };

    return NextResponse.json({
      data: {
        trackProgress,
        moduleProgress,
        lessonProgress,
        stats,
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

/**
 * POST /api/training/progress
 * Update lesson progress (mark as started/completed)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, status, timeSpentSeconds } = body;

    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId is required" },
        { status: 400 }
      );
    }

    // Get the lesson to find the module
    const { data: lesson, error: lessonError } = await supabase
      .from("training_lessons")
      .select("id, module_id")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Update or insert lesson progress
    const now = new Date().toISOString();
    const progressData: Record<string, unknown> = {
      user_id: user.id,
      lesson_id: lessonId,
      status: status || "in_progress",
      last_activity_at: now,
    };

    if (status === "in_progress" || status === "not_started") {
      progressData.started_at = now;
    }

    if (status === "completed") {
      progressData.completed_at = now;
    }

    if (timeSpentSeconds !== undefined) {
      // Add to existing time
      const { data: existing } = await supabase
        .from("training_lesson_progress")
        .select("time_spent_seconds")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .single();

      progressData.time_spent_seconds =
        (existing?.time_spent_seconds || 0) + timeSpentSeconds;
    }

    const { data, error } = await supabase
      .from("training_lesson_progress")
      .upsert(progressData, {
        onConflict: "user_id,lesson_id",
      })
      .select()
      .single();

    if (error) {
      console.error("Error updating lesson progress:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // The database triggers will automatically update module and track progress

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
