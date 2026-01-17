-- LocateConnect Database Migration
-- Add Indigenous Language Support to Profiles and Cases

-- =============================================================================
-- PROFILES TABLE - Language Preferences
-- =============================================================================

-- Add language preference fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS additional_languages TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS communication_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS needs_interpreter BOOLEAN DEFAULT FALSE;

-- Add index for language queries
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language ON profiles(preferred_language);

-- =============================================================================
-- CASES TABLE - Language Information
-- =============================================================================

-- Reporter language info
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reporter_languages TEXT[] DEFAULT '{}';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reporter_preferred_language VARCHAR(10);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reporter_needs_interpreter BOOLEAN DEFAULT FALSE;

-- Missing person language info
ALTER TABLE cases ADD COLUMN IF NOT EXISTS subject_primary_languages TEXT[] DEFAULT '{}';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS subject_responds_to_languages TEXT[] DEFAULT '{}';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS subject_can_communicate_official BOOLEAN DEFAULT TRUE;

-- Add indexes for language-based queries
CREATE INDEX IF NOT EXISTS idx_cases_subject_languages ON cases USING GIN(subject_primary_languages);
CREATE INDEX IF NOT EXISTS idx_cases_reporter_languages ON cases USING GIN(reporter_languages);

-- =============================================================================
-- COMMUNITY ORGANIZATIONS TABLE
-- For Indigenous community outreach
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_indigenous VARCHAR(255),
  type VARCHAR(50) NOT NULL, -- 'band_office', 'police', 'community_center', 'language_center', 'health_center'
  languages_served TEXT[] DEFAULT '{}',
  primary_language VARCHAR(10),
  region VARCHAR(100),
  province VARCHAR(50),
  community VARCHAR(255),
  nation VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  website VARCHAR(255),
  notification_preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for language-based community lookups
CREATE INDEX IF NOT EXISTS idx_community_orgs_languages ON community_organizations USING GIN(languages_served);
CREATE INDEX IF NOT EXISTS idx_community_orgs_region ON community_organizations(region, province);
CREATE INDEX IF NOT EXISTS idx_community_orgs_type ON community_organizations(type);

-- RLS for community organizations
ALTER TABLE community_organizations ENABLE ROW LEVEL SECURITY;

-- Anyone can view active community organizations
CREATE POLICY "Public can view active community organizations" ON community_organizations
  FOR SELECT USING (is_active = TRUE);

-- Only admins can modify
CREATE POLICY "Admins can manage community organizations" ON community_organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- =============================================================================
-- NOTIFICATION TEMPLATES TABLE
-- For multilingual notifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(50) NOT NULL, -- 'missing_alert', 'amber_alert', 'found_safe', 'community_request'
  language_code VARCHAR(10) NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  short_body VARCHAR(160), -- SMS length
  variables TEXT[] DEFAULT '{}', -- Template variables like {{name}}, {{location}}
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  translator_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_type, language_code)
);

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_language ON notification_templates(language_code);

-- RLS for notification templates
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved templates
CREATE POLICY "Public can view approved notification templates" ON notification_templates
  FOR SELECT USING (is_approved = TRUE);

-- Admins can manage all templates
CREATE POLICY "Admins can manage notification templates" ON notification_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_community_orgs_updated_at BEFORE UPDATE ON community_organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED DATA: Sample Community Organizations
-- =============================================================================

INSERT INTO community_organizations (name, name_indigenous, type, languages_served, primary_language, region, province, nation) VALUES
  ('Assembly of First Nations', NULL, 'advocacy', ARRAY['en', 'fr', 'cr', 'oj', 'mic'], 'en', 'National', NULL, NULL),
  ('Inuit Tapiriit Kanatami', 'ᐃᓄᐃᑦ ᑕᐱᕇᑦ ᑲᓇᑕᒥ', 'advocacy', ARRAY['en', 'fr', 'iu', 'ikt'], 'en', 'National', NULL, 'Inuit'),
  ('Cree Nation Government', 'ᐄᔨᔨᐤ ᐅᑎᐦᒋᒫᐅᐏᓐ', 'governance', ARRAY['cr', 'en', 'fr'], 'cr', 'Eeyou Istchee', 'QC', 'Cree'),
  ('Nishnawbe Aski Police Service', NULL, 'police', ARRAY['oj', 'cr', 'en'], 'en', 'Northern Ontario', 'ON', 'Anishinaabe'),
  ('Nunavut RCMP', 'ᓄᓇᕗᑦ ᐊᑎᓕᐅᖅᑕᐅᓯᒪᔪᑦ', 'police', ARRAY['iu', 'ikt', 'en', 'fr'], 'en', 'Nunavut', 'NU', 'Inuit')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SEED DATA: Default Notification Templates (English)
-- =============================================================================

INSERT INTO notification_templates (template_type, language_code, subject, body, short_body, variables, is_approved) VALUES
  ('missing_alert', 'en', 'Missing Person Alert: {{name}}',
   'A missing person report has been filed for {{name}}, age {{age}}.\n\nLast seen: {{last_seen_location}} on {{last_seen_date}}\n\nDescription: {{description}}\n\nIf you have any information, please contact: {{contact}}',
   'MISSING: {{name}}, {{age}}. Last seen {{last_seen_location}}. Call {{contact}}',
   ARRAY['name', 'age', 'last_seen_location', 'last_seen_date', 'description', 'contact'],
   TRUE),

  ('missing_alert', 'fr', 'Alerte personne disparue: {{name}}',
   'Un avis de recherche a ete emis pour {{name}}, age de {{age}} ans.\n\nDerniere fois vu(e): {{last_seen_location}} le {{last_seen_date}}\n\nDescription: {{description}}\n\nSi vous avez des informations, veuillez contacter: {{contact}}',
   'DISPARU(E): {{name}}, {{age}} ans. Vu(e) {{last_seen_location}}. Appelez {{contact}}',
   ARRAY['name', 'age', 'last_seen_location', 'last_seen_date', 'description', 'contact'],
   TRUE),

  ('found_safe', 'en', 'Update: {{name}} Has Been Located',
   'We are pleased to report that {{name}} has been located and is safe.\n\nThank you to everyone who helped spread the word and provided information.\n\nCase #{{case_number}} is now closed.',
   'UPDATE: {{name}} has been found safe. Thank you for your help.',
   ARRAY['name', 'case_number'],
   TRUE),

  ('found_safe', 'fr', 'Mise a jour: {{name}} a ete retrouve(e)',
   'Nous sommes heureux de vous informer que {{name}} a ete retrouve(e) sain(e) et sauf/sauve.\n\nMerci a tous ceux qui ont aide a diffuser l''information.\n\nLe dossier #{{case_number}} est maintenant ferme.',
   'MISE A JOUR: {{name}} retrouve(e) sain(e) et sauf/sauve. Merci de votre aide.',
   ARRAY['name', 'case_number'],
   TRUE)
ON CONFLICT (template_type, language_code) DO NOTHING;

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON community_organizations TO service_role;
GRANT ALL ON notification_templates TO service_role;
