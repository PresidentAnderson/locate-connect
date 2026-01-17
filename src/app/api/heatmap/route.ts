import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  HeatMapDataResponse,
  HeatMapQueryParams,
  ResolutionLocationCluster,
  ResolutionPattern,
  PredictiveSuggestion,
  HeatMapInsights,
  HeatMapMetadata,
  HeatMapFilters,
  AgeGroupCategory,
  CaseTypeCategory,
  DispositionType,
  ResolutionSource,
  TimeOfDayCategory,
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

    // Verify user role (only LE, admin, developer can access)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_verified")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    if (!["admin", "developer", "law_enforcement"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Access denied. This feature requires elevated permissions." },
        { status: 403 }
      );
    }

    if (!profile.is_verified) {
      return NextResponse.json(
        { error: "Account verification required" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = parseQueryParams(searchParams);

    // Fetch data in parallel
    const [clustersResult, patternsResult, suggestionsResult] = await Promise.all([
      fetchClusters(supabase, params),
      fetchPatterns(supabase, params),
      fetchSuggestions(supabase, params),
    ]);

    // Generate insights from the data
    const insights = generateInsights(
      clustersResult.data || [],
      patternsResult.data || []
    );

    // Build metadata
    const metadata: HeatMapMetadata = {
      totalClusters: clustersResult.data?.length || 0,
      totalPatterns: patternsResult.data?.length || 0,
      totalSuggestions: suggestionsResult.data?.length || 0,
      lastAggregationAt: new Date().toISOString(),
      privacyCompliant: true,
      filtersApplied: buildFiltersFromParams(params),
    };

    // Log access for audit purposes
    await logAccess(supabase, user.id, params, metadata);

    const response: HeatMapDataResponse = {
      clusters: transformClusters(clustersResult.data || []),
      patterns: transformPatterns(patternsResult.data || []),
      suggestions: transformSuggestions(suggestionsResult.data || []),
      insights,
      metadata,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching heat map data:", error);
    return NextResponse.json(
      { error: "Failed to fetch heat map data" },
      { status: 500 }
    );
  }
}

function parseQueryParams(searchParams: URLSearchParams): HeatMapQueryParams {
  const params: HeatMapQueryParams = {};

  // Date range
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  // Filters
  const caseTypes = searchParams.get("caseTypes");
  if (caseTypes) {
    params.caseTypes = caseTypes.split(",") as CaseTypeCategory[];
  }

  const ageGroups = searchParams.get("ageGroups");
  if (ageGroups) {
    params.ageGroups = ageGroups.split(",") as AgeGroupCategory[];
  }

  const dispositions = searchParams.get("dispositions");
  if (dispositions) {
    params.dispositions = dispositions.split(",") as DispositionType[];
  }

  const sources = searchParams.get("sources");
  if (sources) {
    params.sources = sources.split(",") as ResolutionSource[];
  }

  const timeOfDay = searchParams.get("timeOfDay");
  if (timeOfDay) {
    params.timeOfDay = timeOfDay.split(",") as TimeOfDayCategory[];
  }

  // Geographic
  const jurisdictionId = searchParams.get("jurisdictionId");
  if (jurisdictionId) params.jurisdictionId = jurisdictionId;

  const province = searchParams.get("province");
  if (province) params.province = province;

  // Bounds
  const north = searchParams.get("north");
  const south = searchParams.get("south");
  const east = searchParams.get("east");
  const west = searchParams.get("west");
  if (north && south && east && west) {
    params.bounds = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west),
    };
  }

  // Pagination
  const limit = searchParams.get("limit");
  if (limit) params.limit = parseInt(limit, 10);

  const offset = searchParams.get("offset");
  if (offset) params.offset = parseInt(offset, 10);

  return params;
}

async function fetchClusters(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, params: HeatMapQueryParams) {
  let query = supabase
    .from("resolution_location_clusters")
    .select("*")
    .eq("is_privacy_compliant", true)
    .gte("total_resolutions", MINIMUM_PRIVACY_THRESHOLD);

  // Apply date filters
  if (params.startDate) {
    query = query.gte("period_start", params.startDate);
  }
  if (params.endDate) {
    query = query.lte("period_end", params.endDate);
  }

  // Apply geographic filters
  if (params.jurisdictionId) {
    query = query.eq("jurisdiction_id", params.jurisdictionId);
  }
  if (params.province) {
    query = query.eq("province", params.province);
  }

  // Apply bounds filter
  if (params.bounds) {
    query = query
      .gte("cluster_center_lat", params.bounds.south)
      .lte("cluster_center_lat", params.bounds.north)
      .gte("cluster_center_lng", params.bounds.west)
      .lte("cluster_center_lng", params.bounds.east);
  }

  // Apply pagination
  if (params.limit) {
    query = query.limit(params.limit);
  }
  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 100) - 1);
  }

  // Order by total resolutions
  query = query.order("total_resolutions", { ascending: false });

  return await query;
}

async function fetchPatterns(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, params: HeatMapQueryParams) {
  let query = supabase
    .from("resolution_patterns")
    .select("*")
    .eq("is_active", true);

  // Apply age group filter
  if (params.ageGroups && params.ageGroups.length > 0) {
    query = query.in("age_group", params.ageGroups);
  }

  // Apply date filters
  if (params.startDate) {
    query = query.gte("period_start", params.startDate);
  }
  if (params.endDate) {
    query = query.lte("period_end", params.endDate);
  }

  // Apply geographic filters
  if (params.jurisdictionId) {
    query = query.eq("jurisdiction_id", params.jurisdictionId);
  }
  if (params.province) {
    query = query.eq("province", params.province);
  }

  // Order by confidence level
  query = query.order("confidence_level", { ascending: false });

  // Limit patterns
  query = query.limit(50);

  return await query;
}

async function fetchSuggestions(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, params: HeatMapQueryParams) {
  let query = supabase
    .from("predictive_suggestions")
    .select("*")
    .eq("is_active", true);

  // Apply jurisdiction filter
  if (params.jurisdictionId) {
    query = query.or(`applies_to_jurisdiction.is.null,applies_to_jurisdiction.eq.${params.jurisdictionId}`);
  }

  // Order by confidence score and success rate
  query = query
    .order("confidence_score", { ascending: false })
    .order("success_rate", { ascending: false });

  // Limit suggestions
  query = query.limit(20);

  return await query;
}

function transformClusters(data: unknown[]): ResolutionLocationCluster[] {
  return (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    clusterCenterLat: row.cluster_center_lat as number,
    clusterCenterLng: row.cluster_center_lng as number,
    clusterRadiusKm: row.cluster_radius_km as number,
    province: row.province as string,
    city: row.city as string | undefined,
    region: row.region as string | undefined,
    jurisdictionId: row.jurisdiction_id as string | undefined,
    totalResolutions: row.total_resolutions as number,
    dispositionCounts: {
      foundAliveSafe: row.found_alive_safe_count as number || 0,
      foundAliveInjured: row.found_alive_injured_count as number || 0,
      foundDeceased: row.found_deceased_count as number || 0,
      returnedVoluntarily: row.returned_voluntarily_count as number || 0,
      locatedRunaway: row.located_runaway_count as number || 0,
      locatedCustody: row.located_custody_count as number || 0,
      locatedMedicalFacility: row.located_medical_facility_count as number || 0,
      locatedShelter: row.located_shelter_count as number || 0,
      locatedIncarcerated: row.located_incarcerated_count as number || 0,
      other: row.other_disposition_count as number || 0,
    },
    sourceCounts: {
      hospital: row.hospital_source_count as number || 0,
      shelter: row.shelter_source_count as number || 0,
      police: row.police_source_count as number || 0,
      home: row.home_source_count as number || 0,
      publicLocation: row.public_location_count as number || 0,
      school: row.school_source_count as number || 0,
      other: row.other_source_count as number || 0,
    },
    timeOfDayCounts: {
      earlyMorning: row.early_morning_count as number || 0,
      morning: row.morning_count as number || 0,
      afternoon: row.afternoon_count as number || 0,
      evening: row.evening_count as number || 0,
    },
    ageGroupCounts: {
      child: row.child_count as number || 0,
      teen: row.teen_count as number || 0,
      youngAdult: row.young_adult_count as number || 0,
      adult: row.adult_count as number || 0,
      elderly: row.elderly_count as number || 0,
    },
    caseTypeCounts: {
      runaway: row.runaway_count as number || 0,
      abduction: row.abduction_count as number || 0,
      dementiaRelated: row.dementia_related_count as number || 0,
      mentalHealth: row.mental_health_count as number || 0,
      indigenous: row.indigenous_count as number || 0,
    },
    avgResolutionHours: row.avg_resolution_hours as number | undefined,
    medianResolutionHours: row.median_resolution_hours as number | undefined,
    minResolutionHours: row.min_resolution_hours as number | undefined,
    maxResolutionHours: row.max_resolution_hours as number | undefined,
    avgDistanceFromLastSeenKm: row.avg_distance_from_last_seen_km as number | undefined,
    medianDistanceFromLastSeenKm: row.median_distance_from_last_seen_km as number | undefined,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    isPrivacyCompliant: row.is_privacy_compliant as boolean,
    minimumCaseThreshold: row.minimum_case_threshold as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

function transformPatterns(data: unknown[]): ResolutionPattern[] {
  return (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    patternType: row.pattern_type as ResolutionPattern["patternType"],
    patternName: row.pattern_name as string,
    patternDescription: row.pattern_description as string,
    confidenceLevel: row.confidence_level as number,
    sampleSize: row.sample_size as number,
    statisticalSignificance: row.statistical_significance as number | undefined,
    patternData: row.pattern_data as ResolutionPattern["patternData"],
    jurisdictionId: row.jurisdiction_id as string | undefined,
    province: row.province as string | undefined,
    ageGroup: row.age_group as AgeGroupCategory | undefined,
    caseType: row.case_type as string | undefined,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    isActive: row.is_active as boolean,
    expiresAt: row.expires_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

function transformSuggestions(data: unknown[]): PredictiveSuggestion[] {
  return (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    suggestionType: row.suggestion_type as PredictiveSuggestion["suggestionType"],
    suggestionTitle: row.suggestion_title as string,
    suggestionDescription: row.suggestion_description as string,
    patternIds: row.pattern_ids as string[] || [],
    parameters: row.parameters as PredictiveSuggestion["parameters"],
    appliesToAgeGroup: row.applies_to_age_group as AgeGroupCategory[] | undefined,
    appliesToCaseType: row.applies_to_case_type as string[] | undefined,
    appliesToJurisdiction: row.applies_to_jurisdiction as string | undefined,
    confidenceScore: row.confidence_score as number,
    relevanceScore: row.relevance_score as number | undefined,
    timesUsed: row.times_used as number,
    timesSuccessful: row.times_successful as number,
    successRate: row.success_rate as number,
    isActive: row.is_active as boolean,
    expiresAt: row.expires_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

function generateInsights(
  clusters: unknown[],
  patterns: unknown[]
): HeatMapInsights {
  // Calculate total resolutions across all clusters
  const totalResolutions = clusters.reduce((sum: number, c: Record<string, unknown>) =>
    sum + (c.total_resolutions as number || 0), 0);

  // Generate top patterns
  const topPatterns = patterns.slice(0, 5).map((p: Record<string, unknown>) => ({
    title: p.pattern_name as string,
    description: p.pattern_description as string,
    confidenceLevel: p.confidence_level as number,
  }));

  // Generate distance insights (aggregated)
  const distanceInsights = generateDistanceInsights(clusters);

  // Generate demographic insights
  const demographicInsights = generateDemographicInsights(clusters);

  // Generate temporal insights
  const temporalInsights = generateTemporalInsights(clusters);

  // Generate source insights
  const sourceInsights = generateSourceInsights(clusters);

  return {
    totalResolutions,
    dateRange: {
      startDate: clusters.length > 0 ?
        Math.min(...clusters.map((c: Record<string, unknown>) => new Date(c.period_start as string).getTime())).toString() :
        new Date().toISOString(),
      endDate: clusters.length > 0 ?
        Math.max(...clusters.map((c: Record<string, unknown>) => new Date(c.period_end as string).getTime())).toString() :
        new Date().toISOString(),
    },
    topPatterns,
    distanceInsights,
    demographicInsights,
    temporalInsights,
    sourceInsights,
  };
}

function generateDistanceInsights(clusters: unknown[]): HeatMapInsights["distanceInsights"] {
  const ageGroups: AgeGroupCategory[] = ["child", "teen", "young_adult", "adult", "elderly"];

  return ageGroups.map(ageGroup => {
    const relevantClusters = clusters.filter((c: Record<string, unknown>) => {
      const count = c[`${ageGroup}_count`] as number;
      return count && count > 0;
    });

    const totalCount = relevantClusters.reduce((sum: number, c: Record<string, unknown>) => {
      const countKey = `${ageGroup === "young_adult" ? "young_adult" : ageGroup}_count`;
      return sum + (c[countKey] as number || 0);
    }, 0);

    const avgDistance = relevantClusters.length > 0
      ? relevantClusters.reduce((sum: number, c: Record<string, unknown>) =>
          sum + (c.avg_distance_from_last_seen_km as number || 0), 0) / relevantClusters.length
      : 0;

    return {
      ageGroup,
      avgDistanceKm: Math.round(avgDistance * 10) / 10,
      medianDistanceKm: Math.round(avgDistance * 10) / 10, // Simplified
      withinRadiusPercentages: {
        radius5km: 0,
        radius10km: 0,
        radius25km: 0,
        radius50km: 0,
      },
      sampleSize: totalCount,
    };
  }).filter(insight => insight.sampleSize > 0);
}

function generateDemographicInsights(clusters: unknown[]): HeatMapInsights["demographicInsights"] {
  const ageGroups: AgeGroupCategory[] = ["child", "teen", "young_adult", "adult", "elderly"];

  return ageGroups.map(ageGroup => {
    const countKey = ageGroup === "young_adult" ? "young_adult_count" : `${ageGroup}_count`;
    const totalCases = clusters.reduce((sum: number, c: Record<string, unknown>) =>
      sum + (c[countKey] as number || 0), 0);

    return {
      ageGroup,
      totalCases,
      resolutionRate: 100, // All these are resolved cases
      avgResolutionHours: clusters.length > 0
        ? clusters.reduce((sum: number, c: Record<string, unknown>) =>
            sum + (c.avg_resolution_hours as number || 0), 0) / clusters.length
        : 0,
      topDispositions: [],
      topSources: [],
    };
  }).filter(insight => insight.totalCases > 0);
}

function generateTemporalInsights(clusters: unknown[]): HeatMapInsights["temporalInsights"] {
  const timeCategories: TimeOfDayCategory[] = ["early_morning", "morning", "afternoon", "evening"];
  const countKeys: Record<TimeOfDayCategory, string> = {
    early_morning: "early_morning_count",
    morning: "morning_count",
    afternoon: "afternoon_count",
    evening: "evening_count",
    unknown: "unknown_count",
  };

  const totalByTime = timeCategories.reduce((acc, time) => {
    acc[time] = clusters.reduce((sum: number, c: Record<string, unknown>) =>
      sum + (c[countKeys[time]] as number || 0), 0);
    return acc;
  }, {} as Record<TimeOfDayCategory, number>);

  const grandTotal = Object.values(totalByTime).reduce((a, b) => a + b, 0);

  return timeCategories.map(time => ({
    timeOfDay: time,
    count: totalByTime[time],
    percentage: grandTotal > 0 ? Math.round((totalByTime[time] / grandTotal) * 1000) / 10 : 0,
  }));
}

function generateSourceInsights(clusters: unknown[]): HeatMapInsights["sourceInsights"] {
  const sources: ResolutionSource[] = ["hospital", "shelter", "police_station", "home_address", "public_location", "school"];
  const sourceKeys: Record<string, string> = {
    hospital: "hospital_source_count",
    shelter: "shelter_source_count",
    police_station: "police_source_count",
    home_address: "home_source_count",
    public_location: "public_location_count",
    school: "school_source_count",
  };

  const totalBySource = sources.reduce((acc, source) => {
    const key = sourceKeys[source] || `${source}_count`;
    acc[source] = clusters.reduce((sum: number, c: Record<string, unknown>) =>
      sum + (c[key] as number || 0), 0);
    return acc;
  }, {} as Record<ResolutionSource, number>);

  const grandTotal = Object.values(totalBySource).reduce((a, b) => a + b, 0);

  return sources
    .map(source => ({
      source,
      count: totalBySource[source],
      percentage: grandTotal > 0 ? Math.round((totalBySource[source] / grandTotal) * 1000) / 10 : 0,
    }))
    .filter(insight => insight.count > 0)
    .sort((a, b) => b.count - a.count);
}

function buildFiltersFromParams(params: HeatMapQueryParams): HeatMapFilters {
  return {
    caseTypes: params.caseTypes || [],
    ageGroups: params.ageGroups || [],
    timeFrame: "all",
    dispositions: params.dispositions || [],
    sources: params.sources || [],
    dateRange: params.startDate && params.endDate
      ? { startDate: params.startDate, endDate: params.endDate }
      : undefined,
    jurisdictionId: params.jurisdictionId,
    province: params.province,
  };
}

async function logAccess(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  params: HeatMapQueryParams,
  metadata: HeatMapMetadata
) {
  try {
    await supabase.from("heat_map_access_logs").insert({
      user_id: userId,
      action: "view",
      filters_applied: buildFiltersFromParams(params),
      clusters_returned: metadata.totalClusters,
      patterns_returned: metadata.totalPatterns,
    });
  } catch (error) {
    console.error("Failed to log heat map access:", error);
    // Don't fail the request if logging fails
  }
}
