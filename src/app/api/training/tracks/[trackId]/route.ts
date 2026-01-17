import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ trackId: string }>;
}

/**
 * GET /api/training/tracks/[trackId]
 * Get a single training track with modules and optionally lessons
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { trackId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const includeModules = searchParams.get("includeModules") !== "false";
    const includeLessons = searchParams.get("includeLessons") === "true";
    const includeProgress = searchParams.get("includeProgress") === "true";

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Build query based on includes
    let selectQuery = "*";
    if (includeModules) {
      if (includeLessons) {
        selectQuery = `
          *,
          modules:training_modules(
            *,
            lessons:training_lessons(*),
            quizzes:training_quizzes(*)
          )
        `;
      } else {
        selectQuery = `
          *,
          modules:training_modules(*)
        `;
      }
    }

    const { data: track, error } = await supabase
      .from("training_tracks")
      .select(selectQuery)
      .eq("id", trackId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Track not found" }, { status: 404 });
      }
      console.error("Error fetching track:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Type the track data properly
    interface ModuleData {
      id: string;
      display_order: number;
      lessons?: { id: string; display_order: number }[];
      quizzes?: { display_order: number }[];
    }
    interface TrackData {
      id: string;
      slug: string;
      title: string;
      title_fr?: string;
      description?: string;
      description_fr?: string;
      audience: string;
      icon?: string;
      color?: string;
      estimated_duration_minutes: number;
      is_required: boolean;
      is_certification_track: boolean;
      certification_valid_days?: number;
      pass_percentage: number;
      display_order: number;
      status: string;
      created_by?: string;
      created_at: string;
      updated_at: string;
      modules?: ModuleData[];
    }
    const typedTrack = track as unknown as TrackData;

    // Sort modules and lessons by display_order
    if (typedTrack.modules) {
      typedTrack.modules.sort((a, b) => a.display_order - b.display_order);
      if (includeLessons) {
        typedTrack.modules.forEach((module) => {
          if (module.lessons) {
            module.lessons.sort((a, b) => a.display_order - b.display_order);
          }
          if (module.quizzes) {
            module.quizzes.sort((a, b) => a.display_order - b.display_order);
          }
        });
      }
    }

    // Include progress if requested and user is authenticated
    if (includeProgress && user) {
      const { data: trackProgress } = await supabase
        .from("training_track_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("track_id", trackId)
        .single();

      const { data: moduleProgress } = await supabase
        .from("training_module_progress")
        .select("*")
        .eq("user_id", user.id);

      const { data: lessonProgress } = await supabase
        .from("training_lesson_progress")
        .select("*")
        .eq("user_id", user.id);

      const { data: certification } = await supabase
        .from("training_certifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("track_id", trackId)
        .eq("status", "active")
        .single();

      // Attach progress to track and modules
      const trackWithProgress = {
        ...typedTrack,
        progress: trackProgress,
        certification,
        modules: typedTrack.modules?.map((module) => ({
          ...module,
          progress: moduleProgress?.find((p) => p.module_id === module.id),
          lessons: module.lessons?.map((lesson) => ({
            ...lesson,
            progress: lessonProgress?.find((p) => p.lesson_id === lesson.id),
          })),
        })),
      };

      return NextResponse.json({ data: trackWithProgress });
    }

    return NextResponse.json({ data: typedTrack });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/training/tracks/[trackId]
 * Update a training track (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { trackId } = await params;
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
    if (body.audience !== undefined) updateData.audience = body.audience;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.estimatedDurationMinutes !== undefined)
      updateData.estimated_duration_minutes = body.estimatedDurationMinutes;
    if (body.isRequired !== undefined) updateData.is_required = body.isRequired;
    if (body.isCertificationTrack !== undefined)
      updateData.is_certification_track = body.isCertificationTrack;
    if (body.certificationValidDays !== undefined)
      updateData.certification_valid_days = body.certificationValidDays;
    if (body.passPercentage !== undefined)
      updateData.pass_percentage = body.passPercentage;
    if (body.displayOrder !== undefined)
      updateData.display_order = body.displayOrder;
    if (body.status !== undefined) updateData.status = body.status;

    const { data, error } = await supabase
      .from("training_tracks")
      .update(updateData)
      .eq("id", trackId)
      .select()
      .single();

    if (error) {
      console.error("Error updating track:", error);
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
 * DELETE /api/training/tracks/[trackId]
 * Delete a training track (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { trackId } = await params;
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
      .from("training_tracks")
      .delete()
      .eq("id", trackId);

    if (error) {
      console.error("Error deleting track:", error);
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
