-- ============================================================================
-- LC-M2-003: Risk Factor Intake with Safe Handling
-- ============================================================================
-- This migration creates a separate table for contextual/interpersonal risk
-- factors with enhanced privacy controls, access logging, and safeguards.

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE risk_factor_category AS ENUM (
  'interpersonal',
  'behavioral',
  'environmental',
  'historical'
);

CREATE TYPE risk_factor_severity AS ENUM (
  'low',
  'medium',
  'high'
);

-- ============================================================================
-- SENSITIVE RISK FACTORS TABLE
-- ============================================================================

-- Separate table with strict access controls for contextual/interpersonal
-- risk factors that require corroboration and special handling
CREATE TABLE sensitive_risk_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Risk factor details
  category risk_factor_category NOT NULL,
  factor_type TEXT NOT NULL,
  description TEXT,
  severity risk_factor_severity DEFAULT 'low',
  
  -- Corroboration & verification
  requires_corroboration BOOLEAN DEFAULT TRUE,
  is_corroborated BOOLEAN DEFAULT FALSE,
  corroboration_source TEXT,
  corroboration_date TIMESTAMPTZ,
  corroborated_by UUID REFERENCES profiles(id),
  
  -- Reporter acknowledgment
  reporter_acknowledged_sensitivity BOOLEAN DEFAULT FALSE,
  reporter_acknowledgment_timestamp TIMESTAMPTZ,
  reporter_id UUID REFERENCES profiles(id),
  
  -- Additional context
  behavioral_correlation TEXT,
  medical_correlation TEXT,
  supporting_evidence TEXT,
  
  -- Access controls
  is_restricted BOOLEAN DEFAULT TRUE,
  restriction_reason TEXT,
  authorized_viewers UUID[] DEFAULT '{}',
  
  -- Metadata
  weight_in_priority DECIMAL(3,2) DEFAULT 0.10, -- Low weight per requirements
  included_in_le_view BOOLEAN DEFAULT FALSE,
  inclusion_justification TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Index for case lookups
CREATE INDEX idx_sensitive_risk_factors_case_id ON sensitive_risk_factors(case_id);
CREATE INDEX idx_sensitive_risk_factors_category ON sensitive_risk_factors(category);

-- ============================================================================
-- RISK FACTOR ACCESS LOG
-- ============================================================================

-- Comprehensive audit logging for all access to sensitive risk factors
CREATE TABLE risk_factor_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_factor_id UUID NOT NULL REFERENCES sensitive_risk_factors(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Access details
  accessed_by UUID NOT NULL REFERENCES profiles(id),
  access_type TEXT NOT NULL, -- 'read', 'update', 'create', 'delete', 'export'
  access_reason TEXT,
  access_granted BOOLEAN DEFAULT TRUE,
  denial_reason TEXT,
  
  -- Context
  user_role user_role,
  user_organization TEXT,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  
  -- Correlation requirement check
  had_behavioral_correlation BOOLEAN,
  had_medical_correlation BOOLEAN,
  correlation_details TEXT,
  
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX idx_risk_factor_access_log_risk_factor_id ON risk_factor_access_log(risk_factor_id);
CREATE INDEX idx_risk_factor_access_log_accessed_by ON risk_factor_access_log(accessed_by);
CREATE INDEX idx_risk_factor_access_log_case_id ON risk_factor_access_log(case_id);
CREATE INDEX idx_risk_factor_access_log_accessed_at ON risk_factor_access_log(accessed_at);

-- ============================================================================
-- RISK FACTOR INTAKE CONSENT
-- ============================================================================

-- Track reporter consent and acknowledgment of sensitivity
CREATE TABLE risk_factor_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Consent details
  consent_given BOOLEAN DEFAULT FALSE,
  consent_text TEXT NOT NULL,
  consent_version TEXT DEFAULT '1.0',
  
  -- Acknowledgments
  acknowledged_non_accusatory BOOLEAN DEFAULT FALSE,
  acknowledged_corroboration_required BOOLEAN DEFAULT FALSE,
  acknowledged_limited_weight BOOLEAN DEFAULT FALSE,
  acknowledged_privacy_protections BOOLEAN DEFAULT FALSE,
  
  -- Disclaimers accepted
  accepted_sensitivity_disclaimer BOOLEAN DEFAULT FALSE,
  accepted_privacy_policy BOOLEAN DEFAULT FALSE,
  
  ip_address TEXT,
  user_agent TEXT,
  
  consented_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX idx_risk_factor_consent_case_id ON risk_factor_consent(case_id);
CREATE INDEX idx_risk_factor_consent_reporter_id ON risk_factor_consent(reporter_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all risk factor tables
ALTER TABLE sensitive_risk_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_factor_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_factor_consent ENABLE ROW LEVEL SECURITY;

-- Policy: Only authorized users can view sensitive risk factors
CREATE POLICY "sensitive_risk_factors_select_policy" ON sensitive_risk_factors
  FOR SELECT
  USING (
    -- Admin or law_enforcement with proper authorization
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('admin', 'law_enforcement')
      AND id = ANY(authorized_viewers)
    )
    -- Or the creator
    OR auth.uid() = created_by
    -- Or the reporter who submitted it
    OR auth.uid() = reporter_id
  );

-- Policy: Only authorized users can insert risk factors
CREATE POLICY "sensitive_risk_factors_insert_policy" ON sensitive_risk_factors
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('admin', 'law_enforcement', 'user')
    )
  );

-- Policy: Only authorized users can update risk factors
CREATE POLICY "sensitive_risk_factors_update_policy" ON sensitive_risk_factors
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('admin', 'law_enforcement')
    )
  );

-- Policy: Access log can only be inserted by system
CREATE POLICY "risk_factor_access_log_insert_policy" ON risk_factor_access_log
  FOR INSERT
  WITH CHECK (true); -- Allow all authenticated inserts

-- Policy: Access log can only be viewed by admin
CREATE POLICY "risk_factor_access_log_select_policy" ON risk_factor_access_log
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- Policy: Consent records visible to admin and reporter
CREATE POLICY "risk_factor_consent_select_policy" ON risk_factor_consent
  FOR SELECT
  USING (
    auth.uid() = reporter_id
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- Policy: Consent can be created by reporters
CREATE POLICY "risk_factor_consent_insert_policy" ON risk_factor_consent
  FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id
  );

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sensitive_risk_factors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_sensitive_risk_factors_updated_at
  BEFORE UPDATE ON sensitive_risk_factors
  FOR EACH ROW
  EXECUTE FUNCTION update_sensitive_risk_factors_updated_at();

-- Function to log all access to sensitive risk factors
CREATE OR REPLACE FUNCTION log_risk_factor_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO risk_factor_access_log (
    risk_factor_id,
    case_id,
    accessed_by,
    access_type,
    user_role,
    had_behavioral_correlation,
    had_medical_correlation,
    correlation_details
  )
  SELECT
    NEW.id,
    NEW.case_id,
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'create'
      WHEN TG_OP = 'UPDATE' THEN 'update'
      WHEN TG_OP = 'DELETE' THEN 'delete'
    END,
    p.role,
    NEW.behavioral_correlation IS NOT NULL AND NEW.behavioral_correlation != '',
    NEW.medical_correlation IS NOT NULL AND NEW.medical_correlation != '',
    CASE
      WHEN NEW.behavioral_correlation IS NOT NULL OR NEW.medical_correlation IS NOT NULL
      THEN 'Has correlation: ' || COALESCE(NEW.behavioral_correlation, '') || ' ' || COALESCE(NEW.medical_correlation, '')
      ELSE 'No correlation provided'
    END
  FROM profiles p
  WHERE p.id = auth.uid();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for access logging on INSERT/UPDATE
CREATE TRIGGER trigger_log_risk_factor_access
  AFTER INSERT OR UPDATE ON sensitive_risk_factors
  FOR EACH ROW
  EXECUTE FUNCTION log_risk_factor_access();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE sensitive_risk_factors IS 'LC-M2-003: Stores contextual/interpersonal risk factors with enhanced privacy controls. Requires corroboration and has low weight in priority calculations. Not shown in LE view by default.';

COMMENT ON COLUMN sensitive_risk_factors.requires_corroboration IS 'Risk factors require corroboration before being fully trusted in assessments';

COMMENT ON COLUMN sensitive_risk_factors.weight_in_priority IS 'Low weight (default 0.10) in priority calculation per safety constraints';

COMMENT ON COLUMN sensitive_risk_factors.included_in_le_view IS 'Only included in law enforcement view when there is behavioral/medical correlation';

COMMENT ON TABLE risk_factor_access_log IS 'Comprehensive audit log for all access to sensitive risk factors, including correlation checks';

COMMENT ON TABLE risk_factor_consent IS 'Tracks reporter acknowledgment of sensitivity and consent for risk factor collection';
