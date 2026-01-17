import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/family/liaisons
 * List family liaisons (with optional filters)
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

    if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const liaisonType = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("family_liaisons")
      .select(`
        *,
        user:profiles!family_liaisons_user_id_fkey(
          id, first_name, last_name, email, phone, avatar_url, organization
        ),
        case:cases(id, case_number, first_name, last_name)
      `, { count: "exact" })
      .eq("is_active", true)
      .order("assigned_at", { ascending: false });

    if (caseId) {
      query = query.eq("case_id", caseId);
    }

    if (liaisonType) {
      query = query.eq("liaison_type", liaisonType);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching liaisons:", error);
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
 * POST /api/family/liaisons
 * Assign a liaison to a case
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
      .select("role, is_verified")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      !["law_enforcement", "admin", "developer"].includes(profile.role) ||
      !profile.is_verified
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("family_liaisons")
      .insert({
        case_id: body.caseId,
        user_id: body.userId,
        liaison_type: body.liaisonType,
        is_primary: body.isPrimary ?? false,
        assigned_by: user.id,
        notes: body.notes,
      })
      .select(`
        *,
        user:profiles!family_liaisons_user_id_fkey(
          id, first_name, last_name, email, phone
        )
      `)
      .single();

    if (error) {
      console.error("Error creating liaison:", error);
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
