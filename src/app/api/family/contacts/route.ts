import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/family/contacts
 * List family contacts (for a case or all)
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
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // If caseId provided, verify access
    if (caseId) {
      const { data: caseData } = await supabase
        .from("cases")
        .select("reporter_id")
        .eq("id", caseId)
        .single();

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isOwner = caseData?.reporter_id === user.id;
      const isLE = profile && ["law_enforcement", "admin", "developer"].includes(profile.role);

      if (!isOwner && !isLE) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // For all contacts, require LE access
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let query = supabase
      .from("family_contacts")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("is_primary_contact", { ascending: false });

    if (caseId) {
      query = query.eq("case_id", caseId);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching contacts:", error);
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
 * POST /api/family/contacts
 * Add a family contact to a case
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

    // Verify access to the case
    const { data: caseData } = await supabase
      .from("cases")
      .select("reporter_id")
      .eq("id", body.caseId)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isOwner = caseData?.reporter_id === user.id;
    const isLE = profile && ["law_enforcement", "admin", "developer"].includes(profile.role);

    if (!isOwner && !isLE) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("family_contacts")
      .insert({
        case_id: body.caseId,
        relationship: body.relationship,
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        phone: body.phone,
        mobile_phone: body.mobilePhone,
        address: body.address,
        city: body.city,
        province: body.province,
        postal_code: body.postalCode,
        is_primary_contact: body.isPrimaryContact ?? false,
        preferred_contact_method: body.preferredContactMethod || "phone",
        preferred_language: body.preferredLanguage || "en",
        accessibility_needs: body.accessibilityNeeds,
        notification_preferences: body.notificationPreferences || {
          caseUpdates: true,
          mediaAlerts: true,
          checkInReminders: true,
          resourceSuggestions: true,
        },
        notes: body.notes,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating contact:", error);
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
