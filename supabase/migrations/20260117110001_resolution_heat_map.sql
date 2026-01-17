-- LocateConnect Resolution Location Heat Map Schema
-- Migration: LC-FEAT-020 Resolution Location Heat Map

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE resolution_source AS ENUM (
  'hospital',
  'shelter',
  'police_station',
  'home_address',
  'public_location',
  'school',
  'workplace',
  'transit_location',
  'detention_facility',
  'mental_health_facility',
  'friend_family_residence',
  'unknown',
  'other'
);

CREATE TYPE time_of_day_category AS ENUM (
  'early_morning',   -- 00:00 - 06:00
  'morning',         -- 06:00 - 12:00
  'afternoon',       -- 12:00 - 18:00
  'evening',         -- 18:00 - 24:00
  'unknown'
);

CREATE TYPE age_group_category AS ENUM (
  'child',           -- 0-12
  'teen',            -- 13-17
  'young_adult',     -- 18-25
  'adult',           -- 26-64
  'elderly',         -- 65+
  'unknown'
);

-- =============================================================================
-- RESOLUTION LOCATION CLUSTERS TABLE (Privacy-compliant aggregated data)
-- =============================================================================

CREATE TABLE resolution_location_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Geographic data (clustered, not individual locations)
  cluster_center_lat DOUBLE PRECISION NOT NULL,
  cluster_center_lng DOUBLE PRECISION NOT NULL,
  cluster_radius_km DOUBLE PRECISION NOT NULL DEFAULT 5.0,

  -- Location metadata
  province TEXT NOT NULL,
  city TEXT,
  region TEXT,
  jurisdiction_id UUID REFERENCES jurisdictions(id),

  -- Aggregated metrics (privacy: minimum 10 cases per cluster)
  total_resolutions INTEGER NOT NULL DEFAULT 0,

  -- By disposition
  found_alive_safe_count INTEGER DEFAULT 0,
  found_alive_injured_count INTEGER DEFAULT 0,
  found_deceased_count INTEGER DEFAULT 0,
  returned_voluntarily_count INTEGER DEFAULT 0,
  located_runaway_count INTEGER DEFAULT 0,
  located_custody_count INTEGER DEFAULT 0,
  located_medical_facility_count INTEGER DEFAULT 0,
  located_shelter_count INTEGER DEFAULT 0,
  located_incarcerated_count INTEGER DEFAULT 0,
  other_disposition_count INTEGER DEFAULT 0,

  -- By source
  hospital_source_count INTEGER DEFAULT 0,
  shelter_source_count INTEGER DEFAULT 0,
  police_source_count INTEGER DEFAULT 0,
  home_source_count INTEGER DEFAULT 0,
  public_location_count INTEGER DEFAULT 0,
  school_source_count INTEGER DEFAULT 0,
  other_source_count INTEGER DEFAULT 0,

  -- By time of day
  early_morning_count INTEGER DEFAULT 0,
  morning_count INTEGER DEFAULT 0,
  afternoon_count INTEGER DEFAULT 0,
  evening_count INTEGER DEFAULT 0,

  -- By age group
  child_count INTEGER DEFAULT 0,
  teen_count INTEGER DEFAULT 0,
  young_adult_count INTEGER DEFAULT 0,
  adult_count INTEGER DEFAULT 0,
  elderly_count INTEGER DEFAULT 0,

  -- By case type
  runaway_count INTEGER DEFAULT 0,
  abduction_count INTEGER DEFAULT 0,
  dementia_related_count INTEGER DEFAULT 0,
  mental_health_count INTEGER DEFAULT 0,
  indigenous_count INTEGER DEFAULT 0,

  -- Resolution time metrics
  avg_resolution_hours DOUBLE PRECISION,
  median_resolution_hours DOUBLE PRECISION,
  min_resolution_hours DOUBLE PRECISION,
  max_resolution_hours DOUBLE PRECISION,

  -- Distance metrics
  avg_distance_from_last_seen_km DOUBLE PRECISION,
  median_distance_from_last_seen_km DOUBLE PRECISION,

  -- Time frame
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Privacy compliance
  is_privacy_compliant BOOLEAN DEFAULT TRUE,
  minimum_case_threshold INTEGER DEFAULT 10,
  last_aggregation_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_minimum_cases CHECK (total_resolutions >= 10 OR is_privacy_compliant = FALSE)
);

-- =============================================================================
-- RESOLUTION PATTERNS TABLE (Statistical insights)
-- =============================================================================

CREATE TABLE resolution_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pattern identification
  pattern_type TEXT NOT NULL, -- 'distance', 'time', 'demographic', 'source', 'correlation'
  pattern_name TEXT NOT NULL,
  pattern_description TEXT NOT NULL,

  -- Statistical data
  confidence_level DOUBLE PRECISION NOT NULL, -- 0.0 to 1.0
  sample_size INTEGER NOT NULL,
  statistical_significance DOUBLE PRECISION, -- p-value

  -- Pattern details as JSON for flexibility
  pattern_data JSONB NOT NULL DEFAULT '{}',

  -- Example patterns:
  -- { "age_group": "teen", "disposition": "runaway", "avg_distance_km": 5.2, "within_10km_percentage": 70 }
  -- { "time_of_day": "evening", "source": "shelter", "correlation": 0.85 }

  -- Filters that apply to this pattern
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  province TEXT,
  age_group age_group_category,
  case_type TEXT,

  -- Time frame
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Validity
  is_active BOOLEAN DEFAULT TRUE,
  expires_at DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PREDICTIVE SUGGESTIONS TABLE
-- =============================================================================

CREATE TABLE predictive_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Suggestion type
  suggestion_type TEXT NOT NULL, -- 'search_area', 'location_type', 'time_window', 'resource_allocation'
  suggestion_title TEXT NOT NULL,
  suggestion_description TEXT NOT NULL,

  -- Based on patterns
  pattern_ids UUID[] DEFAULT '{}',

  -- Suggestion parameters
  parameters JSONB NOT NULL DEFAULT '{}',
  -- Example: { "search_radius_km": 10, "priority_locations": ["shelter", "hospital"], "time_window": "evening" }

  -- Applicability
  applies_to_age_group age_group_category[],
  applies_to_case_type TEXT[],
  applies_to_jurisdiction UUID REFERENCES jurisdictions(id),

  -- Confidence and relevance
  confidence_score DOUBLE PRECISION NOT NULL,
  relevance_score DOUBLE PRECISION,

  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  times_successful INTEGER DEFAULT 0,
  success_rate DOUBLE PRECISION GENERATED ALWAYS AS (
    CASE WHEN times_used > 0 THEN times_successful::DOUBLE PRECISION / times_used ELSE 0 END
  ) STORED,

  -- Validity
  is_active BOOLEAN DEFAULT TRUE,
  expires_at DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- HEAT MAP CONFIGURATIONS TABLE
-- =============================================================================

CREATE TABLE heat_map_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User association
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  configuration_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,

  -- Filter settings
  filters JSONB NOT NULL DEFAULT '{
    "caseTypes": [],
    "ageGroups": [],
    "timeFrame": "all",
    "dispositions": [],
    "sources": [],
    "dateRange": null
  }',

  -- Map settings
  map_settings JSONB NOT NULL DEFAULT '{
    "centerLat": 46.8139,
    "centerLng": -71.2082,
    "zoomLevel": 6,
    "mapStyle": "streets",
    "heatMapIntensity": 0.7,
    "heatMapRadius": 30,
    "showClusters": true,
    "showPatterns": true
  }',

  -- Layer visibility
  visible_layers JSONB NOT NULL DEFAULT '{
    "allResolutions": true,
    "byDisposition": false,
    "bySource": false,
    "byTimePattern": false,
    "byDemographic": false
  }',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, configuration_name)
);

-- =============================================================================
-- HEAT MAP ACCESS LOGS (For audit and access control)
-- =============================================================================

CREATE TABLE heat_map_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'view', 'filter', 'export', 'analyze'

  -- Request details
  filters_applied JSONB,
  layers_viewed TEXT[],
  zoom_level INTEGER,
  bounds JSONB, -- { "north": lat, "south": lat, "east": lng, "west": lng }

  -- Results metadata (no actual location data)
  clusters_returned INTEGER,
  patterns_returned INTEGER,

  -- Session info
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- AGGREGATION JOB TRACKING
-- =============================================================================

CREATE TABLE resolution_aggregation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  job_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'full'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'

  -- Job parameters
  period_start DATE,
  period_end DATE,
  jurisdiction_id UUID REFERENCES jurisdictions(id),

  -- Results
  clusters_created INTEGER DEFAULT 0,
  patterns_identified INTEGER DEFAULT 0,
  suggestions_generated INTEGER DEFAULT 0,
  cases_processed INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Triggered by
  triggered_by UUID REFERENCES profiles(id),
  trigger_type TEXT DEFAULT 'scheduled', -- 'scheduled', 'manual', 'case_update'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_resolution_clusters_location ON resolution_location_clusters(cluster_center_lat, cluster_center_lng);
CREATE INDEX idx_resolution_clusters_province ON resolution_location_clusters(province);
CREATE INDEX idx_resolution_clusters_period ON resolution_location_clusters(period_start, period_end);
CREATE INDEX idx_resolution_clusters_privacy ON resolution_location_clusters(is_privacy_compliant) WHERE is_privacy_compliant = TRUE;
CREATE INDEX idx_resolution_clusters_total ON resolution_location_clusters(total_resolutions DESC);

CREATE INDEX idx_resolution_patterns_type ON resolution_patterns(pattern_type);
CREATE INDEX idx_resolution_patterns_active ON resolution_patterns(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_resolution_patterns_confidence ON resolution_patterns(confidence_level DESC);
CREATE INDEX idx_resolution_patterns_age_group ON resolution_patterns(age_group);

CREATE INDEX idx_predictive_suggestions_type ON predictive_suggestions(suggestion_type);
CREATE INDEX idx_predictive_suggestions_active ON predictive_suggestions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_predictive_suggestions_confidence ON predictive_suggestions(confidence_score DESC);

CREATE INDEX idx_heat_map_configs_user ON heat_map_configurations(user_id);
CREATE INDEX idx_heat_map_access_logs_user ON heat_map_access_logs(user_id);
CREATE INDEX idx_heat_map_access_logs_created ON heat_map_access_logs(created_at DESC);

CREATE INDEX idx_aggregation_jobs_status ON resolution_aggregation_jobs(status);
CREATE INDEX idx_aggregation_jobs_created ON resolution_aggregation_jobs(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE resolution_location_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolution_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE heat_map_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE heat_map_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolution_aggregation_jobs ENABLE ROW LEVEL SECURITY;

-- Resolution clusters: Only privacy-compliant data visible to LE and admin
CREATE POLICY "LE and Admin can view privacy-compliant clusters"
  ON resolution_location_clusters
  FOR SELECT
  USING (
    is_privacy_compliant = TRUE AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer', 'law_enforcement')
      AND p.is_verified = TRUE
    )
  );

CREATE POLICY "Admin can manage clusters"
  ON resolution_location_clusters
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Resolution patterns: LE and admin can view
CREATE POLICY "LE and Admin can view patterns"
  ON resolution_patterns
  FOR SELECT
  USING (
    is_active = TRUE AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer', 'law_enforcement')
      AND p.is_verified = TRUE
    )
  );

CREATE POLICY "Admin can manage patterns"
  ON resolution_patterns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Predictive suggestions: LE and admin can view
CREATE POLICY "LE and Admin can view suggestions"
  ON predictive_suggestions
  FOR SELECT
  USING (
    is_active = TRUE AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer', 'law_enforcement')
      AND p.is_verified = TRUE
    )
  );

CREATE POLICY "Admin can manage suggestions"
  ON predictive_suggestions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Heat map configurations: Users can manage their own
CREATE POLICY "Users can view own configurations"
  ON heat_map_configurations
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own configurations"
  ON heat_map_configurations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own configurations"
  ON heat_map_configurations
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own configurations"
  ON heat_map_configurations
  FOR DELETE
  USING (user_id = auth.uid());

-- Access logs: Users can view own logs, admin can view all
CREATE POLICY "Users can view own access logs"
  ON heat_map_access_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admin can view all access logs"
  ON heat_map_access_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

CREATE POLICY "System can insert access logs"
  ON heat_map_access_logs
  FOR INSERT
  WITH CHECK (TRUE);

-- Aggregation jobs: Admin only
CREATE POLICY "Admin can view aggregation jobs"
  ON resolution_aggregation_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Admin can manage aggregation jobs"
  ON resolution_aggregation_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_resolution_clusters_updated_at
  BEFORE UPDATE ON resolution_location_clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resolution_patterns_updated_at
  BEFORE UPDATE ON resolution_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictive_suggestions_updated_at
  BEFORE UPDATE ON predictive_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_heat_map_configurations_updated_at
  BEFORE UPDATE ON heat_map_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  R DOUBLE PRECISION := 6371; -- Earth's radius in km
  dLat DOUBLE PRECISION;
  dLon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  a := sin(dLat/2) * sin(dLat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dLon/2) * sin(dLon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to determine age group from age
CREATE OR REPLACE FUNCTION get_age_group(age INTEGER)
RETURNS age_group_category AS $$
BEGIN
  IF age IS NULL THEN RETURN 'unknown';
  ELSIF age <= 12 THEN RETURN 'child';
  ELSIF age <= 17 THEN RETURN 'teen';
  ELSIF age <= 25 THEN RETURN 'young_adult';
  ELSIF age <= 64 THEN RETURN 'adult';
  ELSE RETURN 'elderly';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to determine time of day category
CREATE OR REPLACE FUNCTION get_time_of_day_category(ts TIMESTAMPTZ)
RETURNS time_of_day_category AS $$
DECLARE
  hour INTEGER;
BEGIN
  IF ts IS NULL THEN RETURN 'unknown'; END IF;
  hour := EXTRACT(HOUR FROM ts);
  IF hour >= 0 AND hour < 6 THEN RETURN 'early_morning';
  ELSIF hour >= 6 AND hour < 12 THEN RETURN 'morning';
  ELSIF hour >= 12 AND hour < 18 THEN RETURN 'afternoon';
  ELSE RETURN 'evening';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
