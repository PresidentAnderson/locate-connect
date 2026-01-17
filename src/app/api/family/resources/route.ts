import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/family/resources
 * List support resources (public access for active resources)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const province = searchParams.get("province");
    const isFree = searchParams.get("free") === "true";
    const is24_7 = searchParams.get("24_7") === "true";
    const language = searchParams.get("language");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("support_resources")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .order("name", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    if (province) {
      query = query.or(`serves_nationally.eq.true,serves_provinces.cs.{${province}}`);
    }

    if (isFree) {
      query = query.eq("is_free", true);
    }

    if (is24_7) {
      query = query.eq("is_available_24_7", true);
    }

    if (language) {
      query = query.contains("languages", [language]);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,organization_name.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching resources:", error);
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
 * POST /api/family/resources
 * Create a new support resource (admin only)
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
      .from("support_resources")
      .insert({
        name: body.name,
        name_fr: body.nameFr,
        category: body.category,
        subcategory: body.subcategory,
        description: body.description,
        description_fr: body.descriptionFr,
        organization_name: body.organizationName,
        website: body.website,
        phone: body.phone,
        toll_free_phone: body.tollFreePhone,
        email: body.email,
        address: body.address,
        city: body.city,
        province: body.province,
        postal_code: body.postalCode,
        serves_provinces: body.servesProvinces || [],
        serves_nationally: body.servesNationally ?? false,
        is_available_24_7: body.isAvailable24_7 ?? false,
        operating_hours: body.operatingHours,
        languages: body.languages || ["en", "fr"],
        eligibility_notes: body.eligibilityNotes,
        cost_info: body.costInfo,
        is_free: body.isFree ?? false,
        tags: body.tags || [],
        priority: body.priority || 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating resource:", error);
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
