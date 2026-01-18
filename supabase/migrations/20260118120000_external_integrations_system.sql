-- LocateConnect External Integrations System
-- Migration: M5 External Integrations
-- LC-M5-001 through LC-M5-010

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE integration_status AS ENUM (
  'active',
  'inactive',
  'error',
  'pending',
  'suspended',
  'configuring'
);

CREATE TYPE integration_category AS ENUM (
  'healthcare',
  'law_enforcement',
  'government',
  'transportation',
  'border_services',
  'social_services',
  'communication',
  'data_provider',
  'custom'
);

CREATE TYPE authentication_type AS ENUM (
  'api_key',
  'oauth2',
  'basic',
  'bearer',
  'certificate',
  'custom'
);

CREATE TYPE credential_status AS ENUM (
  'active',
  'expired',
  'revoked',
  'rotating'
);

CREATE TYPE connector_state AS ENUM (
  'disconnected',
  'connecting',
  'connected',
  'reconnecting',
  'error'
);

CREATE TYPE circuit_breaker_state AS ENUM (
  'closed',
  'open',
  'half_open'
);

CREATE TYPE health_status AS ENUM (
  'healthy',
  'degraded',
  'unhealthy',
  'unknown'
);

CREATE TYPE alert_severity AS ENUM (
  'critical',
  'high',
  'medium',
  'low'
);

CREATE TYPE alert_status AS ENUM (
  'active',
  'acknowledged',
  'resolved'
);

CREATE TYPE trigger_type AS ENUM (
  'event',
  'schedule',
  'webhook',
  'manual'
);

CREATE TYPE match_verification_status AS ENUM (
  'pending',
  'verified',
  'rejected',
  'expired',
  'excluded',
  'confirmed'
);

CREATE TYPE border_alert_type AS ENUM (
  'crossing_detected',
  'watch_match',
  'document_flag'
);

CREATE TYPE sighting_type AS ENUM (
  'camera',
  'fare_card',
  'operator_report',
  'passenger_report'
);

CREATE TYPE sighting_status AS ENUM (
  'new',
  'investigating',
  'verified',
  'false_positive',
  'resolved'
);

-- =============================================================================
-- CORE INTEGRATION TABLES
-- =============================================================================

-- Integrations - Main configuration table
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category integration_category NOT NULL,
  provider TEXT NOT NULL,
  version TEXT DEFAULT '1.0.0',
  status integration_status DEFAULT 'pending',

  -- Connection
  base_url TEXT NOT NULL,
  auth_type authentication_type NOT NULL,
  credential_id UUID,

  -- Configuration
  config JSONB DEFAULT '{}',
  endpoints JSONB DEFAULT '[]',
  default_headers JSONB DEFAULT '{}',
  timeout_ms INTEGER DEFAULT 30000,

  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  rate_limit_per_day INTEGER DEFAULT 10000,

  -- Health
  health_status health_status DEFAULT 'unknown',
  health_check_url TEXT,
  last_health_check TIMESTAMPTZ,
  avg_response_time_ms INTEGER,
  error_rate DECIMAL(5,2) DEFAULT 0,
  uptime_percentage DECIMAL(5,2) DEFAULT 100,

  -- Sync
  sync_schedule TEXT, -- cron expression
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  CONSTRAINT valid_base_url CHECK (base_url ~ '^https?://')
);

-- =============================================================================
-- CREDENTIALS VAULT
-- =============================================================================

-- Integration Credentials - Encrypted credential storage
CREATE TABLE integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type authentication_type NOT NULL,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,

  -- Encrypted data (AES-256-GCM)
  encrypted_data TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,

  -- Access control
  allowed_users UUID[] DEFAULT '{}',
  allowed_roles TEXT[] DEFAULT '{"admin", "super_admin"}',

  -- Rotation
  expires_at TIMESTAMPTZ,
  rotation_schedule TEXT,
  last_rotated TIMESTAMPTZ,
  rotation_count INTEGER DEFAULT 0,

  -- Status
  status credential_status DEFAULT 'active',
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES profiles(id),
  revoke_reason TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  last_accessed_at TIMESTAMPTZ,
  last_accessed_by UUID REFERENCES profiles(id)
);

-- Credential Access Logs - Audit trail
CREATE TABLE credential_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES integration_credentials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'retrieve', 'create', 'update', 'rotate', 'revoke', 'access_denied'
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CONNECTOR STATE & METRICS
-- =============================================================================

-- Integration Connectors - Runtime state
CREATE TABLE integration_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  -- State
  state connector_state DEFAULT 'disconnected',
  circuit_breaker_state circuit_breaker_state DEFAULT 'closed',
  connected_at TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  -- Circuit Breaker
  failure_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  circuit_breaker_trips INTEGER DEFAULT 0,
  last_circuit_trip TIMESTAMPTZ,

  -- Metrics
  total_requests BIGINT DEFAULT 0,
  successful_requests BIGINT DEFAULT 0,
  failed_requests BIGINT DEFAULT 0,
  avg_response_time_ms INTEGER,
  last_request_at TIMESTAMPTZ,

  -- Configuration
  retry_attempts INTEGER DEFAULT 3,
  retry_delay_ms INTEGER DEFAULT 1000,
  max_concurrent_requests INTEGER DEFAULT 10,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(integration_id)
);

-- Integration Endpoints - API endpoint definitions
CREATE TABLE integration_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  path TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  description TEXT,

  -- Schemas
  request_schema JSONB,
  response_schema JSONB,

  -- Rate limiting per endpoint
  rate_limit_per_minute INTEGER,
  cache_ttl_seconds INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ROUTE BINDINGS
-- =============================================================================

-- Integration Route Bindings - Request-to-integration mapping
CREATE TABLE integration_route_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger
  trigger_type trigger_type NOT NULL,
  trigger_event TEXT,
  trigger_schedule TEXT,
  trigger_webhook_path TEXT,

  -- Action
  action_type TEXT NOT NULL CHECK (action_type IN ('api_call', 'data_sync', 'notification', 'workflow')),
  action_endpoint_id UUID REFERENCES integration_endpoints(id),
  action_payload JSONB,
  action_transformations JSONB DEFAULT '[]',

  -- Conditions
  conditions JSONB DEFAULT '[]',

  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MARKETPLACE / TEMPLATES
-- =============================================================================

-- Integration Templates - Pre-built integration configurations
CREATE TABLE integration_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category integration_category NOT NULL,
  provider TEXT NOT NULL,
  version TEXT DEFAULT '1.0.0',

  -- Template content
  config_template JSONB NOT NULL,
  credential_requirements JSONB NOT NULL,
  endpoints_template JSONB DEFAULT '[]',

  -- Documentation
  documentation TEXT,
  setup_guide TEXT,
  logo_url TEXT,

  -- Ratings/Usage
  rating DECIMAL(2,1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  is_official BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- =============================================================================
-- MONITORING & ALERTS
-- =============================================================================

-- Integration Health - Health check history
CREATE TABLE integration_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  status health_status NOT NULL,
  response_time_ms INTEGER,
  message TEXT,
  details JSONB,

  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration Metrics - Time-series metrics
CREATE TABLE integration_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  period TEXT NOT NULL CHECK (period IN ('hour', 'day', 'week', 'month')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Request metrics
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,

  -- Performance metrics
  avg_response_time_ms INTEGER,
  p50_response_time_ms INTEGER,
  p95_response_time_ms INTEGER,
  p99_response_time_ms INTEGER,

  -- Error metrics
  errors_by_type JSONB DEFAULT '{}',

  -- Data metrics
  data_in_bytes BIGINT DEFAULT 0,
  data_out_bytes BIGINT DEFAULT 0,
  records_processed INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(integration_id, period, period_start)
);

-- Integration Alerts - Active alerts
CREATE TABLE integration_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('error', 'warning', 'info')),
  severity alert_severity NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,

  -- Status
  status alert_status DEFAULT 'active',
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Integration Alert Rules - Alert rule definitions
CREATE TABLE integration_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE, -- NULL for global rules

  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,

  -- Condition
  metric TEXT NOT NULL CHECK (metric IN ('error_rate', 'response_time', 'availability', 'rate_limit')),
  operator TEXT NOT NULL CHECK (operator IN ('gt', 'lt', 'eq')),
  threshold DECIMAL NOT NULL,
  duration_seconds INTEGER DEFAULT 60,

  -- Action
  alert_severity alert_severity NOT NULL,
  notification_channels TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SPECIFIC INTEGRATION TABLES
-- =============================================================================

-- Hospital Patient Matches
CREATE TABLE hospital_patient_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL, -- Reference to cases table
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  hospital_id TEXT NOT NULL,
  hospital_name TEXT NOT NULL,
  match_score DECIMAL(3,2) NOT NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('exact', 'probable', 'possible')),

  -- Patient info (limited for privacy)
  admission_date TIMESTAMPTZ,
  department TEXT,
  patient_status TEXT CHECK (patient_status IN ('admitted', 'discharged', 'transferred', 'unknown')),
  age_range TEXT,
  gender TEXT,
  physical_description TEXT,

  -- Match details
  matching_fields TEXT[] DEFAULT '{}',
  confidence_factors JSONB DEFAULT '{}',

  -- Contact
  contact_name TEXT,
  contact_role TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  -- Verification
  verification_status match_verification_status DEFAULT 'pending',
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Border Crossing Alerts
CREATE TABLE border_crossing_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  alert_type border_alert_type NOT NULL,
  severity alert_severity NOT NULL,

  -- Crossing details
  port_of_entry TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  crossing_timestamp TIMESTAMPTZ NOT NULL,
  country TEXT NOT NULL,
  travel_method TEXT CHECK (travel_method IN ('air', 'land', 'sea')),

  -- Match info
  document_type TEXT,
  match_score DECIMAL(3,2),
  matching_fields TEXT[] DEFAULT '{}',
  biometric_match BOOLEAN,

  -- Agency info
  agency TEXT NOT NULL CHECK (agency IN ('cbsa', 'ice', 'cbp', 'other')),
  agency_reference TEXT,
  agent_name TEXT,
  agent_badge TEXT,
  agent_phone TEXT,
  agent_email TEXT,

  -- Status
  status alert_status DEFAULT 'active',
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Unidentified Remains Matches
CREATE TABLE unidentified_remains_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  registry_id TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  match_score DECIMAL(3,2) NOT NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('dna', 'dental', 'physical', 'circumstantial')),

  -- Remains info
  discovery_date DATE,
  discovery_location TEXT,
  estimated_age TEXT,
  estimated_gender TEXT,
  estimated_time_of_death TEXT,
  cause_of_death TEXT,
  physical_description TEXT,

  -- Match details
  matching_factors JSONB DEFAULT '[]',

  -- Investigator contact
  investigator_name TEXT,
  investigator_agency TEXT,
  investigator_phone TEXT,
  investigator_email TEXT,
  investigator_case_number TEXT,

  -- Verification
  verification_status match_verification_status DEFAULT 'pending',
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transit Sightings
CREATE TABLE transit_sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  transit_authority TEXT NOT NULL,
  sighting_type sighting_type NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),

  -- Location
  station TEXT,
  line TEXT,
  vehicle_id TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  address TEXT,

  -- Timing
  sighting_timestamp TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER,

  -- Evidence
  has_video BOOLEAN DEFAULT FALSE,
  video_url TEXT,
  has_photo BOOLEAN DEFAULT FALSE,
  photo_url TEXT,
  fare_card_id TEXT,
  operator_id TEXT,
  description TEXT,

  -- Direction
  travel_direction TEXT,
  possible_destinations TEXT[] DEFAULT '{}',

  -- Status
  status sighting_status DEFAULT 'new',
  investigated_by UUID REFERENCES profiles(id),
  investigated_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Integrations
CREATE INDEX idx_integrations_status ON integrations(status);
CREATE INDEX idx_integrations_category ON integrations(category);
CREATE INDEX idx_integrations_created_by ON integrations(created_by);

-- Credentials
CREATE INDEX idx_credentials_integration ON integration_credentials(integration_id);
CREATE INDEX idx_credentials_status ON integration_credentials(status);
CREATE INDEX idx_credentials_type ON integration_credentials(type);

-- Credential Access Logs
CREATE INDEX idx_credential_logs_credential ON credential_access_logs(credential_id);
CREATE INDEX idx_credential_logs_user ON credential_access_logs(user_id);
CREATE INDEX idx_credential_logs_timestamp ON credential_access_logs(timestamp DESC);
CREATE INDEX idx_credential_logs_action ON credential_access_logs(action);

-- Connectors
CREATE INDEX idx_connectors_integration ON integration_connectors(integration_id);
CREATE INDEX idx_connectors_state ON integration_connectors(state);

-- Endpoints
CREATE INDEX idx_endpoints_integration ON integration_endpoints(integration_id);

-- Route Bindings
CREATE INDEX idx_bindings_integration ON integration_route_bindings(integration_id);
CREATE INDEX idx_bindings_trigger_type ON integration_route_bindings(trigger_type);
CREATE INDEX idx_bindings_enabled ON integration_route_bindings(enabled) WHERE enabled = TRUE;

-- Templates
CREATE INDEX idx_templates_category ON integration_templates(category);
CREATE INDEX idx_templates_provider ON integration_templates(provider);
CREATE INDEX idx_templates_published ON integration_templates(is_published) WHERE is_published = TRUE;
CREATE INDEX idx_templates_tags ON integration_templates USING GIN(tags);

-- Health
CREATE INDEX idx_health_integration ON integration_health(integration_id);
CREATE INDEX idx_health_checked_at ON integration_health(checked_at DESC);
CREATE INDEX idx_health_status ON integration_health(status);

-- Metrics
CREATE INDEX idx_metrics_integration_period ON integration_metrics(integration_id, period, period_start);

-- Alerts
CREATE INDEX idx_alerts_integration ON integration_alerts(integration_id);
CREATE INDEX idx_alerts_status ON integration_alerts(status);
CREATE INDEX idx_alerts_severity ON integration_alerts(severity);
CREATE INDEX idx_alerts_created ON integration_alerts(created_at DESC);

-- Alert Rules
CREATE INDEX idx_alert_rules_integration ON integration_alert_rules(integration_id);
CREATE INDEX idx_alert_rules_enabled ON integration_alert_rules(enabled) WHERE enabled = TRUE;

-- Hospital Matches
CREATE INDEX idx_hospital_matches_case ON hospital_patient_matches(case_id);
CREATE INDEX idx_hospital_matches_integration ON hospital_patient_matches(integration_id);
CREATE INDEX idx_hospital_matches_status ON hospital_patient_matches(verification_status);

-- Border Alerts
CREATE INDEX idx_border_alerts_case ON border_crossing_alerts(case_id);
CREATE INDEX idx_border_alerts_integration ON border_crossing_alerts(integration_id);
CREATE INDEX idx_border_alerts_status ON border_crossing_alerts(status);

-- Remains Matches
CREATE INDEX idx_remains_matches_case ON unidentified_remains_matches(case_id);
CREATE INDEX idx_remains_matches_integration ON unidentified_remains_matches(integration_id);
CREATE INDEX idx_remains_matches_status ON unidentified_remains_matches(verification_status);

-- Transit Sightings
CREATE INDEX idx_transit_sightings_case ON transit_sightings(case_id);
CREATE INDEX idx_transit_sightings_integration ON transit_sightings(integration_id);
CREATE INDEX idx_transit_sightings_status ON transit_sightings(status);
CREATE INDEX idx_transit_sightings_location ON transit_sightings USING GIST (
  ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_route_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_patient_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE border_crossing_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidentified_remains_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE transit_sightings ENABLE ROW LEVEL SECURITY;

-- Integrations policies
CREATE POLICY "Admins can manage integrations" ON integrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view active integrations" ON integrations
  FOR SELECT USING (status = 'active');

-- Credentials policies (admin only)
CREATE POLICY "Admins can manage credentials" ON integration_credentials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- Credential access logs (admin view only)
CREATE POLICY "Admins can view credential logs" ON credential_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- Allow service role to insert logs
CREATE POLICY "Service can insert credential logs" ON credential_access_logs
  FOR INSERT WITH CHECK (TRUE);

-- Templates (public read for published)
CREATE POLICY "Anyone can view published templates" ON integration_templates
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Admins can manage templates" ON integration_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- Health/Metrics (read for coordinators+)
CREATE POLICY "Coordinators can view health" ON integration_health
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('coordinator', 'investigator', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Coordinators can view metrics" ON integration_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('coordinator', 'investigator', 'admin', 'super_admin')
    )
  );

-- Alerts (coordinators can view and acknowledge)
CREATE POLICY "Coordinators can view alerts" ON integration_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('coordinator', 'investigator', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Coordinators can update alerts" ON integration_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('coordinator', 'investigator', 'admin', 'super_admin')
    )
  );

-- Match/sighting tables (investigators can view and update)
CREATE POLICY "Investigators can manage hospital matches" ON hospital_patient_matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('investigator', 'coordinator', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Investigators can manage border alerts" ON border_crossing_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('investigator', 'coordinator', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Investigators can manage remains matches" ON unidentified_remains_matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('investigator', 'coordinator', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Investigators can manage transit sightings" ON transit_sightings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('investigator', 'coordinator', 'admin', 'super_admin')
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamps
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credentials_updated_at
  BEFORE UPDATE ON integration_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connectors_updated_at
  BEFORE UPDATE ON integration_connectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_endpoints_updated_at
  BEFORE UPDATE ON integration_endpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bindings_updated_at
  BEFORE UPDATE ON integration_route_bindings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON integration_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON integration_alert_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hospital_matches_updated_at
  BEFORE UPDATE ON hospital_patient_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_border_alerts_updated_at
  BEFORE UPDATE ON border_crossing_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_remains_matches_updated_at
  BEFORE UPDATE ON unidentified_remains_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transit_sightings_updated_at
  BEFORE UPDATE ON transit_sightings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Update integration health status
CREATE OR REPLACE FUNCTION update_integration_health(
  p_integration_id UUID,
  p_status health_status,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Insert health record
  INSERT INTO integration_health (integration_id, status, response_time_ms, message)
  VALUES (p_integration_id, p_status, p_response_time_ms, p_message);

  -- Update integration
  UPDATE integrations
  SET
    health_status = p_status,
    last_health_check = NOW(),
    avg_response_time_ms = COALESCE(
      (SELECT AVG(response_time_ms)::INTEGER
       FROM integration_health
       WHERE integration_id = p_integration_id
       AND checked_at > NOW() - INTERVAL '1 hour'),
      p_response_time_ms
    )
  WHERE id = p_integration_id;
END;
$$ LANGUAGE plpgsql;

-- Record integration metrics
CREATE OR REPLACE FUNCTION record_integration_metrics(
  p_integration_id UUID,
  p_requests INTEGER,
  p_successes INTEGER,
  p_failures INTEGER,
  p_avg_response_time INTEGER
)
RETURNS void AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
BEGIN
  v_period_start := date_trunc('hour', NOW());

  INSERT INTO integration_metrics (
    integration_id, period, period_start, period_end,
    total_requests, successful_requests, failed_requests,
    avg_response_time_ms
  )
  VALUES (
    p_integration_id, 'hour', v_period_start, v_period_start + INTERVAL '1 hour',
    p_requests, p_successes, p_failures, p_avg_response_time
  )
  ON CONFLICT (integration_id, period, period_start)
  DO UPDATE SET
    total_requests = integration_metrics.total_requests + p_requests,
    successful_requests = integration_metrics.successful_requests + p_successes,
    failed_requests = integration_metrics.failed_requests + p_failures,
    avg_response_time_ms = (integration_metrics.avg_response_time_ms + p_avg_response_time) / 2;
END;
$$ LANGUAGE plpgsql;

-- Increment template usage
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE integration_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
