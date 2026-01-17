import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ResolutionPattern,
  AgeGroupCategory,
  PatternType,
} from "@/types/heatmap.types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication and authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_verified")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "developer", "law_enforcement"].includes(profile.role) || !profile.is_verified) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const patternType = searchParams.get("patternType") as PatternType | null;
    const ageGroup = searchParams.get("ageGroup") as AgeGroupCategory | null;
    const minConfidence = searchParams.get("minConfidence");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Build query
    let query = supabase
      .from("resolution_patterns")
      .select("*")
      .eq("is_active", true);

    if (patternType) {
      query = query.eq("pattern_type", patternType);
    }

    if (ageGroup) {
      query = query.eq("age_group", ageGroup);
    }

    if (minConfidence) {
      query = query.gte("confidence_level", parseFloat(minConfidence));
    }

    query = query
      .order("confidence_level", { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching patterns:", error);
      return NextResponse.json(
        { error: "Failed to fetch patterns" },
        { status: 500 }
      );
    }

    const patterns: ResolutionPattern[] = (data || []).map((row) => ({
      id: row.id,
      patternType: row.pattern_type,
      patternName: row.pattern_name,
      patternDescription: row.pattern_description,
      confidenceLevel: row.confidence_level,
      sampleSize: row.sample_size,
      statisticalSignificance: row.statistical_significance,
      patternData: row.pattern_data,
      jurisdictionId: row.jurisdiction_id,
      province: row.province,
      ageGroup: row.age_group,
      caseType: row.case_type,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      isActive: row.is_active,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      patterns,
      total: patterns.length,
    });
  } catch (error) {
    console.error("Error in patterns API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
