-- LocateConnect Dashboard Analytics Schema
-- Migration: Executive & Operational Dashboards (LC-FEAT-039)

CREATE TABLE dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_date DATE NOT NULL,
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  total_cases INTEGER DEFAULT 0,
  active_cases INTEGER DEFAULT 0,
  resolved_cases INTEGER DEFAULT 0,
  closed_cases INTEGER DEFAULT 0,
  cold_cases INTEGER DEFAULT 0,
  found_alive_safe INTEGER DEFAULT 0,
  found_alive_injured INTEGER DEFAULT 0,
  found_deceased INTEGER DEFAULT 0,
  returned_voluntarily INTEGER DEFAULT 0,
  p0_critical_count INTEGER DEFAULT 0,
  p1_high_count INTEGER DEFAULT 0,
  p2_medium_count INTEGER DEFAULT 0,
  p3_low_count INTEGER DEFAULT 0,
  p4_routine_count INTEGER DEFAULT 0,
  avg_time_to_resolution DECIMAL(10,2),
  median_time_to_resolution DECIMAL(10,2),
  minor_cases INTEGER DEFAULT 0,
  elderly_cases INTEGER DEFAULT 0,
  indigenous_cases INTEGER DEFAULT 0,
  medical_dependency_cases INTEGER DEFAULT 0,
  total_leads INTEGER DEFAULT 0,
  verified_leads INTEGER DEFAULT 0,
  total_tips INTEGER DEFAULT 0,
  verified_tips INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_type, metric_date, jurisdiction_id)
);

CREATE TABLE staff_productivity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  cases_assigned INTEGER DEFAULT 0,
  cases_resolved INTEGER DEFAULT 0,
  cases_escalated INTEGER DEFAULT 0,
  leads_created INTEGER DEFAULT 0,
  leads_verified INTEGER DEFAULT 0,
  leads_dismissed INTEGER DEFAULT 0,
  tips_reviewed INTEGER DEFAULT 0,
  tips_converted_to_leads INTEGER DEFAULT 0,
  avg_response_time DECIMAL(10,2),
  total_actions INTEGER DEFAULT 0,
  case_updates_made INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, metric_date)
);

CREATE TYPE agent_status AS ENUM ('available', 'busy', 'away', 'offline');

CREATE TABLE agent_queue_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  status agent_status DEFAULT 'offline',
  current_case_id UUID REFERENCES cases(id),
  active_cases_count INTEGER DEFAULT 0,
  pending_leads_count INTEGER DEFAULT 0,
  pending_tips_count INTEGER DEFAULT 0,
  max_capacity INTEGER DEFAULT 20,
  utilization_percentage DECIMAL(5,2) DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  session_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sla_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority_level priority_level NOT NULL,
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  initial_response_hours DECIMAL(10,2) NOT NULL,
  first_action_hours DECIMAL(10,2) NOT NULL,
  update_frequency_hours DECIMAL(10,2) NOT NULL,
  escalation_threshold_hours DECIMAL(10,2) NOT NULL,
  resolution_target_hours DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(priority_level, jurisdiction_id)
);

CREATE TABLE sla_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sla_definition_id UUID NOT NULL REFERENCES sla_definitions(id),
  initial_response_met BOOLEAN,
  initial_response_at TIMESTAMPTZ,
  first_action_met BOOLEAN,
  first_action_at TIMESTAMPTZ,
  updates_on_time INTEGER DEFAULT 0,
  updates_late INTEGER DEFAULT 0,
  last_update_at TIMESTAMPTZ,
  next_update_due TIMESTAMPTZ,
  was_escalated BOOLEAN DEFAULT FALSE,
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  resolution_met BOOLEAN,
  resolved_at TIMESTAMPTZ,
  compliance_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(case_id, sla_definition_id)
);

CREATE TYPE integration_status AS ENUM ('healthy', 'degraded', 'down', 'unknown');

CREATE TABLE integration_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  status integration_status DEFAULT 'unknown',
  last_check_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  uptime_percentage DECIMAL(5,2) DEFAULT 100,
  avg_response_time_ms INTEGER,
  error_rate DECIMAL(5,2) DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  last_error_message TEXT,
  is_critical BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE partner_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  cases_referred INTEGER DEFAULT 0,
  cases_received INTEGER DEFAULT 0,
  cases_jointly_resolved INTEGER DEFAULT 0,
  leads_shared INTEGER DEFAULT 0,
  leads_received INTEGER DEFAULT 0,
  tips_forwarded INTEGER DEFAULT 0,
  avg_response_time_hours DECIMAL(10,2),
  collaboration_score DECIMAL(5,2),
  api_calls INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, metric_date)
);

CREATE TYPE report_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE report_format AS ENUM ('pdf', 'csv', 'excel', 'json');

CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL,
  frequency report_frequency NOT NULL,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  timezone TEXT DEFAULT 'America/Toronto',
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  organization_id UUID REFERENCES organizations(id),
  date_range_days INTEGER DEFAULT 30,
  custom_filters JSONB DEFAULT '{}',
  format report_format DEFAULT 'pdf',
  include_charts BOOLEAN DEFAULT TRUE,
  include_branding BOOLEAN DEFAULT TRUE,
  recipients JSONB NOT NULL DEFAULT '[]',
  cc_recipients JSONB DEFAULT '[]',
  subject_template TEXT,
  body_template TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  format report_format NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  organization_id UUID REFERENCES organizations(id),
  filters_applied JSONB DEFAULT '{}',
  file_url TEXT,
  file_size_bytes INTEGER,
  generated_by UUID REFERENCES profiles(id),
  generation_started_at TIMESTAMPTZ,
  generation_completed_at TIMESTAMPTZ,
  generation_error TEXT,
  delivery_status TEXT DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  delivery_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE geographic_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  province TEXT NOT NULL,
  city TEXT,
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  active_cases INTEGER DEFAULT 0,
  resolved_cases INTEGER DEFAULT 0,
  total_cases INTEGER DEFAULT 0,
  minor_cases INTEGER DEFAULT 0,
  indigenous_cases INTEGER DEFAULT 0,
  avg_resolution_hours DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_date, province, city)
);

CREATE TYPE bottleneck_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE bottleneck_status AS ENUM ('active', 'investigating', 'resolved', 'monitoring');

CREATE TABLE bottleneck_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bottleneck_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity bottleneck_severity NOT NULL,
  status bottleneck_status DEFAULT 'active',
  affected_cases_count INTEGER DEFAULT 0,
  affected_users JSONB DEFAULT '[]',
  estimated_delay_hours DECIMAL(10,2),
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  affected_stage TEXT,
  identified_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES profiles(id),
  is_recurring BOOLEAN DEFAULT FALSE,
  occurrence_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dashboard_metrics_date ON dashboard_metrics(metric_date DESC);
CREATE INDEX idx_dashboard_metrics_type ON dashboard_metrics(metric_type);
CREATE INDEX idx_staff_productivity_user ON staff_productivity(user_id);
CREATE INDEX idx_staff_productivity_date ON staff_productivity(metric_date DESC);
CREATE INDEX idx_agent_queue_status_status ON agent_queue_status(status);
CREATE INDEX idx_sla_compliance_case ON sla_compliance(case_id);
CREATE INDEX idx_partner_engagement_org ON partner_engagement(organization_id);
CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = TRUE;
CREATE INDEX idx_generated_reports_created ON generated_reports(created_at DESC);
CREATE INDEX idx_geographic_distribution_date ON geographic_distribution(metric_date DESC);
CREATE INDEX idx_bottleneck_tracking_status ON bottleneck_tracking(status);
CREATE INDEX idx_bottleneck_tracking_severity ON bottleneck_tracking(severity);

ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_productivity ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_queue_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottleneck_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and LE can view dashboard metrics" ON dashboard_metrics FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer', 'law_enforcement')));
CREATE POLICY "Users can view own productivity" ON staff_productivity FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin can view all productivity" ON staff_productivity FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "Admin and LE can view agent status" ON agent_queue_status FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer', 'law_enforcement')));
CREATE POLICY "Users can update own status" ON agent_queue_status FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Anyone can view SLA definitions" ON sla_definitions FOR SELECT USING (TRUE);
CREATE POLICY "Admin can manage SLA definitions" ON sla_definitions FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "Admin and LE can view all SLA compliance" ON sla_compliance FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer', 'law_enforcement')));
CREATE POLICY "Admin can view integration health" ON integration_health FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "Admin and LE can view partner engagement" ON partner_engagement FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer', 'law_enforcement')));
CREATE POLICY "Admin can view all scheduled reports" ON scheduled_reports FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "Admin can view all generated reports" ON generated_reports FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer', 'law_enforcement')));
CREATE POLICY "Admin and LE can view geographic distribution" ON geographic_distribution FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer', 'law_enforcement')));
CREATE POLICY "Admin can view bottleneck tracking" ON bottleneck_tracking FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));

CREATE TRIGGER update_dashboard_metrics_updated_at BEFORE UPDATE ON dashboard_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_productivity_updated_at BEFORE UPDATE ON staff_productivity FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_queue_status_updated_at BEFORE UPDATE ON agent_queue_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sla_definitions_updated_at BEFORE UPDATE ON sla_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sla_compliance_updated_at BEFORE UPDATE ON sla_compliance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integration_health_updated_at BEFORE UPDATE ON integration_health FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_partner_engagement_updated_at BEFORE UPDATE ON partner_engagement FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_reports_updated_at BEFORE UPDATE ON scheduled_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_geographic_distribution_updated_at BEFORE UPDATE ON geographic_distribution FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bottleneck_tracking_updated_at BEFORE UPDATE ON bottleneck_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO sla_definitions (name, priority_level, initial_response_hours, first_action_hours, update_frequency_hours, escalation_threshold_hours, resolution_target_hours) VALUES
  ('P0 Critical Response SLA', 'p0_critical', 0.25, 1, 2, 4, 24),
  ('P1 High Priority SLA', 'p1_high', 1, 4, 6, 12, 72),
  ('P2 Medium Priority SLA', 'p2_medium', 4, 12, 24, 48, 168),
  ('P3 Low Priority SLA', 'p3_low', 8, 24, 48, 96, 336),
  ('P4 Routine SLA', 'p4_routine', 24, 48, 168, 336, 720);

INSERT INTO integration_health (integration_name, display_name, description, is_critical) VALUES
  ('supabase_auth', 'Supabase Authentication', 'Core authentication service', TRUE),
  ('supabase_storage', 'Supabase Storage', 'File storage for case photos and documents', TRUE),
  ('supabase_realtime', 'Supabase Realtime', 'Real-time subscriptions for live updates', FALSE),
  ('email_service', 'Email Service', 'Transactional email delivery', FALSE),
  ('geocoding_api', 'Geocoding API', 'Address to coordinates conversion', FALSE),
  ('hospital_registry', 'Hospital Registry', 'Hospital patient lookup integration', FALSE),
  ('police_database', 'Police Database', 'Law enforcement data integration', TRUE);

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
