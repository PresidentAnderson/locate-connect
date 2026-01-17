import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/indigenous/mmiwg/statistics
 * Get MMIWG case statistics (law enforcement only)
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

    // Get total counts
    const { count: totalCases } = await supabase
      .from("mmiwg_cases")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Get active cases (missing or under investigation)
    const { count: activeCases } = await supabase
      .from("mmiwg_cases")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .in("classification", ["missing", "under_investigation"]);

    // Get resolved cases
    const { count: resolvedCases } = await supabase
      .from("mmiwg_cases")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .in("classification", ["found_safe", "found_deceased"]);

    // Get historical cases
    const { count: historicalCases } = await supabase
      .from("mmiwg_cases")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("is_historical_case", true);

    // Get cases by classification
    const classifications = [
      "missing",
      "murdered",
      "suspicious_death",
      "unexplained_death",
      "historical_case",
      "found_safe",
      "found_deceased",
      "under_investigation",
    ];

    const casesByClassification: Record<string, number> = {};
    for (const classification of classifications) {
      const { count } = await supabase
        .from("mmiwg_cases")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("classification", classification);
      casesByClassification[classification] = count || 0;
    }

    // Get consultations stats
    const { count: consultationsCompleted } = await supabase
      .from("community_consultations")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    const { count: consultationsPending } = await supabase
      .from("community_consultations")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "scheduled"]);

    const statistics = {
      totalCases: totalCases || 0,
      activeCases: activeCases || 0,
      resolvedCases: resolvedCases || 0,
      historicalCases: historicalCases || 0,
      casesByClassification,
      consultationsCompleted: consultationsCompleted || 0,
      consultationsPending: consultationsPending || 0,
    };

    return NextResponse.json({ data: statistics });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
