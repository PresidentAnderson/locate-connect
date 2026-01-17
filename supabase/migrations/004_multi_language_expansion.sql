-- LocateConnect Database Migration
-- Multi-Language Expansion (LC-FEAT-033)
-- Adds support for Spanish, Mandarin, Cantonese, Punjabi, Tagalog, Arabic
-- Plus enhanced Indigenous language support

-- =============================================================================
-- USER LANGUAGE PREFERENCES TABLE
-- Comprehensive storage for user language settings
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_language_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- UI Language Preferences
  ui_language VARCHAR(10) NOT NULL DEFAULT 'en',
  ui_language_fallback VARCHAR(10) DEFAULT 'en',

  -- Communication Preferences
  communication_language VARCHAR(10) NOT NULL DEFAULT 'en',
  email_language VARCHAR(10) NOT NULL DEFAULT 'en',
  sms_language VARCHAR(10) NOT NULL DEFAULT 'en',

  -- Additional Languages (spoken)
  additional_languages TEXT[] DEFAULT '{}',

  -- Interpreter Services
  needs_interpreter BOOLEAN DEFAULT FALSE,
  interpreter_languages TEXT[] DEFAULT '{}',

  -- RTL Preference (for users who prefer RTL even in LTR languages)
  force_rtl BOOLEAN DEFAULT FALSE,

  -- Auto-detection settings
  auto_detect_language BOOLEAN DEFAULT TRUE,
  browser_language_detected VARCHAR(10),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_language_prefs_user ON user_language_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_language_prefs_ui_lang ON user_language_preferences(ui_language);
CREATE INDEX IF NOT EXISTS idx_user_language_prefs_comm_lang ON user_language_preferences(communication_language);

-- RLS for user language preferences
ALTER TABLE user_language_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own preferences
CREATE POLICY "Users can manage their own language preferences" ON user_language_preferences
  FOR ALL USING (user_id = auth.uid());

-- Admins can view all preferences for support purposes
CREATE POLICY "Admins can view all language preferences" ON user_language_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- =============================================================================
-- SUPPORTED LANGUAGES TABLE
-- Reference table for all supported languages
-- =============================================================================

CREATE TABLE IF NOT EXISTS supported_languages (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  native_name VARCHAR(100) NOT NULL,
  direction VARCHAR(3) NOT NULL DEFAULT 'ltr' CHECK (direction IN ('ltr', 'rtl')),
  category VARCHAR(20) NOT NULL CHECK (category IN ('official', 'immigrant', 'indigenous')),
  family VARCHAR(50),
  region TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  translation_complete BOOLEAN DEFAULT FALSE,
  priority_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data for supported languages
INSERT INTO supported_languages (code, name, native_name, direction, category, family, is_active, translation_complete, priority_order) VALUES
  -- Official Languages
  ('en', 'English', 'English', 'ltr', 'official', NULL, TRUE, TRUE, 1),
  ('fr', 'French', 'Francais', 'ltr', 'official', NULL, TRUE, TRUE, 2),

  -- Priority Immigrant Languages (Canada)
  ('es', 'Spanish', 'Espanol', 'ltr', 'immigrant', NULL, TRUE, TRUE, 10),
  ('zh', 'Mandarin Chinese', '普通话', 'ltr', 'immigrant', 'Sino-Tibetan', TRUE, TRUE, 11),
  ('yue', 'Cantonese', '廣東話', 'ltr', 'immigrant', 'Sino-Tibetan', TRUE, TRUE, 12),
  ('pa', 'Punjabi', 'ਪੰਜਾਬੀ', 'ltr', 'immigrant', 'Indo-Aryan', TRUE, TRUE, 13),
  ('tl', 'Tagalog', 'Tagalog', 'ltr', 'immigrant', 'Austronesian', TRUE, TRUE, 14),
  ('ar', 'Arabic', 'العربية', 'rtl', 'immigrant', 'Semitic', TRUE, TRUE, 15),

  -- Indigenous Languages
  ('cr', 'Cree', 'ᓀᐦᐃᔭᐍᐏᐣ (Nehiyawewin)', 'ltr', 'indigenous', 'Algonquian', TRUE, FALSE, 20),
  ('iu', 'Inuktitut', 'ᐃᓄᒃᑎᑐᑦ (Inuktitut)', 'ltr', 'indigenous', 'Inuit', TRUE, FALSE, 21),
  ('oj', 'Ojibwe', 'Anishinaabemowin', 'ltr', 'indigenous', 'Algonquian', TRUE, FALSE, 22),
  ('mic', 'Mikmaq', 'Mikmawisimk', 'ltr', 'indigenous', 'Algonquian', TRUE, FALSE, 23)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  native_name = EXCLUDED.native_name,
  direction = EXCLUDED.direction,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  translation_complete = EXCLUDED.translation_complete,
  priority_order = EXCLUDED.priority_order,
  updated_at = NOW();

-- =============================================================================
-- NOTIFICATION TEMPLATES - ADD NEW LANGUAGES
-- =============================================================================

-- Spanish Templates
INSERT INTO notification_templates (template_type, language_code, subject, body, short_body, variables, is_approved) VALUES
  ('missing_alert', 'es', 'Alerta de Persona Desaparecida: {{name}}',
   'Se ha presentado un reporte de persona desaparecida para {{name}}, de {{age}} anos.\n\nUltima vez vista: {{last_seen_location}} el {{last_seen_date}}\n\nDescripcion: {{description}}\n\nSi tiene alguna informacion, por favor contacte: {{contact}}',
   'DESAPARECIDO: {{name}}, {{age}}. Vista en {{last_seen_location}}. Llame al {{contact}}',
   ARRAY['name', 'age', 'last_seen_location', 'last_seen_date', 'description', 'contact'],
   TRUE),

  ('found_safe', 'es', 'Actualizacion: {{name}} Ha Sido Localizado/a',
   'Nos complace informar que {{name}} ha sido localizado/a y esta a salvo.\n\nGracias a todos los que ayudaron a difundir la informacion.\n\nEl caso #{{case_number}} esta ahora cerrado.',
   'ACTUALIZACION: {{name}} encontrado/a sano/a y salvo/a. Gracias por su ayuda.',
   ARRAY['name', 'case_number'],
   TRUE)
ON CONFLICT (template_type, language_code) DO NOTHING;

-- Mandarin Chinese Templates
INSERT INTO notification_templates (template_type, language_code, subject, body, short_body, variables, is_approved) VALUES
  ('missing_alert', 'zh', '失踪人员警报：{{name}}',
   '已提交关于{{name}}（{{age}}岁）的失踪人员报告。\n\n最后出现地点：{{last_seen_date}}在{{last_seen_location}}\n\n描述：{{description}}\n\n如有任何信息，请联系：{{contact}}',
   '失踪：{{name}}，{{age}}岁。最后出现于{{last_seen_location}}。请拨打{{contact}}',
   ARRAY['name', 'age', 'last_seen_location', 'last_seen_date', 'description', 'contact'],
   TRUE),

  ('found_safe', 'zh', '更新：{{name}}已被找到',
   '我们很高兴地报告{{name}}已被找到且安全。\n\n感谢所有帮助传播信息的人。\n\n案件 #{{case_number}} 现已关闭。',
   '更新：{{name}}已安全找到。感谢您的帮助。',
   ARRAY['name', 'case_number'],
   TRUE)
ON CONFLICT (template_type, language_code) DO NOTHING;

-- Cantonese Templates
INSERT INTO notification_templates (template_type, language_code, subject, body, short_body, variables, is_approved) VALUES
  ('missing_alert', 'yue', '失蹤人口警報：{{name}}',
   '已經提交咗{{name}}（{{age}}歲）嘅失蹤人口報告。\n\n最後出現地點：{{last_seen_date}}喺{{last_seen_location}}\n\n描述：{{description}}\n\n如有任何資料，請聯絡：{{contact}}',
   '失蹤：{{name}}，{{age}}歲。最後出現於{{last_seen_location}}。請打{{contact}}',
   ARRAY['name', 'age', 'last_seen_location', 'last_seen_date', 'description', 'contact'],
   TRUE),

  ('found_safe', 'yue', '更新：{{name}}已經搵到',
   '我哋好高興報告{{name}}已經搵到而且安全。\n\n多謝所有幫手傳播消息嘅人。\n\n案件 #{{case_number}} 而家已經結案。',
   '更新：{{name}}已經安全搵到。多謝你嘅幫忙。',
   ARRAY['name', 'case_number'],
   TRUE)
ON CONFLICT (template_type, language_code) DO NOTHING;

-- Punjabi Templates
INSERT INTO notification_templates (template_type, language_code, subject, body, short_body, variables, is_approved) VALUES
  ('missing_alert', 'pa', 'ਗੁੰਮ ਵਿਅਕਤੀ ਅਲਰਟ: {{name}}',
   '{{name}}, ਉਮਰ {{age}} ਸਾਲ ਲਈ ਗੁੰਮ ਵਿਅਕਤੀ ਦੀ ਰਿਪੋਰਟ ਦਰਜ ਕੀਤੀ ਗਈ ਹੈ।\n\nਆਖਰੀ ਵਾਰ ਦੇਖਿਆ: {{last_seen_date}} ਨੂੰ {{last_seen_location}}\n\nਵੇਰਵਾ: {{description}}\n\nਜੇ ਤੁਹਾਡੇ ਕੋਲ ਕੋਈ ਜਾਣਕਾਰੀ ਹੈ, ਕਿਰਪਾ ਕਰਕੇ ਸੰਪਰਕ ਕਰੋ: {{contact}}',
   'ਗੁੰਮ: {{name}}, {{age}}। {{last_seen_location}} ਵਿੱਚ ਦੇਖਿਆ। {{contact}} ਤੇ ਕਾਲ ਕਰੋ',
   ARRAY['name', 'age', 'last_seen_location', 'last_seen_date', 'description', 'contact'],
   TRUE),

  ('found_safe', 'pa', 'ਅੱਪਡੇਟ: {{name}} ਲੱਭ ਲਿਆ ਗਿਆ ਹੈ',
   'ਸਾਨੂੰ ਖੁਸ਼ੀ ਹੈ ਕਿ {{name}} ਲੱਭ ਲਿਆ ਗਿਆ ਹੈ ਅਤੇ ਸੁਰੱਖਿਅਤ ਹੈ।\n\nਉਨ੍ਹਾਂ ਸਾਰਿਆਂ ਦਾ ਧੰਨਵਾਦ ਜਿਨ੍ਹਾਂ ਨੇ ਖ਼ਬਰ ਫੈਲਾਉਣ ਵਿੱਚ ਮਦਦ ਕੀਤੀ।\n\nਕੇਸ #{{case_number}} ਹੁਣ ਬੰਦ ਹੈ।',
   'ਅੱਪਡੇਟ: {{name}} ਸੁਰੱਖਿਅਤ ਲੱਭਿਆ ਗਿਆ। ਤੁਹਾਡੀ ਮਦਦ ਲਈ ਧੰਨਵਾਦ।',
   ARRAY['name', 'case_number'],
   TRUE)
ON CONFLICT (template_type, language_code) DO NOTHING;

-- Tagalog Templates
INSERT INTO notification_templates (template_type, language_code, subject, body, short_body, variables, is_approved) VALUES
  ('missing_alert', 'tl', 'Alerto ng Nawawalang Tao: {{name}}',
   'Naiulat ang pagkawala ni {{name}}, edad {{age}}.\n\nHuling nakita: {{last_seen_location}} noong {{last_seen_date}}\n\nPaglalarawan: {{description}}\n\nKung may impormasyon ka, mangyaring makipag-ugnayan sa: {{contact}}',
   'NAWAWALA: {{name}}, {{age}}. Nakita sa {{last_seen_location}}. Tumawag sa {{contact}}',
   ARRAY['name', 'age', 'last_seen_location', 'last_seen_date', 'description', 'contact'],
   TRUE),

  ('found_safe', 'tl', 'Update: Natagpuan na si {{name}}',
   'Ikinagagalak naming iulat na natagpuan at ligtas na si {{name}}.\n\nSalamat sa lahat ng tumulong sa pagpapakalat ng impormasyon.\n\nAng Kaso #{{case_number}} ay sarado na.',
   'UPDATE: Natagpuan si {{name}} na ligtas. Salamat sa tulong.',
   ARRAY['name', 'case_number'],
   TRUE)
ON CONFLICT (template_type, language_code) DO NOTHING;

-- Arabic Templates (RTL)
INSERT INTO notification_templates (template_type, language_code, subject, body, short_body, variables, is_approved) VALUES
  ('missing_alert', 'ar', 'تنبيه شخص مفقود: {{name}}',
   'تم تقديم بلاغ عن شخص مفقود باسم {{name}}، العمر {{age}}.\n\nآخر مشاهدة: {{last_seen_location}} في {{last_seen_date}}\n\nالوصف: {{description}}\n\nإذا كانت لديك أي معلومات، يرجى الاتصال بـ: {{contact}}',
   'مفقود: {{name}}، {{age}}. شوهد في {{last_seen_location}}. اتصل بـ {{contact}}',
   ARRAY['name', 'age', 'last_seen_location', 'last_seen_date', 'description', 'contact'],
   TRUE),

  ('found_safe', 'ar', 'تحديث: تم العثور على {{name}}',
   'يسرنا الإبلاغ بأنه تم العثور على {{name}} وهو/هي بأمان.\n\nشكراً لكل من ساعد في نشر الخبر.\n\nالقضية #{{case_number}} مغلقة الآن.',
   'تحديث: تم العثور على {{name}} بأمان. شكراً لمساعدتكم.',
   ARRAY['name', 'case_number'],
   TRUE)
ON CONFLICT (template_type, language_code) DO NOTHING;

-- =============================================================================
-- TRANSLATION MANAGEMENT TABLE
-- Track translation status and contributors
-- =============================================================================

CREATE TABLE IF NOT EXISTS translation_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code VARCHAR(10) NOT NULL REFERENCES supported_languages(code),
  namespace VARCHAR(50) NOT NULL, -- 'common', 'intake', 'email', 'help'
  key_path TEXT NOT NULL, -- Dot notation path like 'nav.dashboard'
  english_text TEXT NOT NULL,
  translated_text TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'draft', 'review', 'approved', 'rejected')),
  translator_id UUID REFERENCES profiles(id),
  reviewer_id UUID REFERENCES profiles(id),
  translator_notes TEXT,
  review_notes TEXT,
  machine_translated BOOLEAN DEFAULT FALSE,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00 for machine translations
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  UNIQUE(language_code, namespace, key_path)
);

-- Indexes for translation management
CREATE INDEX IF NOT EXISTS idx_translation_mgmt_lang ON translation_management(language_code);
CREATE INDEX IF NOT EXISTS idx_translation_mgmt_status ON translation_management(status);
CREATE INDEX IF NOT EXISTS idx_translation_mgmt_namespace ON translation_management(namespace);

-- RLS for translation management
ALTER TABLE translation_management ENABLE ROW LEVEL SECURITY;

-- Admins can manage translations
CREATE POLICY "Admins can manage translations" ON translation_management
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Public can view approved translations
CREATE POLICY "Public can view approved translations" ON translation_management
  FOR SELECT USING (status = 'approved');

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp trigger for user_language_preferences
CREATE TRIGGER update_user_language_prefs_updated_at BEFORE UPDATE ON user_language_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for supported_languages
CREATE TRIGGER update_supported_languages_updated_at BEFORE UPDATE ON supported_languages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for translation_management
CREATE TRIGGER update_translation_mgmt_updated_at BEFORE UPDATE ON translation_management
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get user's preferred language with fallback
CREATE OR REPLACE FUNCTION get_user_language(p_user_id UUID)
RETURNS VARCHAR(10) AS $$
DECLARE
  v_language VARCHAR(10);
BEGIN
  SELECT ui_language INTO v_language
  FROM user_language_preferences
  WHERE user_id = p_user_id;

  IF v_language IS NULL THEN
    SELECT preferred_language INTO v_language
    FROM profiles
    WHERE id = p_user_id;
  END IF;

  RETURN COALESCE(v_language, 'en');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notification template in user's language with fallback
CREATE OR REPLACE FUNCTION get_notification_template(
  p_template_type VARCHAR(50),
  p_language_code VARCHAR(10)
)
RETURNS TABLE (
  subject TEXT,
  body TEXT,
  short_body VARCHAR(160),
  variables TEXT[],
  actual_language VARCHAR(10)
) AS $$
BEGIN
  -- Try requested language first
  RETURN QUERY
  SELECT nt.subject, nt.body, nt.short_body, nt.variables, nt.language_code
  FROM notification_templates nt
  WHERE nt.template_type = p_template_type
    AND nt.language_code = p_language_code
    AND nt.is_approved = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    -- Fall back to English
    RETURN QUERY
    SELECT nt.subject, nt.body, nt.short_body, nt.variables, nt.language_code
    FROM notification_templates nt
    WHERE nt.template_type = p_template_type
      AND nt.language_code = 'en'
      AND nt.is_approved = TRUE
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON user_language_preferences TO service_role;
GRANT ALL ON supported_languages TO service_role;
GRANT ALL ON translation_management TO service_role;
GRANT EXECUTE ON FUNCTION get_user_language(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_notification_template(VARCHAR, VARCHAR) TO service_role;
