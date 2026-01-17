import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/training/badges
 * Get available badges and user's earned badges
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const earnedOnly = searchParams.get("earnedOnly") === "true";
    const badgeType = searchParams.get("type");

    // Get all badges
    let badgesQuery = supabase
      .from("training_badges")
      .select(
        `
        *,
        track:training_tracks(id, title, title_fr)
      `
      )
      .order("display_order", { ascending: true });

    if (badgeType) {
      badgesQuery = badgesQuery.eq("badge_type", badgeType);
    }

    const { data: badges, error: badgesError } = await badgesQuery;

    if (badgesError) {
      console.error("Error fetching badges:", badgesError);
      return NextResponse.json({ error: badgesError.message }, { status: 500 });
    }

    if (!user) {
      // Non-authenticated users can see public badges without earned status
      return NextResponse.json({
        data: badges?.filter((b) => b.is_public).map((b) => ({
          ...b,
          earned: false,
        })),
      });
    }

    // Get user's earned badges
    const { data: userBadges, error: userBadgesError } = await supabase
      .from("user_badges")
      .select(
        `
        *,
        badge:training_badges(*),
        certification:training_certifications(id, certificate_number)
      `
      )
      .eq("user_id", user.id);

    if (userBadgesError) {
      console.error("Error fetching user badges:", userBadgesError);
      return NextResponse.json(
        { error: userBadgesError.message },
        { status: 500 }
      );
    }

    const earnedBadgeIds = new Set(userBadges?.map((ub) => ub.badge_id));

    if (earnedOnly) {
      return NextResponse.json({ data: userBadges });
    }

    // Combine badges with earned status
    const badgesWithEarned = badges?.map((badge) => {
      const userBadge = userBadges?.find((ub) => ub.badge_id === badge.id);
      return {
        ...badge,
        earned: earnedBadgeIds.has(badge.id),
        earnedAt: userBadge?.earned_at,
        certificationId: userBadge?.certification_id,
      };
    });

    return NextResponse.json({ data: badgesWithEarned });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/training/badges
 * Create a new badge (admin only)
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
      .from("training_badges")
      .insert({
        track_id: body.trackId,
        slug: body.slug,
        name: body.name,
        name_fr: body.nameFr,
        description: body.description,
        description_fr: body.descriptionFr,
        icon_url: body.iconUrl,
        badge_type: body.badgeType || "completion",
        criteria: body.criteria || {},
        points: body.points || 0,
        is_public: body.isPublic ?? true,
        display_order: body.displayOrder || 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating badge:", error);
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
