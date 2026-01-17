import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/indigenous/mmiwg
 * List MMIWG cases (law enforcement only)
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

    const { searchParams } = new URL(request.url);

    const classification = searchParams.get("classification");
    const communityId = searchParams.get("communityId");
    const nation = searchParams.get("nation");
    const consultationStatus = searchParams.get("consultationStatus");
    const isHistorical = searchParams.get("historical") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("mmiwg_cases")
      .select(
        `
        *,
        home_community:indigenous_communities!home_community_id(id, name, province),
        last_seen_community:indigenous_communities!last_seen_community_id(id, name, province),
        family_liaison:indigenous_liaison_contacts(id, first_name, last_name),
        family_support_org:indigenous_organizations(id, name, acronym),
        case:cases(id, case_number, first_name, last_name, status, priority_level)
      `,
        { count: "exact" }
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (classification) {
      query = query.eq("classification", classification);
    }

    if (communityId) {
      query = query.eq("home_community_id", communityId);
    }

    if (nation) {
      query = query.ilike("nation", `%${nation}%`);
    }

    if (consultationStatus) {
      query = query.eq("consultation_status", consultationStatus);
    }

    if (isHistorical) {
      query = query.eq("is_historical_case", true);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching MMIWG cases:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log data access for sovereignty compliance
    await supabase.from("indigenous_data_sovereignty_log").insert({
      action: "data_access",
      action_description: "MMIWG case list accessed",
      performed_by: user.id,
      consent_verified: true,
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
 * POST /api/indigenous/mmiwg
 * Create a new MMIWG case record (law enforcement only)
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

    // Verify the case exists
    const { data: existingCase } = await supabase
      .from("cases")
      .select("id")
      .eq("id", body.caseId)
      .single();

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("mmiwg_cases")
      .insert({
        case_id: body.caseId,
        classification: body.classification,
        is_mmiwg2s: body.isMMIWG2S ?? false,
        home_community_id: body.homeCommunityId,
        nation: body.nation,
        treaty_area: body.treatyArea,
        last_seen_on_reserve: body.lastSeenOnReserve ?? false,
        last_seen_community_id: body.lastSeenCommunityId,
        traditional_territory_involved:
          body.traditionalTerritoryInvolved ?? false,
        family_liaison_id: body.familyLiaisonId,
        family_support_org_id: body.familySupportOrgId,
        cultural_support_requested: body.culturalSupportRequested ?? false,
        ceremony_support_requested: body.ceremonySupportRequested ?? false,
        data_consent_level: body.dataConsentLevel || "investigation_only",
        community_notification_consent:
          body.communityNotificationConsent ?? false,
        media_consent: body.mediaConsent ?? false,
        research_consent: body.researchConsent ?? false,
        prior_interaction_with_systems:
          body.priorInteractionWithSystems || [],
        vulnerability_factors: body.vulnerabilityFactors || [],
        is_historical_case: body.isHistoricalCase ?? false,
        original_report_date: body.originalReportDate,
        original_investigating_agency: body.originalInvestigatingAgency,
        case_transferred_from: body.caseTransferredFrom,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating MMIWG case:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log data creation for sovereignty compliance
    await supabase.from("indigenous_data_sovereignty_log").insert({
      case_id: body.caseId,
      mmiwg_case_id: data.id,
      community_id: body.homeCommunityId,
      action: "data_access",
      action_description: "MMIWG case record created",
      performed_by: user.id,
      consent_verified: true,
      consent_level: body.dataConsentLevel || "investigation_only",
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
