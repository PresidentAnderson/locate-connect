-- LocateConnect Comprehensive Audit & Compliance System (LC-FEAT-037)
-- Migration: 004_audit_compliance_system.sql
-- Description: End-to-end audit logging and compliance monitoring for legal and regulatory requirements

-- =============================================================================
-- ENUMS FOR AUDIT & COMPLIANCE
-- =============================================================================

CREATE TYPE audit_action_type AS ENUM (
  'create', 'read', 'update', 'delete',
  'login', 'logout', 'failed_login',
  'export', 'import', 'search',
  'share', 'download', 'print',
  'consent_given', 'consent_withdrawn',
  'data_request', 'data_erasure', 'data_portability'
);

CREATE TYPE compliance_framework AS ENUM (
  'pipeda',           -- Personal Information Protection and Electronic Documents Act (Canada)
  'gdpr',             -- General Data Protection Regulation (EU)
  'ccpa',             -- California Consumer Privacy Act
  'phipa',            -- Personal Health Information Protection Act (Ontario)
  'pipa_ab',          -- Personal Information Protection Act (Alberta)
  'pipa_bc',          -- Personal Information Protection Act (British Columbia)
  'qc_private_sector' -- Quebec Private Sector Privacy Act
);

CREATE TYPE compliance_status AS ENUM (
  'compliant', 'non_compliant', 'partial', 'pending_review', 'not_applicable'
);

CREATE TYPE data_request_type AS ENUM (
  'access',           -- Right to access personal data
  'rectification',    -- Right to correct inaccurate data
  'erasure',          -- Right to be forgotten
  'portability',      -- Right to data portability
  'restriction',      -- Right to restrict processing
  'objection',        -- Right to object to processing
  'legal_hold',       -- Legal discovery/hold request
  'law_enforcement'   -- Law enforcement data request
);

CREATE TYPE data_request_status AS ENUM (
  'submitted', 'under_review', 'in_progress', 'completed', 'denied', 'partially_completed', 'cancelled'
);

CREATE TYPE retention_policy_status AS ENUM (
  'active', 'paused', 'completed', 'failed'
);

CREATE TYPE violation_severity AS ENUM (
  'critical', 'high', 'medium', 'low', 'info'
);

CREATE TYPE remediation_status AS ENUM (
  'open', 'in_progress', 'resolved', 'verified', 'closed', 'wont_fix'
);

-- =============================================================================
-- ENHANCED AUDIT LOGS TABLE
-- Comprehensive action logging with detailed metadata
-- =============================================================================

CREATE TABLE IF NOT EXISTS comprehensive_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor information
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id UUID,
  actor_email TEXT,
  actor_role user_role,
  actor_organization TEXT,
  impersonated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Action details
  action audit_action_type NOT NULL,
  action_description TEXT,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  resource_name TEXT,

  -- Change tracking
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],

  -- Request context
  ip_address INET,
  user_agent TEXT,
  request_method TEXT,
  request_path TEXT,
  request_query JSONB,
  response_status INTEGER,
  response_time_ms INTEGER,

  -- Geolocation (optional)
  geo_country TEXT,
  geo_region TEXT,
  geo_city TEXT,
  geo_coordinates POINT,

  -- Security context
  is_sensitive_data BOOLEAN DEFAULT FALSE,
  data_classification TEXT,
  compliance_relevant BOOLEAN DEFAULT FALSE,
  compliance_frameworks compliance_framework[],

  -- Retention
  retention_until TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- USER SESSION TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Session details
  session_token_hash TEXT NOT NULL,
  refresh_token_hash TEXT,

  -- Device/client info
  device_id TEXT,
  device_type TEXT,
  device_name TEXT,
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  os_version TEXT,

  -- Location
  ip_address INET,
  geo_country TEXT,
  geo_region TEXT,
  geo_city TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  login_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  logout_reason TEXT,

  -- Security
  is_suspicious BOOLEAN DEFAULT FALSE,
  suspicious_reason TEXT,
  mfa_used BOOLEAN DEFAULT FALSE,
  mfa_method TEXT,

  -- Session limits
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DATA ACCESS LOGS
-- Track who accessed what data and when
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID REFERENCES comprehensive_audit_logs(id) ON DELETE SET NULL,

  -- Accessor
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,

  -- What was accessed
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  resource_owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Access details
  access_type TEXT NOT NULL, -- 'view', 'list', 'search', 'export', 'api'
  fields_accessed TEXT[],
  query_parameters JSONB,

  -- Context
  access_reason TEXT,
  is_authorized BOOLEAN DEFAULT TRUE,
  authorization_rule TEXT,

  -- Privacy
  contains_pii BOOLEAN DEFAULT FALSE,
  pii_fields_accessed TEXT[],
  data_sensitivity_level TEXT,

  -- Request info
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- RECORD CHANGE HISTORY
-- Complete audit trail for all record modifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS record_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Record identification
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,

  -- Change details
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_by_email TEXT,

  -- Data snapshots
  old_data JSONB,
  new_data JSONB,

  -- Detailed changes (for updates)
  changes JSONB, -- Array of {field, old_value, new_value}

  -- Context
  change_reason TEXT,
  change_source TEXT, -- 'user', 'system', 'api', 'migration', 'bulk_operation'
  transaction_id TEXT,

  -- Version tracking
  version_number INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT TRUE,

  -- Compliance
  compliance_relevant BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- COMPLIANCE ASSESSMENTS
-- Track compliance status across different frameworks
-- =============================================================================

CREATE TABLE IF NOT EXISTS compliance_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Assessment details
  framework compliance_framework NOT NULL,
  assessment_date DATE NOT NULL,
  assessor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assessor_name TEXT,

  -- Results
  overall_status compliance_status NOT NULL,
  compliance_score DECIMAL(5,2), -- 0-100

  -- Details
  findings JSONB, -- Array of finding objects
  recommendations JSONB,
  action_items JSONB,

  -- Evidence
  evidence_documents JSONB, -- Array of document references

  -- Timestamps
  next_review_date DATE,
  expires_at DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- COMPLIANCE REQUIREMENTS
-- Define compliance requirements per framework
-- =============================================================================

CREATE TABLE IF NOT EXISTS compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  framework compliance_framework NOT NULL,
  requirement_code TEXT NOT NULL,
  requirement_name TEXT NOT NULL,
  description TEXT,

  -- Classification
  category TEXT,
  subcategory TEXT,

  -- Compliance details
  is_mandatory BOOLEAN DEFAULT TRUE,
  implementation_status compliance_status DEFAULT 'pending_review',
  implementation_notes TEXT,

  -- Evidence
  evidence_required TEXT[],
  evidence_provided JSONB,

  -- Control mapping
  control_reference TEXT,
  related_requirements TEXT[],

  -- Review
  last_reviewed_at TIMESTAMPTZ,
  last_reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  next_review_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(framework, requirement_code)
);

-- =============================================================================
-- DATA RETENTION POLICIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Policy identification
  name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Scope
  table_name TEXT NOT NULL,
  record_filter JSONB, -- Optional filter for specific records

  -- Retention rules
  retention_period_days INTEGER NOT NULL,
  retention_basis TEXT NOT NULL, -- Legal basis for retention

  -- Applicable frameworks
  applicable_frameworks compliance_framework[],

  -- Actions
  action_on_expiry TEXT NOT NULL, -- 'delete', 'archive', 'anonymize'
  archive_location TEXT,

  -- Status
  status retention_policy_status DEFAULT 'active',
  is_active BOOLEAN DEFAULT TRUE,

  -- Execution tracking
  last_executed_at TIMESTAMPTZ,
  next_execution_at TIMESTAMPTZ,
  records_processed_last_run INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DATA RETENTION EXECUTION LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS retention_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  policy_id UUID NOT NULL REFERENCES data_retention_policies(id) ON DELETE CASCADE,

  -- Execution details
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status retention_policy_status NOT NULL,

  -- Results
  records_evaluated INTEGER DEFAULT 0,
  records_retained INTEGER DEFAULT 0,
  records_deleted INTEGER DEFAULT 0,
  records_archived INTEGER DEFAULT 0,
  records_anonymized INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Details
  error_message TEXT,
  execution_log JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DATA SUBJECT REQUESTS (GDPR/PIPEDA Rights)
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request identification
  request_number TEXT UNIQUE,

  -- Requestor
  requestor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  requestor_email TEXT NOT NULL,
  requestor_name TEXT,
  requestor_phone TEXT,

  -- Identity verification
  identity_verified BOOLEAN DEFAULT FALSE,
  identity_verified_at TIMESTAMPTZ,
  identity_verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verification_method TEXT,
  verification_documents JSONB,

  -- Request details
  request_type data_request_type NOT NULL,
  request_description TEXT,
  specific_data_requested TEXT[],

  -- Applicable frameworks
  applicable_framework compliance_framework,

  -- Processing
  status data_request_status DEFAULT 'submitted',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  priority violation_severity DEFAULT 'medium',

  -- Timeline (GDPR requires response within 30 days)
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Response
  response_notes TEXT,
  data_provided JSONB,
  denial_reason TEXT,

  -- Audit
  processing_log JSONB, -- Array of processing steps

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DATA ERASURE RECORDS (Right to be Forgotten)
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_erasure_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  request_id UUID REFERENCES data_subject_requests(id) ON DELETE SET NULL,

  -- Subject
  subject_id UUID,
  subject_email TEXT,

  -- Erasure details
  erasure_type TEXT NOT NULL, -- 'full', 'partial', 'anonymization'

  -- What was erased
  tables_affected TEXT[],
  records_erased JSONB, -- {table: count}
  fields_anonymized JSONB,

  -- Exceptions
  data_retained JSONB, -- Data retained due to legal obligations
  retention_reason TEXT,

  -- Execution
  requested_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  executed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Verification
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verification_notes TEXT,

  -- Compliance
  compliance_certificate TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DATA PORTABILITY EXPORTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_portability_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  request_id UUID REFERENCES data_subject_requests(id) ON DELETE SET NULL,

  -- Subject
  subject_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Export details
  export_format TEXT NOT NULL, -- 'json', 'csv', 'xml'

  -- Content
  tables_included TEXT[],
  record_counts JSONB,
  total_records INTEGER,
  file_size_bytes BIGINT,

  -- File
  file_path TEXT,
  file_hash TEXT,
  encryption_key_hash TEXT,

  -- Access
  download_url TEXT,
  download_expires_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'downloaded', 'expired', 'failed'
  error_message TEXT,

  -- Timestamps
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  generated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- COMPLIANCE VIOLATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS compliance_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Violation details
  violation_code TEXT,
  title TEXT NOT NULL,
  description TEXT,

  -- Classification
  framework compliance_framework,
  requirement_id UUID REFERENCES compliance_requirements(id) ON DELETE SET NULL,
  severity violation_severity NOT NULL,

  -- Detection
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  detected_by TEXT, -- 'automated', 'manual_review', 'external_audit', 'user_report'
  detector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Affected resources
  affected_resource_type TEXT,
  affected_resource_id UUID,
  affected_users INTEGER,

  -- Evidence
  evidence JSONB,
  audit_log_ids UUID[],

  -- Status
  status remediation_status DEFAULT 'open',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolution_evidence JSONB,

  -- Verification
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Impact assessment
  potential_fine DECIMAL(12,2),
  actual_impact TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- REMEDIATION TASKS
-- =============================================================================

CREATE TABLE IF NOT EXISTS remediation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  violation_id UUID NOT NULL REFERENCES compliance_violations(id) ON DELETE CASCADE,

  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  priority violation_severity DEFAULT 'medium',

  -- Assignment
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Timeline
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Status
  status remediation_status DEFAULT 'open',

  -- Progress
  progress_notes TEXT,
  evidence_provided JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- AUDIT REPORTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Report identification
  report_number TEXT UNIQUE,
  report_type TEXT NOT NULL, -- 'compliance', 'access', 'security', 'activity', 'custom'
  title TEXT NOT NULL,

  -- Scope
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  frameworks compliance_framework[],

  -- Generation
  generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_parameters JSONB,

  -- Content
  summary TEXT,
  findings JSONB,
  statistics JSONB,
  recommendations JSONB,

  -- Export
  export_format TEXT, -- 'pdf', 'csv', 'json'
  file_path TEXT,
  file_size_bytes BIGINT,

  -- Distribution
  recipients TEXT[],
  sent_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'final', 'archived'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- LEGAL HOLDS
-- Prevent deletion of data under legal hold
-- =============================================================================

CREATE TABLE IF NOT EXISTS legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hold identification
  hold_name TEXT NOT NULL,
  hold_reference TEXT, -- Legal case reference

  -- Scope
  matter_description TEXT,
  custodians UUID[], -- User IDs under hold

  -- Data scope
  tables_in_scope TEXT[],
  record_filters JSONB,
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'active', -- 'active', 'released', 'expired'

  -- Timeline
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  release_reason TEXT,

  -- Management
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  legal_contact TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CONSENT RECORDS
-- =============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Consent details
  consent_type TEXT NOT NULL, -- 'data_processing', 'marketing', 'analytics', 'third_party_sharing'
  consent_version TEXT NOT NULL,

  -- Status
  is_granted BOOLEAN NOT NULL,

  -- When and how
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,

  -- Context
  ip_address INET,
  user_agent TEXT,
  consent_source TEXT, -- 'signup', 'settings', 'email', 'api'

  -- Legal text
  consent_text TEXT,
  privacy_policy_version TEXT,

  -- Withdrawal
  withdrawal_reason TEXT,

  -- Expiry
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Comprehensive audit logs indexes
CREATE INDEX idx_comprehensive_audit_logs_user ON comprehensive_audit_logs(user_id);
CREATE INDEX idx_comprehensive_audit_logs_session ON comprehensive_audit_logs(session_id);
CREATE INDEX idx_comprehensive_audit_logs_action ON comprehensive_audit_logs(action);
CREATE INDEX idx_comprehensive_audit_logs_resource ON comprehensive_audit_logs(resource_type, resource_id);
CREATE INDEX idx_comprehensive_audit_logs_created ON comprehensive_audit_logs(created_at DESC);
CREATE INDEX idx_comprehensive_audit_logs_compliance ON comprehensive_audit_logs(compliance_relevant) WHERE compliance_relevant = TRUE;
CREATE INDEX idx_comprehensive_audit_logs_ip ON comprehensive_audit_logs(ip_address);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_login ON user_sessions(login_at DESC);
CREATE INDEX idx_user_sessions_ip ON user_sessions(ip_address);

-- Data access logs indexes
CREATE INDEX idx_data_access_logs_user ON data_access_logs(user_id);
CREATE INDEX idx_data_access_logs_resource ON data_access_logs(resource_type, resource_id);
CREATE INDEX idx_data_access_logs_created ON data_access_logs(created_at DESC);
CREATE INDEX idx_data_access_logs_pii ON data_access_logs(contains_pii) WHERE contains_pii = TRUE;

-- Record change history indexes
CREATE INDEX idx_record_change_history_table ON record_change_history(table_name);
CREATE INDEX idx_record_change_history_record ON record_change_history(table_name, record_id);
CREATE INDEX idx_record_change_history_user ON record_change_history(changed_by);
CREATE INDEX idx_record_change_history_created ON record_change_history(created_at DESC);

-- Compliance indexes
CREATE INDEX idx_compliance_assessments_framework ON compliance_assessments(framework);
CREATE INDEX idx_compliance_requirements_framework ON compliance_requirements(framework);
CREATE INDEX idx_compliance_violations_severity ON compliance_violations(severity);
CREATE INDEX idx_compliance_violations_status ON compliance_violations(status);

-- Data subject requests indexes
CREATE INDEX idx_data_subject_requests_email ON data_subject_requests(requestor_email);
CREATE INDEX idx_data_subject_requests_status ON data_subject_requests(status);
CREATE INDEX idx_data_subject_requests_type ON data_subject_requests(request_type);
CREATE INDEX idx_data_subject_requests_due ON data_subject_requests(due_date) WHERE status NOT IN ('completed', 'denied', 'cancelled');

-- Legal holds indexes
CREATE INDEX idx_legal_holds_active ON legal_holds(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_legal_holds_custodians ON legal_holds USING GIN(custodians);

-- Consent records indexes
CREATE INDEX idx_consent_records_user ON consent_records(user_id);
CREATE INDEX idx_consent_records_type ON consent_records(consent_type);
CREATE INDEX idx_consent_records_granted ON consent_records(user_id, consent_type) WHERE is_granted = TRUE;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE comprehensive_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_erasure_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_portability_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- Audit logs - Admin/Compliance only
CREATE POLICY "Admins can view all audit logs" ON comprehensive_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions" ON user_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Data access logs - Admin only
CREATE POLICY "Admins can view data access logs" ON data_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Record change history - Admin only
CREATE POLICY "Admins can view record change history" ON record_change_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Compliance tables - Admin only
CREATE POLICY "Admins can manage compliance assessments" ON compliance_assessments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Admins can manage compliance requirements" ON compliance_requirements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Admins can manage retention policies" ON data_retention_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Data subject requests - Users can view/create their own, admins can manage all
CREATE POLICY "Users can view own data requests" ON data_subject_requests
  FOR SELECT USING (requestor_id = auth.uid());

CREATE POLICY "Users can create data requests" ON data_subject_requests
  FOR INSERT WITH CHECK (requestor_id = auth.uid());

CREATE POLICY "Admins can manage all data requests" ON data_subject_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Data portability exports - Users can view their own
CREATE POLICY "Users can view own exports" ON data_portability_exports
  FOR SELECT USING (subject_id = auth.uid());

CREATE POLICY "Admins can manage exports" ON data_portability_exports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Compliance violations - Admin only
CREATE POLICY "Admins can manage violations" ON compliance_violations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Remediation tasks - Admin only
CREATE POLICY "Admins can manage remediation tasks" ON remediation_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Audit reports - Admin only
CREATE POLICY "Admins can manage audit reports" ON audit_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Legal holds - Admin only
CREATE POLICY "Admins can manage legal holds" ON legal_holds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Consent records - Users can view/manage their own
CREATE POLICY "Users can view own consent records" ON consent_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own consent records" ON consent_records
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all consent records" ON consent_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Generate request number
CREATE OR REPLACE FUNCTION generate_data_request_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 5) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM data_subject_requests
  WHERE request_number LIKE 'DSR-' || year_part || '-%';

  NEW.request_number := 'DSR-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate audit report number
CREATE OR REPLACE FUNCTION generate_audit_report_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(report_number FROM 5) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM audit_reports
  WHERE report_number LIKE 'AUD-' || year_part || '-%';

  NEW.report_number := 'AUD-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive audit log entry
CREATE OR REPLACE FUNCTION create_comprehensive_audit_log(
  p_user_id UUID,
  p_session_id UUID,
  p_action audit_action_type,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_is_sensitive BOOLEAN DEFAULT FALSE,
  p_compliance_relevant BOOLEAN DEFAULT FALSE,
  p_frameworks compliance_framework[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_profile profiles%ROWTYPE;
  v_changed_fields TEXT[];
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  -- Calculate changed fields for updates
  IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
    SELECT ARRAY_AGG(key)
    INTO v_changed_fields
    FROM (
      SELECT key FROM jsonb_each(p_new_values)
      EXCEPT
      SELECT key FROM jsonb_each(p_old_values) WHERE p_old_values->key = p_new_values->key
    ) changed;
  END IF;

  INSERT INTO comprehensive_audit_logs (
    user_id, session_id, actor_email, actor_role, actor_organization,
    action, resource_type, resource_id,
    old_values, new_values, changed_fields,
    ip_address, user_agent,
    is_sensitive_data, compliance_relevant, compliance_frameworks
  ) VALUES (
    p_user_id, p_session_id, v_profile.email, v_profile.role, v_profile.organization,
    p_action, p_resource_type, p_resource_id,
    p_old_values, p_new_values, v_changed_fields,
    p_ip_address, p_user_agent,
    p_is_sensitive, p_compliance_relevant, p_frameworks
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log data access
CREATE OR REPLACE FUNCTION log_data_access(
  p_user_id UUID,
  p_session_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_access_type TEXT,
  p_fields_accessed TEXT[] DEFAULT NULL,
  p_contains_pii BOOLEAN DEFAULT FALSE,
  p_pii_fields TEXT[] DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_audit_id UUID;
  v_resource_owner UUID;
BEGIN
  -- Get resource owner if applicable
  IF p_resource_type = 'cases' THEN
    SELECT reporter_id INTO v_resource_owner FROM cases WHERE id = p_resource_id;
  ELSIF p_resource_type = 'profiles' THEN
    v_resource_owner := p_resource_id;
  END IF;

  -- Create audit log entry
  v_audit_id := create_comprehensive_audit_log(
    p_user_id, p_session_id, 'read'::audit_action_type,
    p_resource_type, p_resource_id,
    NULL, NULL,
    p_ip_address, p_user_agent,
    p_contains_pii, p_contains_pii, NULL
  );

  -- Create data access log entry
  INSERT INTO data_access_logs (
    audit_log_id, user_id, session_id,
    resource_type, resource_id, resource_owner_id,
    access_type, fields_accessed,
    contains_pii, pii_fields_accessed,
    ip_address, user_agent
  ) VALUES (
    v_audit_id, p_user_id, p_session_id,
    p_resource_type, p_resource_id, v_resource_owner,
    p_access_type, p_fields_accessed,
    p_contains_pii, p_pii_fields,
    p_ip_address, p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track record changes (enhanced trigger function)
CREATE OR REPLACE FUNCTION track_record_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB;
  v_old_data JSONB;
  v_new_data JSONB;
  v_version INTEGER;
BEGIN
  -- Convert row data to JSONB
  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSE -- UPDATE
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);

    -- Calculate specific changes
    SELECT jsonb_agg(
      jsonb_build_object(
        'field', key,
        'old_value', v_old_data->key,
        'new_value', v_new_data->key
      )
    )
    INTO v_changes
    FROM (
      SELECT key FROM jsonb_each(v_new_data)
      WHERE v_old_data->key IS DISTINCT FROM v_new_data->key
    ) changed_fields;
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_version
  FROM record_change_history
  WHERE table_name = TG_TABLE_NAME
  AND record_id = COALESCE(NEW.id, OLD.id);

  -- Mark previous version as not current
  UPDATE record_change_history
  SET is_current = FALSE
  WHERE table_name = TG_TABLE_NAME
  AND record_id = COALESCE(NEW.id, OLD.id)
  AND is_current = TRUE;

  -- Insert change record
  INSERT INTO record_change_history (
    table_name, record_id, operation,
    changed_by, changed_by_email,
    old_data, new_data, changes,
    change_source, version_number, is_current
  ) VALUES (
    TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP,
    auth.uid(),
    (SELECT email FROM profiles WHERE id = auth.uid()),
    v_old_data, v_new_data, v_changes,
    'user', v_version, TRUE
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if record is under legal hold
CREATE OR REPLACE FUNCTION is_under_legal_hold(
  p_table_name TEXT,
  p_record_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_held BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM legal_holds
    WHERE is_active = TRUE
    AND (
      p_table_name = ANY(tables_in_scope)
      OR (p_user_id IS NOT NULL AND p_user_id = ANY(custodians))
    )
  ) INTO v_is_held;

  RETURN v_is_held;
END;
$$ LANGUAGE plpgsql;

-- Prevent deletion of records under legal hold
CREATE OR REPLACE FUNCTION prevent_deletion_under_legal_hold()
RETURNS TRIGGER AS $$
BEGIN
  IF is_under_legal_hold(TG_TABLE_NAME, OLD.id, NULL) THEN
    RAISE EXCEPTION 'Cannot delete record: under legal hold';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Check PIPEDA compliance for a record
CREATE OR REPLACE FUNCTION check_pipeda_compliance(p_resource_type TEXT, p_resource_id UUID)
RETURNS TABLE (
  requirement_code TEXT,
  requirement_name TEXT,
  status compliance_status,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.requirement_code,
    cr.requirement_name,
    cr.implementation_status,
    cr.implementation_notes
  FROM compliance_requirements cr
  WHERE cr.framework = 'pipeda'
  ORDER BY cr.requirement_code;
END;
$$ LANGUAGE plpgsql;

-- Calculate retention date for a record
CREATE OR REPLACE FUNCTION calculate_retention_date(
  p_table_name TEXT,
  p_created_at TIMESTAMPTZ
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_retention_days INTEGER;
BEGIN
  SELECT retention_period_days
  INTO v_retention_days
  FROM data_retention_policies
  WHERE table_name = p_table_name
  AND is_active = TRUE
  LIMIT 1;

  IF v_retention_days IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN p_created_at + (v_retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Data subject request number generation
CREATE TRIGGER generate_data_request_number_trigger
  BEFORE INSERT ON data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION generate_data_request_number();

-- Audit report number generation
CREATE TRIGGER generate_audit_report_number_trigger
  BEFORE INSERT ON audit_reports
  FOR EACH ROW EXECUTE FUNCTION generate_audit_report_number();

-- Track changes on critical tables
CREATE TRIGGER track_cases_changes
  AFTER INSERT OR UPDATE OR DELETE ON cases
  FOR EACH ROW EXECUTE FUNCTION track_record_changes();

CREATE TRIGGER track_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION track_record_changes();

CREATE TRIGGER track_leads_changes
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION track_record_changes();

-- Prevent deletion under legal hold
CREATE TRIGGER prevent_cases_deletion_legal_hold
  BEFORE DELETE ON cases
  FOR EACH ROW EXECUTE FUNCTION prevent_deletion_under_legal_hold();

CREATE TRIGGER prevent_leads_deletion_legal_hold
  BEFORE DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION prevent_deletion_under_legal_hold();

-- Update timestamps
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_assessments_updated_at
  BEFORE UPDATE ON compliance_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_requirements_updated_at
  BEFORE UPDATE ON compliance_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_retention_policies_updated_at
  BEFORE UPDATE ON data_retention_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_subject_requests_updated_at
  BEFORE UPDATE ON data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_violations_updated_at
  BEFORE UPDATE ON compliance_violations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_remediation_tasks_updated_at
  BEFORE UPDATE ON remediation_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_reports_updated_at
  BEFORE UPDATE ON audit_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_holds_updated_at
  BEFORE UPDATE ON legal_holds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED DATA: Default Compliance Requirements (PIPEDA)
-- =============================================================================

INSERT INTO compliance_requirements (framework, requirement_code, requirement_name, description, category, is_mandatory) VALUES
  ('pipeda', 'PIPEDA-1', 'Accountability', 'Organization is responsible for personal information under its control', 'Principles', TRUE),
  ('pipeda', 'PIPEDA-2', 'Identifying Purposes', 'Purposes for which personal information is collected must be identified', 'Principles', TRUE),
  ('pipeda', 'PIPEDA-3', 'Consent', 'Knowledge and consent required for collection, use, or disclosure', 'Principles', TRUE),
  ('pipeda', 'PIPEDA-4', 'Limiting Collection', 'Collection limited to purposes identified', 'Principles', TRUE),
  ('pipeda', 'PIPEDA-5', 'Limiting Use, Disclosure, and Retention', 'Personal information shall not be used or disclosed for purposes other than those for which it was collected', 'Principles', TRUE),
  ('pipeda', 'PIPEDA-6', 'Accuracy', 'Personal information shall be as accurate, complete, and up-to-date as necessary', 'Principles', TRUE),
  ('pipeda', 'PIPEDA-7', 'Safeguards', 'Personal information shall be protected by appropriate security safeguards', 'Principles', TRUE),
  ('pipeda', 'PIPEDA-8', 'Openness', 'Organization shall make information about its policies and practices readily available', 'Principles', TRUE),
  ('pipeda', 'PIPEDA-9', 'Individual Access', 'Upon request, an individual shall be informed of the existence, use, and disclosure of their personal information', 'Principles', TRUE),
  ('pipeda', 'PIPEDA-10', 'Challenging Compliance', 'An individual shall be able to address a challenge concerning compliance', 'Principles', TRUE);

-- GDPR Requirements
INSERT INTO compliance_requirements (framework, requirement_code, requirement_name, description, category, is_mandatory) VALUES
  ('gdpr', 'GDPR-5.1a', 'Lawfulness, Fairness, Transparency', 'Personal data shall be processed lawfully, fairly and in a transparent manner', 'Principles', TRUE),
  ('gdpr', 'GDPR-5.1b', 'Purpose Limitation', 'Personal data shall be collected for specified, explicit and legitimate purposes', 'Principles', TRUE),
  ('gdpr', 'GDPR-5.1c', 'Data Minimization', 'Personal data shall be adequate, relevant and limited to what is necessary', 'Principles', TRUE),
  ('gdpr', 'GDPR-5.1d', 'Accuracy', 'Personal data shall be accurate and kept up to date', 'Principles', TRUE),
  ('gdpr', 'GDPR-5.1e', 'Storage Limitation', 'Personal data shall be kept for no longer than necessary', 'Principles', TRUE),
  ('gdpr', 'GDPR-5.1f', 'Integrity and Confidentiality', 'Personal data shall be processed with appropriate security', 'Principles', TRUE),
  ('gdpr', 'GDPR-15', 'Right of Access', 'Data subject has the right to obtain confirmation of processing', 'Data Subject Rights', TRUE),
  ('gdpr', 'GDPR-16', 'Right to Rectification', 'Data subject has the right to obtain rectification of inaccurate data', 'Data Subject Rights', TRUE),
  ('gdpr', 'GDPR-17', 'Right to Erasure', 'Data subject has the right to obtain erasure of personal data', 'Data Subject Rights', TRUE),
  ('gdpr', 'GDPR-20', 'Right to Data Portability', 'Data subject has the right to receive their data in a portable format', 'Data Subject Rights', TRUE);

-- =============================================================================
-- SEED DATA: Default Retention Policies
-- =============================================================================

INSERT INTO data_retention_policies (name, description, table_name, retention_period_days, retention_basis, applicable_frameworks, action_on_expiry) VALUES
  ('Audit Logs Retention', 'Retain audit logs for 7 years for compliance', 'comprehensive_audit_logs', 2555, 'Legal compliance requirement', ARRAY['pipeda', 'gdpr']::compliance_framework[], 'archive'),
  ('Session Data Retention', 'Retain session data for 2 years', 'user_sessions', 730, 'Security and fraud prevention', ARRAY['pipeda', 'gdpr']::compliance_framework[], 'delete'),
  ('Case Data Retention', 'Retain case data for 10 years', 'cases', 3650, 'Legal requirement for missing persons records', ARRAY['pipeda']::compliance_framework[], 'archive'),
  ('Data Access Logs Retention', 'Retain data access logs for 3 years', 'data_access_logs', 1095, 'Security audit requirements', ARRAY['pipeda', 'gdpr']::compliance_framework[], 'archive');

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
