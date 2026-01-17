-- Case Outcome Reports Schema
-- LC-FEAT-021: Case Outcome Reports for Analysis and Learning
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE outcome_report_status AS ENUM ('draft', 'pending_review', 'approved', 'archived');
CREATE TYPE recommendation_category AS ENUM ('process', 'resource', 'communication', 'technology', 'training', 'policy');
CREATE TYPE recommendation_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE lead_effectiveness_rating AS ENUM ('highly_effective', 'effective', 'neutral', 'ineffective', 'counterproductive');
CREATE TYPE discovery_method AS ENUM (
  'lead_from_public',
  'lead_from_law_enforcement',
  'tip_anonymous',
  'tip_identified',
  'social_media_monitoring',
  'surveillance',
  'patrol_encounter',
  'self_return',
  'hospital_report',
  'shelter_report',
  'cross_border_alert',
  'amber_alert_response',
  'volunteer_search',
  'ai_facial_recognition',
  'financial_tracking',
  'phone_tracking',
  'other'
);

-- =============================================================================
-- CASE OUTCOME REPORTS TABLE
-- Main table storing comprehensive outcome reports for resolved cases
-- =============================================================================

CREATE TABLE case_outcome_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Report metadata
  report_number TEXT UNIQUE,
  status outcome_report_status DEFAULT 'draft',
  version INTEGER DEFAULT 1,

  -- Case summary
  total_duration_hours DECIMAL(10,2),
  initial_priority_level priority_level,
  final_priority_level priority_level,
  priority_changes INTEGER DEFAULT 0,

  -- Resolution details
  discovery_method discovery_method,
  discovery_method_other TEXT,
  location_found TEXT,
  location_found_city TEXT,
  location_found_province TEXT,
  location_found_latitude DOUBLE PRECISION,
  location_found_longitude DOUBLE PRECISION,
  distance_from_last_seen_km DECIMAL(10,2),
  condition_at_resolution TEXT,
  condition_notes TEXT,

  -- Who found
  found_by_type TEXT, -- 'law_enforcement', 'public', 'family', 'self', 'organization', 'other'
  found_by_organization_id UUID REFERENCES organizations(id),
  found_by_user_id UUID REFERENCES profiles(id),
  found_by_name TEXT,

  -- Lead analysis metrics
  total_leads_generated INTEGER DEFAULT 0,
  leads_verified INTEGER DEFAULT 0,
  leads_dismissed INTEGER DEFAULT 0,
  leads_acted_upon INTEGER DEFAULT 0,
  solving_lead_id UUID REFERENCES leads(id),
  solving_lead_source TEXT,
  false_positive_rate DECIMAL(5,2),
  avg_lead_response_hours DECIMAL(10,2),

  -- Tip analysis metrics
  total_tips_received INTEGER DEFAULT 0,
  tips_verified INTEGER DEFAULT 0,
  tips_hoax INTEGER DEFAULT 0,
  tips_duplicate INTEGER DEFAULT 0,
  tips_converted_to_leads INTEGER DEFAULT 0,
  tip_conversion_rate DECIMAL(5,2),

  -- Resource utilization
  total_assigned_officers INTEGER DEFAULT 0,
  total_volunteer_hours DECIMAL(10,2),
  media_outlets_engaged INTEGER DEFAULT 0,
  social_media_reach BIGINT DEFAULT 0,
  estimated_cost DECIMAL(12,2),
  partner_organizations_involved TEXT[],

  -- Time breakdown (in hours)
  time_to_first_response DECIMAL(10,2),
  time_to_first_lead DECIMAL(10,2),
  time_to_verified_lead DECIMAL(10,2),
  time_to_resolution DECIMAL(10,2),

  -- Key milestones (timestamps)
  case_reported_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  first_lead_at TIMESTAMPTZ,
  first_verified_lead_at TIMESTAMPTZ,
  public_alert_issued_at TIMESTAMPTZ,
  media_coverage_started_at TIMESTAMPTZ,
  case_resolved_at TIMESTAMPTZ,

  -- Analysis and learning
  what_worked TEXT[],
  what_didnt_work TEXT[],
  delays_identified TEXT[],
  lessons_learned TEXT,
  key_decision_points JSONB DEFAULT '[]',

  -- Approval workflow
  created_by UUID NOT NULL REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- OUTCOME REPORT RECOMMENDATIONS TABLE
-- Stores individual recommendations for process improvements
-- =============================================================================

CREATE TABLE outcome_report_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_report_id UUID NOT NULL REFERENCES case_outcome_reports(id) ON DELETE CASCADE,

  category recommendation_category NOT NULL,
  priority recommendation_priority NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Implementation tracking
  is_actionable BOOLEAN DEFAULT TRUE,
  assigned_to UUID REFERENCES profiles(id),
  target_completion_date DATE,
  is_implemented BOOLEAN DEFAULT FALSE,
  implemented_at TIMESTAMPTZ,
  implemented_by UUID REFERENCES profiles(id),
  implementation_notes TEXT,

  -- Source analysis
  source_analysis TEXT, -- What analysis led to this recommendation
  similar_cases_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SIMILAR CASES ANALYSIS TABLE
-- Links cases that share similar characteristics for learning
-- =============================================================================

CREATE TABLE similar_case_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_report_id UUID NOT NULL REFERENCES case_outcome_reports(id) ON DELETE CASCADE,
  similar_case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  similarity_score DECIMAL(5,2) NOT NULL, -- 0-100 percentage
  similarity_factors JSONB NOT NULL DEFAULT '[]', -- What factors make them similar

  -- Comparison metrics
  resolution_comparison TEXT,
  duration_difference_hours DECIMAL(10,2),
  lead_effectiveness_comparison TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(outcome_report_id, similar_case_id)
);

-- =============================================================================
-- LEAD EFFECTIVENESS SCORES TABLE
-- Tracks effectiveness of leads for analytics
-- =============================================================================

CREATE TABLE lead_effectiveness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_report_id UUID NOT NULL REFERENCES case_outcome_reports(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  effectiveness_rating lead_effectiveness_rating NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),

  -- Analysis
  response_time_hours DECIMAL(10,2),
  contributed_to_resolution BOOLEAN DEFAULT FALSE,
  was_false_positive BOOLEAN DEFAULT FALSE,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(outcome_report_id, lead_id)
);

-- =============================================================================
-- TIMELINE MILESTONES TABLE
-- Key events and decision points during the case
-- =============================================================================

CREATE TABLE outcome_timeline_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_report_id UUID NOT NULL REFERENCES case_outcome_reports(id) ON DELETE CASCADE,

  milestone_type TEXT NOT NULL, -- 'report', 'lead', 'tip', 'action', 'decision', 'escalation', 'resolution'
  timestamp TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Related entities
  related_lead_id UUID REFERENCES leads(id),
  related_tip_id UUID REFERENCES tips(id),
  actor_id UUID REFERENCES profiles(id),
  actor_name TEXT,

  -- Decision analysis
  is_decision_point BOOLEAN DEFAULT FALSE,
  decision_outcome TEXT,
  decision_rationale TEXT,
  was_delay BOOLEAN DEFAULT FALSE,
  delay_hours DECIMAL(10,2),
  delay_reason TEXT,

  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- OUTCOME ANALYTICS AGGREGATES TABLE
-- Pre-computed aggregates for fast dashboard queries
-- =============================================================================

CREATE TABLE outcome_analytics_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dimensions
  aggregation_period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  jurisdiction_id UUID REFERENCES jurisdictions(id),

  -- Case outcomes
  total_cases_resolved INTEGER DEFAULT 0,
  cases_found_alive_safe INTEGER DEFAULT 0,
  cases_found_alive_injured INTEGER DEFAULT 0,
  cases_found_deceased INTEGER DEFAULT 0,
  cases_returned_voluntarily INTEGER DEFAULT 0,
  cases_other_resolution INTEGER DEFAULT 0,

  -- Duration metrics
  avg_resolution_hours DECIMAL(10,2),
  median_resolution_hours DECIMAL(10,2),
  min_resolution_hours DECIMAL(10,2),
  max_resolution_hours DECIMAL(10,2),

  -- Lead metrics
  avg_leads_per_case DECIMAL(10,2),
  avg_lead_verification_rate DECIMAL(5,2),
  avg_false_positive_rate DECIMAL(5,2),

  -- Resource metrics
  avg_officers_per_case DECIMAL(10,2),
  avg_cost_per_case DECIMAL(12,2),
  total_volunteer_hours DECIMAL(10,2),

  -- Discovery methods distribution
  discovery_method_counts JSONB DEFAULT '{}',

  -- Effectiveness
  top_performing_lead_sources JSONB DEFAULT '[]',
  common_delays JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(aggregation_period, period_start, jurisdiction_id)
);

-- =============================================================================
-- RECOMMENDATION PATTERNS TABLE
-- Tracks recurring recommendation patterns across cases
-- =============================================================================

CREATE TABLE recommendation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  pattern_name TEXT NOT NULL UNIQUE,
  category recommendation_category NOT NULL,
  description TEXT NOT NULL,

  -- Pattern details
  trigger_conditions JSONB DEFAULT '[]', -- What case characteristics trigger this
  suggested_action TEXT NOT NULL,

  -- Statistics
  times_recommended INTEGER DEFAULT 0,
  times_implemented INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Outcome reports
CREATE INDEX idx_outcome_reports_case ON case_outcome_reports(case_id);
CREATE INDEX idx_outcome_reports_status ON case_outcome_reports(status);
CREATE INDEX idx_outcome_reports_created_by ON case_outcome_reports(created_by);
CREATE INDEX idx_outcome_reports_created_at ON case_outcome_reports(created_at DESC);
CREATE INDEX idx_outcome_reports_discovery_method ON case_outcome_reports(discovery_method);

-- Recommendations
CREATE INDEX idx_recommendations_report ON outcome_report_recommendations(outcome_report_id);
CREATE INDEX idx_recommendations_category ON outcome_report_recommendations(category);
CREATE INDEX idx_recommendations_priority ON outcome_report_recommendations(priority);
CREATE INDEX idx_recommendations_assigned ON outcome_report_recommendations(assigned_to) WHERE assigned_to IS NOT NULL;

-- Similar cases
CREATE INDEX idx_similar_cases_report ON similar_case_analysis(outcome_report_id);
CREATE INDEX idx_similar_cases_similar ON similar_case_analysis(similar_case_id);
CREATE INDEX idx_similar_cases_score ON similar_case_analysis(similarity_score DESC);

-- Lead effectiveness
CREATE INDEX idx_lead_effectiveness_report ON lead_effectiveness_scores(outcome_report_id);
CREATE INDEX idx_lead_effectiveness_lead ON lead_effectiveness_scores(lead_id);
CREATE INDEX idx_lead_effectiveness_rating ON lead_effectiveness_scores(effectiveness_rating);

-- Timeline
CREATE INDEX idx_timeline_report ON outcome_timeline_milestones(outcome_report_id);
CREATE INDEX idx_timeline_timestamp ON outcome_timeline_milestones(timestamp);
CREATE INDEX idx_timeline_type ON outcome_timeline_milestones(milestone_type);

-- Analytics aggregates
CREATE INDEX idx_analytics_period ON outcome_analytics_aggregates(aggregation_period, period_start);
CREATE INDEX idx_analytics_jurisdiction ON outcome_analytics_aggregates(jurisdiction_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE case_outcome_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_report_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE similar_case_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_effectiveness_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_timeline_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_analytics_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_patterns ENABLE ROW LEVEL SECURITY;

-- Outcome reports policies
CREATE POLICY "LE can view outcome reports" ON case_outcome_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

CREATE POLICY "LE can create outcome reports" ON case_outcome_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

CREATE POLICY "LE can update outcome reports" ON case_outcome_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Recommendations policies
CREATE POLICY "LE can view recommendations" ON outcome_report_recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can manage recommendations" ON outcome_report_recommendations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Similar cases policies
CREATE POLICY "LE can view similar cases" ON similar_case_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can manage similar cases" ON similar_case_analysis
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Lead effectiveness policies
CREATE POLICY "LE can view lead effectiveness" ON lead_effectiveness_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can manage lead effectiveness" ON lead_effectiveness_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Timeline policies
CREATE POLICY "LE can view timeline milestones" ON outcome_timeline_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can manage timeline milestones" ON outcome_timeline_milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Analytics aggregates policies
CREATE POLICY "LE can view analytics" ON outcome_analytics_aggregates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Admins can manage analytics" ON outcome_analytics_aggregates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Recommendation patterns policies
CREATE POLICY "LE can view patterns" ON recommendation_patterns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Admins can manage patterns" ON recommendation_patterns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Generate outcome report number
CREATE OR REPLACE FUNCTION generate_outcome_report_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(report_number FROM 11) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM case_outcome_reports
  WHERE report_number LIKE 'LC-OR-' || year_part || '-%';

  NEW.report_number := 'LC-OR-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate lead effectiveness for a case
CREATE OR REPLACE FUNCTION calculate_lead_metrics(p_case_id UUID)
RETURNS TABLE (
  total_leads INTEGER,
  verified_leads INTEGER,
  dismissed_leads INTEGER,
  false_positive_rate DECIMAL,
  avg_response_hours DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_leads,
    COUNT(*) FILTER (WHERE status = 'verified')::INTEGER as verified_leads,
    COUNT(*) FILTER (WHERE status = 'dismissed')::INTEGER as dismissed_leads,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE status = 'dismissed')::DECIMAL / COUNT(*)) * 100, 2)
      ELSE 0
    END as false_positive_rate,
    ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600)::DECIMAL, 2) as avg_response_hours
  FROM leads
  WHERE case_id = p_case_id;
END;
$$ LANGUAGE plpgsql;

-- Calculate tip metrics for a case
CREATE OR REPLACE FUNCTION calculate_tip_metrics(p_case_id UUID)
RETURNS TABLE (
  total_tips INTEGER,
  verified_tips INTEGER,
  hoax_tips INTEGER,
  duplicate_tips INTEGER,
  converted_to_leads INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_tips,
    COUNT(*) FILTER (WHERE status = 'verified')::INTEGER as verified_tips,
    COUNT(*) FILTER (WHERE status = 'hoax')::INTEGER as hoax_tips,
    COUNT(*) FILTER (WHERE is_duplicate = TRUE)::INTEGER as duplicate_tips,
    COUNT(*) FILTER (WHERE lead_id IS NOT NULL)::INTEGER as converted_to_leads
  FROM tips
  WHERE case_id = p_case_id;
END;
$$ LANGUAGE plpgsql;

-- Find similar cases based on characteristics
CREATE OR REPLACE FUNCTION find_similar_cases(
  p_case_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  similar_case_id UUID,
  case_number TEXT,
  similarity_score DECIMAL,
  similarity_factors JSONB
) AS $$
DECLARE
  v_case RECORD;
BEGIN
  -- Get the reference case
  SELECT * INTO v_case FROM cases WHERE id = p_case_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH similarity_calc AS (
    SELECT
      c.id,
      c.case_number,
      -- Calculate similarity based on various factors
      (
        -- Age similarity (if both have ages)
        CASE WHEN v_case.age_at_disappearance IS NOT NULL AND c.age_at_disappearance IS NOT NULL THEN
          GREATEST(0, 20 - ABS(v_case.age_at_disappearance - c.age_at_disappearance)) * 2
        ELSE 0 END
        +
        -- Gender match
        CASE WHEN v_case.gender = c.gender THEN 15 ELSE 0 END
        +
        -- Minor status match
        CASE WHEN v_case.is_minor = c.is_minor THEN 10 ELSE 0 END
        +
        -- Indigenous status match
        CASE WHEN v_case.is_indigenous = c.is_indigenous THEN 10 ELSE 0 END
        +
        -- Same jurisdiction
        CASE WHEN v_case.jurisdiction_id = c.jurisdiction_id THEN 15 ELSE 0 END
        +
        -- Same province
        CASE WHEN v_case.last_seen_province = c.last_seen_province THEN 10 ELSE 0 END
        +
        -- Same disposition
        CASE WHEN v_case.disposition = c.disposition THEN 20 ELSE 0 END
      ) AS score,
      jsonb_build_array(
        CASE WHEN v_case.gender = c.gender THEN jsonb_build_object('factor', 'gender', 'match', true) ELSE NULL END,
        CASE WHEN v_case.is_minor = c.is_minor THEN jsonb_build_object('factor', 'minor_status', 'match', true) ELSE NULL END,
        CASE WHEN v_case.is_indigenous = c.is_indigenous THEN jsonb_build_object('factor', 'indigenous_status', 'match', true) ELSE NULL END,
        CASE WHEN v_case.jurisdiction_id = c.jurisdiction_id THEN jsonb_build_object('factor', 'jurisdiction', 'match', true) ELSE NULL END,
        CASE WHEN v_case.disposition = c.disposition THEN jsonb_build_object('factor', 'disposition', 'match', true) ELSE NULL END
      ) - 'null' AS factors
    FROM cases c
    WHERE c.id != p_case_id
      AND c.status IN ('resolved', 'closed')
      AND c.disposition IS NOT NULL
  )
  SELECT
    sc.id,
    sc.case_number,
    sc.score,
    sc.factors
  FROM similarity_calc sc
  WHERE sc.score > 30 -- Minimum threshold
  ORDER BY sc.score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Generate recommendations based on case analysis
CREATE OR REPLACE FUNCTION generate_case_recommendations(p_outcome_report_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_report RECORD;
  v_recommendations_count INTEGER := 0;
BEGIN
  SELECT * INTO v_report FROM case_outcome_reports WHERE id = p_outcome_report_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Check for high false positive rate
  IF v_report.false_positive_rate > 50 THEN
    INSERT INTO outcome_report_recommendations (
      outcome_report_id, category, priority, title, description, source_analysis
    ) VALUES (
      p_outcome_report_id,
      'process',
      'medium',
      'Review lead verification process',
      'The false positive rate exceeded 50% in this case. Consider implementing additional verification steps or training on lead assessment.',
      'High false positive rate detected: ' || v_report.false_positive_rate || '%'
    );
    v_recommendations_count := v_recommendations_count + 1;
  END IF;

  -- Check for slow response time
  IF v_report.time_to_first_response > 24 THEN
    INSERT INTO outcome_report_recommendations (
      outcome_report_id, category, priority, title, description, source_analysis
    ) VALUES (
      p_outcome_report_id,
      'resource',
      'high',
      'Improve initial response time',
      'Initial response took over 24 hours. Review staffing levels and assignment procedures to reduce response time.',
      'Time to first response: ' || v_report.time_to_first_response || ' hours'
    );
    v_recommendations_count := v_recommendations_count + 1;
  END IF;

  -- Check for low tip conversion rate
  IF v_report.tip_conversion_rate < 10 AND v_report.total_tips_received > 5 THEN
    INSERT INTO outcome_report_recommendations (
      outcome_report_id, category, priority, title, description, source_analysis
    ) VALUES (
      p_outcome_report_id,
      'communication',
      'medium',
      'Improve tip quality and public communication',
      'The tip-to-lead conversion rate was below 10%. Consider improving public communication about what constitutes a useful tip.',
      'Tip conversion rate: ' || v_report.tip_conversion_rate || '%'
    );
    v_recommendations_count := v_recommendations_count + 1;
  END IF;

  RETURN v_recommendations_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Generate report number
CREATE TRIGGER generate_outcome_report_number_trigger
  BEFORE INSERT ON case_outcome_reports
  FOR EACH ROW EXECUTE FUNCTION generate_outcome_report_number();

-- Update timestamps
CREATE TRIGGER update_outcome_reports_updated_at
  BEFORE UPDATE ON case_outcome_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at
  BEFORE UPDATE ON outcome_report_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at
  BEFORE UPDATE ON outcome_analytics_aggregates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patterns_updated_at
  BEFORE UPDATE ON recommendation_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED DATA: Default Recommendation Patterns
-- =============================================================================

INSERT INTO recommendation_patterns (pattern_name, category, description, trigger_conditions, suggested_action) VALUES
  (
    'high_false_positive_rate',
    'process',
    'When false positive rate exceeds 50%',
    '[{"condition": "false_positive_rate", "operator": ">", "value": 50}]',
    'Review lead verification process and provide additional training on lead assessment criteria.'
  ),
  (
    'slow_initial_response',
    'resource',
    'When initial response takes more than 24 hours',
    '[{"condition": "time_to_first_response", "operator": ">", "value": 24}]',
    'Review staffing levels and implement automated case assignment to reduce response times.'
  ),
  (
    'low_tip_conversion',
    'communication',
    'When tip conversion rate is below 10%',
    '[{"condition": "tip_conversion_rate", "operator": "<", "value": 10}]',
    'Improve public communication about what information is most helpful. Consider adding tip templates.'
  ),
  (
    'no_social_media_monitoring',
    'technology',
    'When resolved without social media tracking',
    '[{"condition": "social_media_reach", "operator": "=", "value": 0}]',
    'Consider implementing social media monitoring for future similar cases.'
  ),
  (
    'extended_resolution_time',
    'process',
    'When case takes more than 72 hours to resolve',
    '[{"condition": "total_duration_hours", "operator": ">", "value": 72}]',
    'Review case escalation procedures and ensure adequate resources are assigned to time-critical cases.'
  );

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON case_outcome_reports TO service_role;
GRANT ALL ON outcome_report_recommendations TO service_role;
GRANT ALL ON similar_case_analysis TO service_role;
GRANT ALL ON lead_effectiveness_scores TO service_role;
GRANT ALL ON outcome_timeline_milestones TO service_role;
GRANT ALL ON outcome_analytics_aggregates TO service_role;
GRANT ALL ON recommendation_patterns TO service_role;
