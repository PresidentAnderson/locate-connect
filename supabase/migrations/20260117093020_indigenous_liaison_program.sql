-- LocateConnect Database Schema
-- Migration 002: Indigenous Community Liaison Program (LC-FEAT-042)

CREATE TYPE indigenous_language AS ENUM (
  'cree', 'ojibwe', 'oji_cree', 'inuktitut', 'inuinnaqtun', 'dene', 'mohawk',
  'mi_kmaq', 'blackfoot', 'salish', 'haida', 'tlingit', 'kwakwala',
  'nuu_chah_nulth', 'gitxsan', 'carrier', 'chilcotin', 'shuswap', 'other'
);

CREATE TYPE indigenous_org_type AS ENUM (
  'national_organization', 'provincial_territorial_organization', 'tribal_council',
  'band_council', 'metis_organization', 'inuit_organization',
  'urban_indigenous_organization', 'womens_organization', 'youth_organization',
  'health_services', 'legal_services', 'victim_services', 'friendship_centre', 'other'
);

CREATE TYPE data_governance_consent AS ENUM (
  'full_consent', 'limited_sharing', 'community_only', 'investigation_only', 'restricted', 'withdrawn'
);

CREATE TYPE mmiwg_classification AS ENUM (
  'missing', 'murdered', 'suspicious_death', 'unexplained_death',
  'historical_case', 'found_safe', 'found_deceased', 'under_investigation'
);

CREATE TYPE consultation_status AS ENUM (
  'pending', 'scheduled', 'in_progress', 'completed', 'deferred', 'not_required'
);

CREATE TABLE indigenous_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_traditional TEXT,
  community_type TEXT NOT NULL,
  nation TEXT,
  treaty_area TEXT,
  province TEXT,
  region TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  traditional_territory_description TEXT,
  primary_language indigenous_language,
  secondary_languages indigenous_language[] DEFAULT '{}',
  population_estimate INTEGER,
  band_office_phone TEXT,
  band_office_email TEXT,
  band_office_address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_email TEXT,
  policing_arrangement TEXT,
  police_service_name TEXT,
  police_service_phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE indigenous_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_fr TEXT,
  name_indigenous TEXT,
  acronym TEXT,
  org_type indigenous_org_type NOT NULL,
  description TEXT,
  description_fr TEXT,
  services_offered TEXT[],
  scope TEXT,
  provinces_served TEXT[],
  regions_served TEXT[],
  communities_served UUID[] DEFAULT '{}',
  primary_phone TEXT,
  toll_free_phone TEXT,
  crisis_line TEXT,
  email TEXT,
  website TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  is_verified_partner BOOLEAN DEFAULT FALSE,
  partnership_date DATE,
  partnership_agreement_url TEXT,
  mou_signed BOOLEAN DEFAULT FALSE,
  data_sharing_agreement BOOLEAN DEFAULT FALSE,
  data_governance_contact_name TEXT,
  data_governance_contact_email TEXT,
  receives_alerts BOOLEAN DEFAULT FALSE,
  alert_regions TEXT[],
  alert_categories TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE indigenous_liaison_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  organization_id UUID REFERENCES indigenous_organizations(id),
  community_id UUID REFERENCES indigenous_communities(id),
  languages_spoken indigenous_language[] DEFAULT '{}',
  speaks_english BOOLEAN DEFAULT TRUE,
  speaks_french BOOLEAN DEFAULT FALSE,
  email TEXT,
  phone TEXT,
  mobile_phone TEXT,
  preferred_contact_method TEXT,
  available_24_7 BOOLEAN DEFAULT FALSE,
  availability_notes TEXT,
  specializations TEXT[],
  cultural_protocols_trained BOOLEAN DEFAULT FALSE,
  trauma_informed_trained BOOLEAN DEFAULT FALSE,
  coverage_regions TEXT[],
  coverage_communities UUID[],
  is_active BOOLEAN DEFAULT TRUE,
  is_primary_contact BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cultural_sensitivity_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_fr TEXT,
  title_indigenous TEXT,
  content TEXT NOT NULL,
  content_fr TEXT,
  content_indigenous TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  applies_to_nations TEXT[],
  applies_to_regions TEXT[],
  is_universal BOOLEAN DEFAULT FALSE,
  resource_type TEXT,
  resource_url TEXT,
  contains_traditional_knowledge BOOLEAN DEFAULT FALSE,
  traditional_knowledge_consent TEXT,
  community_approved BOOLEAN DEFAULT FALSE,
  approved_by_community_id UUID REFERENCES indigenous_communities(id),
  is_public BOOLEAN DEFAULT FALSE,
  requires_training BOOLEAN DEFAULT FALSE,
  law_enforcement_only BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mmiwg_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  classification mmiwg_classification NOT NULL,
  is_mmiwg2s BOOLEAN DEFAULT FALSE,
  home_community_id UUID REFERENCES indigenous_communities(id),
  nation TEXT,
  treaty_area TEXT,
  last_seen_on_reserve BOOLEAN DEFAULT FALSE,
  last_seen_community_id UUID REFERENCES indigenous_communities(id),
  traditional_territory_involved BOOLEAN DEFAULT FALSE,
  family_liaison_id UUID REFERENCES indigenous_liaison_contacts(id),
  family_support_org_id UUID REFERENCES indigenous_organizations(id),
  cultural_support_requested BOOLEAN DEFAULT FALSE,
  ceremony_support_requested BOOLEAN DEFAULT FALSE,
  data_consent_level data_governance_consent DEFAULT 'investigation_only',
  community_notification_consent BOOLEAN DEFAULT FALSE,
  media_consent BOOLEAN DEFAULT FALSE,
  research_consent BOOLEAN DEFAULT FALSE,
  prior_interaction_with_systems TEXT[],
  vulnerability_factors TEXT[],
  is_historical_case BOOLEAN DEFAULT FALSE,
  original_report_date DATE,
  original_investigating_agency TEXT,
  case_transferred_from TEXT,
  consultation_status consultation_status DEFAULT 'pending',
  consultation_date TIMESTAMPTZ,
  consultation_notes TEXT,
  community_representative_present BOOLEAN DEFAULT FALSE,
  included_in_annual_report BOOLEAN DEFAULT FALSE,
  reported_to_national_inquiry BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE community_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  mmiwg_case_id UUID REFERENCES mmiwg_cases(id) ON DELETE CASCADE,
  community_id UUID REFERENCES indigenous_communities(id),
  organization_id UUID REFERENCES indigenous_organizations(id),
  consultation_type TEXT NOT NULL,
  status consultation_status DEFAULT 'pending',
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  law_enforcement_participants UUID[],
  community_participants TEXT[],
  family_participants_present BOOLEAN DEFAULT FALSE,
  location TEXT,
  is_on_reserve BOOLEAN DEFAULT FALSE,
  elder_present BOOLEAN DEFAULT FALSE,
  ceremony_conducted BOOLEAN DEFAULT FALSE,
  ceremony_type TEXT,
  interpreter_present BOOLEAN DEFAULT FALSE,
  interpreter_language indigenous_language,
  summary TEXT,
  summary_fr TEXT,
  action_items JSONB DEFAULT '[]',
  agreements_reached TEXT[],
  concerns_raised TEXT[],
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMPTZ,
  follow_up_notes TEXT,
  is_confidential BOOLEAN DEFAULT TRUE,
  can_share_summary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE community_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  community_id UUID REFERENCES indigenous_communities(id),
  organization_id UUID REFERENCES indigenous_organizations(id),
  liaison_contact_id UUID REFERENCES indigenous_liaison_contacts(id),
  notification_type TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  subject TEXT NOT NULL,
  subject_fr TEXT,
  message TEXT NOT NULL,
  message_fr TEXT,
  message_indigenous TEXT,
  sent_via TEXT[],
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES profiles(id),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  response_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE traditional_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_traditional TEXT,
  nation TEXT NOT NULL,
  description TEXT,
  historical_context TEXT,
  bounds_north DOUBLE PRECISION,
  bounds_south DOUBLE PRECISION,
  bounds_east DOUBLE PRECISION,
  bounds_west DOUBLE PRECISION,
  center_latitude DOUBLE PRECISION,
  center_longitude DOUBLE PRECISION,
  boundary_geojson JSONB,
  treaty_number TEXT,
  treaty_name TEXT,
  treaty_year INTEGER,
  modern_community_ids UUID[],
  overlapping_jurisdiction_ids UUID[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE indigenous_data_sovereignty_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  mmiwg_case_id UUID REFERENCES mmiwg_cases(id) ON DELETE SET NULL,
  community_id UUID REFERENCES indigenous_communities(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES indigenous_organizations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  action_description TEXT,
  performed_by UUID REFERENCES profiles(id),
  performed_by_organization TEXT,
  consent_verified BOOLEAN DEFAULT FALSE,
  consent_level data_governance_consent,
  community_notification_sent BOOLEAN DEFAULT FALSE,
  ocap_ownership_verified BOOLEAN DEFAULT FALSE,
  ocap_control_verified BOOLEAN DEFAULT FALSE,
  ocap_access_verified BOOLEAN DEFAULT FALSE,
  ocap_possession_verified BOOLEAN DEFAULT FALSE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_indigenous_communities_name ON indigenous_communities(name);
CREATE INDEX idx_indigenous_communities_province ON indigenous_communities(province);
CREATE INDEX idx_indigenous_organizations_type ON indigenous_organizations(org_type);
CREATE INDEX idx_liaison_contacts_organization ON indigenous_liaison_contacts(organization_id);
CREATE INDEX idx_cultural_resources_category ON cultural_sensitivity_resources(category);
CREATE INDEX idx_mmiwg_cases_case ON mmiwg_cases(case_id);
CREATE INDEX idx_consultations_case ON community_consultations(case_id);
CREATE INDEX idx_community_notifications_case ON community_notifications(case_id);
CREATE INDEX idx_territories_nation ON traditional_territories(nation);
CREATE INDEX idx_sovereignty_log_case ON indigenous_data_sovereignty_log(case_id);

ALTER TABLE cases ADD COLUMN IF NOT EXISTS indigenous_community_id UUID REFERENCES indigenous_communities(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS indigenous_nation TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS indigenous_language_preferred indigenous_language;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_mmiwg_case BOOLEAN DEFAULT FALSE;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS requires_cultural_protocol BOOLEAN DEFAULT FALSE;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS community_liaison_id UUID REFERENCES indigenous_liaison_contacts(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS data_sovereignty_consent data_governance_consent DEFAULT 'investigation_only';

CREATE INDEX idx_cases_indigenous_community ON cases(indigenous_community_id);
CREATE INDEX idx_cases_mmiwg ON cases(is_mmiwg_case) WHERE is_mmiwg_case = TRUE;

ALTER TABLE indigenous_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE indigenous_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE indigenous_liaison_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_sensitivity_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmiwg_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE traditional_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE indigenous_data_sovereignty_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active communities" ON indigenous_communities FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage communities" ON indigenous_communities FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "Anyone can view active organizations" ON indigenous_organizations FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage organizations" ON indigenous_organizations FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "LE and admins can view liaison contacts" ON indigenous_liaison_contacts FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer')));
CREATE POLICY "Admins can manage liaison contacts" ON indigenous_liaison_contacts FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "Anyone can view public resources" ON cultural_sensitivity_resources FOR SELECT USING (is_public = TRUE);
CREATE POLICY "LE can view all resources" ON cultural_sensitivity_resources FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer')));
CREATE POLICY "Admins can manage resources" ON cultural_sensitivity_resources FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "Case owners can view their MMIWG data" ON mmiwg_cases FOR SELECT USING (EXISTS (SELECT 1 FROM cases c WHERE c.id = mmiwg_cases.case_id AND c.reporter_id = auth.uid()));
CREATE POLICY "LE can view MMIWG cases" ON mmiwg_cases FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer') AND p.is_verified = TRUE));
CREATE POLICY "LE can manage MMIWG cases" ON mmiwg_cases FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer') AND p.is_verified = TRUE));
CREATE POLICY "LE can view consultations" ON community_consultations FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer')));
CREATE POLICY "LE can manage consultations" ON community_consultations FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer')));
CREATE POLICY "LE can view notifications" ON community_notifications FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer')));
CREATE POLICY "LE can create notifications" ON community_notifications FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer')));
CREATE POLICY "Anyone can view territories" ON traditional_territories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage territories" ON traditional_territories FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "Admins can view sovereignty log" ON indigenous_data_sovereignty_log FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "System can insert sovereignty log" ON indigenous_data_sovereignty_log FOR INSERT WITH CHECK (TRUE);

CREATE TRIGGER update_indigenous_communities_updated_at BEFORE UPDATE ON indigenous_communities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_indigenous_organizations_updated_at BEFORE UPDATE ON indigenous_organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_indigenous_liaison_contacts_updated_at BEFORE UPDATE ON indigenous_liaison_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cultural_sensitivity_resources_updated_at BEFORE UPDATE ON cultural_sensitivity_resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mmiwg_cases_updated_at BEFORE UPDATE ON mmiwg_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_consultations_updated_at BEFORE UPDATE ON community_consultations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_notifications_updated_at BEFORE UPDATE ON community_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_traditional_territories_updated_at BEFORE UPDATE ON traditional_territories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER audit_mmiwg_cases AFTER INSERT OR UPDATE OR DELETE ON mmiwg_cases FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_community_consultations AFTER INSERT OR UPDATE OR DELETE ON community_consultations FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE OR REPLACE FUNCTION check_mmiwg_case() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_indigenous = TRUE AND NEW.gender IN ('female', 'non_binary') THEN
    NEW.is_mmiwg_case := TRUE;
    NEW.requires_cultural_protocol := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_mmiwg_case_trigger BEFORE INSERT OR UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION check_mmiwg_case();

INSERT INTO indigenous_organizations (name, name_fr, acronym, org_type, scope, description, toll_free_phone, website, provinces_served) VALUES
('Native Womens Association of Canada', 'Association des femmes autochtones du Canada', 'NWAC', 'national_organization', 'national', 'National voice for Indigenous women, girls, and gender-diverse people in Canada.', '1-800-461-4043', 'https://nwac.ca', ARRAY['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']),
('Assembly of First Nations', 'Assemblee des Premieres Nations', 'AFN', 'national_organization', 'national', 'National advocacy organization representing First Nations citizens in Canada.', '1-866-869-6789', 'https://afn.ca', ARRAY['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']),
('Inuit Tapiriit Kanatami', 'Inuit Tapiriit Kanatami', 'ITK', 'inuit_organization', 'national', 'National representational organization for the Inuit of Canada.', '1-855-489-1680', 'https://itk.ca', ARRAY['NL', 'NT', 'NU', 'QC']),
('Metis National Council', 'Ralliement national des Metis', 'MNC', 'metis_organization', 'national', 'National representative body for the Metis Nation.', NULL, 'https://metisnation.ca', ARRAY['AB', 'BC', 'MB', 'ON', 'SK']),
('Congress of Aboriginal Peoples', 'Congres des peuples autochtones', 'CAP', 'national_organization', 'national', 'National voice for off-reserve Indigenous peoples in Canada.', '1-800-563-6444', 'https://abo-peoples.org', ARRAY['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']),
('Pauktuutit Inuit Women of Canada', 'Pauktuutit Inuit Women of Canada', NULL, 'womens_organization', 'national', 'National representative organization for Inuit women in Canada.', '1-800-667-0749', 'https://pauktuutit.ca', ARRAY['NL', 'NT', 'NU', 'QC']);

INSERT INTO cultural_sensitivity_resources (title, title_fr, category, content, content_fr, is_public, is_universal) VALUES
('Working with Indigenous Families: Initial Contact Protocol', 'Travailler avec les familles autochtones: Protocole de premier contact', 'protocol', 'When making initial contact with Indigenous families regarding a missing person case: 1. Introduce yourself clearly 2. Ask about language preferences 3. Ask if they want an Elder present 4. Respect extended family structures 5. Allow time for consensus-building 6. Be mindful of eye contact norms 7. Avoid interrupting 8. Meet in comfortable locations 9. Ask about ceremonies 10. Provide accessible written info', 'Protocoles de communication culturellement appropries pour les familles autochtones.', TRUE, TRUE),
('MMIWG Case Handling: Trauma-Informed Approach', 'Traitement des cas FFADA: Approche tenant compte des traumatismes', 'investigation', 'MMIWG cases require special consideration: 1. Acknowledge historical context 2. Build trust through respect 3. Include Indigenous liaison officers 4. Connect with victim services 5. Provide regular updates 6. Be aware of intergenerational trauma 7. Document systemic barriers 8. Coordinate with Indigenous organizations 9. Follow cultural protocols 10. Support access to Inquiry resources', 'Les cas FFADA necessitent une consideration particuliere.', TRUE, TRUE),
('Understanding Indigenous Data Sovereignty (OCAP Principles)', 'Comprendre la souverainete des donnees autochtones (Principes PCAP)', 'protocol', 'OCAP principles: Ownership - communities own information about members. Control - communities control data management. Access - communities access their data. Possession - physical control maintains ownership.', 'Principes PCAP pour la gouvernance des donnees autochtones.', TRUE, TRUE);

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
