import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/cases/[caseId]/family-support
 * Get comprehensive family support dashboard data for a case
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const supabase = await createClient();
    const { caseId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("id, reporter_id")
      .eq("id", caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_verified")
      .eq("id", user.id)
      .single();

    const isOwner = caseData.reporter_id === user.id;
    const isLE = profile && ["law_enforcement", "admin", "developer"].includes(profile.role);

    if (!isOwner && !isLE) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all family support data in parallel
    const [
      liaisonsResult,
      contactsResult,
      checkInsResult,
      messagesResult,
      resourcesResult,
      groupsResult,
      peerMatchesResult,
      documentsResult,
      reportsResult,
    ] = await Promise.all([
      // Primary liaison with user details
      supabase
        .from("family_liaisons")
        .select(`
          *,
          user:profiles!family_liaisons_user_id_fkey(
            id, first_name, last_name, email, phone, avatar_url, organization
          )
        `)
        .eq("case_id", caseId)
        .eq("is_active", true)
        .order("is_primary", { ascending: false }),

      // Family contacts
      supabase
        .from("family_contacts")
        .select("*")
        .eq("case_id", caseId)
        .eq("is_active", true)
        .order("is_primary_contact", { ascending: false }),

      // Upcoming check-ins
      supabase
        .from("scheduled_check_ins")
        .select("*")
        .eq("case_id", caseId)
        .in("status", ["scheduled", "rescheduled"])
        .gte("scheduled_date", new Date().toISOString().split("T")[0])
        .order("scheduled_date", { ascending: true })
        .limit(10),

      // Recent messages
      supabase
        .from("family_messages")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(20),

      // Recommended resources (based on case assignments)
      supabase
        .from("family_resource_assignments")
        .select(`
          *,
          resource:support_resources(*)
        `)
        .eq("case_id", caseId)
        .eq("is_active", true)
        .not("resource_id", "is", null),

      // Available support groups
      supabase
        .from("support_groups")
        .select("*")
        .eq("is_active", true)
        .limit(10),

      // Peer matches
      supabase
        .from("peer_support_matches")
        .select(`
          *,
          seeking_contact:family_contacts!peer_support_matches_seeking_family_contact_id_fkey(*),
          supporting_contact:family_contacts!peer_support_matches_supporting_family_contact_id_fkey(*)
        `)
        .or(`seeking_family_contact_id.in.(select id from family_contacts where case_id = '${caseId}')`)
        .in("status", ["pending", "active"]),

      // Recent generated documents
      supabase
        .from("generated_documents")
        .select("*")
        .eq("case_id", caseId)
        .order("generated_at", { ascending: false })
        .limit(10),

      // Progress reports
      supabase
        .from("case_progress_reports")
        .select("*")
        .eq("case_id", caseId)
        .order("period_end", { ascending: false })
        .limit(5),
    ]);

    // Get general resources if no assigned resources
    let resources = resourcesResult.data?.map((r) => r.resource).filter(Boolean) || [];
    if (resources.length === 0) {
      const { data: generalResources } = await supabase
        .from("support_resources")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .limit(10);
      resources = generalResources || [];
    }

    // Transform data for dashboard
    const dashboard = {
      caseId,
      primaryLiaison: liaisonsResult.data?.find((l) => l.is_primary) || liaisonsResult.data?.[0] || null,
      allLiaisons: liaisonsResult.data || [],
      familyContacts: contactsResult.data || [],
      upcomingCheckIns: checkInsResult.data || [],
      recentMessages: messagesResult.data || [],
      recommendedResources: resources,
      availableSupportGroups: groupsResult.data || [],
      peerMatches: peerMatchesResult.data || [],
      recentDocuments: documentsResult.data || [],
      progressReports: reportsResult.data || [],
    };

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
