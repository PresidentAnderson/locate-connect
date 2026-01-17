import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/morgue/grief-support
 * List grief support resources (public access for active resources)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const province = searchParams.get("province");
    const isFree = searchParams.get("free") === "true";
    const available24_7 = searchParams.get("24_7") === "true";
    const traumaSpecialized = searchParams.get("trauma") === "true";
    const language = searchParams.get("language");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("grief_support_resources")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .order("name", { ascending: true });

    if (type) {
      query = query.eq("type", type);
    }

    if (province) {
      query = query.or(`serves_nationally.eq.true,serves_provinces.cs.{${province}}`);
    }

    if (isFree) {
      query = query.eq("is_free", true);
    }

    if (available24_7) {
      query = query.eq("available_24_7", true);
    }

    if (traumaSpecialized) {
      query = query.or("specializes_in_trauma.eq.true,specializes_in_violent_death.eq.true,specializes_in_unidentified_remains.eq.true");
    }

    if (language) {
      query = query.contains("languages", [language]);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching grief support resources:", error);
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
 * POST /api/morgue/grief-support
 * Create a new grief support resource (admin only)
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

    if (!profile || !["admin", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("grief_support_resources")
      .insert({
        type: body.type,
        name: body.name,
        name_fr: body.nameFr,
        description: body.description,
        description_fr: body.descriptionFr,
        organization_name: body.organizationName,
        specializes_in_trauma: body.specializesInTrauma || false,
        specializes_in_violent_death: body.specializesInViolentDeath || false,
        specializes_in_unidentified_remains: body.specializesInUnidentifiedRemains || false,
        phone: body.phone,
        toll_free_phone: body.tollFreePhone,
        crisis_line: body.crisisLine,
        email: body.email,
        website: body.website,
        available_24_7: body.available24_7 || false,
        operating_hours: body.operatingHours,
        response_time: body.responseTime,
        serves_provinces: body.servesProvinces || [],
        serves_nationally: body.servesNationally || false,
        in_person_available: body.inPersonAvailable || false,
        virtual_available: body.virtualAvailable || false,
        languages: body.languages || ["en", "fr"],
        accessibility_features: body.accessibilityFeatures || [],
        is_free: body.isFree || false,
        cost_info: body.costInfo,
        financial_assistance_available: body.financialAssistanceAvailable || false,
        eligibility_notes: body.eligibilityNotes,
        priority: body.priority || 0,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating grief support resource:", error);
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
