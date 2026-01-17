/**
 * Resolution Location Heat Map Types
 * LC-FEAT-020
 */

// =============================================================================
// ENUMS
// =============================================================================

export type ResolutionSource =
  | 'hospital'
  | 'shelter'
  | 'police_station'
  | 'home_address'
  | 'public_location'
  | 'school'
  | 'workplace'
  | 'transit_location'
  | 'detention_facility'
  | 'mental_health_facility'
  | 'friend_family_residence'
  | 'unknown'
  | 'other';

export type TimeOfDayCategory =
  | 'early_morning'  // 00:00 - 06:00
  | 'morning'        // 06:00 - 12:00
  | 'afternoon'      // 12:00 - 18:00
  | 'evening'        // 18:00 - 24:00
  | 'unknown';

export type AgeGroupCategory =
  | 'child'         // 0-12
  | 'teen'          // 13-17
  | 'young_adult'   // 18-25
  | 'adult'         // 26-64
  | 'elderly'       // 65+
  | 'unknown';

export type CaseTypeCategory =
  | 'runaway'
  | 'abduction'
  | 'dementia_related'
  | 'mental_health'
  | 'indigenous'
  | 'other';

export type HeatMapLayer =
  | 'allResolutions'
  | 'byDisposition'
  | 'bySource'
  | 'byTimePattern'
  | 'byDemographic';

export type PatternType =
  | 'distance'
  | 'time'
  | 'demographic'
  | 'source'
  | 'correlation';

export type SuggestionType =
  | 'search_area'
  | 'location_type'
  | 'time_window'
  | 'resource_allocation';

export type DispositionType =
  | 'found_alive_safe'
  | 'found_alive_injured'
  | 'found_deceased'
  | 'returned_voluntarily'
  | 'located_runaway'
  | 'located_custody'
  | 'located_medical_facility'
  | 'located_shelter'
  | 'located_incarcerated'
  | 'other';

// =============================================================================
// RESOLUTION LOCATION CLUSTER
// =============================================================================

export interface ResolutionLocationCluster {
  id: string;

  // Geographic data
  clusterCenterLat: number;
  clusterCenterLng: number;
  clusterRadiusKm: number;

  // Location metadata
  province: string;
  city?: string;
  region?: string;
  jurisdictionId?: string;

  // Aggregated metrics
  totalResolutions: number;

  // By disposition
  dispositionCounts: {
    foundAliveSafe: number;
    foundAliveInjured: number;
    foundDeceased: number;
    returnedVoluntarily: number;
    locatedRunaway: number;
    locatedCustody: number;
    locatedMedicalFacility: number;
    locatedShelter: number;
    locatedIncarcerated: number;
    other: number;
  };

  // By source
  sourceCounts: {
    hospital: number;
    shelter: number;
    police: number;
    home: number;
    publicLocation: number;
    school: number;
    other: number;
  };

  // By time of day
  timeOfDayCounts: {
    earlyMorning: number;
    morning: number;
    afternoon: number;
    evening: number;
  };

  // By age group
  ageGroupCounts: {
    child: number;
    teen: number;
    youngAdult: number;
    adult: number;
    elderly: number;
  };

  // By case type
  caseTypeCounts: {
    runaway: number;
    abduction: number;
    dementiaRelated: number;
    mentalHealth: number;
    indigenous: number;
  };

  // Resolution time metrics
  avgResolutionHours?: number;
  medianResolutionHours?: number;
  minResolutionHours?: number;
  maxResolutionHours?: number;

  // Distance metrics
  avgDistanceFromLastSeenKm?: number;
  medianDistanceFromLastSeenKm?: number;

  // Time frame
  periodStart: string;
  periodEnd: string;

  // Privacy compliance
  isPrivacyCompliant: boolean;
  minimumCaseThreshold: number;

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// RESOLUTION PATTERNS
// =============================================================================

export interface ResolutionPattern {
  id: string;
  patternType: PatternType;
  patternName: string;
  patternDescription: string;

  // Statistical data
  confidenceLevel: number; // 0.0 to 1.0
  sampleSize: number;
  statisticalSignificance?: number;

  // Pattern details
  patternData: PatternData;

  // Filters
  jurisdictionId?: string;
  province?: string;
  ageGroup?: AgeGroupCategory;
  caseType?: string;

  // Time frame
  periodStart: string;
  periodEnd: string;

  isActive: boolean;
  expiresAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface PatternData {
  // Distance patterns
  avgDistanceKm?: number;
  withinRadiusPercentage?: number;
  radiusKm?: number;

  // Time patterns
  timeOfDay?: TimeOfDayCategory;
  peakHours?: number[];

  // Demographic patterns
  ageGroup?: AgeGroupCategory;
  disposition?: DispositionType;

  // Source patterns
  source?: ResolutionSource;
  correlation?: number;

  // Additional flexible data
  [key: string]: unknown;
}

// =============================================================================
// PREDICTIVE SUGGESTIONS
// =============================================================================

export interface PredictiveSuggestion {
  id: string;
  suggestionType: SuggestionType;
  suggestionTitle: string;
  suggestionDescription: string;

  patternIds: string[];
  parameters: SuggestionParameters;

  appliesToAgeGroup?: AgeGroupCategory[];
  appliesToCaseType?: string[];
  appliesToJurisdiction?: string;

  confidenceScore: number;
  relevanceScore?: number;

  timesUsed: number;
  timesSuccessful: number;
  successRate: number;

  isActive: boolean;
  expiresAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface SuggestionParameters {
  searchRadiusKm?: number;
  priorityLocations?: ResolutionSource[];
  timeWindow?: TimeOfDayCategory;
  recommendedResources?: string[];
  [key: string]: unknown;
}

// =============================================================================
// HEAT MAP CONFIGURATION
// =============================================================================

export interface HeatMapConfiguration {
  id: string;
  userId: string;
  configurationName: string;
  isDefault: boolean;

  filters: HeatMapFilters;
  mapSettings: MapSettings;
  visibleLayers: LayerVisibility;

  createdAt: string;
  updatedAt: string;
}

export interface HeatMapFilters {
  caseTypes: CaseTypeCategory[];
  ageGroups: AgeGroupCategory[];
  timeFrame: 'all' | 'day' | 'night' | 'custom';
  dispositions: DispositionType[];
  sources: ResolutionSource[];
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  jurisdictionId?: string;
  province?: string;
}

export interface MapSettings {
  centerLat: number;
  centerLng: number;
  zoomLevel: number;
  mapStyle: 'streets' | 'satellite' | 'hybrid' | 'dark';
  heatMapIntensity: number; // 0.0 to 1.0
  heatMapRadius: number;    // in pixels
  showClusters: boolean;
  showPatterns: boolean;
}

export interface LayerVisibility {
  allResolutions: boolean;
  byDisposition: boolean;
  bySource: boolean;
  byTimePattern: boolean;
  byDemographic: boolean;
}

// =============================================================================
// HEAT MAP DATA RESPONSE
// =============================================================================

export interface HeatMapDataResponse {
  clusters: ResolutionLocationCluster[];
  patterns: ResolutionPattern[];
  suggestions: PredictiveSuggestion[];
  insights: HeatMapInsights;
  metadata: HeatMapMetadata;
}

export interface HeatMapInsights {
  totalResolutions: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };

  // Key statistics
  topPatterns: InsightPattern[];
  distanceInsights: DistanceInsight[];
  demographicInsights: DemographicInsight[];
  temporalInsights: TemporalInsight[];
  sourceInsights: SourceInsight[];
}

export interface InsightPattern {
  title: string;
  description: string;
  percentage?: number;
  count?: number;
  confidenceLevel: number;
}

export interface DistanceInsight {
  ageGroup: AgeGroupCategory;
  caseType?: CaseTypeCategory;
  avgDistanceKm: number;
  medianDistanceKm: number;
  withinRadiusPercentages: {
    radius5km: number;
    radius10km: number;
    radius25km: number;
    radius50km: number;
  };
  sampleSize: number;
}

export interface DemographicInsight {
  ageGroup: AgeGroupCategory;
  totalCases: number;
  resolutionRate: number;
  avgResolutionHours: number;
  topDispositions: {
    disposition: DispositionType;
    percentage: number;
  }[];
  topSources: {
    source: ResolutionSource;
    percentage: number;
  }[];
}

export interface TemporalInsight {
  timeOfDay: TimeOfDayCategory;
  percentage: number;
  count: number;
  topLocationType?: ResolutionSource;
}

export interface SourceInsight {
  source: ResolutionSource;
  percentage: number;
  count: number;
  topAgeGroup?: AgeGroupCategory;
  avgResolutionHours?: number;
}

export interface HeatMapMetadata {
  totalClusters: number;
  totalPatterns: number;
  totalSuggestions: number;
  lastAggregationAt: string;
  privacyCompliant: boolean;
  filtersApplied: HeatMapFilters;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface HeatMapQueryParams {
  // Date range
  startDate?: string;
  endDate?: string;

  // Filters
  caseTypes?: CaseTypeCategory[];
  ageGroups?: AgeGroupCategory[];
  dispositions?: DispositionType[];
  sources?: ResolutionSource[];
  timeOfDay?: TimeOfDayCategory[];

  // Geographic
  jurisdictionId?: string;
  province?: string;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };

  // Layers to include
  layers?: HeatMapLayer[];

  // Pagination
  limit?: number;
  offset?: number;
}

export interface HeatMapAccessLog {
  id: string;
  userId: string;
  action: 'view' | 'filter' | 'export' | 'analyze';
  filtersApplied?: HeatMapFilters;
  layersViewed?: HeatMapLayer[];
  zoomLevel?: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  clustersReturned?: number;
  patternsReturned?: number;
  createdAt: string;
}

// =============================================================================
// AGGREGATION TYPES
// =============================================================================

export interface AggregationJob {
  id: string;
  jobType: 'daily' | 'weekly' | 'monthly' | 'full';
  status: 'pending' | 'running' | 'completed' | 'failed';

  periodStart?: string;
  periodEnd?: string;
  jurisdictionId?: string;

  clustersCreated: number;
  patternsIdentified: number;
  suggestionsGenerated: number;
  casesProcessed: number;

  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;

  triggeredBy?: string;
  triggerType: 'scheduled' | 'manual' | 'case_update';

  createdAt: string;
}

// =============================================================================
// HEAT MAP POINT FOR RENDERING
// =============================================================================

export interface HeatMapPoint {
  lat: number;
  lng: number;
  intensity: number;
  data?: ResolutionLocationCluster;
}

export interface ClusterMarker {
  id: string;
  lat: number;
  lng: number;
  count: number;
  radiusKm: number;
  label: string;
  data: ResolutionLocationCluster;
}
