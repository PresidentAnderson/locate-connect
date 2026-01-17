import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/morgue/matches
 * List matches between missing persons and unidentified remains
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "developer", "law_enforcement"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden - Requires law enforcement authorization" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("case_id");
    const remainsId = searchParams.get("remains_id");
    const status = searchParams.get("status");
    const confirmedOnly = searchParams.get("confirmed") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("morgue_registry_matches")
      .select(`
        *,
        case:cases(id, missing_person_first_name, missing_person_last_name, reported_missing_date),
        remains:unidentified_remains(*)
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (caseId) {
      query = query.eq("case_id", caseId);
    }

    if (remainsId) {
      query = query.eq("remains_id", remainsId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (confirmedOnly) {
      query = query.eq("confirmed_match", true);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching matches:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false,
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
 * POST /api/morgue/matches
 * Create a match between missing person and unidentified remains (physical description matching)
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "developer", "law_enforcement"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden - Requires law enforcement authorization" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.caseId || !body.remainsId || !body.matchConfidence) {
      return NextResponse.json(
        { error: "Missing required fields: caseId, remainsId, matchConfidence" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("morgue_registry_matches")
      .insert({
        case_id: body.caseId,
        remains_id: body.remainsId,
        match_confidence: body.matchConfidence,
        match_score: body.matchScore || 0,
        matched_features: body.matchedFeatures || [],
        physical_match_details: body.physicalMatchDetails,
        location_proximity_km: body.locationProximity,
        timeline_alignment: body.timelineAlignment,
        investigation_notes: body.notes,
        created_by: user.id,
      })
      .select(`
        *,
        case:cases(id, missing_person_first_name, missing_person_last_name),
        remains:unidentified_remains(case_number, morgue_name)
      `)
      .single();

    if (error) {
      console.error("Error creating match:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the match creation
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "create_morgue_match",
      resource: "morgue_registry_matches",
      resource_id: data.id,
      details: {
        case_id: body.caseId,
        remains_id: body.remainsId,
        match_confidence: body.matchConfidence,
      },
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/morgue/matches
 * Update match status (e.g., under investigation, ruled out, confirmed)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "developer", "law_enforcement"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden - Requires law enforcement authorization" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { matchId, ...updates } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: "Missing required field: matchId" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.investigationNotes !== undefined) {
      updateData.investigation_notes = updates.investigationNotes;
    }
    if (updates.dnaComparisonRequested !== undefined) {
      updateData.dna_comparison_requested = updates.dnaComparisonRequested;
      if (updates.dnaComparisonRequested) {
        updateData.dna_comparison_requested_date = new Date().toISOString();
      }
    }
    if (updates.familyNotified !== undefined) {
      updateData.family_notified = updates.familyNotified;
      if (updates.familyNotified) {
        updateData.family_notified_date = new Date().toISOString();
        updateData.notified_by = user.id;
        updateData.notification_method = updates.notificationMethod || "phone";
      }
    }
    if (updates.confirmedMatch !== undefined) {
      updateData.confirmed_match = updates.confirmedMatch;
      if (updates.confirmedMatch) {
        updateData.confirmed_date = new Date().toISOString();
        updateData.confirmed_by = user.id;
        updateData.closure_notes = updates.closureNotes;
      }
    }

    if (updates.status === "under_investigation") {
      updateData.investigated_by = user.id;
      updateData.investigation_date = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("morgue_registry_matches")
      .update(updateData)
      .eq("id", matchId)
      .select()
      .single();

    if (error) {
      console.error("Error updating match:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the update
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "update_morgue_match",
      resource: "morgue_registry_matches",
      resource_id: matchId,
      details: { updates: updateData },
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
