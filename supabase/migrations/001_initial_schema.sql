-- LocateConnect Database Schema
-- Initial Migration (without PostGIS - add PostGIS extension later for spatial queries)

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('user', 'law_enforcement', 'journalist', 'admin', 'developer');
CREATE TYPE case_status AS ENUM ('active', 'resolved', 'closed', 'cold');
CREATE TYPE priority_level AS ENUM ('p0_critical', 'p1_high', 'p2_medium', 'p3_low', 'p4_routine');
CREATE TYPE lead_status AS ENUM ('new', 'investigating', 'verified', 'dismissed', 'acted_upon');
CREATE TYPE tip_status AS ENUM ('pending', 'reviewing', 'verified', 'hoax', 'duplicate');
CREATE TYPE case_disposition AS ENUM (
  'found_alive_safe',
  'found_alive_injured',
  'found_deceased',
  'returned_voluntarily',
  'located_runaway',
  'located_custody',
  'located_medical_facility',
  'located_shelter',
  'located_incarcerated',
  'false_report',
  'other'
);
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE gender AS ENUM ('male', 'female', 'non_binary', 'other', 'unknown');

-- =============================================================================
-- PROFILES TABLE (extends auth.users)
-- =============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role user_role DEFAULT 'user',
  organization TEXT,
  badge_number TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status verification_status DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  jurisdiction_id UUID,
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- JURISDICTIONS TABLE
-- =============================================================================

CREATE TABLE jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_fr TEXT,
  type TEXT NOT NULL,
  parent_jurisdiction_id UUID REFERENCES jurisdictions(id),
  region TEXT,
  province TEXT,
  country TEXT DEFAULT 'CA',
  priority_weights JSONB DEFAULT '{}',
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for profiles.jurisdiction_id after jurisdictions table exists
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_jurisdiction FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id);

-- =============================================================================
-- ORGANIZATIONS TABLE
-- =============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  api_endpoint TEXT,
  api_key_hash TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MISSING PERSONS / CASES TABLE
-- =============================================================================

CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT UNIQUE,

  -- Reporter info
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  reporter_relationship TEXT,

  -- Missing person info
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  nickname TEXT,
  date_of_birth DATE,
  age_at_disappearance INTEGER,
  gender gender,

  -- Physical description
  height_cm INTEGER,
  weight_kg INTEGER,
  eye_color TEXT,
  hair_color TEXT,
  hair_style TEXT,
  skin_tone TEXT,
  distinguishing_features TEXT,
  clothing_last_seen TEXT,

  -- Medical info
  medical_conditions TEXT[],
  medications TEXT[],
  mental_health_conditions TEXT[],
  is_medication_dependent BOOLEAN DEFAULT FALSE,

  -- Disappearance details
  last_seen_date TIMESTAMPTZ NOT NULL,
  last_seen_location TEXT,
  last_seen_latitude DOUBLE PRECISION,
  last_seen_longitude DOUBLE PRECISION,
  last_seen_city TEXT,
  last_seen_province TEXT,
  circumstances TEXT,

  -- Risk factors
  is_minor BOOLEAN DEFAULT FALSE,
  is_elderly BOOLEAN DEFAULT FALSE,
  is_indigenous BOOLEAN DEFAULT FALSE,
  has_dementia BOOLEAN DEFAULT FALSE,
  has_autism BOOLEAN DEFAULT FALSE,
  is_suicidal_risk BOOLEAN DEFAULT FALSE,
  suspected_abduction BOOLEAN DEFAULT FALSE,
  suspected_foul_play BOOLEAN DEFAULT FALSE,

  -- Status and priority
  status case_status DEFAULT 'active',
  priority_level priority_level DEFAULT 'p3_low',
  priority_score INTEGER DEFAULT 0,
  priority_factors JSONB DEFAULT '[]',

  -- Jurisdiction and assignment
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  assigned_organization_id UUID REFERENCES organizations(id),
  primary_investigator_id UUID REFERENCES profiles(id),

  -- Resolution info
  disposition case_disposition,
  resolution_date TIMESTAMPTZ,
  resolution_location TEXT,
  resolution_latitude DOUBLE PRECISION,
  resolution_longitude DOUBLE PRECISION,
  resolution_city TEXT,
  resolution_province TEXT,
  resolution_notes TEXT,
  resolved_by_id UUID REFERENCES profiles(id),

  -- Social media
  social_media_accounts JSONB DEFAULT '[]',

  -- Photos
  primary_photo_url TEXT,

  -- Flags
  is_amber_alert BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  is_media_restricted BOOLEAN DEFAULT FALSE,

  -- Bilingual
  circumstances_fr TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CASE PHOTOS TABLE
-- =============================================================================

CREATE TABLE case_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  is_age_progressed BOOLEAN DEFAULT FALSE,
  photo_date DATE,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- LEADS TABLE
-- =============================================================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT,
  source_reference TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  city TEXT,
  province TEXT,
  status lead_status DEFAULT 'new',
  credibility_score INTEGER DEFAULT 50,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES profiles(id),
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  sighting_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TIPS TABLE
-- =============================================================================

CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  tipster_id UUID REFERENCES profiles(id),
  tipster_name TEXT,
  tipster_email TEXT,
  tipster_phone TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  content TEXT NOT NULL,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  sighting_date TIMESTAMPTZ,
  status tip_status DEFAULT 'pending',
  credibility_score INTEGER,
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of UUID REFERENCES tips(id),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  lead_id UUID REFERENCES leads(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CASE UPDATES TABLE
-- =============================================================================

CREATE TABLE case_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  update_type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  old_status case_status,
  new_status case_status,
  old_priority priority_level,
  new_priority priority_level,
  is_public BOOLEAN DEFAULT FALSE,
  is_law_enforcement_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CASE ATTACHMENTS TABLE
-- =============================================================================

CREATE TABLE case_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  url TEXT NOT NULL,
  description TEXT,
  is_evidence BOOLEAN DEFAULT FALSE,
  is_law_enforcement_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CASE ASSIGNMENTS TABLE
-- =============================================================================

CREATE TABLE case_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL,
  assigned_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  UNIQUE(case_id, user_id, role)
);

-- =============================================================================
-- AUDIT LOGS TABLE
-- =============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- EMAIL TRACKING TABLE
-- =============================================================================

CREATE TABLE email_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  tracking_pixel_id UUID UNIQUE DEFAULT gen_random_uuid(),
  opened_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,
  last_opened_ip INET,
  last_opened_user_agent TEXT,
  last_opened_location JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_organization ON profiles(organization);
CREATE INDEX idx_profiles_jurisdiction ON profiles(jurisdiction_id);

CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_priority ON cases(priority_level);
CREATE INDEX idx_cases_reporter ON cases(reporter_id);
CREATE INDEX idx_cases_jurisdiction ON cases(jurisdiction_id);
CREATE INDEX idx_cases_created ON cases(created_at DESC);
CREATE INDEX idx_cases_last_seen_date ON cases(last_seen_date DESC);
CREATE INDEX idx_cases_disposition ON cases(disposition);
CREATE INDEX idx_cases_is_indigenous ON cases(is_indigenous) WHERE is_indigenous = TRUE;
CREATE INDEX idx_cases_is_minor ON cases(is_minor) WHERE is_minor = TRUE;
CREATE INDEX idx_cases_active ON cases(status) WHERE status = 'active';

CREATE INDEX idx_leads_case ON leads(case_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);

CREATE INDEX idx_tips_case ON tips(case_id);
CREATE INDEX idx_tips_status ON tips(status);

CREATE INDEX idx_case_updates_case ON case_updates(case_id);
CREATE INDEX idx_case_updates_author ON case_updates(author_id);
CREATE INDEX idx_case_updates_created ON case_updates(created_at DESC);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "LE can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Cases policies
CREATE POLICY "Users can view their own cases" ON cases
  FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY "Users can create cases" ON cases
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can update their own cases" ON cases
  FOR UPDATE USING (reporter_id = auth.uid());

CREATE POLICY "Public can view public active cases" ON cases
  FOR SELECT USING (is_public = TRUE AND status = 'active');

CREATE POLICY "LE can view all cases" ON cases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

CREATE POLICY "LE can update cases" ON cases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Case photos policies
CREATE POLICY "Users can view photos of their cases" ON case_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = case_photos.case_id AND cases.reporter_id = auth.uid())
  );

CREATE POLICY "Users can add photos to their cases" ON case_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = case_photos.case_id AND cases.reporter_id = auth.uid())
  );

CREATE POLICY "Public can view photos of public cases" ON case_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = case_photos.case_id AND cases.is_public = TRUE AND cases.status = 'active')
  );

-- Leads policies
CREATE POLICY "LE can view leads" ON leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

CREATE POLICY "Case owners can view their case leads" ON leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = leads.case_id
      AND cases.reporter_id = auth.uid()
    )
  );

CREATE POLICY "LE can create leads" ON leads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

CREATE POLICY "LE can update leads" ON leads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Tips policies
CREATE POLICY "Anyone can create tips" ON tips
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "LE can view tips" ON tips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can update tips" ON tips
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Case updates policies
CREATE POLICY "Case owners can view updates" ON case_updates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = case_updates.case_id AND cases.reporter_id = auth.uid())
    OR is_public = TRUE
  );

CREATE POLICY "LE can view all updates" ON case_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can create updates" ON case_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Audit logs policies (admin only)
CREATE POLICY "Admins can view audit logs" ON audit_logs
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

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate case number
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(case_number FROM 9) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM cases
  WHERE case_number LIKE 'LC-' || year_part || '-%';

  NEW.case_number := 'LC-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit logging function
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tips_updated_at BEFORE UPDATE ON tips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jurisdictions_updated_at BEFORE UPDATE ON jurisdictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Case number generation
CREATE TRIGGER generate_case_number_trigger BEFORE INSERT ON cases
  FOR EACH ROW EXECUTE FUNCTION generate_case_number();

-- Audit logging triggers
CREATE TRIGGER audit_cases AFTER INSERT OR UPDATE OR DELETE ON cases
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_leads AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_tips AFTER INSERT OR UPDATE OR DELETE ON tips
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- SEED DATA: Default Jurisdictions
-- =============================================================================

INSERT INTO jurisdictions (code, name, name_fr, type, province, country) VALUES
  ('QC', 'Province of Quebec', 'Province de Québec', 'provincial', 'QC', 'CA'),
  ('ON', 'Province of Ontario', 'Province de l''Ontario', 'provincial', 'ON', 'CA'),
  ('BC', 'Province of British Columbia', 'Province de la Colombie-Britannique', 'provincial', 'BC', 'CA'),
  ('AB', 'Province of Alberta', 'Province de l''Alberta', 'provincial', 'AB', 'CA');

INSERT INTO jurisdictions (code, name, name_fr, type, region, province, country, priority_weights) VALUES
  ('SPVM', 'Service de police de la Ville de Montréal', 'Service de police de la Ville de Montréal', 'municipal', 'Montreal', 'QC', 'CA',
   '{"ageUnder12": 30, "ageUnder18": 20, "age65Plus": 15, "medicalDependency": 30, "mentalHealthRisk": 25, "suicidalRisk": 35, "dementia": 30, "autism": 20, "suspectedAbduction": 40, "suspectedFoulPlay": 35, "indigenousIdentity": 15, "thresholds": {"p0": 80, "p1": 60, "p2": 40, "p3": 20}}'),
  ('SQ', 'Sûreté du Québec', 'Sûreté du Québec', 'provincial', NULL, 'QC', 'CA', '{}'),
  ('OPP', 'Ontario Provincial Police', 'Police provinciale de l''Ontario', 'provincial', NULL, 'ON', 'CA', '{}'),
  ('RCMP', 'Royal Canadian Mounted Police', 'Gendarmerie royale du Canada', 'federal', NULL, NULL, 'CA', '{}');

-- =============================================================================
-- GRANTS FOR SERVICE ROLE
-- =============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
