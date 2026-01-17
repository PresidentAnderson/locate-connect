import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { TrainingAudience, TrainingStatus } from "@/types/training.types";

/**
 * GET /api/training/tracks
 * List training tracks based on user role and audience
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const audience = searchParams.get("audience") as TrainingAudience | null;
    const status = searchParams.get("status") as TrainingStatus | null;
    const includeProgress = searchParams.get("includeProgress") === "true";

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Build base query
    let query = supabase
      .from("training_tracks")
      .select(`
        *,
        modules:training_modules(count)
      `)
      .order("display_order", { ascending: true });

    // Apply status filter (default to published for non-admins)
    if (status) {
      query = query.eq("status", status);
    } else if (!user) {
      query = query.eq("status", "published");
    }

    // Apply audience filter based on user role
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role || "user";

      if (audience) {
        query = query.eq("audience", audience);
      } else {
        // Filter based on user role
        if (role === "admin" || role === "developer") {
          // Admins can see all tracks
        } else if (role === "law_enforcement") {
          query = query.in("audience", ["public", "law_enforcement", "all"]);
        } else {
          query = query.in("audience", ["public", "all"]);
        }
      }

      // Include progress if requested
      if (includeProgress) {
        const { data: tracks, error } = await query;

        if (error) {
          console.error("Error fetching tracks:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Fetch progress for each track
        const { data: progressData } = await supabase
          .from("training_track_progress")
          .select("*")
          .eq("user_id", user.id);

        const { data: certifications } = await supabase
          .from("training_certifications")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active");

        const tracksWithProgress = tracks?.map((track) => ({
          ...track,
          progress: progressData?.find((p) => p.track_id === track.id),
          certification: certifications?.find((c) => c.track_id === track.id),
        }));

        return NextResponse.json({ data: tracksWithProgress });
      }
    } else {
      // Non-authenticated users can only see public tracks
      query = query.in("audience", ["public", "all"]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching tracks:", error);
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
 * POST /api/training/tracks
 * Create a new training track (admin only)
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

    const { data, error } = await supabase
      .from("training_tracks")
      .insert({
        slug: body.slug,
        title: body.title,
        title_fr: body.titleFr,
        description: body.description,
        description_fr: body.descriptionFr,
        audience: body.audience,
        icon: body.icon,
        color: body.color,
        estimated_duration_minutes: body.estimatedDurationMinutes || 0,
        is_required: body.isRequired || false,
        is_certification_track: body.isCertificationTrack || false,
        certification_valid_days: body.certificationValidDays,
        pass_percentage: body.passPercentage || 80,
        display_order: body.displayOrder || 0,
        status: body.status || "draft",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating track:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
