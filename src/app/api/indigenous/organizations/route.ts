import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/indigenous/organizations
 * List all active Indigenous organizations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const orgType = searchParams.get("type");
    const scope = searchParams.get("scope");
    const province = searchParams.get("province");
    const partnersOnly = searchParams.get("partners") === "true";
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("indigenous_organizations")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (orgType) {
      query = query.eq("org_type", orgType);
    }

    if (scope) {
      query = query.eq("scope", scope);
    }

    if (province) {
      query = query.contains("provinces_served", [province]);
    }

    if (partnersOnly) {
      query = query.eq("is_verified_partner", true);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,name_fr.ilike.%${search}%,acronym.ilike.%${search}%`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching organizations:", error);
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
 * POST /api/indigenous/organizations
 * Create a new Indigenous organization (admin only)
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
      .from("indigenous_organizations")
      .insert({
        name: body.name,
        name_fr: body.nameFr,
        name_indigenous: body.nameIndigenous,
        acronym: body.acronym,
        org_type: body.orgType,
        description: body.description,
        description_fr: body.descriptionFr,
        services_offered: body.servicesOffered || [],
        scope: body.scope,
        provinces_served: body.provincesServed || [],
        regions_served: body.regionsServed || [],
        primary_phone: body.primaryPhone,
        toll_free_phone: body.tollFreePhone,
        crisis_line: body.crisisLine,
        email: body.email,
        website: body.website,
        address_line1: body.addressLine1,
        address_line2: body.addressLine2,
        city: body.city,
        province: body.province,
        postal_code: body.postalCode,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating organization:", error);
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
