import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/training/dashboard
 * Get comprehensive training dashboard data for the current user
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

    // Get user profile for role-based filtering
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "user";

    // Determine accessible audiences
    let audiences: string[];
    if (role === "admin" || role === "developer") {
      audiences = ["public", "law_enforcement", "admin", "all"];
    } else if (role === "law_enforcement") {
      audiences = ["public", "law_enforcement", "all"];
    } else {
      audiences = ["public", "all"];
    }

    // Get tracks with progress
    const { data: tracks, error: tracksError } = await supabase
      .from("training_tracks")
      .select(
        `
        *,
        modules:training_modules(count)
      `
      )
      .eq("status", "published")
      .in("audience", audiences)
      .order("display_order", { ascending: true });

    if (tracksError) {
      console.error("Error fetching tracks:", tracksError);
      return NextResponse.json({ error: tracksError.message }, { status: 500 });
    }

    // Get progress for all tracks
    const { data: trackProgress } = await supabase
      .from("training_track_progress")
      .select("*")
      .eq("user_id", user.id);

    // Get certifications
    const { data: certifications } = await supabase
      .from("training_certifications")
      .select(
        `
        *,
        track:training_tracks(id, title, title_fr)
      `
      )
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false });

    // Get badges
    const { data: userBadges } = await supabase
      .from("user_badges")
      .select(
        `
        *,
        badge:training_badges(*)
      `
      )
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false });

    // Get reminders
    const { data: reminders } = await supabase
      .from("training_reminders")
      .select(
        `
        *,
        track:training_tracks(id, title, title_fr)
      `
      )
      .eq("user_id", user.id)
      .is("dismissed_at", null)
      .lte("reminder_date", new Date().toISOString())
      .order("reminder_date", { ascending: true });

    // Get lesson progress for time tracking
    const { data: lessonProgress } = await supabase
      .from("training_lesson_progress")
      .select("time_spent_seconds, status")
      .eq("user_id", user.id);

    // Get quiz attempts for average score
    const { data: quizAttempts } = await supabase
      .from("quiz_attempts")
      .select("score_percentage")
      .eq("user_id", user.id)
      .not("score_percentage", "is", null);

    // Calculate stats
    const stats = {
      totalTracksCompleted:
        trackProgress?.filter((p) => p.status === "completed").length || 0,
      totalTracksInProgress:
        trackProgress?.filter((p) => p.status === "in_progress").length || 0,
      totalLessonsCompleted:
        lessonProgress?.filter((p) => p.status === "completed").length || 0,
      totalTimeSpentMinutes: Math.round(
        (lessonProgress?.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) ||
          0) / 60
      ),
      averageQuizScore:
        quizAttempts && quizAttempts.length > 0
          ? Math.round(
              quizAttempts.reduce((sum, a) => sum + (a.score_percentage || 0), 0) /
                quizAttempts.length
            )
          : 0,
      activeCertifications:
        certifications?.filter((c) => c.status === "active").length || 0,
      totalBadgesEarned: userBadges?.length || 0,
      totalPoints:
        userBadges?.reduce((sum, ub) => sum + (ub.badge?.points || 0), 0) || 0,
    };

    // Combine tracks with their progress
    const tracksWithProgress = tracks?.map((track) => ({
      ...track,
      progress: trackProgress?.find((p) => p.track_id === track.id),
      certification: certifications?.find(
        (c) => c.track_id === track.id && c.status === "active"
      ),
    }));

    // Get recent activity (last 5 tracks with activity)
    const recentActivity = trackProgress
      ?.filter((p) => p.last_activity_at)
      .sort(
        (a, b) =>
          new Date(b.last_activity_at).getTime() -
          new Date(a.last_activity_at).getTime()
      )
      .slice(0, 5)
      .map((p) => ({
        ...p,
        track: tracks?.find((t) => t.id === p.track_id),
      }));

    // Recommended next steps
    const recommendations = [];

    // Recommend incomplete required tracks
    const incompleteRequired = tracksWithProgress?.filter(
      (t) =>
        t.is_required &&
        (!t.progress || t.progress.status !== "completed")
    );
    if (incompleteRequired && incompleteRequired.length > 0) {
      recommendations.push({
        type: "required_track",
        priority: "high",
        track: incompleteRequired[0],
        message: `Complete required training: ${incompleteRequired[0].title}`,
      });
    }

    // Recommend continuing in-progress tracks
    const inProgress = tracksWithProgress?.filter(
      (t) => t.progress?.status === "in_progress"
    );
    if (inProgress && inProgress.length > 0) {
      recommendations.push({
        type: "continue_track",
        priority: "medium",
        track: inProgress[0],
        message: `Continue your progress in: ${inProgress[0].title}`,
      });
    }

    // Recommend expiring certifications
    const expiringCerts = certifications?.filter((c) => {
      if (!c.expires_at || c.status !== "active") return false;
      const daysUntilExpiry = Math.ceil(
        (new Date(c.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    });
    if (expiringCerts && expiringCerts.length > 0) {
      recommendations.push({
        type: "renew_certification",
        priority: "high",
        certification: expiringCerts[0],
        message: `Certification expiring soon: ${expiringCerts[0].track?.title}`,
      });
    }

    return NextResponse.json({
      data: {
        tracks: tracksWithProgress,
        recentActivity,
        certifications,
        badges: userBadges,
        reminders,
        stats,
        recommendations,
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
