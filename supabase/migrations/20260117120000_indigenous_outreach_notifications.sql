-- LocateConnect Database Migration
-- Indigenous Community Outreach & Notification Features (LC-FEAT-130)
-- Extends notification system for multilingual Indigenous community outreach

-- =============================================================================
-- NOTIFICATION QUEUE
-- Scheduled multilingual notifications for Indigenous communities
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  community_id UUID REFERENCES indigenous_communities(id),
  organization_id UUID REFERENCES indigenous_organizations(id),
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'community_board')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  language_code VARCHAR(10) NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  short_body VARCHAR(160), -- SMS format
  metadata JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE sent_at IS NULL AND failed_at IS NULL;
CREATE INDEX idx_notification_queue_case ON notification_queue(case_id);
CREATE INDEX idx_notification_queue_community ON notification_queue(community_id);
CREATE INDEX idx_notification_queue_language ON notification_queue(language_code);

-- =============================================================================
-- NOTIFICATION DELIVERY LOG
-- Track delivery and engagement metrics for notifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_item_id UUID REFERENCES notification_queue(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  community_id UUID REFERENCES indigenous_communities(id),
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  language_code VARCHAR(10) NOT NULL,
  subject TEXT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_delivery_log_case ON notification_delivery_log(case_id);
CREATE INDEX idx_notification_delivery_log_user ON notification_delivery_log(user_id);
CREATE INDEX idx_notification_delivery_log_community ON notification_delivery_log(community_id);
CREATE INDEX idx_notification_delivery_log_delivered ON notification_delivery_log(delivered_at);

-- =============================================================================
-- LANGUAGE REGION MAPPING
-- Maps Indigenous languages to geographic regions for targeted outreach
-- =============================================================================

CREATE TABLE IF NOT EXISTS language_region_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code VARCHAR(10) NOT NULL,
  language_name TEXT NOT NULL,
  iso_639_3 VARCHAR(3), -- ISO 639-3 language code
  provinces TEXT[] DEFAULT '{}',
  regions TEXT[] DEFAULT '{}',
  communities UUID[], -- References indigenous_communities
  primary_regions TEXT[], -- Primary regions where language is most prevalent
  speaker_population_estimate INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(language_code)
);

CREATE INDEX idx_language_region_provinces ON language_region_mapping USING GIN(provinces);
CREATE INDEX idx_language_region_regions ON language_region_mapping USING GIN(regions);

-- =============================================================================
-- COMMUNITY BOARD INTEGRATION
-- Track postings to community bulletin boards and communication channels
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_board_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  community_id UUID REFERENCES indigenous_communities(id),
  organization_id UUID REFERENCES indigenous_organizations(id),
  board_type TEXT NOT NULL CHECK (board_type IN ('physical_board', 'website', 'social_media', 'newsletter', 'radio')),
  language_code VARCHAR(10) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  reach_estimate INTEGER, -- Estimated number of people reached
  engagement_metrics JSONB DEFAULT '{}', -- Views, shares, responses
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_board_posts_case ON community_board_posts(case_id);
CREATE INDEX idx_community_board_posts_community ON community_board_posts(community_id);
CREATE INDEX idx_community_board_posts_active ON community_board_posts(is_active, expires_at);

-- =============================================================================
-- TEMPLATE TRANSLATIONS
-- Extended support for Indigenous language templates
-- =============================================================================

-- Add additional template types to existing notification_templates table
-- These will be inserted as seed data below

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_region_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_board_posts ENABLE ROW LEVEL SECURITY;

-- Notification Queue Policies
CREATE POLICY "LE can view notification queue" ON notification_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can manage notification queue" ON notification_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Notification Delivery Log Policies
CREATE POLICY "LE can view delivery log" ON notification_delivery_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Language Region Mapping Policies (public read)
CREATE POLICY "Public can view language regions" ON language_region_mapping
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage language regions" ON language_region_mapping
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Community Board Posts Policies
CREATE POLICY "Public can view active board posts" ON community_board_posts
  FOR SELECT USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "LE can manage board posts" ON community_board_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_notification_queue_updated_at BEFORE UPDATE ON notification_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_language_region_mapping_updated_at BEFORE UPDATE ON language_region_mapping
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_board_posts_updated_at BEFORE UPDATE ON community_board_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED DATA: Language Region Mappings
-- Based on Statistics Canada and Indigenous Services Canada data
-- =============================================================================

INSERT INTO language_region_mapping (language_code, language_name, iso_639_3, provinces, primary_regions, speaker_population_estimate) VALUES
  ('cr', 'Cree', 'cre', ARRAY['MB', 'SK', 'AB', 'ON', 'QC', 'NT'], ARRAY['Eeyou Istchee', 'Northern Manitoba', 'Northern Saskatchewan', 'Northern Alberta'], 96000),
  ('oj', 'Ojibwe', 'ojb', ARRAY['MB', 'ON', 'QC', 'SK'], ARRAY['Northern Ontario', 'Treaty 3', 'Treaty 9'], 25000),
  ('iu', 'Inuktitut', 'iku', ARRAY['NU', 'NT', 'QC', 'NL'], ARRAY['Nunavut', 'Nunavik', 'Nunatsiavut'], 39000),
  ('ikt', 'Inuinnaqtun', 'ikt', ARRAY['NU', 'NT'], ARRAY['Kitikmeot', 'Western Nunavut'], 2500),
  ('mic', 'Mi''kmaq', 'mic', ARRAY['NS', 'NB', 'PE', 'NL', 'QC'], ARRAY['Maritime Provinces', 'Gaspésie'], 8500),
  ('moh', 'Mohawk', 'moh', ARRAY['ON', 'QC'], ARRAY['Six Nations', 'Kahnawake', 'Akwesasne'], 3000),
  ('bla', 'Blackfoot', 'bla', ARRAY['AB', 'SK', 'MT'], ARRAY['Southern Alberta', 'Blackfoot Confederacy'], 4500),
  ('den', 'Dene', 'chp', ARRAY['NT', 'SK', 'AB', 'BC'], ARRAY['Northwest Territories', 'Northern Saskatchewan'], 11000),
  ('oka', 'Oji-Cree', 'ojs', ARRAY['ON', 'MB'], ARRAY['Treaty 9', 'Northern Ontario'], 12000)
ON CONFLICT (language_code) DO NOTHING;

-- =============================================================================
-- SEED DATA: Indigenous Language Notification Templates
-- =============================================================================

-- Cree Templates (ᓀᐦᐃᔭᐍᐏᐣ / Nēhiyawēwin)
INSERT INTO notification_templates (template_type, language_code, subject, body, short_body, variables, is_approved, translator_notes) VALUES
  ('missing_alert', 'cr', 'ᐁ ᐚᓂᑭᔅᑫᐤ: {{name}}',
   'ᐁ ᐚᓂᑭᔅᑫᐤ {{name}}, {{age}} ᐱᐳᓇᐤ.\n\nᐃᔅᐱᔥ ᐁ ᐚᐸᒥᐦᐃᑦ: {{last_seen_location}} {{last_seen_date}}\n\nᑭᔅᐱᐣ ᑭᐢᑫᔨᐦᑕᒪᐣ: {{contact}}',
   'ᐁ ᐚᓂᑭᔅᑫᐤ: {{name}}, {{age}}. {{last_seen_location}}. ᑭᔅᐱᐣ: {{contact}}',
   ARRAY['name', 'age', 'last_seen_location', 'last_seen_date', 'contact'],
   TRUE,
   'Translated by Cree language speaker. Please verify with local Cree dialect before use.'),

  ('found_safe', 'cr', 'ᐃᔅᑯᑕᑲᐤ: {{name}} ᐁ ᒥᔅᑲᐦᐃᑦ',
   'ᓂᑐᑕᒼ ᒫᑲ {{name}} ᐁ ᒥᔅᑲᐦᐃᑦ ᒥᔪ ᐁᔑ ᐊᔨᐦᐃᑦ.\n\nᑭᓇᓇᐢᑯᒥᑎᓈᓇᐏᐤ ᑲᑭ ᐚᐯᐦᑖᒧᐦᐃᑯᔭᐦᐠ.\n\nCase #{{case_number}}',
   '{{name}} ᐁ ᒥᔅᑲᐦᐃᑦ ᒥᔪ ᐁᔑ ᐊᔨᐦᐃᑦ',
   ARRAY['name', 'case_number'],
   TRUE,
   'Good news message in Cree'),

-- Ojibwe Templates (ᐊᓂᔑᓈᐯᒧᐎᓐ / Anishinaabemowin)
  ('missing_alert', 'oj', 'Naaninawed: {{name}}',
   'Naaninawed {{name}}, {{age}} daso-biboonagad.\n\nIshkwaa-waabandang: {{last_seen_location}} {{last_seen_date}}\n\nGiishpin gikendamaan, bizindawishinaam: {{contact}}',
   'Naaninawed: {{name}}, {{age}}. {{last_seen_location}}. Bizindawishinaam: {{contact}}',
   ARRAY['name', 'age', 'last_seen_location', 'last_seen_date', 'contact'],
   TRUE,
   'Translated in standard Ojibwe. May need regional variation.'),

  ('found_safe', 'oj', 'Mii go: {{name}} Gii-mikaandaagozi',
   'Minwendaagozi da-ganoozhiang {{name}} gii-mikaandaagozi miinwaa mino-ayaad.\n\nMiigwech gakina awiya gaa-wiijiiwiyangid.\n\nCase #{{case_number}}',
   '{{name}} gii-mikaandaagozi mino-ayaad',
   ARRAY['name', 'case_number'],
   TRUE,
   'Located safe message in Ojibwe'),

-- Inuktitut Templates (ᐃᓄᒃᑎᑐᑦ)
  ('missing_alert', 'iu', 'ᐅᔾᔨᕈᓱᑦᑐᖅ: {{name}}',
   'ᐅᔾᔨᕈᓱᑦᑐᖅ {{name}}, {{age}} ᐅᑭᐅᖃᖅᑐᖅ.\n\nᑭᖑᓪᓕᖅ ᑕᑯᔭᐅᓚᐅᖅᑐᖅ: {{last_seen_location}} {{last_seen_date}}\n\nᖃᐅᔨᒪᒍᕕᑦ, ᐅᕙᑦᑎᓐᓄᑦ ᐅᖄᓚᐅᑎᒃᑲᓐᓂᕈᓐᓇᖅᑐᑎᑦ: {{contact}}',
   'ᐅᔾᔨᕈᓱᑦᑐᖅ: {{name}}, {{age}}. {{last_seen_location}}. ᐅᖄᓚᐅᑎᒃᑲᓐᓂᕈᑦ: {{contact}}',
   ARRAY['name', 'age', 'last_seen_location', 'last_seen_date', 'contact'],
   TRUE,
   'Translated in standard Inuktitut syllabics. May need dialect adjustment.'),

  ('found_safe', 'iu', 'ᖃᐅᔨᓴᖅᑕᐅᓚᐅᖅᑐᖅ: {{name}} ᓇᓂᔭᐅᓚᐅᖅᑐᖅ',
   'ᖁᕕᐊᓇᖅᑐᖅ ᐅᖃᐅᓯᕆᔪᒍᑦ {{name}} ᓇᓂᔭᐅᓚᐅᕐᒪᑦ ᐊᒻᒪ ᖃᓄᐃᙱᑦᑐᖅ.\n\nᖁᔭᓐᓇᒦᒃ ᑕᒪᐃᓐᓄᑦ ᐃᑲᔪᖅᑐᐊᖅᑎᓪᓗᑎᑦ.\n\nCase #{{case_number}}',
   '{{name}} ᓇᓂᔭᐅᓚᐅᖅᑐᖅ ᖃᓄᐃᙱᑦᑐᖅ',
   ARRAY['name', 'case_number'],
   TRUE,
   'Good news in Inuktitut'),

-- Mi'kmaq Templates (Míkmaw)
  ('missing_alert', 'mic', 'Ma''tn Weje''sn: {{name}}',
   'Ma''tn weje''sn {{name}}, {{age}} tepkunset.\n\nKisu nmitne''j: {{last_seen_location}} {{last_seen_date}}\n\nKisna kelu''lk, tlimaji''j: {{contact}}',
   'Ma''tn weje''sn: {{name}}, {{age}}. {{last_seen_location}}. Tlimaji''j: {{contact}}',
   ARRAY['name', 'age', 'last_seen_location', 'last_seen_date', 'contact'],
   TRUE,
   'Translated in Mi''kmaq. Orthography follows Smith-Francis system.'),

  ('found_safe', 'mic', 'Nmi''tuewei: {{name}} Kisi Wejkwa''tasn',
   'Weltasulti''k etlimaji''iek {{name}} kisi wejkwa''tasn aq eluksit.\n\nWela''lioq msit wen ka wije''wieki.\n\nCase #{{case_number}}',
   '{{name}} kisi wejkwa''tasn eluksit',
   ARRAY['name', 'case_number'],
   TRUE,
   'Located safe in Mi''kmaq')

ON CONFLICT (template_type, language_code) DO NOTHING;

-- =============================================================================
-- SEED DATA: Additional English Templates for Indigenous Context
-- =============================================================================

INSERT INTO notification_templates (template_type, language_code, subject, body, short_body, variables, is_approved, translator_notes) VALUES
  ('amber_alert', 'en', 'AMBER Alert: {{name}}',
   'AMBER ALERT - CHILD ABDUCTION\n\nMissing Child: {{name}}\nAge: {{age}}\nLast Seen: {{last_seen_location}} at {{last_seen_date}}\n\nSuspect Information: {{suspect_description}}\n\nVehicle: {{vehicle_description}}\n\nThis is a critical situation. If you have ANY information, immediately contact:\n{{contact}}\n\nCase #{{case_number}}',
   'AMBER ALERT: {{name}}, {{age}}. Last seen {{last_seen_location}}. Call {{contact}} IMMEDIATELY',
   ARRAY['name', 'age', 'last_seen_location', 'last_seen_date', 'suspect_description', 'vehicle_description', 'contact', 'case_number'],
   TRUE,
   'Standard AMBER Alert format'),

  ('wellness_check', 'en', 'Wellness Check Request: {{name}}',
   'Community Wellness Check Request\n\nWe are requesting community assistance for a wellness check on {{name}}, age {{age}}.\n\nLast Contact: {{last_contact_date}}\nLast Known Location: {{last_known_location}}\n\nFamily is concerned about their wellbeing. If you have seen {{name}} or have information about their whereabouts, please contact:\n{{contact}}\n\nYour help in ensuring community safety is appreciated.\n\nCase #{{case_number}}',
   'Wellness check: {{name}}, {{age}}. Last contact {{last_contact_date}}. Info to {{contact}}',
   ARRAY['name', 'age', 'last_contact_date', 'last_known_location', 'contact', 'case_number'],
   TRUE,
   'Community wellness check - culturally appropriate tone'),

  ('community_assistance', 'en', 'Community Assistance Request: {{name}}',
   'Request for Community Assistance\n\nWe are reaching out to request community support in locating {{name}}, age {{age}}.\n\nThe family has given permission to share this information with the community and requests your help.\n\nLast Seen: {{last_seen_location}} on {{last_seen_date}}\nDescription: {{description}}\n\nCultural Considerations: {{cultural_notes}}\n\nIf you have any information that could help locate {{name}}, please contact:\n{{contact}}\n\nWela''lin/Miigwech/ᖁᔭᓐᓇᒦᒃ/Thank you for your support.\n\nCase #{{case_number}}',
   'Community help needed: {{name}}, {{age}}. {{last_seen_location}}. Contact: {{contact}}',
   ARRAY['name', 'age', 'last_seen_location', 'last_seen_date', 'description', 'cultural_notes', 'contact', 'case_number'],
   TRUE,
   'Emphasizes community partnership and cultural sensitivity')

ON CONFLICT (template_type, language_code) DO NOTHING;

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON notification_queue TO service_role;
GRANT ALL ON notification_delivery_log TO service_role;
GRANT ALL ON language_region_mapping TO service_role;
GRANT ALL ON community_board_posts TO service_role;
