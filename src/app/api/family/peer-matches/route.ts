import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/family/peer-matches
 * List peer support matches
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
    const caseId = searchParams.get("caseId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isLE = profile && ["law_enforcement", "admin", "developer"].includes(profile.role);

    let query = supabase
      .from("peer_support_matches")
      .select(`
        *,
        seeking_contact:family_contacts!peer_support_matches_seeking_family_contact_id_fkey(
          id, first_name, last_name, case_id, relationship
        ),
        supporting_contact:family_contacts!peer_support_matches_supporting_family_contact_id_fkey(
          id, first_name, last_name, case_id, relationship
        )
      `, { count: "exact" })
      .order("matched_at", { ascending: false });

    if (caseId) {
      // Verify case access
      const { data: caseData } = await supabase
        .from("cases")
        .select("reporter_id")
        .eq("id", caseId)
        .single();

      const isOwner = caseData?.reporter_id === user.id;

      if (!isOwner && !isLE) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Get contacts for this case
      const { data: contacts } = await supabase
        .from("family_contacts")
        .select("id")
        .eq("case_id", caseId);

      const contactIds = contacts?.map((c) => c.id) || [];

      if (contactIds.length > 0) {
        query = query.or(
          `seeking_family_contact_id.in.(${contactIds.join(",")}),supporting_family_contact_id.in.(${contactIds.join(",")})`
        );
      } else {
        // No contacts, return empty
        return NextResponse.json({
          data: [],
          pagination: { total: 0, limit, offset, hasMore: false },
        });
      }
    } else if (!isLE) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (status) {
      query = query.eq("status", status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching peer matches:", error);
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
 * POST /api/family/peer-matches
 * Create a peer support match (LE only)
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

    if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("peer_support_matches")
      .insert({
        seeking_family_contact_id: body.seekingFamilyContactId,
        supporting_family_contact_id: body.supportingFamilyContactId,
        matched_by: user.id,
        status: "pending",
        support_type: body.supportType || "phone",
        frequency_preference: body.frequencyPreference,
        notes: body.notes,
      })
      .select(`
        *,
        seeking_contact:family_contacts!peer_support_matches_seeking_family_contact_id_fkey(
          id, first_name, last_name, case_id
        ),
        supporting_contact:family_contacts!peer_support_matches_supporting_family_contact_id_fkey(
          id, first_name, last_name, case_id
        )
      `)
      .single();

    if (error) {
      console.error("Error creating peer match:", error);
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

/**
 * PATCH /api/family/peer-matches
 * Update a peer support match
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

    if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Match ID is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.status) {
      updateData.status = body.status;
      if (body.status === "ended") {
        updateData.ended_at = new Date().toISOString();
        if (body.endReason) updateData.end_reason = body.endReason;
      }
    }

    if (body.supportType) updateData.support_type = body.supportType;
    if (body.frequencyPreference !== undefined) updateData.frequency_preference = body.frequencyPreference;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.feedback !== undefined) updateData.feedback = body.feedback;

    const { data, error } = await supabase
      .from("peer_support_matches")
      .update(updateData)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating peer match:", error);
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
