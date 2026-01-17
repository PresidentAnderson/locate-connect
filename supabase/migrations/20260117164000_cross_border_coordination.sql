-- Cross-Border Coordination Hub
-- LC-FEAT-035: Specialized tools for managing cases that cross provincial or international borders

-- ============================================================================
-- International Agencies
-- ============================================================================

CREATE TABLE international_agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_local TEXT, -- Name in local language
  country TEXT NOT NULL,
  region TEXT,
  agency_type TEXT NOT NULL CHECK (agency_type IN (
    'police_department', 'state_police', 'federal_agency', 'border_services',
    'coast_guard', 'interpol', 'other'
  )),
  
  -- Contact Information
  primary_contact TEXT,
  email TEXT,
  phone TEXT,
  emergency_phone TEXT,
  fax TEXT,
  address TEXT,
  website TEXT,
  portal_url TEXT, -- Data exchange portal URL
  
  -- Capabilities
  accepts_cross_border_cases BOOLEAN DEFAULT false,
  provides_real_time_alerts BOOLEAN DEFAULT false,
  shares_intelligence BOOLEAN DEFAULT false,
  has_secure_data_link BOOLEAN DEFAULT false,
  supports_video_conference BOOLEAN DEFAULT false,
  can_issue_alerts BOOLEAN DEFAULT false,
  has_translation_services BOOLEAN DEFAULT false,
  
  -- Metadata
  timezone TEXT NOT NULL,
  primary_language TEXT NOT NULL DEFAULT 'en',
  secondary_languages TEXT[] DEFAULT '{}',
  data_exchange_agreement_id UUID,
  is_active BOOLEAN DEFAULT true,
  last_contact_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_international_agencies_country ON international_agencies(country);
CREATE INDEX idx_international_agencies_type ON international_agencies(agency_type);
CREATE INDEX idx_international_agencies_active ON international_agencies(is_active);

-- ============================================================================
-- Cross-Border Cases
-- ============================================================================

CREATE TABLE cross_border_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  lead_jurisdiction_id UUID REFERENCES jurisdictions(id),
  coordinator_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'resolved', 'transferred', 'closed'
  )),
  cross_border_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cross_border_cases_primary ON cross_border_cases(primary_case_id);
CREATE INDEX idx_cross_border_cases_status ON cross_border_cases(status);
CREATE INDEX idx_cross_border_cases_coordinator ON cross_border_cases(coordinator_id);

-- ============================================================================
-- Linked Cases (Multi-jurisdiction case linking)
-- ============================================================================

CREATE TABLE linked_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cross_border_case_id UUID NOT NULL REFERENCES cross_border_cases(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id),
  external_case_number TEXT,
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  agency_id UUID REFERENCES international_agencies(id),
  link_type TEXT NOT NULL CHECK (link_type IN (
    'related', 'duplicate', 'shared_subject', 'shared_location'
  )),
  link_confidence TEXT NOT NULL CHECK (link_confidence IN (
    'confirmed', 'probable', 'possible'
  )),
  link_notes TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  linked_by UUID REFERENCES profiles(id),
  
  UNIQUE(cross_border_case_id, case_id)
);

CREATE INDEX idx_linked_cases_cross_border ON linked_cases(cross_border_case_id);
CREATE INDEX idx_linked_cases_case ON linked_cases(case_id);
CREATE INDEX idx_linked_cases_jurisdiction ON linked_cases(jurisdiction_id);

-- ============================================================================
-- Jurisdiction Involvement
-- ============================================================================

CREATE TABLE jurisdiction_involvement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cross_border_case_id UUID NOT NULL REFERENCES cross_border_cases(id) ON DELETE CASCADE,
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  jurisdiction_name TEXT NOT NULL,
  country TEXT NOT NULL,
  province TEXT,
  role TEXT NOT NULL CHECK (role IN (
    'primary', 'secondary', 'supporting', 'observing'
  )),
  agency_id UUID REFERENCES international_agencies(id),
  contact_person_id UUID REFERENCES profiles(id),
  involved_since TIMESTAMPTZ DEFAULT NOW(),
  involvement_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jurisdiction_involvement_case ON jurisdiction_involvement(cross_border_case_id);
CREATE INDEX idx_jurisdiction_involvement_jurisdiction ON jurisdiction_involvement(jurisdiction_id);

-- ============================================================================
-- Cross-Border Alerts
-- ============================================================================

CREATE TABLE cross_border_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'amber_alert', 'silver_alert', 'missing_person', 'be_on_lookout', 'critical'
  )),
  title TEXT NOT NULL,
  title_translations JSONB DEFAULT '{}', -- {lang_code: translated_title}
  description TEXT NOT NULL,
  description_translations JSONB DEFAULT '{}',
  urgency_level TEXT NOT NULL CHECK (urgency_level IN (
    'critical', 'high', 'medium', 'low'
  )),
  target_jurisdictions UUID[] DEFAULT '{}', -- Jurisdiction IDs
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'active', 'expired', 'cancelled'
  )),
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cross_border_alerts_case ON cross_border_alerts(case_id);
CREATE INDEX idx_cross_border_alerts_status ON cross_border_alerts(status);
CREATE INDEX idx_cross_border_alerts_urgency ON cross_border_alerts(urgency_level);

-- ============================================================================
-- Alert Distribution Records
-- ============================================================================

CREATE TABLE alert_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES cross_border_alerts(id) ON DELETE CASCADE,
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  agency_id UUID REFERENCES international_agencies(id),
  distributed_at TIMESTAMPTZ DEFAULT NOW(),
  distribution_method TEXT CHECK (distribution_method IN (
    'email', 'portal', 'api', 'fax', 'manual'
  )),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),
  response_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alert_distributions_alert ON alert_distributions(alert_id);
CREATE INDEX idx_alert_distributions_agency ON alert_distributions(agency_id);

-- ============================================================================
-- Jurisdiction Handoffs
-- ============================================================================

CREATE TABLE jurisdiction_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  from_jurisdiction_id UUID REFERENCES jurisdictions(id),
  to_jurisdiction_id UUID REFERENCES jurisdictions(id),
  from_agency_id UUID REFERENCES international_agencies(id),
  to_agency_id UUID REFERENCES international_agencies(id),
  handoff_type TEXT NOT NULL CHECK (handoff_type IN (
    'transfer', 'collaboration', 'information_sharing'
  )),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'rejected', 'completed', 'cancelled'
  )),
  
  -- Transfer Package
  transfer_case_data BOOLEAN DEFAULT true,
  transfer_evidence BOOLEAN DEFAULT false,
  transfer_witness_statements BOOLEAN DEFAULT false,
  transfer_forensic_reports BOOLEAN DEFAULT false,
  transfer_timeline_data BOOLEAN DEFAULT true,
  transfer_contact_info BOOLEAN DEFAULT true,
  additional_documents UUID[] DEFAULT '{}',
  special_instructions TEXT,
  
  requested_by UUID REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_by UUID REFERENCES profiles(id),
  responded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jurisdiction_handoffs_case ON jurisdiction_handoffs(case_id);
CREATE INDEX idx_jurisdiction_handoffs_status ON jurisdiction_handoffs(status);
CREATE INDEX idx_jurisdiction_handoffs_from ON jurisdiction_handoffs(from_jurisdiction_id);
CREATE INDEX idx_jurisdiction_handoffs_to ON jurisdiction_handoffs(to_jurisdiction_id);

-- ============================================================================
-- Data Sharing Agreements
-- ============================================================================

CREATE TABLE data_sharing_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'bilateral', 'multilateral', 'treaty', 'memorandum'
  )),
  participating_jurisdictions UUID[] DEFAULT '{}',
  participating_agencies UUID[] DEFAULT '{}',
  effective_date DATE NOT NULL,
  expiration_date DATE,
  auto_renew BOOLEAN DEFAULT false,
  
  -- Scope
  allowed_data_types TEXT[] DEFAULT '{}',
  allowed_purposes TEXT[] DEFAULT '{}',
  geographic_scope TEXT,
  restrictions TEXT[] DEFAULT '{}',
  
  -- Data Protection Requirements
  encryption_required BOOLEAN DEFAULT true,
  minimum_encryption_standard TEXT,
  data_retention_days INTEGER DEFAULT 365,
  deletion_required BOOLEAN DEFAULT true,
  audit_trail_required BOOLEAN DEFAULT true,
  consent_required BOOLEAN DEFAULT false,
  anonymization_required BOOLEAN DEFAULT false,
  transfer_mechanism TEXT CHECK (transfer_mechanism IN (
    'api', 'secure_portal', 'encrypted_email', 'physical_media'
  )),
  
  compliance_requirements TEXT[] DEFAULT '{}',
  document_url TEXT,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_data_sharing_agreements_active ON data_sharing_agreements(is_active);
CREATE INDEX idx_data_sharing_agreements_type ON data_sharing_agreements(type);

-- Add reference back to agencies
ALTER TABLE international_agencies
  ADD CONSTRAINT fk_agency_agreement
  FOREIGN KEY (data_exchange_agreement_id)
  REFERENCES data_sharing_agreements(id);

-- ============================================================================
-- Compliance Records
-- ============================================================================

CREATE TABLE compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  agreement_id UUID REFERENCES data_sharing_agreements(id),
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  compliance_type TEXT NOT NULL CHECK (compliance_type IN (
    'data_sharing', 'privacy_law', 'retention_policy', 'cross_border_transfer'
  )),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'compliant', 'pending_review', 'non_compliant', 'requires_action'
  )),
  check_date TIMESTAMPTZ DEFAULT NOW(),
  checked_by UUID REFERENCES profiles(id),
  findings TEXT,
  issues JSONB DEFAULT '[]', -- Array of ComplianceIssue objects
  remediation_plan JSONB, -- RemediationPlan object
  next_review_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_compliance_records_case ON compliance_records(case_id);
CREATE INDEX idx_compliance_records_agreement ON compliance_records(agreement_id);
CREATE INDEX idx_compliance_records_status ON compliance_records(status);
CREATE INDEX idx_compliance_records_next_review ON compliance_records(next_review_date);

-- ============================================================================
-- Cross-Border Audit Trail
-- ============================================================================

CREATE TABLE cross_border_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'data_shared', 'alert_distributed', 'handoff_requested', 'handoff_completed',
    'compliance_check', 'agreement_accessed', 'case_linked', 'case_unlinked'
  )),
  from_jurisdiction_id UUID REFERENCES jurisdictions(id),
  to_jurisdiction_id UUID REFERENCES jurisdictions(id),
  agency_id UUID REFERENCES international_agencies(id),
  user_id UUID REFERENCES profiles(id),
  user_role TEXT,
  data_shared TEXT[] DEFAULT '{}',
  agreement_id UUID REFERENCES data_sharing_agreements(id),
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cross_border_audit_case ON cross_border_audit_logs(case_id);
CREATE INDEX idx_cross_border_audit_user ON cross_border_audit_logs(user_id);
CREATE INDEX idx_cross_border_audit_timestamp ON cross_border_audit_logs(timestamp);
CREATE INDEX idx_cross_border_audit_action ON cross_border_audit_logs(action_type);

-- ============================================================================
-- Triggers for updated_at timestamps
-- ============================================================================

CREATE TRIGGER update_international_agencies_updated_at
  BEFORE UPDATE ON international_agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cross_border_cases_updated_at
  BEFORE UPDATE ON cross_border_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jurisdiction_involvement_updated_at
  BEFORE UPDATE ON jurisdiction_involvement
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cross_border_alerts_updated_at
  BEFORE UPDATE ON cross_border_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_distributions_updated_at
  BEFORE UPDATE ON alert_distributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jurisdiction_handoffs_updated_at
  BEFORE UPDATE ON jurisdiction_handoffs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sharing_agreements_updated_at
  BEFORE UPDATE ON data_sharing_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_records_updated_at
  BEFORE UPDATE ON compliance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed Data: Partner Agencies
-- ============================================================================

-- US Federal Agencies
INSERT INTO international_agencies (
  name, country, agency_type, email, phone, address, timezone, primary_language,
  accepts_cross_border_cases, provides_real_time_alerts, shares_intelligence,
  has_secure_data_link, can_issue_alerts
) VALUES
  ('Federal Bureau of Investigation (FBI)', 'United States', 'federal_agency',
   'tips.fbi.gov', '1-800-CALL-FBI', '935 Pennsylvania Avenue NW, Washington, DC 20535',
   'America/New_York', 'en', true, true, true, true, true),
  
  ('US Marshals Service', 'United States', 'federal_agency',
   'us.marshals@usdoj.gov', '202-307-9100', 'Washington, DC 20530',
   'America/New_York', 'en', true, false, true, false, false);

-- Canadian Border Services
INSERT INTO international_agencies (
  name, name_local, country, agency_type, email, phone, website, timezone,
  primary_language, secondary_languages, accepts_cross_border_cases,
  provides_real_time_alerts, has_secure_data_link
) VALUES
  ('Canada Border Services Agency', 'Agence des services frontaliers du Canada',
   'Canada', 'border_services', 'cbsa-asfc.gc.ca', '1-800-461-9999',
   'https://www.cbsa-asfc.gc.ca/', 'America/Toronto', 'en', ARRAY['fr'],
   true, true, true);

-- US Customs and Border Protection
INSERT INTO international_agencies (
  name, country, agency_type, email, phone, website, timezone, primary_language,
  accepts_cross_border_cases, provides_real_time_alerts, has_secure_data_link
) VALUES
  ('US Customs and Border Protection', 'United States', 'border_services',
   'CBP.gov', '1-877-227-5511', 'https://www.cbp.gov/',
   'America/New_York', 'en', true, true, true);

-- Interpol
INSERT INTO international_agencies (
  name, country, region, agency_type, email, phone, address, website, timezone,
  primary_language, secondary_languages, accepts_cross_border_cases,
  provides_real_time_alerts, shares_intelligence, has_secure_data_link
) VALUES
  ('INTERPOL - International Criminal Police Organization', 'France', 'Global',
   'interpol', 'contact@interpol.int', '+33 4 72 44 70 00',
   '200 Quai Charles de Gaulle, 69006 Lyon, France', 'https://www.interpol.int/',
   'Europe/Paris', 'en', ARRAY['fr', 'es', 'ar'], true, true, true, true);

-- US Coast Guard
INSERT INTO international_agencies (
  name, country, agency_type, phone, website, timezone, primary_language,
  accepts_cross_border_cases, provides_real_time_alerts
) VALUES
  ('United States Coast Guard', 'United States', 'coast_guard',
   '1-877-663-8724', 'https://www.uscg.mil/',
   'America/New_York', 'en', true, true);

-- Canadian Coast Guard
INSERT INTO international_agencies (
  name, name_local, country, agency_type, phone, website, timezone,
  primary_language, secondary_languages, accepts_cross_border_cases
) VALUES
  ('Canadian Coast Guard', 'Garde côtière canadienne', 'Canada', 'coast_guard',
   '1-800-267-6687', 'https://www.ccg-gcc.gc.ca/',
   'America/Toronto', 'en', ARRAY['fr'], true);

-- ============================================================================
-- Sample Data Sharing Agreement
-- ============================================================================

INSERT INTO data_sharing_agreements (
  name, type, effective_date, geographic_scope,
  allowed_data_types, allowed_purposes,
  encryption_required, audit_trail_required,
  transfer_mechanism, is_active
) VALUES
  ('Canada-US Missing Persons Information Exchange', 'bilateral',
   '2020-01-01', 'Canada and United States',
   ARRAY['missing_person_data', 'case_details', 'photos', 'last_known_location'],
   ARRAY['locate_missing_persons', 'cross_border_investigations', 'amber_alerts'],
   true, true, 'api', true);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE international_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_border_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdiction_involvement ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_border_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdiction_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sharing_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_border_audit_logs ENABLE ROW LEVEL SECURITY;

-- Law enforcement and admins can view all data
CREATE POLICY "Law enforcement can view international agencies"
  ON international_agencies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Law enforcement can manage cross-border cases"
  ON cross_border_cases FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Law enforcement can view linked cases"
  ON linked_cases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Law enforcement can view jurisdiction involvement"
  ON jurisdiction_involvement FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Law enforcement can manage cross-border alerts"
  ON cross_border_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Law enforcement can view alert distributions"
  ON alert_distributions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Law enforcement can manage handoffs"
  ON jurisdiction_handoffs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Law enforcement can view agreements"
  ON data_sharing_agreements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Law enforcement can manage compliance"
  ON compliance_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Law enforcement can view audit logs"
  ON cross_border_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Grant necessary permissions
GRANT SELECT ON international_agencies TO authenticated;
GRANT ALL ON cross_border_cases TO authenticated;
GRANT SELECT ON linked_cases TO authenticated;
GRANT SELECT ON jurisdiction_involvement TO authenticated;
GRANT ALL ON cross_border_alerts TO authenticated;
GRANT SELECT ON alert_distributions TO authenticated;
GRANT ALL ON jurisdiction_handoffs TO authenticated;
GRANT SELECT ON data_sharing_agreements TO authenticated;
GRANT ALL ON compliance_records TO authenticated;
GRANT SELECT ON cross_border_audit_logs TO authenticated;
