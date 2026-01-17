-- LocateConnect: Historical Case Archive (LC-FEAT-041)

CREATE TYPE archive_status AS ENUM ('pending_anonymization', 'anonymized', 'published', 'restricted', 'withdrawn');
CREATE TYPE research_access_level AS ENUM ('public', 'academic', 'law_enforcement', 'restricted');
CREATE TYPE access_request_status AS ENUM ('pending', 'approved', 'denied', 'revoked', 'expired');
CREATE TYPE partnership_status AS ENUM ('pending', 'active', 'suspended', 'terminated');
CREATE TYPE research_category AS ENUM ('academic', 'law_enforcement_training', 'policy_development', 'pattern_analysis', 'best_practices');
CREATE TYPE export_format AS ENUM ('csv', 'json', 'pdf', 'anonymized_dataset');

CREATE TABLE archived_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_case_id UUID UNIQUE REFERENCES cases(id) ON DELETE SET NULL,
  archive_number TEXT UNIQUE,
  archive_status archive_status DEFAULT 'pending_anonymization',
  access_level research_access_level DEFAULT 'public',
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by UUID REFERENCES profiles(id),
  case_category TEXT NOT NULL,
  age_range TEXT,
  gender_anonymized TEXT,
  region TEXT,
  province TEXT,
  jurisdiction_type TEXT,
  urban_rural TEXT,
  had_medical_conditions BOOLEAN DEFAULT FALSE,
  had_mental_health_conditions BOOLEAN DEFAULT FALSE,
  had_medication_dependency BOOLEAN DEFAULT FALSE,
  was_minor BOOLEAN DEFAULT FALSE,
  was_elderly BOOLEAN DEFAULT FALSE,
  was_indigenous BOOLEAN DEFAULT FALSE,
  had_dementia BOOLEAN DEFAULT FALSE,
  had_autism BOOLEAN DEFAULT FALSE,
  was_suicidal_risk BOOLEAN DEFAULT FALSE,
  suspected_abduction BOOLEAN DEFAULT FALSE,
  suspected_foul_play BOOLEAN DEFAULT FALSE,
  year_reported INTEGER,
  month_reported INTEGER,
  season TEXT,
  disposition case_disposition NOT NULL,
  resolution_type TEXT,
  days_to_resolution INTEGER,
  number_of_leads INTEGER DEFAULT 0,
  number_of_tips INTEGER DEFAULT 0,
  amber_alert_issued BOOLEAN DEFAULT FALSE,
  key_factors JSONB DEFAULT '[]',
  lessons_learned TEXT,
  research_tags TEXT[] DEFAULT '{}',
  case_study_potential BOOLEAN DEFAULT FALSE,
  family_opted_out BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE anonymization_rules (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, field_name TEXT NOT NULL, rule_type TEXT NOT NULL, rule_config JSONB DEFAULT '{}', is_active BOOLEAN DEFAULT TRUE, priority INTEGER DEFAULT 100, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE family_opt_outs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE, requester_name TEXT NOT NULL, requester_email TEXT NOT NULL, reason TEXT, opt_out_scope TEXT DEFAULT 'full', is_verified BOOLEAN DEFAULT FALSE, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE research_access_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), requester_id UUID REFERENCES profiles(id), requester_name TEXT NOT NULL, requester_email TEXT NOT NULL, organization_name TEXT NOT NULL, organization_type TEXT NOT NULL, access_level_requested research_access_level NOT NULL, research_category research_category NOT NULL, research_title TEXT NOT NULL, research_description TEXT NOT NULL, ethics_approval_number TEXT, status access_request_status DEFAULT 'pending', reviewed_by UUID REFERENCES profiles(id), reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE academic_partnerships (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), institution_name TEXT NOT NULL, institution_type TEXT NOT NULL, primary_contact_name TEXT NOT NULL, primary_contact_email TEXT NOT NULL, partnership_type TEXT NOT NULL, access_level research_access_level NOT NULL, status partnership_status DEFAULT 'pending', mou_signed_date DATE, mou_expiry_date DATE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE data_use_agreements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), access_request_id UUID REFERENCES research_access_requests(id), partnership_id UUID REFERENCES academic_partnerships(id), agreement_type TEXT NOT NULL, researcher_name TEXT NOT NULL, researcher_email TEXT NOT NULL, institution_name TEXT NOT NULL, permitted_uses TEXT[] NOT NULL, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE partnership_members (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), partnership_id UUID NOT NULL REFERENCES academic_partnerships(id) ON DELETE CASCADE, user_id UUID REFERENCES profiles(id), member_name TEXT NOT NULL, member_email TEXT NOT NULL, is_active BOOLEAN DEFAULT TRUE, can_export_data BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(partnership_id, member_email));

CREATE TABLE case_studies (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), archived_case_id UUID NOT NULL REFERENCES archived_cases(id) ON DELETE CASCADE, study_number TEXT UNIQUE, title TEXT NOT NULL, abstract TEXT NOT NULL, category research_category NOT NULL, tags TEXT[] DEFAULT '{}', access_level research_access_level DEFAULT 'academic', is_published BOOLEAN DEFAULT FALSE, published_at TIMESTAMPTZ, author_id UUID REFERENCES profiles(id), view_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE case_study_sections (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), case_study_id UUID NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE, section_type TEXT NOT NULL, section_order INTEGER NOT NULL, title TEXT NOT NULL, content JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE research_exports (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES profiles(id), export_name TEXT NOT NULL, export_format export_format NOT NULL, filter_criteria JSONB NOT NULL DEFAULT '{}', included_fields TEXT[] NOT NULL, total_records INTEGER, file_url TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE archive_statistics (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), statistic_type TEXT NOT NULL, statistic_key TEXT NOT NULL, data JSONB NOT NULL, computed_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(statistic_type, statistic_key));

CREATE TABLE research_activity_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES profiles(id), action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id UUID, details JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW());

CREATE INDEX idx_archived_cases_status ON archived_cases(archive_status);
CREATE INDEX idx_archived_cases_year ON archived_cases(year_reported);
CREATE INDEX idx_archived_cases_disposition ON archived_cases(disposition);
CREATE INDEX idx_case_studies_published ON case_studies(is_published) WHERE is_published = TRUE;

ALTER TABLE archived_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_use_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_study_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_archived" ON archived_cases FOR SELECT USING (archive_status = 'published' AND access_level = 'public' AND family_opted_out = FALSE);
CREATE POLICY "admin_archived" ON archived_cases FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "admin_rules" ON anonymization_rules FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "admin_optouts" ON family_opt_outs FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "own_requests" ON research_access_requests FOR SELECT USING (requester_id = auth.uid());
CREATE POLICY "create_requests" ON research_access_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin_requests" ON research_access_requests FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "public_partners" ON academic_partnerships FOR SELECT USING (status = 'active');
CREATE POLICY "admin_partners" ON academic_partnerships FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "admin_members" ON partnership_members FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "public_studies" ON case_studies FOR SELECT USING (is_published = TRUE AND access_level = 'public');
CREATE POLICY "admin_studies" ON case_studies FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "admin_sections" ON case_study_sections FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "own_exports" ON research_exports FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admin_exports" ON research_exports FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "public_stats" ON archive_statistics FOR SELECT USING (TRUE);
CREATE POLICY "admin_stats" ON archive_statistics FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "insert_logs" ON research_activity_logs FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "admin_logs" ON research_activity_logs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));
CREATE POLICY "admin_dua" ON data_use_agreements FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer')));

CREATE OR REPLACE FUNCTION generate_archive_number() RETURNS TRIGGER AS $f$ DECLARE y TEXT; s INTEGER; BEGIN y := TO_CHAR(NOW(), 'YYYY'); SELECT COALESCE(MAX(CAST(SUBSTRING(archive_number FROM 9) AS INTEGER)), 0) + 1 INTO s FROM archived_cases WHERE archive_number LIKE 'ARC-' || y || '-%'; NEW.archive_number := 'ARC-' || y || '-' || LPAD(s::TEXT, 6, '0'); RETURN NEW; END; $f$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION generate_study_number() RETURNS TRIGGER AS $f$ DECLARE y TEXT; s INTEGER; BEGIN y := TO_CHAR(NOW(), 'YYYY'); SELECT COALESCE(MAX(CAST(SUBSTRING(study_number FROM 9) AS INTEGER)), 0) + 1 INTO s FROM case_studies WHERE study_number LIKE 'CS-' || y || '-%'; NEW.study_number := 'CS-' || y || '-' || LPAD(s::TEXT, 4, '0'); RETURN NEW; END; $f$ LANGUAGE plpgsql;

CREATE TRIGGER gen_archive_num BEFORE INSERT ON archived_cases FOR EACH ROW EXECUTE FUNCTION generate_archive_number();
CREATE TRIGGER gen_study_num BEFORE INSERT ON case_studies FOR EACH ROW EXECUTE FUNCTION generate_study_number();
CREATE TRIGGER upd_archived BEFORE UPDATE ON archived_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER upd_rules BEFORE UPDATE ON anonymization_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER upd_optouts BEFORE UPDATE ON family_opt_outs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER upd_requests BEFORE UPDATE ON research_access_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER upd_dua BEFORE UPDATE ON data_use_agreements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER upd_partners BEFORE UPDATE ON academic_partnerships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER upd_members BEFORE UPDATE ON partnership_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER upd_studies BEFORE UPDATE ON case_studies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER upd_sections BEFORE UPDATE ON case_study_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO anonymization_rules (name, field_name, rule_type, priority) VALUES ('Remove Names', 'first_name,last_name', 'remove', 10), ('Remove Address', 'last_seen_location', 'remove', 20), ('Age Range', 'age', 'range', 30), ('Remove Photos', 'photo_url', 'remove', 40);

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
