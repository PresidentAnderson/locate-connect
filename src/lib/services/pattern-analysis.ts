/**
 * Pattern Analysis Service for Resolution Location Heat Map
 * LC-FEAT-020
 *
 * This service provides utilities for analyzing resolution patterns,
 * generating insights, and creating predictive suggestions.
 */

import type {
  ResolutionLocationCluster,
  ResolutionPattern,
  PredictiveSuggestion,
  AgeGroupCategory,
  CaseTypeCategory,
  TimeOfDayCategory,
  ResolutionSource,
  DispositionType,
  PatternType,
  PatternData,
  SuggestionParameters,
} from "@/types/heatmap.types";

const MINIMUM_SAMPLE_SIZE = 10;
const HIGH_CONFIDENCE_THRESHOLD = 0.75;
const SIGNIFICANT_PERCENTAGE = 50;

// =============================================================================
// Distance Analysis
// =============================================================================

export interface DistanceAnalysisResult {
  ageGroup: AgeGroupCategory;
  caseType?: CaseTypeCategory;
  sampleSize: number;
  avgDistanceKm: number;
  medianDistanceKm: number;
  stdDevKm: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  withinRadius: {
    radius5km: number;
    radius10km: number;
    radius25km: number;
    radius50km: number;
  };
}

export function analyzeDistancePatterns(
  clusters: ResolutionLocationCluster[],
  ageGroup?: AgeGroupCategory,
  caseType?: CaseTypeCategory
): DistanceAnalysisResult[] {
  const results: DistanceAnalysisResult[] = [];
  const ageGroups: AgeGroupCategory[] = ageGroup
    ? [ageGroup]
    : ["child", "teen", "young_adult", "adult", "elderly"];

  for (const age of ageGroups) {
    const relevantClusters = filterClustersByAgeGroup(clusters, age);

    if (relevantClusters.length === 0) continue;

    const distances = relevantClusters
      .filter(c => c.avgDistanceFromLastSeenKm != null)
      .map(c => ({
        distance: c.avgDistanceFromLastSeenKm!,
        count: getAgeGroupCount(c, age),
      }));

    if (distances.length < 3) continue;

    const totalCount = distances.reduce((sum, d) => sum + d.count, 0);
    if (totalCount < MINIMUM_SAMPLE_SIZE) continue;

    const weightedDistances = distances.flatMap(d =>
      Array(d.count).fill(d.distance)
    );
    weightedDistances.sort((a, b) => a - b);

    const avgDistance = weightedDistances.reduce((a, b) => a + b, 0) / weightedDistances.length;
    const variance = weightedDistances.reduce((sum, d) =>
      sum + Math.pow(d - avgDistance, 2), 0) / weightedDistances.length;
    const stdDev = Math.sqrt(variance);

    results.push({
      ageGroup: age,
      caseType,
      sampleSize: totalCount,
      avgDistanceKm: round(avgDistance, 1),
      medianDistanceKm: round(percentile(weightedDistances, 50), 1),
      stdDevKm: round(stdDev, 1),
      percentiles: {
        p25: round(percentile(weightedDistances, 25), 1),
        p50: round(percentile(weightedDistances, 50), 1),
        p75: round(percentile(weightedDistances, 75), 1),
        p90: round(percentile(weightedDistances, 90), 1),
      },
      withinRadius: {
        radius5km: calculateWithinRadius(weightedDistances, 5),
        radius10km: calculateWithinRadius(weightedDistances, 10),
        radius25km: calculateWithinRadius(weightedDistances, 25),
        radius50km: calculateWithinRadius(weightedDistances, 50),
      },
    });
  }

  return results;
}

// =============================================================================
// Temporal Analysis
// =============================================================================

export interface TemporalAnalysisResult {
  timeOfDay: TimeOfDayCategory;
  count: number;
  percentage: number;
  topSources: { source: ResolutionSource; percentage: number }[];
  topAgeGroups: { ageGroup: AgeGroupCategory; percentage: number }[];
}

export function analyzeTemporalPatterns(
  clusters: ResolutionLocationCluster[]
): TemporalAnalysisResult[] {
  const timeTotals = {
    early_morning: 0,
    morning: 0,
    afternoon: 0,
    evening: 0,
  };

  for (const cluster of clusters) {
    timeTotals.early_morning += cluster.timeOfDayCounts.earlyMorning;
    timeTotals.morning += cluster.timeOfDayCounts.morning;
    timeTotals.afternoon += cluster.timeOfDayCounts.afternoon;
    timeTotals.evening += cluster.timeOfDayCounts.evening;
  }

  const grandTotal = Object.values(timeTotals).reduce((a, b) => a + b, 0);
  if (grandTotal === 0) return [];

  const results: TemporalAnalysisResult[] = [];

  for (const [time, count] of Object.entries(timeTotals)) {
    if (count === 0) continue;

    results.push({
      timeOfDay: time as TimeOfDayCategory,
      count,
      percentage: round((count / grandTotal) * 100, 1),
      topSources: [], // Would need more detailed data to calculate
      topAgeGroups: [], // Would need more detailed data to calculate
    });
  }

  return results.sort((a, b) => b.count - a.count);
}

// =============================================================================
// Source Analysis
// =============================================================================

export interface SourceAnalysisResult {
  source: ResolutionSource;
  count: number;
  percentage: number;
  avgResolutionHours?: number;
  topAgeGroups: { ageGroup: AgeGroupCategory; percentage: number }[];
}

export function analyzeSourcePatterns(
  clusters: ResolutionLocationCluster[]
): SourceAnalysisResult[] {
  const sourceTotals: Record<ResolutionSource, number> = {
    hospital: 0,
    shelter: 0,
    police_station: 0,
    home_address: 0,
    public_location: 0,
    school: 0,
    workplace: 0,
    transit_location: 0,
    detention_facility: 0,
    mental_health_facility: 0,
    friend_family_residence: 0,
    unknown: 0,
    other: 0,
  };

  for (const cluster of clusters) {
    sourceTotals.hospital += cluster.sourceCounts.hospital;
    sourceTotals.shelter += cluster.sourceCounts.shelter;
    sourceTotals.police_station += cluster.sourceCounts.police;
    sourceTotals.home_address += cluster.sourceCounts.home;
    sourceTotals.public_location += cluster.sourceCounts.publicLocation;
    sourceTotals.school += cluster.sourceCounts.school;
    sourceTotals.other += cluster.sourceCounts.other;
  }

  const grandTotal = Object.values(sourceTotals).reduce((a, b) => a + b, 0);
  if (grandTotal === 0) return [];

  const results: SourceAnalysisResult[] = [];

  for (const [source, count] of Object.entries(sourceTotals)) {
    if (count === 0) continue;

    results.push({
      source: source as ResolutionSource,
      count,
      percentage: round((count / grandTotal) * 100, 1),
      topAgeGroups: [],
    });
  }

  return results.sort((a, b) => b.count - a.count);
}

// =============================================================================
// Demographic Analysis
// =============================================================================

export interface DemographicAnalysisResult {
  ageGroup: AgeGroupCategory;
  count: number;
  percentage: number;
  avgResolutionHours?: number;
  topDispositions: { disposition: DispositionType; percentage: number }[];
  topSources: { source: ResolutionSource; percentage: number }[];
}

export function analyzeDemographicPatterns(
  clusters: ResolutionLocationCluster[]
): DemographicAnalysisResult[] {
  const ageTotals = {
    child: 0,
    teen: 0,
    young_adult: 0,
    adult: 0,
    elderly: 0,
  };

  for (const cluster of clusters) {
    ageTotals.child += cluster.ageGroupCounts.child;
    ageTotals.teen += cluster.ageGroupCounts.teen;
    ageTotals.young_adult += cluster.ageGroupCounts.youngAdult;
    ageTotals.adult += cluster.ageGroupCounts.adult;
    ageTotals.elderly += cluster.ageGroupCounts.elderly;
  }

  const grandTotal = Object.values(ageTotals).reduce((a, b) => a + b, 0);
  if (grandTotal === 0) return [];

  const results: DemographicAnalysisResult[] = [];

  for (const [ageGroup, count] of Object.entries(ageTotals)) {
    if (count === 0) continue;

    results.push({
      ageGroup: ageGroup as AgeGroupCategory,
      count,
      percentage: round((count / grandTotal) * 100, 1),
      topDispositions: [],
      topSources: [],
    });
  }

  return results.sort((a, b) => b.count - a.count);
}

// =============================================================================
// Pattern Generation
// =============================================================================

export function generatePatterns(
  clusters: ResolutionLocationCluster[],
  periodStart: string,
  periodEnd: string
): ResolutionPattern[] {
  const patterns: ResolutionPattern[] = [];

  // Generate distance patterns
  const distanceResults = analyzeDistancePatterns(clusters);
  for (const result of distanceResults) {
    if (result.withinRadius.radius10km >= SIGNIFICANT_PERCENTAGE) {
      patterns.push(createDistancePattern(result, periodStart, periodEnd));
    }
  }

  // Generate temporal patterns
  const temporalResults = analyzeTemporalPatterns(clusters);
  const dominantTime = temporalResults[0];
  if (dominantTime && dominantTime.percentage >= 30) {
    patterns.push(createTemporalPattern(dominantTime, periodStart, periodEnd));
  }

  // Generate source patterns
  const sourceResults = analyzeSourcePatterns(clusters);
  for (const result of sourceResults.slice(0, 3)) {
    if (result.percentage >= 20) {
      patterns.push(createSourcePattern(result, periodStart, periodEnd));
    }
  }

  // Generate demographic patterns
  const demographicResults = analyzeDemographicPatterns(clusters);
  for (const result of demographicResults) {
    if (result.percentage >= 15) {
      patterns.push(createDemographicPattern(result, periodStart, periodEnd));
    }
  }

  return patterns;
}

function createDistancePattern(
  result: DistanceAnalysisResult,
  periodStart: string,
  periodEnd: string
): ResolutionPattern {
  const percentage = result.withinRadius.radius10km;
  return {
    id: generateId(),
    patternType: "distance",
    patternName: `${formatAgeGroup(result.ageGroup)} Distance Pattern`,
    patternDescription: `${percentage}% of ${formatAgeGroup(result.ageGroup).toLowerCase()} cases found within 10km of last seen location`,
    confidenceLevel: calculateConfidence(result.sampleSize, percentage),
    sampleSize: result.sampleSize,
    patternData: {
      avgDistanceKm: result.avgDistanceKm,
      withinRadiusPercentage: percentage,
      radiusKm: 10,
      percentiles: result.percentiles,
    },
    ageGroup: result.ageGroup,
    periodStart,
    periodEnd,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createTemporalPattern(
  result: TemporalAnalysisResult,
  periodStart: string,
  periodEnd: string
): ResolutionPattern {
  return {
    id: generateId(),
    patternType: "time",
    patternName: `${formatTimeOfDay(result.timeOfDay)} Resolution Pattern`,
    patternDescription: `${result.percentage}% of resolutions occur during ${formatTimeOfDay(result.timeOfDay).toLowerCase()} hours`,
    confidenceLevel: calculateConfidence(result.count, result.percentage),
    sampleSize: result.count,
    patternData: {
      timeOfDay: result.timeOfDay,
      percentage: result.percentage,
    },
    periodStart,
    periodEnd,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createSourcePattern(
  result: SourceAnalysisResult,
  periodStart: string,
  periodEnd: string
): ResolutionPattern {
  return {
    id: generateId(),
    patternType: "source",
    patternName: `${formatSource(result.source)} Location Pattern`,
    patternDescription: `${result.percentage}% of resolutions occurred at ${formatSource(result.source).toLowerCase()} locations`,
    confidenceLevel: calculateConfidence(result.count, result.percentage),
    sampleSize: result.count,
    patternData: {
      source: result.source,
      percentage: result.percentage,
    },
    periodStart,
    periodEnd,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createDemographicPattern(
  result: DemographicAnalysisResult,
  periodStart: string,
  periodEnd: string
): ResolutionPattern {
  return {
    id: generateId(),
    patternType: "demographic",
    patternName: `${formatAgeGroup(result.ageGroup)} Demographic Pattern`,
    patternDescription: `${result.percentage}% of resolutions involve ${formatAgeGroup(result.ageGroup).toLowerCase()} individuals`,
    confidenceLevel: calculateConfidence(result.count, result.percentage),
    sampleSize: result.count,
    patternData: {
      ageGroup: result.ageGroup,
      percentage: result.percentage,
    },
    periodStart,
    periodEnd,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// =============================================================================
// Suggestion Generation
// =============================================================================

export function generateSuggestions(
  patterns: ResolutionPattern[]
): PredictiveSuggestion[] {
  const suggestions: PredictiveSuggestion[] = [];

  // Distance-based suggestions
  const distancePatterns = patterns.filter(p =>
    p.patternType === "distance" && p.confidenceLevel >= HIGH_CONFIDENCE_THRESHOLD
  );

  for (const pattern of distancePatterns) {
    const data = pattern.patternData;
    const radiusKm = data.radiusKm || 10;
    const percentage = data.withinRadiusPercentage || 0;

    suggestions.push({
      id: generateId(),
      suggestionType: "search_area",
      suggestionTitle: `Focus search within ${radiusKm}km radius`,
      suggestionDescription: `Based on historical data, ${Math.round(percentage as number)}% of similar cases were resolved within ${radiusKm}km of the last seen location.`,
      patternIds: [pattern.id],
      parameters: {
        searchRadiusKm: radiusKm as number,
      },
      appliesToAgeGroup: pattern.ageGroup ? [pattern.ageGroup] : undefined,
      confidenceScore: pattern.confidenceLevel,
      timesUsed: 0,
      timesSuccessful: 0,
      successRate: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Source-based suggestions
  const sourcePatterns = patterns.filter(p =>
    p.patternType === "source" && p.confidenceLevel >= 0.6
  );

  if (sourcePatterns.length > 0) {
    const topSources = sourcePatterns
      .map(p => p.patternData.source as ResolutionSource)
      .filter(Boolean)
      .slice(0, 3);

    if (topSources.length > 0) {
      suggestions.push({
        id: generateId(),
        suggestionType: "location_type",
        suggestionTitle: "Priority location types to check",
        suggestionDescription: `Based on historical patterns, prioritize checking ${topSources.map(formatSource).join(", ")} locations.`,
        patternIds: sourcePatterns.map(p => p.id),
        parameters: {
          priorityLocations: topSources,
        },
        confidenceScore: Math.max(...sourcePatterns.map(p => p.confidenceLevel)),
        timesUsed: 0,
        timesSuccessful: 0,
        successRate: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Time-based suggestions
  const timePatterns = patterns.filter(p =>
    p.patternType === "time" && p.confidenceLevel >= 0.6
  );

  for (const pattern of timePatterns.slice(0, 1)) {
    const timeOfDay = pattern.patternData.timeOfDay as TimeOfDayCategory;
    if (timeOfDay) {
      suggestions.push({
        id: generateId(),
        suggestionType: "time_window",
        suggestionTitle: `Optimal search time: ${formatTimeOfDay(timeOfDay)}`,
        suggestionDescription: `Historical data shows higher resolution rates during ${formatTimeOfDay(timeOfDay).toLowerCase()} hours.`,
        patternIds: [pattern.id],
        parameters: {
          timeWindow: timeOfDay,
        },
        confidenceScore: pattern.confidenceLevel,
        timesUsed: 0,
        timesSuccessful: 0,
        successRate: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return suggestions;
}

// =============================================================================
// Utility Functions
// =============================================================================

function filterClustersByAgeGroup(
  clusters: ResolutionLocationCluster[],
  ageGroup: AgeGroupCategory
): ResolutionLocationCluster[] {
  return clusters.filter(c => getAgeGroupCount(c, ageGroup) > 0);
}

function getAgeGroupCount(
  cluster: ResolutionLocationCluster,
  ageGroup: AgeGroupCategory
): number {
  switch (ageGroup) {
    case "child": return cluster.ageGroupCounts.child;
    case "teen": return cluster.ageGroupCounts.teen;
    case "young_adult": return cluster.ageGroupCounts.youngAdult;
    case "adult": return cluster.ageGroupCounts.adult;
    case "elderly": return cluster.ageGroupCounts.elderly;
    default: return 0;
  }
}

function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  const index = (p / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedArray[lower];
  return sortedArray[lower] + (index - lower) * (sortedArray[upper] - sortedArray[lower]);
}

function calculateWithinRadius(distances: number[], radius: number): number {
  if (distances.length === 0) return 0;
  const within = distances.filter(d => d <= radius).length;
  return round((within / distances.length) * 100, 1);
}

function calculateConfidence(sampleSize: number, percentage: number): number {
  // Simple confidence calculation based on sample size and effect size
  const sampleFactor = Math.min(1, sampleSize / 100);
  const effectFactor = percentage / 100;
  return round(Math.min(0.95, sampleFactor * 0.5 + effectFactor * 0.5), 2);
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function generateId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function formatAgeGroup(ageGroup: AgeGroupCategory): string {
  const map: Record<AgeGroupCategory, string> = {
    child: "Child (0-12)",
    teen: "Teen (13-17)",
    young_adult: "Young Adult (18-25)",
    adult: "Adult (26-64)",
    elderly: "Elderly (65+)",
    unknown: "Unknown",
  };
  return map[ageGroup] || ageGroup;
}

function formatTimeOfDay(timeOfDay: TimeOfDayCategory): string {
  const map: Record<TimeOfDayCategory, string> = {
    early_morning: "Early Morning (00:00-06:00)",
    morning: "Morning (06:00-12:00)",
    afternoon: "Afternoon (12:00-18:00)",
    evening: "Evening (18:00-24:00)",
    unknown: "Unknown",
  };
  return map[timeOfDay] || timeOfDay;
}

function formatSource(source: ResolutionSource): string {
  const map: Record<ResolutionSource, string> = {
    hospital: "Hospital",
    shelter: "Shelter",
    police_station: "Police Station",
    home_address: "Home",
    public_location: "Public Location",
    school: "School",
    workplace: "Workplace",
    transit_location: "Transit Location",
    detention_facility: "Detention Facility",
    mental_health_facility: "Mental Health Facility",
    friend_family_residence: "Friend/Family Residence",
    unknown: "Unknown",
    other: "Other",
  };
  return map[source] || source.replace(/_/g, " ");
}

// =============================================================================
// Export Analysis Summary
// =============================================================================

export interface AnalysisSummary {
  totalClusters: number;
  totalResolutions: number;
  distancePatterns: DistanceAnalysisResult[];
  temporalPatterns: TemporalAnalysisResult[];
  sourcePatterns: SourceAnalysisResult[];
  demographicPatterns: DemographicAnalysisResult[];
  generatedPatterns: ResolutionPattern[];
  generatedSuggestions: PredictiveSuggestion[];
}

export function performFullAnalysis(
  clusters: ResolutionLocationCluster[],
  periodStart: string,
  periodEnd: string
): AnalysisSummary {
  const totalResolutions = clusters.reduce((sum, c) => sum + c.totalResolutions, 0);

  const distancePatterns = analyzeDistancePatterns(clusters);
  const temporalPatterns = analyzeTemporalPatterns(clusters);
  const sourcePatterns = analyzeSourcePatterns(clusters);
  const demographicPatterns = analyzeDemographicPatterns(clusters);

  const generatedPatterns = generatePatterns(clusters, periodStart, periodEnd);
  const generatedSuggestions = generateSuggestions(generatedPatterns);

  return {
    totalClusters: clusters.length,
    totalResolutions,
    distancePatterns,
    temporalPatterns,
    sourcePatterns,
    demographicPatterns,
    generatedPatterns,
    generatedSuggestions,
  };
}
