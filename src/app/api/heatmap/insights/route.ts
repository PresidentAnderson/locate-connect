import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  AgeGroupCategory,
  InsightPattern,
  DistanceInsight,
} from "@/types/heatmap.types";

const MINIMUM_PRIVACY_THRESHOLD = 10;

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
    const ageGroup = searchParams.get("ageGroup") as AgeGroupCategory | null;
    const caseType = searchParams.get("caseType");
    const jurisdictionId = searchParams.get("jurisdictionId");

    // Fetch patterns for generating insights
    let patternsQuery = supabase
      .from("resolution_patterns")
      .select("*")
      .eq("is_active", true)
      .gte("confidence_level", 0.7)
      .order("confidence_level", { ascending: false });

    if (ageGroup) {
      patternsQuery = patternsQuery.eq("age_group", ageGroup);
    }

    if (caseType) {
      patternsQuery = patternsQuery.eq("case_type", caseType);
    }

    if (jurisdictionId) {
      patternsQuery = patternsQuery.eq("jurisdiction_id", jurisdictionId);
    }

    // Fetch clusters for statistical insights
    let clustersQuery = supabase
      .from("resolution_location_clusters")
      .select("*")
      .eq("is_privacy_compliant", true)
      .gte("total_resolutions", MINIMUM_PRIVACY_THRESHOLD);

    if (jurisdictionId) {
      clustersQuery = clustersQuery.eq("jurisdiction_id", jurisdictionId);
    }

    const [patternsResult, clustersResult] = await Promise.all([
      patternsQuery.limit(50),
      clustersQuery.limit(100),
    ]);

    if (patternsResult.error) {
      console.error("Error fetching patterns:", patternsResult.error);
    }

    if (clustersResult.error) {
      console.error("Error fetching clusters:", clustersResult.error);
    }

    const patterns = patternsResult.data || [];
    const clusters = clustersResult.data || [];

    // Generate comprehensive insights
    const keyInsights = generateKeyInsights(patterns, clusters);
    const distanceInsights = generateDistanceInsightsDetailed(clusters);
    const statisticalPatterns = generateStatisticalPatterns(patterns, clusters);
    const actionableRecommendations = generateRecommendations(patterns);

    return NextResponse.json({
      keyInsights,
      distanceInsights,
      statisticalPatterns,
      actionableRecommendations,
      metadata: {
        patternsAnalyzed: patterns.length,
        clustersAnalyzed: clusters.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in insights API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function generateKeyInsights(patterns: Record<string, unknown>[], clusters: Record<string, unknown>[]): InsightPattern[] {
  const insights: InsightPattern[] = [];

  // Distance-based insights
  const distancePatterns = patterns.filter(p => p.pattern_type === "distance");
  for (const pattern of distancePatterns.slice(0, 3)) {
    const data = pattern.pattern_data as Record<string, unknown>;
    if (data.within_radius_percentage && data.radius_km) {
      insights.push({
        title: pattern.pattern_name as string,
        description: `${Math.round(data.within_radius_percentage as number)}% of ${pattern.age_group || "all"} cases found within ${data.radius_km}km of last seen location`,
        percentage: data.within_radius_percentage as number,
        confidenceLevel: pattern.confidence_level as number,
      });
    }
  }

  // Source-based insights
  const sourcePatterns = patterns.filter(p => p.pattern_type === "source");
  for (const pattern of sourcePatterns.slice(0, 2)) {
    const data = pattern.pattern_data as Record<string, unknown>;
    insights.push({
      title: pattern.pattern_name as string,
      description: pattern.pattern_description as string,
      percentage: data.percentage as number | undefined,
      confidenceLevel: pattern.confidence_level as number,
    });
  }

  // Time-based insights
  const timePatterns = patterns.filter(p => p.pattern_type === "time");
  for (const pattern of timePatterns.slice(0, 2)) {
    insights.push({
      title: pattern.pattern_name as string,
      description: pattern.pattern_description as string,
      confidenceLevel: pattern.confidence_level as number,
    });
  }

  // Aggregate cluster insights
  if (clusters.length > 0) {
    const totalResolutions = clusters.reduce((sum, c) => sum + (c.total_resolutions as number || 0), 0);
    const totalTeens = clusters.reduce((sum, c) => sum + (c.teen_count as number || 0), 0);
    const totalRunaway = clusters.reduce((sum, c) => sum + (c.runaway_count as number || 0), 0);

    if (totalTeens > 0 && totalResolutions > 0) {
      const teenPercentage = Math.round((totalTeens / totalResolutions) * 100);
      if (teenPercentage > 20) {
        insights.push({
          title: "Teen Population Trend",
          description: `${teenPercentage}% of resolved cases involve teenagers (13-17 years)`,
          percentage: teenPercentage,
          count: totalTeens,
          confidenceLevel: 0.9,
        });
      }
    }

    if (totalRunaway > 0 && totalResolutions > 0) {
      const runawayPercentage = Math.round((totalRunaway / totalResolutions) * 100);
      if (runawayPercentage > 15) {
        insights.push({
          title: "Runaway Case Pattern",
          description: `${runawayPercentage}% of resolutions are classified as runaway cases`,
          percentage: runawayPercentage,
          count: totalRunaway,
          confidenceLevel: 0.85,
        });
      }
    }
  }

  return insights.slice(0, 10);
}

function generateDistanceInsightsDetailed(clusters: Record<string, unknown>[]): DistanceInsight[] {
  const ageGroups: AgeGroupCategory[] = ["child", "teen", "young_adult", "adult", "elderly"];
  const insights: DistanceInsight[] = [];

  for (const ageGroup of ageGroups) {
    const countKey = ageGroup === "young_adult" ? "young_adult_count" : `${ageGroup}_count`;
    const relevantClusters = clusters.filter(c => (c[countKey] as number || 0) > 0);

    if (relevantClusters.length === 0) continue;

    const totalCount = relevantClusters.reduce((sum, c) => sum + (c[countKey] as number || 0), 0);

    if (totalCount < MINIMUM_PRIVACY_THRESHOLD) continue;

    // Calculate weighted average distance
    let totalWeightedDistance = 0;
    let weightSum = 0;

    for (const cluster of relevantClusters) {
      const count = cluster[countKey] as number || 0;
      const avgDist = cluster.avg_distance_from_last_seen_km as number || 0;
      totalWeightedDistance += avgDist * count;
      weightSum += count;
    }

    const avgDistance = weightSum > 0 ? totalWeightedDistance / weightSum : 0;

    // Estimate radius percentages based on average distance
    // This is a simplified estimation - real data would come from actual calculations
    const estimateWithinRadius = (radius: number): number => {
      if (avgDistance === 0) return 0;
      // Simple exponential decay model for estimation
      const lambda = 1 / avgDistance;
      return Math.min(100, Math.round((1 - Math.exp(-lambda * radius)) * 100));
    };

    insights.push({
      ageGroup,
      avgDistanceKm: Math.round(avgDistance * 10) / 10,
      medianDistanceKm: Math.round(avgDistance * 0.8 * 10) / 10, // Rough estimate
      withinRadiusPercentages: {
        radius5km: estimateWithinRadius(5),
        radius10km: estimateWithinRadius(10),
        radius25km: estimateWithinRadius(25),
        radius50km: estimateWithinRadius(50),
      },
      sampleSize: totalCount,
    });
  }

  return insights;
}

function generateStatisticalPatterns(patterns: Record<string, unknown>[], clusters: Record<string, unknown>[]): InsightPattern[] {
  const statisticalPatterns: InsightPattern[] = [];

  // High-confidence patterns
  const highConfidencePatterns = patterns.filter(p => (p.confidence_level as number) >= 0.8);

  for (const pattern of highConfidencePatterns.slice(0, 5)) {
    statisticalPatterns.push({
      title: `High Confidence: ${pattern.pattern_name}`,
      description: pattern.pattern_description as string,
      confidenceLevel: pattern.confidence_level as number,
      count: pattern.sample_size as number,
    });
  }

  // Correlation patterns
  const correlationPatterns = patterns.filter(p => p.pattern_type === "correlation");
  for (const pattern of correlationPatterns.slice(0, 3)) {
    const data = pattern.pattern_data as Record<string, unknown>;
    statisticalPatterns.push({
      title: `Correlation: ${pattern.pattern_name}`,
      description: pattern.pattern_description as string,
      percentage: data.correlation ? (data.correlation as number) * 100 : undefined,
      confidenceLevel: pattern.confidence_level as number,
    });
  }

  return statisticalPatterns;
}

interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  applicableTo: string[];
}

function generateRecommendations(patterns: Record<string, unknown>[]): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Generate recommendations based on pattern data
  const distancePatterns = patterns.filter(p =>
    p.pattern_type === "distance" && (p.confidence_level as number) >= 0.75
  );

  for (const pattern of distancePatterns.slice(0, 2)) {
    const data = pattern.pattern_data as Record<string, unknown>;
    const radius = data.radius_km as number || 10;
    const percentage = data.within_radius_percentage as number || 0;

    if (percentage > 60) {
      recommendations.push({
        title: `Focus initial search within ${radius}km radius`,
        description: `Based on historical data, ${Math.round(percentage)}% of ${pattern.age_group || "similar"} cases were resolved within ${radius}km of the last seen location.`,
        priority: "high",
        applicableTo: pattern.age_group ? [pattern.age_group as string] : ["all"],
      });
    }
  }

  // Source-based recommendations
  const sourcePatterns = patterns.filter(p =>
    p.pattern_type === "source" && (p.confidence_level as number) >= 0.7
  );

  for (const pattern of sourcePatterns.slice(0, 2)) {
    const data = pattern.pattern_data as Record<string, unknown>;
    if (data.source) {
      recommendations.push({
        title: `Prioritize ${formatSource(data.source as string)} outreach`,
        description: pattern.pattern_description as string,
        priority: "medium",
        applicableTo: pattern.age_group ? [pattern.age_group as string] : ["all"],
      });
    }
  }

  // Time-based recommendations
  const timePatterns = patterns.filter(p =>
    p.pattern_type === "time" && (p.confidence_level as number) >= 0.7
  );

  for (const pattern of timePatterns.slice(0, 1)) {
    const data = pattern.pattern_data as Record<string, unknown>;
    if (data.time_of_day) {
      recommendations.push({
        title: `Consider ${formatTimeOfDay(data.time_of_day as string)} search operations`,
        description: pattern.pattern_description as string,
        priority: "medium",
        applicableTo: pattern.age_group ? [pattern.age_group as string] : ["all"],
      });
    }
  }

  return recommendations.slice(0, 5);
}

function formatSource(source: string): string {
  const sourceMap: Record<string, string> = {
    hospital: "hospital",
    shelter: "shelter",
    police_station: "police station",
    home_address: "home",
    public_location: "public location",
    school: "school",
    transit_location: "transit",
    mental_health_facility: "mental health facility",
  };
  return sourceMap[source] || source.replace(/_/g, " ");
}

function formatTimeOfDay(timeOfDay: string): string {
  const timeMap: Record<string, string> = {
    early_morning: "early morning (00:00-06:00)",
    morning: "morning (06:00-12:00)",
    afternoon: "afternoon (12:00-18:00)",
    evening: "evening (18:00-24:00)",
  };
  return timeMap[timeOfDay] || timeOfDay.replace(/_/g, " ");
}
