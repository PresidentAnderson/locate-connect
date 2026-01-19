-- LocateConnect Integration Route Mapping System
-- Migration: Integration Route Binding System (Issue #49)
-- Enables binding external APIs to app routes with configuration

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE aggregation_strategy AS ENUM (
  'first_success',     -- Return first successful response
  'merge_results',     -- Merge all results together
  'priority_order',    -- Return based on priority, fallback on failure
  'all_parallel',      -- Execute all in parallel, return aggregated
  'chain'              -- Chain results from one to next
);

CREATE TYPE transform_type AS ENUM (
  'request',           -- Transform request before sending
  'response',          -- Transform response after receiving
  'both'               -- Transform both request and response
);

-- =============================================================================
-- ROUTE MAPPING TABLES
-- =============================================================================

-- Integration Routes - Maps internal routes to external integrations
CREATE TABLE integration_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Route configuration
  route_path TEXT NOT NULL,                    -- e.g., /api/search/hospitals
  route_method TEXT NOT NULL DEFAULT 'GET' CHECK (route_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ANY')),
  name TEXT NOT NULL,
  description TEXT,

  -- Aggregation settings
  aggregation_strategy aggregation_strategy DEFAULT 'priority_order',
  timeout_ms INTEGER DEFAULT 30000,
  fail_on_any_error BOOLEAN DEFAULT FALSE,     -- If true, fail if any integration fails

  -- Status
  is_enabled BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE(route_path, route_method)
);

-- Route Integration Mappings - Links routes to specific integrations
CREATE TABLE route_integration_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES integration_routes(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  -- Endpoint configuration
  endpoint_path TEXT NOT NULL,                 -- Path on the external API
  endpoint_method TEXT NOT NULL DEFAULT 'GET' CHECK (endpoint_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),

  -- Priority & Fallback
  priority INTEGER NOT NULL DEFAULT 1,         -- Lower = higher priority
  is_fallback BOOLEAN DEFAULT FALSE,           -- Only used if higher priority fails

  -- Request transformation
  request_transform TEXT,                      -- Function name or inline transform
  request_template JSONB,                      -- Template for request body mapping
  request_headers JSONB DEFAULT '{}',          -- Additional headers to add
  query_params_map JSONB DEFAULT '{}',         -- Query parameter mapping

  -- Response transformation
  response_transform TEXT,                     -- Function name or inline transform
  response_template JSONB,                     -- Template for response mapping
  response_field_map JSONB DEFAULT '{}',       -- Field mapping configuration

  -- Caching
  cache_enabled BOOLEAN DEFAULT FALSE,
  cache_ttl_seconds INTEGER DEFAULT 300,
  cache_key_template TEXT,                     -- Template for cache key generation

  -- Status
  is_enabled BOOLEAN DEFAULT TRUE,

  -- Metrics
  total_calls BIGINT DEFAULT 0,
  successful_calls BIGINT DEFAULT 0,
  failed_calls BIGINT DEFAULT 0,
  avg_response_time_ms INTEGER,
  last_called_at TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(route_id, integration_id)
);

-- Route Transformers - Reusable transformation functions
CREATE TABLE route_transformers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Transform type
  transform_type transform_type NOT NULL,

  -- Transform definition (JavaScript-like expression or mapping)
  transform_expression TEXT NOT NULL,

  -- Input/Output schemas for validation
  input_schema JSONB,
  output_schema JSONB,

  -- Status
  is_enabled BOOLEAN DEFAULT TRUE,
  is_builtin BOOLEAN DEFAULT FALSE,            -- System-provided transformers

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Route Execution Logs - Detailed logs of route executions
CREATE TABLE route_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES integration_routes(id) ON DELETE CASCADE,

  -- Request info
  request_method TEXT NOT NULL,
  request_path TEXT NOT NULL,
  request_query JSONB,
  request_body_hash TEXT,                      -- Hash of request body for privacy

  -- Execution details
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Integration calls
  integration_calls JSONB DEFAULT '[]',        -- Array of {integration_id, status, duration_ms, error}

  -- Result
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failure')),
  response_status_code INTEGER,
  error_message TEXT,

  -- User context
  user_id UUID REFERENCES profiles(id),
  ip_address INET,
  user_agent TEXT
);

-- =============================================================================
-- BUILT-IN TRANSFORMERS
-- =============================================================================

INSERT INTO route_transformers (name, description, transform_type, transform_expression, is_builtin) VALUES
('identity', 'Pass through without modification', 'both', '$.', true),
('hospitalPatientTransform', 'Transform hospital patient search results', 'response',
  '{ "patients": $.results.map(r => ({ "id": r.patient_id, "name": r.full_name, "hospital": r.facility_name, "admissionDate": r.admitted_at, "status": r.patient_status })) }', true),
('quebecHealthTransform', 'Transform Quebec Health Registry results', 'response',
  '{ "patients": $.data.patients.map(p => ({ "id": p.numero_dossier, "name": p.nom_complet, "hospital": p.etablissement, "admissionDate": p.date_admission, "status": p.statut })) }', true),
('borderCrossingTransform', 'Transform border crossing alerts', 'response',
  '{ "crossings": $.alerts.map(a => ({ "id": a.alert_id, "port": a.port_of_entry, "direction": a.travel_direction, "timestamp": a.crossing_time, "confidence": a.match_confidence })) }', true),
('transitSightingTransform', 'Transform transit sighting results', 'response',
  '{ "sightings": $.sightings.map(s => ({ "id": s.sighting_id, "station": s.station_name, "line": s.transit_line, "timestamp": s.observed_at, "confidence": s.confidence_level })) }', true),
('mergeResults', 'Aggregation: Merge multiple result sets', 'response',
  '{ "results": [].concat(...$.map(r => r.results || r.data || [])), "sources": $.map(r => r._source), "count": [].concat(...$.map(r => r.results || r.data || [])).length }', true),
('firstNonEmpty', 'Aggregation: Return first non-empty result', 'response',
  '$.find(r => (r.results && r.results.length > 0) || (r.data && r.data.length > 0)) || { "results": [] }', true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_integration_routes_path ON integration_routes(route_path);
CREATE INDEX idx_integration_routes_enabled ON integration_routes(is_enabled) WHERE is_enabled = TRUE;

CREATE INDEX idx_route_mappings_route ON route_integration_mappings(route_id);
CREATE INDEX idx_route_mappings_integration ON route_integration_mappings(integration_id);
CREATE INDEX idx_route_mappings_priority ON route_integration_mappings(route_id, priority);
CREATE INDEX idx_route_mappings_enabled ON route_integration_mappings(is_enabled) WHERE is_enabled = TRUE;

CREATE INDEX idx_route_transformers_name ON route_transformers(name);
CREATE INDEX idx_route_transformers_type ON route_transformers(transform_type);

CREATE INDEX idx_route_logs_route ON route_execution_logs(route_id);
CREATE INDEX idx_route_logs_started ON route_execution_logs(started_at DESC);
CREATE INDEX idx_route_logs_status ON route_execution_logs(status);
CREATE INDEX idx_route_logs_user ON route_execution_logs(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE integration_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_integration_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_transformers ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_execution_logs ENABLE ROW LEVEL SECURITY;

-- Routes - admin management, coordinator view
CREATE POLICY "Admins can manage routes" ON integration_routes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Coordinators can view routes" ON integration_routes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('coordinator', 'investigator', 'admin', 'super_admin')
    )
  );

-- Route mappings - admin only
CREATE POLICY "Admins can manage route mappings" ON route_integration_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- Transformers - admin management, all read for built-in
CREATE POLICY "Admins can manage transformers" ON route_transformers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view built-in transformers" ON route_transformers
  FOR SELECT USING (is_builtin = TRUE);

-- Execution logs - coordinators+
CREATE POLICY "Coordinators can view execution logs" ON route_execution_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('coordinator', 'investigator', 'admin', 'super_admin')
    )
  );

-- Allow service role to insert logs
CREATE POLICY "Service can insert execution logs" ON route_execution_logs
  FOR INSERT WITH CHECK (TRUE);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_integration_routes_updated_at
  BEFORE UPDATE ON integration_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_route_mappings_updated_at
  BEFORE UPDATE ON route_integration_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_route_transformers_updated_at
  BEFORE UPDATE ON route_transformers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Get route configuration with all mappings
CREATE OR REPLACE FUNCTION get_route_config(p_route_path TEXT, p_method TEXT DEFAULT 'GET')
RETURNS JSONB AS $$
DECLARE
  v_route RECORD;
  v_mappings JSONB;
BEGIN
  -- Get the route
  SELECT * INTO v_route
  FROM integration_routes
  WHERE route_path = p_route_path
    AND (route_method = p_method OR route_method = 'ANY')
    AND is_enabled = TRUE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get mappings with integration details
  SELECT jsonb_agg(
    jsonb_build_object(
      'mapping_id', rim.id,
      'integration_id', rim.integration_id,
      'integration_name', i.name,
      'endpoint_path', rim.endpoint_path,
      'endpoint_method', rim.endpoint_method,
      'priority', rim.priority,
      'is_fallback', rim.is_fallback,
      'request_transform', rim.request_transform,
      'request_template', rim.request_template,
      'response_transform', rim.response_transform,
      'response_template', rim.response_template,
      'cache_enabled', rim.cache_enabled,
      'cache_ttl_seconds', rim.cache_ttl_seconds,
      'base_url', i.base_url
    ) ORDER BY rim.priority
  ) INTO v_mappings
  FROM route_integration_mappings rim
  JOIN integrations i ON i.id = rim.integration_id
  WHERE rim.route_id = v_route.id
    AND rim.is_enabled = TRUE
    AND i.status = 'active';

  RETURN jsonb_build_object(
    'route_id', v_route.id,
    'route_path', v_route.route_path,
    'route_method', v_route.route_method,
    'name', v_route.name,
    'aggregation_strategy', v_route.aggregation_strategy,
    'timeout_ms', v_route.timeout_ms,
    'fail_on_any_error', v_route.fail_on_any_error,
    'mappings', COALESCE(v_mappings, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;

-- Update route mapping metrics
CREATE OR REPLACE FUNCTION update_route_mapping_metrics(
  p_mapping_id UUID,
  p_success BOOLEAN,
  p_response_time_ms INTEGER,
  p_error TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE route_integration_mappings
  SET
    total_calls = total_calls + 1,
    successful_calls = CASE WHEN p_success THEN successful_calls + 1 ELSE successful_calls END,
    failed_calls = CASE WHEN NOT p_success THEN failed_calls + 1 ELSE failed_calls END,
    avg_response_time_ms = COALESCE(
      (avg_response_time_ms * total_calls + p_response_time_ms) / (total_calls + 1),
      p_response_time_ms
    ),
    last_called_at = NOW(),
    last_error = CASE WHEN NOT p_success THEN p_error ELSE last_error END,
    last_error_at = CASE WHEN NOT p_success THEN NOW() ELSE last_error_at END
  WHERE id = p_mapping_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON integration_routes TO service_role;
GRANT ALL ON route_integration_mappings TO service_role;
GRANT ALL ON route_transformers TO service_role;
GRANT ALL ON route_execution_logs TO service_role;
