import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/training/certifications
 * Get user's certifications
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = searchParams.get("status");
    const trackId = searchParams.get("trackId");

    let query = supabase
      .from("training_certifications")
      .select(
        `
        *,
        track:training_tracks(*)
      `
      )
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (trackId) {
      query = query.eq("track_id", trackId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching certifications:", error);
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
 * POST /api/training/certifications
 * Issue a certification for a completed track
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
    const { trackId } = body;

    if (!trackId) {
      return NextResponse.json(
        { error: "trackId is required" },
        { status: 400 }
      );
    }

    // Check if track exists and is a certification track
    const { data: track, error: trackError } = await supabase
      .from("training_tracks")
      .select("*")
      .eq("id", trackId)
      .single();

    if (trackError || !track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    if (!track.is_certification_track) {
      return NextResponse.json(
        { error: "This track does not issue certifications" },
        { status: 400 }
      );
    }

    // Check if user has completed the track
    const { data: progress, error: progressError } = await supabase
      .from("training_track_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("track_id", trackId)
      .single();

    if (progressError || !progress || progress.status !== "completed") {
      return NextResponse.json(
        { error: "Track must be completed to receive certification" },
        { status: 400 }
      );
    }

    // Check for existing active certification
    const { data: existingCert } = await supabase
      .from("training_certifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("track_id", trackId)
      .eq("status", "active")
      .single();

    if (existingCert) {
      return NextResponse.json(
        { error: "Active certification already exists" },
        { status: 400 }
      );
    }

    // Calculate expiration date
    const expiresAt = track.certification_valid_days
      ? new Date(
          Date.now() + track.certification_valid_days * 24 * 60 * 60 * 1000
        ).toISOString()
      : null;

    // Calculate final score from quiz attempts
    const { data: quizAttempts } = await supabase
      .from("quiz_attempts")
      .select(
        `
        *,
        quiz:training_quizzes(module_id)
      `
      )
      .eq("user_id", user.id)
      .eq("passed", true);

    // Get modules for this track
    const { data: modules } = await supabase
      .from("training_modules")
      .select("id")
      .eq("track_id", trackId);

    const moduleIds = modules?.map((m) => m.id) || [];
    const trackQuizAttempts = quizAttempts?.filter(
      (a) => a.quiz && moduleIds.includes(a.quiz.module_id)
    );

    const finalScore =
      trackQuizAttempts && trackQuizAttempts.length > 0
        ? Math.round(
            trackQuizAttempts.reduce(
              (sum, a) => sum + (a.score_percentage || 0),
              0
            ) / trackQuizAttempts.length
          )
        : 100;

    // Create certification
    const { data: certification, error: certError } = await supabase
      .from("training_certifications")
      .insert({
        user_id: user.id,
        track_id: trackId,
        expires_at: expiresAt,
        final_score_percentage: finalScore,
        metadata: {
          completed_modules: moduleIds.length,
          quiz_scores: trackQuizAttempts?.map((a) => ({
            quiz_id: a.quiz_id,
            score: a.score_percentage,
          })),
        },
      })
      .select()
      .single();

    if (certError) {
      console.error("Error creating certification:", certError);
      return NextResponse.json({ error: certError.message }, { status: 500 });
    }

    // Award badge if track has one
    const { data: badge } = await supabase
      .from("training_badges")
      .select("*")
      .eq("track_id", trackId)
      .eq("badge_type", "completion")
      .single();

    if (badge) {
      await supabase.from("user_badges").upsert(
        {
          user_id: user.id,
          badge_id: badge.id,
          certification_id: certification.id,
          earned_at: new Date().toISOString(),
        },
        { onConflict: "user_id,badge_id" }
      );
    }

    // Create expiration reminder if applicable
    if (expiresAt && track.certification_valid_days) {
      const reminderDate = new Date(
        new Date(expiresAt).getTime() - 30 * 24 * 60 * 60 * 1000 // 30 days before expiration
      ).toISOString();

      await supabase.from("training_reminders").insert({
        user_id: user.id,
        track_id: trackId,
        certification_id: certification.id,
        reminder_type: "expiring_soon",
        reminder_date: reminderDate,
      });
    }

    return NextResponse.json({ data: certification }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
