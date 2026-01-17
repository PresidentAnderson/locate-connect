-- Migration: AMBER Alert Integration System
-- Author: GitHub Copilot Agent
-- Date: 2026-01-17
-- Issue: LC-FEAT-026

-- =====================================================
-- AMBER Alert Request Status Enum
-- =====================================================
CREATE TYPE amber_alert_status AS ENUM (
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'active',
  'expired',
  'cancelled',
  'resolved'
);

-- =====================================================
-- Distribution Channel Enum
-- =====================================================
CREATE TYPE distribution_channel AS ENUM (
  'wea',              -- Wireless Emergency Alerts
  'eas',              -- Emergency Alert System
  'amber_canada',     -- AMBER Alert Canada
  'amber_quebec',     -- AMBER Alert Quebec
  'highway_signage',  -- Digital highway signs
  'social_media',     -- Facebook, Twitter, etc.
  'broadcast_media',  -- TV and Radio
  'mobile_app'        -- Mobile applications
);

-- =====================================================
-- AMBER Alert Requests Table
-- =====================================================
CREATE TABLE amber_alert_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Request metadata
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requesting_agency TEXT NOT NULL,
  status amber_alert_status NOT NULL DEFAULT 'draft',
  
  -- Child information (pre-populated from case)
  child_first_name TEXT NOT NULL,
  child_last_name TEXT NOT NULL,
  child_middle_name TEXT,
  child_nickname TEXT,
  child_age INTEGER NOT NULL,
  child_date_of_birth DATE NOT NULL,
  child_sex TEXT NOT NULL,
  child_race TEXT,
  child_height_cm INTEGER,
  child_weight_kg INTEGER,
  child_eye_color TEXT,
  child_hair_color TEXT,
  child_description TEXT NOT NULL,
  child_photo_url TEXT,
  
  -- Abduction details
  abduction_date TIMESTAMPTZ NOT NULL,
  abduction_location TEXT NOT NULL,
  abduction_latitude DECIMAL(10, 8),
  abduction_longitude DECIMAL(11, 8),
  abduction_circumstances TEXT NOT NULL,
  suspected_abductor_relationship TEXT,
  
  -- Suspect information
  suspect_name TEXT,
  suspect_age INTEGER,
  suspect_description TEXT,
  suspect_photo_url TEXT,
  
  -- Vehicle information
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_color TEXT,
  vehicle_license_plate TEXT,
  vehicle_license_province TEXT,
  vehicle_description TEXT,
  
  -- Alert criteria validation
  meets_amber_criteria BOOLEAN NOT NULL DEFAULT false,
  criteria_child_under_18 BOOLEAN NOT NULL DEFAULT false,
  criteria_abduction_confirmed BOOLEAN NOT NULL DEFAULT false,
  criteria_imminent_danger BOOLEAN NOT NULL DEFAULT false,
  criteria_sufficient_info BOOLEAN NOT NULL DEFAULT false,
  
  -- Distribution settings
  geographic_scope TEXT[] DEFAULT '{}', -- Array of provinces/territories
  target_radius_km INTEGER DEFAULT 100,
  distribution_channels distribution_channel[] DEFAULT '{}',
  
  -- Alert activation details
  alert_id TEXT UNIQUE, -- External system alert ID
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  
  -- Deactivation details
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES auth.users(id),
  deactivation_reason TEXT,
  
  -- Law enforcement verification
  le_verified BOOLEAN NOT NULL DEFAULT false,
  le_verified_by UUID REFERENCES auth.users(id),
  le_verified_at TIMESTAMPTZ,
  le_contact_name TEXT NOT NULL,
  le_contact_phone TEXT NOT NULL,
  le_contact_email TEXT NOT NULL,
  le_badge_number TEXT,
  le_agency_case_number TEXT,
  
  -- Approval workflow
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Tracking
  submission_count INTEGER NOT NULL DEFAULT 0,
  last_submitted_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_child_age CHECK (child_age >= 0 AND child_age <= 17),
  CONSTRAINT valid_target_radius CHECK (target_radius_km > 0 AND target_radius_km <= 1000),
  CONSTRAINT activation_requires_approval CHECK (
    (status = 'active' AND activated_at IS NOT NULL AND activated_by IS NOT NULL) OR
    status != 'active'
  ),
  CONSTRAINT expiration_after_activation CHECK (
    expires_at IS NULL OR activated_at IS NULL OR expires_at > activated_at
  )
);

-- =====================================================
-- Alert Status History Table
-- =====================================================
CREATE TABLE amber_alert_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_request_id UUID NOT NULL REFERENCES amber_alert_requests(id) ON DELETE CASCADE,
  
  status amber_alert_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Alert Distribution Log Table
-- =====================================================
CREATE TABLE amber_alert_distribution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_request_id UUID NOT NULL REFERENCES amber_alert_requests(id) ON DELETE CASCADE,
  
  channel distribution_channel NOT NULL,
  distributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL, -- 'success', 'failed', 'pending'
  
  -- External system details
  external_reference_id TEXT,
  response_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  
  -- Reach metrics
  estimated_reach INTEGER,
  actual_reach INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Alert Performance Metrics Table
-- =====================================================
CREATE TABLE amber_alert_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_request_id UUID NOT NULL REFERENCES amber_alert_requests(id) ON DELETE CASCADE,
  
  -- Engagement metrics
  views_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  tips_received_count INTEGER DEFAULT 0,
  
  -- Geographic reach
  provinces_reached TEXT[] DEFAULT '{}',
  cities_reached TEXT[] DEFAULT '{}',
  
  -- Time metrics
  time_to_approval_minutes INTEGER,
  time_to_activation_minutes INTEGER,
  total_active_duration_minutes INTEGER,
  
  -- Outcome
  led_to_recovery BOOLEAN DEFAULT false,
  recovery_time_minutes INTEGER,
  
  -- Metadata
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX idx_amber_alert_requests_case_id ON amber_alert_requests(case_id);
CREATE INDEX idx_amber_alert_requests_status ON amber_alert_requests(status);
CREATE INDEX idx_amber_alert_requests_requested_by ON amber_alert_requests(requested_by);
CREATE INDEX idx_amber_alert_requests_activated_at ON amber_alert_requests(activated_at);
CREATE INDEX idx_amber_alert_requests_geographic_scope ON amber_alert_requests USING GIN(geographic_scope);

CREATE INDEX idx_amber_alert_status_history_alert_id ON amber_alert_status_history(alert_request_id);
CREATE INDEX idx_amber_alert_status_history_changed_at ON amber_alert_status_history(changed_at DESC);

CREATE INDEX idx_amber_alert_distribution_log_alert_id ON amber_alert_distribution_log(alert_request_id);
CREATE INDEX idx_amber_alert_distribution_log_channel ON amber_alert_distribution_log(channel);
CREATE INDEX idx_amber_alert_distribution_log_status ON amber_alert_distribution_log(status);

CREATE INDEX idx_amber_alert_metrics_alert_id ON amber_alert_metrics(alert_request_id);

-- =====================================================
-- Row Level Security Policies
-- =====================================================
ALTER TABLE amber_alert_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE amber_alert_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE amber_alert_distribution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE amber_alert_metrics ENABLE ROW LEVEL SECURITY;

-- Law enforcement can view all alerts
CREATE POLICY "Law enforcement can view all AMBER alert requests"
  ON amber_alert_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Case reporters can view their own alerts
CREATE POLICY "Reporters can view their own AMBER alert requests"
  ON amber_alert_requests FOR SELECT
  USING (
    requested_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = amber_alert_requests.case_id
      AND cases.reporter_id = auth.uid()
    )
  );

-- Law enforcement can create alert requests
CREATE POLICY "Law enforcement can create AMBER alert requests"
  ON amber_alert_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Law enforcement can update alerts
CREATE POLICY "Law enforcement can update AMBER alert requests"
  ON amber_alert_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Status history policies
CREATE POLICY "Users can view status history for their accessible alerts"
  ON amber_alert_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM amber_alert_requests
      WHERE amber_alert_requests.id = amber_alert_status_history.alert_request_id
      AND (
        amber_alert_requests.requested_by = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('law_enforcement', 'admin', 'developer')
        )
      )
    )
  );

CREATE POLICY "System can insert status history"
  ON amber_alert_status_history FOR INSERT
  WITH CHECK (true);

-- Distribution log policies (LE only)
CREATE POLICY "Law enforcement can view distribution logs"
  ON amber_alert_distribution_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "System can insert distribution logs"
  ON amber_alert_distribution_log FOR INSERT
  WITH CHECK (true);

-- Metrics policies (LE only)
CREATE POLICY "Law enforcement can view alert metrics"
  ON amber_alert_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "System can manage alert metrics"
  ON amber_alert_metrics FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Triggers
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_amber_alert_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_amber_alert_requests_updated_at
  BEFORE UPDATE ON amber_alert_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_amber_alert_requests_updated_at();

-- Auto-create status history on status change
CREATE OR REPLACE FUNCTION track_amber_alert_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR OLD.status != NEW.status) THEN
    INSERT INTO amber_alert_status_history (
      alert_request_id,
      status,
      changed_by,
      notes,
      metadata
    ) VALUES (
      NEW.id,
      NEW.status,
      COALESCE(auth.uid(), NEW.requested_by),
      CASE 
        WHEN NEW.status = 'approved' THEN 'Alert request approved for activation'
        WHEN NEW.status = 'rejected' THEN NEW.rejection_reason
        WHEN NEW.status = 'active' THEN 'Alert activated and distributed'
        WHEN NEW.status = 'expired' THEN 'Alert expired automatically'
        WHEN NEW.status = 'cancelled' THEN NEW.deactivation_reason
        WHEN NEW.status = 'resolved' THEN 'Case resolved, alert deactivated'
        ELSE NULL
      END,
      jsonb_build_object(
        'operation', TG_OP,
        'timestamp', NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_amber_alert_status_change
  AFTER INSERT OR UPDATE ON amber_alert_requests
  FOR EACH ROW
  EXECUTE FUNCTION track_amber_alert_status_change();

-- Update case is_amber_alert flag when alert is activated
CREATE OR REPLACE FUNCTION sync_case_amber_alert_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
    UPDATE cases
    SET is_amber_alert = true
    WHERE id = NEW.case_id;
  ELSIF NEW.status IN ('expired', 'cancelled', 'resolved') AND OLD.status = 'active' THEN
    -- Only unset if no other active alerts exist for this case
    UPDATE cases
    SET is_amber_alert = (
      EXISTS (
        SELECT 1 FROM amber_alert_requests
        WHERE case_id = NEW.case_id
        AND status = 'active'
        AND id != NEW.id
      )
    )
    WHERE id = NEW.case_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_case_amber_alert_flag
  AFTER INSERT OR UPDATE ON amber_alert_requests
  FOR EACH ROW
  EXECUTE FUNCTION sync_case_amber_alert_flag();

-- =====================================================
-- Helper Functions
-- =====================================================

-- Get active AMBER alerts within a geographic area
CREATE OR REPLACE FUNCTION get_active_amber_alerts_nearby(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_km INTEGER DEFAULT 100
)
RETURNS TABLE (
  alert_id UUID,
  case_id UUID,
  child_name TEXT,
  child_age INTEGER,
  child_description TEXT,
  abduction_location TEXT,
  distance_km DECIMAL,
  activated_at TIMESTAMPTZ,
  suspect_info TEXT,
  vehicle_info TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aar.id,
    aar.case_id,
    aar.child_first_name || ' ' || aar.child_last_name,
    aar.child_age,
    aar.child_description,
    aar.abduction_location,
    CASE 
      WHEN aar.abduction_latitude IS NOT NULL AND aar.abduction_longitude IS NOT NULL THEN
        -- Haversine formula for distance calculation
        (6371 * acos(
          cos(radians(p_latitude)) * 
          cos(radians(aar.abduction_latitude)) * 
          cos(radians(aar.abduction_longitude) - radians(p_longitude)) + 
          sin(radians(p_latitude)) * 
          sin(radians(aar.abduction_latitude))
        ))
      ELSE NULL
    END AS distance_km,
    aar.activated_at,
    aar.suspect_name || ' - ' || COALESCE(aar.suspect_description, 'No description'),
    COALESCE(
      aar.vehicle_year::TEXT || ' ' || aar.vehicle_make || ' ' || aar.vehicle_model || 
      ' (' || aar.vehicle_color || ') - ' || aar.vehicle_license_plate,
      'No vehicle information'
    )
  FROM amber_alert_requests aar
  WHERE aar.status = 'active'
    AND (aar.expires_at IS NULL OR aar.expires_at > NOW())
    AND (
      aar.abduction_latitude IS NULL 
      OR aar.abduction_longitude IS NULL
      OR (
        6371 * acos(
          cos(radians(p_latitude)) * 
          cos(radians(aar.abduction_latitude)) * 
          cos(radians(aar.abduction_longitude) - radians(p_longitude)) + 
          sin(radians(p_latitude)) * 
          sin(radians(aar.abduction_latitude))
        )
      ) <= p_radius_km
    )
  ORDER BY distance_km NULLS LAST, aar.activated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if a case meets AMBER alert criteria
CREATE OR REPLACE FUNCTION check_amber_alert_criteria(p_case_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_case RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_case FROM cases WHERE id = p_case_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Case not found');
  END IF;
  
  v_result := jsonb_build_object(
    'meets_criteria', (
      v_case.age_at_disappearance IS NOT NULL AND 
      v_case.age_at_disappearance < 18 AND
      v_case.suspected_abduction = true AND
      v_case.last_seen_date IS NOT NULL AND
      (v_case.first_name IS NOT NULL AND v_case.last_name IS NOT NULL)
    ),
    'criteria_breakdown', jsonb_build_object(
      'child_under_18', v_case.age_at_disappearance IS NOT NULL AND v_case.age_at_disappearance < 18,
      'abduction_confirmed', v_case.suspected_abduction = true,
      'sufficient_info', (v_case.first_name IS NOT NULL AND v_case.last_name IS NOT NULL),
      'recent_abduction', v_case.last_seen_date IS NOT NULL
    ),
    'case_details', jsonb_build_object(
      'child_age', v_case.age_at_disappearance,
      'suspected_abduction', v_case.suspected_abduction,
      'last_seen', v_case.last_seen_date,
      'has_photo', v_case.primary_photo_url IS NOT NULL
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Audit Logging Integration
-- =====================================================

-- Log AMBER alert actions to audit_logs table
CREATE OR REPLACE FUNCTION audit_amber_alert_actions()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_details JSONB;
BEGIN
  CASE TG_OP
    WHEN 'INSERT' THEN
      v_action := 'amber_alert.request_created';
      v_details := jsonb_build_object(
        'alert_id', NEW.id,
        'case_id', NEW.case_id,
        'requested_by', NEW.requested_by,
        'status', NEW.status
      );
    WHEN 'UPDATE' THEN
      IF OLD.status != NEW.status THEN
        v_action := 'amber_alert.status_changed';
        v_details := jsonb_build_object(
          'alert_id', NEW.id,
          'case_id', NEW.case_id,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'changed_by', COALESCE(auth.uid(), NEW.requested_by)
        );
      ELSIF NEW.status = 'active' AND (OLD.activated_at IS NULL AND NEW.activated_at IS NOT NULL) THEN
        v_action := 'amber_alert.activated';
        v_details := jsonb_build_object(
          'alert_id', NEW.id,
          'case_id', NEW.case_id,
          'activated_by', NEW.activated_by,
          'channels', NEW.distribution_channels,
          'geographic_scope', NEW.geographic_scope
        );
      ELSE
        v_action := 'amber_alert.updated';
        v_details := jsonb_build_object(
          'alert_id', NEW.id,
          'case_id', NEW.case_id
        );
      END IF;
    WHEN 'DELETE' THEN
      v_action := 'amber_alert.deleted';
      v_details := jsonb_build_object(
        'alert_id', OLD.id,
        'case_id', OLD.case_id
      );
  END CASE;
  
  -- Insert into audit_logs if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      details,
      ip_address,
      user_agent
    ) VALUES (
      COALESCE(auth.uid(), COALESCE(NEW.requested_by, OLD.requested_by)),
      v_action,
      'amber_alert_request',
      COALESCE(NEW.id, OLD.id),
      v_details,
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_amber_alert_actions
  AFTER INSERT OR UPDATE OR DELETE ON amber_alert_requests
  FOR EACH ROW
  EXECUTE FUNCTION audit_amber_alert_actions();

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE amber_alert_requests IS 'Tracks AMBER Alert requests and their lifecycle from creation to resolution';
COMMENT ON TABLE amber_alert_status_history IS 'Historical log of all status changes for AMBER alert requests';
COMMENT ON TABLE amber_alert_distribution_log IS 'Tracks distribution of alerts across various channels (WEA, EAS, etc.)';
COMMENT ON TABLE amber_alert_metrics IS 'Performance metrics and analytics for AMBER alert effectiveness';

COMMENT ON FUNCTION get_active_amber_alerts_nearby IS 'Returns active AMBER alerts within specified radius of coordinates';
COMMENT ON FUNCTION check_amber_alert_criteria IS 'Validates if a case meets AMBER alert criteria';
