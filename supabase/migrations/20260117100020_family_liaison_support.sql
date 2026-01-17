-- LocateConnect Database Schema
-- Migration: Family Liaison & Support Resources (LC-FEAT-029)
-- Comprehensive support system for families of missing persons throughout the search process

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE liaison_type AS ENUM ('law_enforcement', 'social_worker', 'volunteer', 'advocate');
CREATE TYPE family_support_category AS ENUM ('mental_health', 'financial', 'legal', 'media', 'peer_support', 'grief', 'practical');
CREATE TYPE check_in_frequency AS ENUM ('daily', 'every_other_day', 'weekly', 'biweekly', 'monthly', 'as_needed');
CREATE TYPE support_group_type AS ENUM ('in_person', 'virtual', 'hybrid');
CREATE TYPE check_in_status AS ENUM ('scheduled', 'completed', 'missed', 'rescheduled', 'cancelled');
CREATE TYPE peer_match_status AS ENUM ('pending', 'active', 'paused', 'ended');
CREATE TYPE document_template_type AS ENUM ('missing_poster', 'press_release', 'social_media', 'flyer', 'thank_you', 'update');
CREATE TYPE message_sender_type AS ENUM ('liaison', 'family', 'system');
CREATE TYPE progress_report_type AS ENUM ('weekly', 'monthly', 'milestone', 'custom');

-- =============================================================================
-- FAMILY LIAISONS TABLE
-- =============================================================================

CREATE TABLE family_liaisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  liaison_type liaison_type NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  unassigned_at TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(case_id, user_id)
);

-- =============================================================================
-- FAMILY CONTACTS TABLE
-- =============================================================================

CREATE TABLE family_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile_phone TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  is_primary_contact BOOLEAN DEFAULT FALSE,
  preferred_contact_method TEXT DEFAULT 'phone',
  preferred_language TEXT DEFAULT 'en',
  accessibility_needs TEXT,
  notification_preferences JSONB DEFAULT '{"caseUpdates": true, "mediaAlerts": true, "checkInReminders": true, "resourceSuggestions": true}',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SCHEDULED CHECK-INS TABLE
-- =============================================================================

CREATE TABLE scheduled_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  family_contact_id UUID NOT NULL REFERENCES family_contacts(id) ON DELETE CASCADE,
  liaison_id UUID REFERENCES family_liaisons(id) ON DELETE SET NULL,
  frequency check_in_frequency DEFAULT 'weekly',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  contact_method TEXT DEFAULT 'phone',
  status check_in_status DEFAULT 'scheduled',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT,
  next_check_in_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SUPPORT RESOURCES TABLE
-- =============================================================================

CREATE TABLE support_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_fr TEXT,
  category family_support_category NOT NULL,
  subcategory TEXT,
  description TEXT NOT NULL,
  description_fr TEXT,
  organization_name TEXT,
  website TEXT,
  phone TEXT,
  toll_free_phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  serves_provinces TEXT[] DEFAULT '{}',
  serves_nationally BOOLEAN DEFAULT FALSE,
  is_available_24_7 BOOLEAN DEFAULT FALSE,
  operating_hours TEXT,
  languages TEXT[] DEFAULT ARRAY['en', 'fr'],
  eligibility_notes TEXT,
  cost_info TEXT,
  is_free BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  tags TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SUPPORT GROUPS TABLE
-- =============================================================================

CREATE TABLE support_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_fr TEXT,
  description TEXT,
  description_fr TEXT,
  group_type support_group_type NOT NULL,
  category TEXT DEFAULT 'missing_persons_families',
  organization_name TEXT,
  facilitator_name TEXT,
  facilitator_credentials TEXT,
  meeting_frequency TEXT,
  meeting_day TEXT,
  meeting_time TIME,
  timezone TEXT DEFAULT 'America/Toronto',
  location TEXT,
  virtual_platform TEXT,
  virtual_link TEXT,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  is_open_enrollment BOOLEAN DEFAULT TRUE,
  registration_required BOOLEAN DEFAULT FALSE,
  registration_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  serves_provinces TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT ARRAY['en'],
  is_free BOOLEAN DEFAULT TRUE,
  cost_info TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PEER SUPPORT MATCHES TABLE
-- =============================================================================

CREATE TABLE peer_support_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seeking_family_contact_id UUID NOT NULL REFERENCES family_contacts(id) ON DELETE CASCADE,
  supporting_family_contact_id UUID NOT NULL REFERENCES family_contacts(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  matched_by UUID REFERENCES profiles(id),
  status peer_match_status DEFAULT 'pending',
  support_type TEXT DEFAULT 'phone',
  frequency_preference TEXT,
  notes TEXT,
  ended_at TIMESTAMPTZ,
  end_reason TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seeking_family_contact_id, supporting_family_contact_id)
);

-- =============================================================================
-- DOCUMENT TEMPLATES TABLE
-- =============================================================================

CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_fr TEXT,
  template_type document_template_type NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  content_fr TEXT,
  placeholders TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  file_format TEXT DEFAULT 'pdf',
  is_default BOOLEAN DEFAULT FALSE,
  category TEXT,
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- GENERATED DOCUMENTS TABLE
-- =============================================================================

CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  generated_by UUID NOT NULL REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  placeholder_values JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FAMILY MESSAGES TABLE
-- =============================================================================

CREATE TABLE family_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  sender_type message_sender_type NOT NULL,
  recipient_id UUID REFERENCES profiles(id),
  recipient_contact_id UUID REFERENCES family_contacts(id),
  thread_id UUID,
  subject TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_urgent BOOLEAN DEFAULT FALSE,
  is_encrypted BOOLEAN DEFAULT TRUE,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Self-referencing thread_id after table creation
ALTER TABLE family_messages ADD CONSTRAINT fk_thread_id FOREIGN KEY (thread_id) REFERENCES family_messages(id) ON DELETE SET NULL;

-- =============================================================================
-- CASE PROGRESS REPORTS TABLE
-- =============================================================================

CREATE TABLE case_progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  report_type progress_report_type DEFAULT 'weekly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  summary TEXT NOT NULL,
  activities_completed TEXT[] DEFAULT '{}',
  leads_followed INTEGER DEFAULT 0,
  tips_received INTEGER DEFAULT 0,
  media_outreach TEXT,
  upcoming_activities TEXT[] DEFAULT '{}',
  family_questions TEXT[] DEFAULT '{}',
  questions_answered TEXT[] DEFAULT '{}',
  generated_by UUID NOT NULL REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_to_family BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  family_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FAMILY RESOURCE ASSIGNMENTS TABLE
-- Junction table for recommending resources to specific cases/families
-- =============================================================================

CREATE TABLE family_resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES support_resources(id) ON DELETE CASCADE,
  support_group_id UUID REFERENCES support_groups(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  family_contact_id UUID REFERENCES family_contacts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'recommended',
  family_feedback TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT resource_or_group CHECK (
    (resource_id IS NOT NULL AND support_group_id IS NULL) OR
    (resource_id IS NULL AND support_group_id IS NOT NULL)
  )
);

-- =============================================================================
-- FAQ AND GUIDES TABLE
-- =============================================================================

CREATE TABLE family_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  question_fr TEXT,
  answer TEXT NOT NULL,
  answer_fr TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  languages TEXT[] DEFAULT ARRAY['en', 'fr'],
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ACCESSIBILITY ACCOMMODATIONS TABLE
-- =============================================================================

CREATE TABLE accessibility_accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_contact_id UUID NOT NULL REFERENCES family_contacts(id) ON DELETE CASCADE,
  accommodation_type TEXT NOT NULL,
  description TEXT,
  special_instructions TEXT,
  interpreter_needed BOOLEAN DEFAULT FALSE,
  interpreter_language TEXT,
  assistive_technology_needed BOOLEAN DEFAULT FALSE,
  assistive_technology_type TEXT,
  mobility_accommodations TEXT,
  communication_preferences TEXT,
  other_needs TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_family_liaisons_case ON family_liaisons(case_id);
CREATE INDEX idx_family_liaisons_user ON family_liaisons(user_id);
CREATE INDEX idx_family_liaisons_primary ON family_liaisons(case_id, is_primary) WHERE is_primary = TRUE;

CREATE INDEX idx_family_contacts_case ON family_contacts(case_id);
CREATE INDEX idx_family_contacts_primary ON family_contacts(case_id, is_primary_contact) WHERE is_primary_contact = TRUE;

CREATE INDEX idx_scheduled_check_ins_case ON scheduled_check_ins(case_id);
CREATE INDEX idx_scheduled_check_ins_date ON scheduled_check_ins(scheduled_date);
CREATE INDEX idx_scheduled_check_ins_status ON scheduled_check_ins(status);

CREATE INDEX idx_support_resources_category ON support_resources(category);
CREATE INDEX idx_support_resources_province ON support_resources USING GIN (serves_provinces);
CREATE INDEX idx_support_resources_active ON support_resources(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_support_groups_type ON support_groups(group_type);
CREATE INDEX idx_support_groups_category ON support_groups(category);

CREATE INDEX idx_peer_matches_seeking ON peer_support_matches(seeking_family_contact_id);
CREATE INDEX idx_peer_matches_supporting ON peer_support_matches(supporting_family_contact_id);
CREATE INDEX idx_peer_matches_status ON peer_support_matches(status);

CREATE INDEX idx_document_templates_type ON document_templates(template_type);

CREATE INDEX idx_generated_documents_case ON generated_documents(case_id);

CREATE INDEX idx_family_messages_case ON family_messages(case_id);
CREATE INDEX idx_family_messages_sender ON family_messages(sender_id);
CREATE INDEX idx_family_messages_thread ON family_messages(thread_id);
CREATE INDEX idx_family_messages_unread ON family_messages(recipient_id, is_read) WHERE is_read = FALSE;

CREATE INDEX idx_progress_reports_case ON case_progress_reports(case_id);
CREATE INDEX idx_progress_reports_period ON case_progress_reports(period_start, period_end);

CREATE INDEX idx_resource_assignments_case ON family_resource_assignments(case_id);

CREATE INDEX idx_family_faqs_category ON family_faqs(category);
CREATE INDEX idx_family_faqs_featured ON family_faqs(is_featured) WHERE is_featured = TRUE;

CREATE INDEX idx_accessibility_contact ON accessibility_accommodations(family_contact_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE family_liaisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_support_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessibility_accommodations ENABLE ROW LEVEL SECURITY;

-- Family Liaisons policies
CREATE POLICY "Case owners can view their liaisons" ON family_liaisons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = family_liaisons.case_id AND cases.reporter_id = auth.uid())
  );

CREATE POLICY "LE can view all liaisons" ON family_liaisons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer'))
  );

CREATE POLICY "LE can manage liaisons" ON family_liaisons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer') AND p.is_verified = TRUE)
  );

-- Family Contacts policies
CREATE POLICY "Case owners can view their contacts" ON family_contacts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = family_contacts.case_id AND cases.reporter_id = auth.uid())
  );

CREATE POLICY "Case owners can manage their contacts" ON family_contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = family_contacts.case_id AND cases.reporter_id = auth.uid())
  );

CREATE POLICY "LE can view all contacts" ON family_contacts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer'))
  );

CREATE POLICY "LE can manage contacts" ON family_contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer') AND p.is_verified = TRUE)
  );

-- Check-ins policies
CREATE POLICY "Case owners can view their check-ins" ON scheduled_check_ins
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = scheduled_check_ins.case_id AND cases.reporter_id = auth.uid())
  );

CREATE POLICY "LE can view all check-ins" ON scheduled_check_ins
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer'))
  );

CREATE POLICY "LE can manage check-ins" ON scheduled_check_ins
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer'))
  );

-- Support Resources policies (public read)
CREATE POLICY "Anyone can view active resources" ON support_resources
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage resources" ON support_resources
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer'))
  );

-- Support Groups policies (public read)
CREATE POLICY "Anyone can view active groups" ON support_groups
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage groups" ON support_groups
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer'))
  );

-- Peer Matches policies
CREATE POLICY "Participants can view their matches" ON peer_support_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_contacts fc
      JOIN cases c ON c.id = fc.case_id
      WHERE (fc.id = peer_support_matches.seeking_family_contact_id OR fc.id = peer_support_matches.supporting_family_contact_id)
      AND c.reporter_id = auth.uid()
    )
  );

CREATE POLICY "LE can view all matches" ON peer_support_matches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer'))
  );

CREATE POLICY "LE can manage matches" ON peer_support_matches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer'))
  );

-- Document Templates policies (public read for active)
CREATE POLICY "Anyone can view active templates" ON document_templates
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage templates" ON document_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer'))
  );

-- Generated Documents policies
CREATE POLICY "Case owners can view their documents" ON generated_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = generated_documents.case_id AND cases.reporter_id = auth.uid())
  );

CREATE POLICY "Case owners can create documents" ON generated_documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = generated_documents.case_id AND cases.reporter_id = auth.uid())
  );

CREATE POLICY "LE can view all documents" ON generated_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer'))
  );

CREATE POLICY "LE can manage documents" ON generated_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer'))
  );

-- Messages policies
CREATE POLICY "Users can view their messages" ON family_messages
  FOR SELECT USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
    OR EXISTS (SELECT 1 FROM cases WHERE cases.id = family_messages.case_id AND cases.reporter_id = auth.uid())
  );

CREATE POLICY "Users can send messages" ON family_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer'))
  );

CREATE POLICY "Recipients can update read status" ON family_messages
  FOR UPDATE USING (recipient_id = auth.uid());

CREATE POLICY "LE can view all messages" ON family_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer'))
  );

-- Progress Reports policies
CREATE POLICY "Case owners can view their reports" ON case_progress_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = case_progress_reports.case_id AND cases.reporter_id = auth.uid())
  );

CREATE POLICY "LE can view all reports" ON case_progress_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer'))
  );

CREATE POLICY "LE can manage reports" ON case_progress_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer'))
  );

-- Resource Assignments policies
CREATE POLICY "Case owners can view their assignments" ON family_resource_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = family_resource_assignments.case_id AND cases.reporter_id = auth.uid())
  );

CREATE POLICY "LE can manage assignments" ON family_resource_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer'))
  );

-- FAQs policies (public read)
CREATE POLICY "Anyone can view active FAQs" ON family_faqs
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage FAQs" ON family_faqs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'developer'))
  );

-- Accessibility policies
CREATE POLICY "Case owners can view their accommodations" ON accessibility_accommodations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_contacts fc
      JOIN cases c ON c.id = fc.case_id
      WHERE fc.id = accessibility_accommodations.family_contact_id
      AND c.reporter_id = auth.uid()
    )
  );

CREATE POLICY "Case owners can manage their accommodations" ON accessibility_accommodations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM family_contacts fc
      JOIN cases c ON c.id = fc.case_id
      WHERE fc.id = accessibility_accommodations.family_contact_id
      AND c.reporter_id = auth.uid()
    )
  );

CREATE POLICY "LE can view all accommodations" ON accessibility_accommodations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('law_enforcement', 'admin', 'developer'))
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_family_liaisons_updated_at BEFORE UPDATE ON family_liaisons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_contacts_updated_at BEFORE UPDATE ON family_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_check_ins_updated_at BEFORE UPDATE ON scheduled_check_ins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_resources_updated_at BEFORE UPDATE ON support_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_groups_updated_at BEFORE UPDATE ON support_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_peer_support_matches_updated_at BEFORE UPDATE ON peer_support_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_progress_reports_updated_at BEFORE UPDATE ON case_progress_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_faqs_updated_at BEFORE UPDATE ON family_faqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accessibility_accommodations_updated_at BEFORE UPDATE ON accessibility_accommodations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit triggers for sensitive tables
CREATE TRIGGER audit_family_liaisons AFTER INSERT OR UPDATE OR DELETE ON family_liaisons
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_family_messages AFTER INSERT OR UPDATE OR DELETE ON family_messages
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_case_progress_reports AFTER INSERT OR UPDATE OR DELETE ON case_progress_reports
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to ensure only one primary liaison per case
CREATE OR REPLACE FUNCTION ensure_single_primary_liaison()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    UPDATE family_liaisons
    SET is_primary = FALSE
    WHERE case_id = NEW.case_id AND id != NEW.id AND is_primary = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_liaison_trigger
  BEFORE INSERT OR UPDATE ON family_liaisons
  FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_liaison();

-- Function to ensure only one primary family contact per case
CREATE OR REPLACE FUNCTION ensure_single_primary_contact()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary_contact = TRUE THEN
    UPDATE family_contacts
    SET is_primary_contact = FALSE
    WHERE case_id = NEW.case_id AND id != NEW.id AND is_primary_contact = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_contact_trigger
  BEFORE INSERT OR UPDATE ON family_contacts
  FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_contact();

-- Function to auto-create next check-in
CREATE OR REPLACE FUNCTION auto_schedule_next_check_in()
RETURNS TRIGGER AS $$
DECLARE
  next_date DATE;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    CASE NEW.frequency
      WHEN 'daily' THEN next_date := NEW.scheduled_date + INTERVAL '1 day';
      WHEN 'every_other_day' THEN next_date := NEW.scheduled_date + INTERVAL '2 days';
      WHEN 'weekly' THEN next_date := NEW.scheduled_date + INTERVAL '1 week';
      WHEN 'biweekly' THEN next_date := NEW.scheduled_date + INTERVAL '2 weeks';
      WHEN 'monthly' THEN next_date := NEW.scheduled_date + INTERVAL '1 month';
      ELSE next_date := NULL;
    END CASE;

    IF next_date IS NOT NULL THEN
      NEW.next_check_in_date := next_date;

      INSERT INTO scheduled_check_ins (
        case_id, family_contact_id, liaison_id, frequency,
        scheduled_date, scheduled_time, contact_method, status
      ) VALUES (
        NEW.case_id, NEW.family_contact_id, NEW.liaison_id, NEW.frequency,
        next_date, NEW.scheduled_time, NEW.contact_method, 'scheduled'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_schedule_next_check_in_trigger
  AFTER UPDATE ON scheduled_check_ins
  FOR EACH ROW EXECUTE FUNCTION auto_schedule_next_check_in();

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Insert default support resources
INSERT INTO support_resources (name, name_fr, category, description, description_fr, organization_name, toll_free_phone, website, serves_nationally, is_free, languages, is_verified, is_active) VALUES
-- Mental Health Resources
('Canadian Mental Health Association Crisis Line', 'Ligne de crise de l''ACSM', 'mental_health', '24/7 crisis support for mental health emergencies. Trained counselors available to provide immediate support.', 'Soutien de crise 24/7 pour les urgences de sante mentale.', 'Canadian Mental Health Association', '1-833-456-4566', 'https://cmha.ca', TRUE, TRUE, ARRAY['en', 'fr'], TRUE, TRUE),
('Talk Suicide Canada', 'Parlons suicide Canada', 'mental_health', 'National suicide prevention service providing 24/7 support.', 'Service national de prevention du suicide offrant un soutien 24/7.', 'Centre for Suicide Prevention', '1-833-456-4566', 'https://talksuicide.ca', TRUE, TRUE, ARRAY['en', 'fr'], TRUE, TRUE),
('Kids Help Phone', 'Jeunesse, J''ecoute', 'mental_health', 'Canada''s only 24/7 national support service for young people. Professional counseling, information, and referrals.', 'Seul service d''aide national canadien offert aux jeunes 24/7.', 'Kids Help Phone', '1-800-668-6868', 'https://kidshelpphone.ca', TRUE, TRUE, ARRAY['en', 'fr'], TRUE, TRUE),

-- Financial Assistance
('Victim Services Financial Assistance', 'Aide financiere aux victimes', 'financial', 'Provincial victim services programs may provide financial assistance for families of missing persons.', 'Les programmes provinciaux d''aide aux victimes peuvent fournir une aide financiere.', 'Provincial Victim Services', NULL, 'https://justice.gc.ca/eng/cj-jp/victims-victimes/index.html', TRUE, TRUE, ARRAY['en', 'fr'], TRUE, TRUE),
('Canadian Red Cross Emergency Assistance', 'Aide d''urgence de la Croix-Rouge canadienne', 'financial', 'Emergency assistance for families in crisis situations, including search-related expenses.', 'Aide d''urgence pour les familles en situation de crise.', 'Canadian Red Cross', '1-800-418-1111', 'https://redcross.ca', TRUE, TRUE, ARRAY['en', 'fr'], TRUE, TRUE),

-- Legal Aid
('Legal Aid Ontario', 'Aide juridique Ontario', 'legal', 'Free legal services for eligible low-income individuals.', 'Services juridiques gratuits pour les personnes a faible revenu admissibles.', 'Legal Aid Ontario', '1-800-668-8258', 'https://legalaid.on.ca', FALSE, TRUE, ARRAY['en', 'fr'], TRUE, TRUE),
('National Victim Rights Helpline', 'Ligne d''aide nationale pour les droits des victimes', 'legal', 'Information about victim rights and the criminal justice system.', 'Information sur les droits des victimes et le systeme de justice penale.', 'Department of Justice Canada', '1-866-525-0554', 'https://justice.gc.ca', TRUE, TRUE, ARRAY['en', 'fr'], TRUE, TRUE),

-- Media Coaching
('Media Relations Guide for Families', 'Guide des relations mediatiques pour les familles', 'media', 'Resources and guidance for families dealing with media attention during a missing persons case.', 'Ressources et conseils pour les familles confrontees a l''attention des medias.', 'Missing Children Society of Canada', '1-800-661-6160', 'https://mcsc.ca', TRUE, TRUE, ARRAY['en', 'fr'], TRUE, TRUE),

-- Grief Counseling
('Canadian Hospice Palliative Care Association', 'Association canadienne de soins palliatifs', 'grief', 'Resources for grief and bereavement support across Canada.', 'Ressources pour le soutien au deuil a travers le Canada.', 'CHPCA', '1-800-668-2785', 'https://chpca.ca', TRUE, TRUE, ARRAY['en', 'fr'], TRUE, TRUE),
('GriefNet', 'GriefNet', 'grief', 'Online grief support community with resources and peer connections.', 'Communaute de soutien au deuil en ligne.', 'GriefNet', NULL, 'https://griefnet.org', TRUE, TRUE, ARRAY['en'], TRUE, TRUE),

-- Peer Support
('Families of Missing Persons Network', 'Reseau des familles de personnes disparues', 'peer_support', 'Connecting families who have experienced similar situations for mutual support.', 'Mettre en contact les familles ayant vecu des situations similaires.', 'Missing Children Society of Canada', '1-800-661-6160', 'https://mcsc.ca', TRUE, TRUE, ARRAY['en', 'fr'], TRUE, TRUE),

-- Practical Support
('Salvation Army Emergency Services', 'Services d''urgence de l''Armee du Salut', 'practical', 'Practical support including meals, temporary housing, and basic necessities.', 'Soutien pratique incluant repas, hebergement temporaire et necessites de base.', 'Salvation Army', NULL, 'https://salvationarmy.ca', TRUE, TRUE, ARRAY['en', 'fr'], TRUE, TRUE),
('211 Canada', '211 Canada', 'practical', 'Find community and social services in your area. Available 24/7.', 'Trouvez des services communautaires et sociaux dans votre region. Disponible 24/7.', '211 Canada', '211', 'https://211.ca', TRUE, TRUE, ARRAY['en', 'fr'], TRUE, TRUE);

-- Insert default support groups
INSERT INTO support_groups (name, name_fr, description, description_fr, group_type, category, organization_name, meeting_frequency, is_open_enrollment, languages, is_free) VALUES
('Families of the Missing Support Circle', 'Cercle de soutien aux familles de personnes disparues', 'Weekly virtual support group for families of missing persons. Facilitated by trained counselors.', 'Groupe de soutien virtuel hebdomadaire pour les familles de personnes disparues.', 'virtual', 'missing_persons_families', 'Missing Children Society of Canada', 'Weekly', TRUE, ARRAY['en'], TRUE),
('Hope & Healing Group', 'Groupe Espoir et guerison', 'Bi-weekly in-person support group in major cities. Share experiences and coping strategies.', 'Groupe de soutien en personne bimensuel dans les grandes villes.', 'hybrid', 'missing_persons_families', 'Victim Services', 'Bi-weekly', TRUE, ARRAY['en', 'fr'], TRUE),
('Ambiguous Loss Support Group', 'Groupe de soutien pour perte ambigue', 'Specialized support for families dealing with the unique grief of having a missing loved one.', 'Soutien specialise pour les familles confrontees au deuil unique d''avoir un etre cher disparu.', 'virtual', 'grief_support', 'Canadian Mental Health Association', 'Monthly', TRUE, ARRAY['en', 'fr'], TRUE);

-- Insert default document templates
INSERT INTO document_templates (name, name_fr, template_type, description, content, content_fr, placeholders, is_default, is_active) VALUES
('Standard Missing Person Poster', 'Affiche standard de personne disparue', 'missing_poster', 'Standard missing person poster template with photo and key details',
'MISSING PERSON

{{full_name}}
Age: {{age}}
Last Seen: {{last_seen_date}} at {{last_seen_location}}

Description:
Height: {{height}} | Weight: {{weight}}
Hair: {{hair_color}} | Eyes: {{eye_color}}
Last Seen Wearing: {{clothing_description}}

Distinguishing Features: {{distinguishing_features}}

If you have any information, please contact:
{{contact_phone}}
Case Reference: {{case_number}}

DO NOT APPROACH - Contact authorities immediately',
'PERSONNE DISPARUE

{{full_name}}
Age: {{age}}
Derniere fois vue: {{last_seen_date}} a {{last_seen_location}}

Description:
Taille: {{height}} | Poids: {{weight}}
Cheveux: {{hair_color}} | Yeux: {{eye_color}}
Derniers vetements portes: {{clothing_description}}

Signes distinctifs: {{distinguishing_features}}

Si vous avez des informations, veuillez contacter:
{{contact_phone}}
Reference du dossier: {{case_number}}

NE PAS APPROCHER - Contactez les autorites immediatement',
ARRAY['full_name', 'age', 'last_seen_date', 'last_seen_location', 'height', 'weight', 'hair_color', 'eye_color', 'clothing_description', 'distinguishing_features', 'contact_phone', 'case_number'],
TRUE, TRUE),

('Press Release Template', 'Modele de communique de presse', 'press_release', 'Template for press releases about missing persons cases',
'FOR IMMEDIATE RELEASE
{{release_date}}

MISSING PERSON: {{full_name}}, {{age}}, Last Seen {{last_seen_date}}

{{city}}, {{province}} - {{organization_name}} is seeking the public''s assistance in locating {{full_name}}, a {{age}}-year-old {{gender}} who was last seen on {{last_seen_date}} in {{last_seen_location}}.

{{full_name}} is described as {{height}} tall, weighing approximately {{weight}}, with {{hair_color}} hair and {{eye_color}} eyes. {{pronoun}} was last seen wearing {{clothing_description}}.

{{additional_details}}

Anyone with information regarding the whereabouts of {{full_name}} is asked to contact {{organization_name}} at {{contact_phone}} or their local police department. Reference case number {{case_number}}.

###

Media Contact:
{{media_contact_name}}
{{media_contact_phone}}
{{media_contact_email}}',
'POUR DIFFUSION IMMEDIATE
{{release_date}}

PERSONNE DISPARUE: {{full_name}}, {{age}} ans, Derniere fois vue {{last_seen_date}}

{{city}}, {{province}} - {{organization_name}} sollicite l''aide du public pour localiser {{full_name}}.

###

Contact media:
{{media_contact_name}}
{{media_contact_phone}}
{{media_contact_email}}',
ARRAY['release_date', 'full_name', 'age', 'last_seen_date', 'city', 'province', 'organization_name', 'gender', 'last_seen_location', 'height', 'weight', 'hair_color', 'eye_color', 'pronoun', 'clothing_description', 'additional_details', 'contact_phone', 'case_number', 'media_contact_name', 'media_contact_phone', 'media_contact_email'],
TRUE, TRUE),

('Social Media Post', 'Publication sur les reseaux sociaux', 'social_media', 'Short format for social media sharing',
'MISSING: {{full_name}}, {{age}}
Last seen: {{last_seen_date}} in {{last_seen_location}}
Description: {{brief_description}}
Contact: {{contact_phone}}
Case #{{case_number}}
Please share! #MissingPerson #{{city}}',
'DISPARU(E): {{full_name}}, {{age}} ans
Derniere fois vu(e): {{last_seen_date}} a {{last_seen_location}}
Description: {{brief_description}}
Contact: {{contact_phone}}
Dossier #{{case_number}}
SVP partagez! #PersonneDisparue #{{city}}',
ARRAY['full_name', 'age', 'last_seen_date', 'last_seen_location', 'brief_description', 'contact_phone', 'case_number', 'city'],
TRUE, TRUE);

-- Insert default FAQs
INSERT INTO family_faqs (question, question_fr, answer, answer_fr, category, display_order, is_featured) VALUES
('What should I do immediately after someone goes missing?', 'Que dois-je faire immediatement apres la disparition de quelqu''un?',
'1. Contact local police immediately to file a missing persons report
2. Gather recent photos and important identification information
3. Make a list of the person''s friends, colleagues, and regular places they visit
4. Check hospitals and detention centers
5. Contact family and friends to help with the search
6. Preserve any evidence (notes, electronic devices, recent communications)',
'1. Contactez immediatement la police locale pour signaler la disparition
2. Rassemblez des photos recentes et des informations d''identification importantes
3. Faites une liste des amis, collegues et endroits regulierement visites
4. Verifiez les hopitaux et centres de detention
5. Contactez famille et amis pour aider aux recherches
6. Preservez toute preuve (notes, appareils electroniques, communications recentes)',
'Getting Started', 1, TRUE),

('Is there a waiting period before reporting someone missing?', 'Y a-t-il un delai d''attente avant de signaler une disparition?',
'No. There is NO waiting period to report someone missing in Canada. You can and should report a missing person to police immediately if you believe they are in danger or their absence is unusual.',
'Non. Il n''y a AUCUN delai d''attente pour signaler une disparition au Canada. Vous pouvez et devez signaler immediatement une personne disparue a la police si vous croyez qu''elle est en danger ou que son absence est inhabituelle.',
'Getting Started', 2, TRUE),

('How can I help spread the word about my missing loved one?', 'Comment puis-je aider a diffuser l''information sur mon proche disparu?',
'Use our document templates to create missing person posters and social media posts. Share through your networks. Contact local media for coverage. Our liaison can help coordinate media outreach and ensure accurate information is shared.',
'Utilisez nos modeles de documents pour creer des affiches et des publications sur les reseaux sociaux. Partagez via vos reseaux. Contactez les medias locaux. Notre agent de liaison peut aider a coordonner la sensibilisation mediatique.',
'Search Efforts', 3, TRUE),

('What support services are available for families?', 'Quels services de soutien sont disponibles pour les familles?',
'We offer: assigned family liaison officers, mental health resources, support groups, peer matching with other families, financial assistance referrals, legal aid connections, media coaching, and regular case updates. All services are free and confidential.',
'Nous offrons: agents de liaison familiaux designes, ressources en sante mentale, groupes de soutien, jumelage avec d''autres familles, references pour aide financiere, connexions d''aide juridique, coaching mediatique, et mises a jour regulieres sur le dossier. Tous les services sont gratuits et confidentiels.',
'Support Services', 4, TRUE),

('How often will I receive updates on the case?', 'A quelle frequence recevrai-je des mises a jour sur le dossier?',
'You can customize your notification preferences. By default, you will receive updates whenever there is significant case activity. You can also schedule regular check-ins with your liaison (daily, weekly, bi-weekly, or monthly) and receive progress summary reports.',
'Vous pouvez personnaliser vos preferences de notification. Par defaut, vous recevrez des mises a jour chaque fois qu''il y a une activite importante dans le dossier. Vous pouvez egalement planifier des suivis reguliers avec votre agent de liaison.',
'Communication', 5, TRUE),

('Can I connect with other families who have gone through this?', 'Puis-je entrer en contact avec d''autres familles ayant vecu cela?',
'Yes. Our peer support matching program connects families of missing persons with families of resolved cases who have volunteered to provide support and share their experiences. This can be done via phone, email, or in person based on your preference.',
'Oui. Notre programme de jumelage met en contact les familles de personnes disparues avec des familles de cas resolus qui se sont portees volontaires pour offrir du soutien et partager leurs experiences.',
'Support Services', 6, FALSE);

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
