import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/morgue/unidentified
 * Query unidentified remains database (authorized users only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authentication check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization check - only law enforcement, admin, developer
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
    const status = searchParams.get("status");
    const province = searchParams.get("province");
    const sex = searchParams.get("sex");
    const ageMin = searchParams.get("age_min");
    const ageMax = searchParams.get("age_max");
    const heightMin = searchParams.get("height_min");
    const heightMax = searchParams.get("height_max");
    const hasDNA = searchParams.get("has_dna") === "true";
    const morgueId = searchParams.get("morgue_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("unidentified_remains")
      .select("*", { count: "exact" })
      .order("discovery_date", { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (province) {
      query = query.eq("discovery_province", province);
    }

    if (sex) {
      query = query.eq("sex", sex);
    }

    if (ageMin) {
      query = query.or(`estimated_age.gte.${ageMin},estimated_age_max.gte.${ageMin}`);
    }

    if (ageMax) {
      query = query.or(`estimated_age.lte.${ageMax},estimated_age_min.lte.${ageMax}`);
    }

    if (heightMin) {
      query = query.or(`height_cm.gte.${heightMin},height_max_cm.gte.${heightMin}`);
    }

    if (heightMax) {
      query = query.or(`height_cm.lte.${heightMax},height_min_cm.lte.${heightMax}`);
    }

    if (hasDNA) {
      query = query.eq("dna_available", true);
    }

    if (morgueId) {
      query = query.eq("morgue_id", morgueId);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error querying unidentified remains:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the query for audit purposes
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "morgue_registry_query",
      resource: "unidentified_remains",
      resource_id: "query",
      details: {
        filters: {
          status,
          province,
          sex,
          ageMin,
          ageMax,
          heightMin,
          heightMax,
          hasDNA,
          morgueId,
        },
        results_count: count,
      },
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

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
 * POST /api/morgue/unidentified
 * Create new unidentified remains record (authorized users only)
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

    const { data, error } = await supabase
      .from("unidentified_remains")
      .insert({
        case_number: body.caseNumber,
        morgue_id: body.morgueId,
        morgue_name: body.morgueName,
        morgue_jurisdiction: body.morgueJurisdiction,
        coroner_id: body.coronerId,
        discovery_date: body.discoveryDate,
        discovery_location: body.discoveryLocation,
        discovery_city: body.discoveryCity,
        discovery_province: body.discoveryProvince,
        discovery_latitude: body.discoveryCoordinates?.latitude,
        discovery_longitude: body.discoveryCoordinates?.longitude,
        status: body.status,
        cause_of_death: body.causeOfDeath,
        estimated_death_date: body.estimatedDeathDate,
        estimated_death_date_earliest: body.estimatedDeathDateRange?.earliest,
        estimated_death_date_latest: body.estimatedDeathDateRange?.latest,
        estimated_age: body.physicalDescription?.estimatedAge,
        estimated_age_min: body.physicalDescription?.estimatedAgeRange?.min,
        estimated_age_max: body.physicalDescription?.estimatedAgeRange?.max,
        sex: body.physicalDescription?.sex,
        race: body.physicalDescription?.race,
        ethnicity: body.physicalDescription?.ethnicity,
        height_cm: body.physicalDescription?.height,
        height_min_cm: body.physicalDescription?.heightRange?.min,
        height_max_cm: body.physicalDescription?.heightRange?.max,
        weight_kg: body.physicalDescription?.weight,
        weight_min_kg: body.physicalDescription?.weightRange?.min,
        weight_max_kg: body.physicalDescription?.weightRange?.max,
        hair_color: body.physicalDescription?.hairColor,
        hair_length: body.physicalDescription?.hairLength,
        eye_color: body.physicalDescription?.eyeColor,
        build: body.physicalDescription?.build,
        tattoos: body.physicalDescription?.tattoos || [],
        scars: body.physicalDescription?.scars || [],
        piercings: body.physicalDescription?.piercings || [],
        birthmarks: body.physicalDescription?.birthmarks || [],
        dental_records_available: body.physicalDescription?.dentalRecordsAvailable || false,
        dental_work: body.physicalDescription?.dentalWork || [],
        medical_implants: body.physicalDescription?.medicalImplants || [],
        unique_features: body.physicalDescription?.uniqueFeatures || [],
        clothing: body.physicalDescription?.clothing || [],
        jewelry: body.physicalDescription?.jewelry || [],
        personal_effects: body.personalEffects || [],
        dna_available: body.dnaAvailable || false,
        dna_profile_reference: body.dnaProfile,
        investigating_agency: body.investigatingAgency,
        lead_investigator: body.leadInvestigator,
        contact_phone: body.contactPhone,
        contact_email: body.contactEmail,
        restricted_access: body.restrictedAccess ?? true,
        access_requires_approval: body.accessRequiresApproval ?? true,
        media_releasable: body.mediaReleasable ?? false,
        notes: body.notes,
        entered_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating unidentified remains record:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "create_unidentified_remains",
      resource: "unidentified_remains",
      resource_id: data.id,
      details: { case_number: body.caseNumber },
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
