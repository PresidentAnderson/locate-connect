import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/training/modules
 * List training modules, optionally filtered by track
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const trackId = searchParams.get("trackId");
    const status = searchParams.get("status");
    const includeLessons = searchParams.get("includeLessons") === "true";

    let selectQuery = "*";
    if (includeLessons) {
      selectQuery = `
        *,
        lessons:training_lessons(*),
        quizzes:training_quizzes(*)
      `;
    }

    let query = supabase
      .from("training_modules")
      .select(selectQuery)
      .order("display_order", { ascending: true });

    if (trackId) {
      query = query.eq("track_id", trackId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching modules:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort lessons by display_order
    if (includeLessons && data) {
      data.forEach(
        (module: {
          lessons?: { display_order: number }[];
          quizzes?: { display_order: number }[];
        }) => {
          if (module.lessons) {
            module.lessons.sort((a, b) => a.display_order - b.display_order);
          }
          if (module.quizzes) {
            module.quizzes.sort((a, b) => a.display_order - b.display_order);
          }
        }
      );
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
 * POST /api/training/modules
 * Create a new training module (admin only)
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
      .from("training_modules")
      .insert({
        track_id: body.trackId,
        slug: body.slug,
        title: body.title,
        title_fr: body.titleFr,
        description: body.description,
        description_fr: body.descriptionFr,
        estimated_duration_minutes: body.estimatedDurationMinutes || 0,
        display_order: body.displayOrder || 0,
        is_required: body.isRequired ?? true,
        prerequisites: body.prerequisites || [],
        status: body.status || "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating module:", error);
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
