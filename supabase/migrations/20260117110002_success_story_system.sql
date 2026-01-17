-- =============================================================================
-- SUCCESS STORY & TESTIMONIAL SYSTEM (LC-FEAT-022)
-- Migration for celebrating successful case resolutions with consent-based sharing
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE story_status AS ENUM (
  'draft',
  'pending_family_approval',
  'pending_admin_approval',
  'approved',
  'published',
  'archived',
  'rejected'
);

CREATE TYPE story_visibility AS ENUM (
  'private',
  'internal',
  'public'
);

CREATE TYPE anonymization_level AS ENUM (
  'none',
  'partial',
  'full'
);

CREATE TYPE media_template_type AS ENUM (
  'press_release',
  'social_media',
  'newsletter',
  'website_feature',
  'video_script',
  'infographic'
);

-- =============================================================================
-- SUCCESS STORIES TABLE
-- =============================================================================

CREATE TABLE success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Story content
  title TEXT NOT NULL,
  title_fr TEXT,
  summary TEXT NOT NULL,
  summary_fr TEXT,
  full_story TEXT,
  full_story_fr TEXT,

  -- Anonymization settings
  anonymization_level anonymization_level DEFAULT 'partial',
  display_name TEXT, -- Can be real name, initials, or pseudonym
  display_location TEXT, -- Can be exact, city only, or region only

  -- Redaction tracking
  redacted_fields JSONB DEFAULT '[]', -- List of fields that have been redacted
  original_content_hash TEXT, -- Hash of original content for audit purposes

  -- Media
  featured_image_url TEXT,
  gallery_images JSONB DEFAULT '[]',
  video_url TEXT,

  -- Quotes and testimonials
  family_quote TEXT,
  family_quote_fr TEXT,
  investigator_quote TEXT,
  investigator_quote_fr TEXT,
  volunteer_quote TEXT,
  volunteer_quote_fr TEXT,

  -- Categorization
  tags JSONB DEFAULT '[]',
  outcome_category TEXT, -- e.g., 'reunion', 'safe_recovery', 'community_effort'

  -- Statistics (anonymized)
  days_until_resolution INTEGER,
  tip_count INTEGER,
  volunteer_count INTEGER,
  agency_count INTEGER,

  -- Status and visibility
  status story_status DEFAULT 'draft',
  visibility story_visibility DEFAULT 'private',

  -- Publishing
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id),
  featured_on_homepage BOOLEAN DEFAULT FALSE,
  featured_until TIMESTAMPTZ,

  -- SEO
  slug TEXT UNIQUE,
  meta_description TEXT,
  meta_keywords TEXT[],

  -- Tracking
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- STORY CONSENT TABLE
-- Tracks explicit consent for sharing story details
-- =============================================================================

CREATE TABLE story_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES success_stories(id) ON DELETE CASCADE,

  -- Who is giving consent
  consenter_id UUID REFERENCES profiles(id), -- NULL if external person
  consenter_name TEXT NOT NULL,
  consenter_email TEXT,
  consenter_phone TEXT,
  consenter_relationship TEXT NOT NULL, -- e.g., 'missing_person', 'parent', 'spouse', 'sibling'

  -- What they're consenting to
  consent_type TEXT NOT NULL, -- e.g., 'story_publication', 'name_use', 'photo_use', 'quote_use'
  consent_scope JSONB DEFAULT '{}', -- Specific details of what's consented

  -- Consent status
  is_granted BOOLEAN DEFAULT FALSE,
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Consent method
  consent_method TEXT NOT NULL, -- 'digital_signature', 'email_confirmation', 'verbal_recorded', 'physical_form'
  consent_document_url TEXT, -- Link to signed consent form if applicable

  -- Verification
  verification_code TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),

  -- Withdrawal
  withdrawn_at TIMESTAMPTZ,
  withdrawal_reason TEXT,
  withdrawal_processed_by UUID REFERENCES profiles(id),

  -- Legal
  ip_address INET,
  user_agent TEXT,
  consent_version TEXT DEFAULT '1.0',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- STORY APPROVAL WORKFLOW TABLE
-- Tracks the approval process
-- =============================================================================

CREATE TABLE story_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES success_stories(id) ON DELETE CASCADE,

  -- Approval stage
  approval_stage TEXT NOT NULL, -- 'family_review', 'content_review', 'legal_review', 'final_approval'
  approval_order INTEGER DEFAULT 1,

  -- Reviewer
  reviewer_type TEXT NOT NULL, -- 'family_member', 'case_manager', 'legal_team', 'admin'
  reviewer_id UUID REFERENCES profiles(id), -- NULL for external reviewers
  reviewer_email TEXT, -- For external reviewers
  reviewer_name TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'changes_requested'

  -- Feedback
  feedback TEXT,
  requested_changes JSONB DEFAULT '[]',

  -- Timeline
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ,

  -- Reminder tracking
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FAMILY THANK YOU MESSAGES TABLE
-- System for families to express gratitude
-- =============================================================================

CREATE TABLE family_thank_you_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  story_id UUID REFERENCES success_stories(id) ON DELETE SET NULL,

  -- Sender
  sender_id UUID REFERENCES profiles(id),
  sender_name TEXT NOT NULL,
  sender_relationship TEXT NOT NULL,

  -- Recipients
  recipient_type TEXT NOT NULL, -- 'law_enforcement', 'volunteers', 'tipsters', 'community', 'specific_person'
  recipient_id UUID REFERENCES profiles(id), -- If specific person
  recipient_organization_id UUID REFERENCES organizations(id),

  -- Message content
  message TEXT NOT NULL,
  message_fr TEXT,

  -- Display settings
  is_public BOOLEAN DEFAULT FALSE,
  display_name TEXT, -- How to show sender name publicly
  anonymize_details BOOLEAN DEFAULT TRUE,

  -- Attachments
  attachment_urls JSONB DEFAULT '[]',

  -- Approval
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),

  -- Delivery tracking
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MEDIA READY TEMPLATES TABLE
-- Pre-formatted templates for various media outlets
-- =============================================================================

CREATE TABLE story_media_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES success_stories(id) ON DELETE CASCADE,

  -- Template info
  template_type media_template_type NOT NULL,
  template_name TEXT NOT NULL,

  -- Content
  content TEXT NOT NULL,
  content_fr TEXT,

  -- Media-specific fields
  headline TEXT,
  subheadline TEXT,
  call_to_action TEXT,
  hashtags TEXT[],

  -- Character limits for different platforms
  short_version TEXT, -- < 280 chars for Twitter/X
  medium_version TEXT, -- < 500 chars for LinkedIn
  long_version TEXT, -- Full press release

  -- Associated media
  primary_image_url TEXT,
  thumbnail_url TEXT,
  media_kit_url TEXT,

  -- Approval status
  is_approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),

  -- Usage tracking
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,
  last_downloaded_by UUID REFERENCES profiles(id),

  -- Metadata
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SUCCESS METRICS TABLE (ANONYMOUS)
-- Aggregated metrics for public display
-- =============================================================================

CREATE TABLE success_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Time period
  metric_period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly', 'all_time'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Case outcomes
  total_cases_resolved INTEGER DEFAULT 0,
  found_alive_safe INTEGER DEFAULT 0,
  found_alive_injured INTEGER DEFAULT 0,
  reunited_with_family INTEGER DEFAULT 0,
  voluntary_return INTEGER DEFAULT 0,

  -- Demographics (anonymized)
  minors_found INTEGER DEFAULT 0,
  adults_found INTEGER DEFAULT 0,
  seniors_found INTEGER DEFAULT 0,
  indigenous_cases_resolved INTEGER DEFAULT 0,

  -- Time metrics
  average_resolution_days DECIMAL(10,2),
  median_resolution_days DECIMAL(10,2),
  fastest_resolution_hours INTEGER,

  -- Community involvement
  total_tips_received INTEGER DEFAULT 0,
  verified_tips INTEGER DEFAULT 0,
  total_volunteers INTEGER DEFAULT 0,
  volunteer_hours INTEGER DEFAULT 0,

  -- Agency collaboration
  agencies_involved INTEGER DEFAULT 0,
  cross_jurisdiction_cases INTEGER DEFAULT 0,

  -- Story metrics
  stories_published INTEGER DEFAULT 0,
  total_story_views INTEGER DEFAULT 0,
  total_story_shares INTEGER DEFAULT 0,

  -- Calculated at
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Uniqueness constraint
  UNIQUE (metric_period, period_start, period_end)
);

-- =============================================================================
-- STORY VIEWS & SHARES TRACKING
-- For analytics while preserving privacy
-- =============================================================================

CREATE TABLE story_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES success_stories(id) ON DELETE CASCADE,

  -- Interaction type
  interaction_type TEXT NOT NULL, -- 'view', 'share', 'download', 'print'

  -- Source
  source TEXT, -- 'website', 'social_media', 'email', 'api'
  referrer TEXT,

  -- Anonymized user info
  session_hash TEXT, -- Hashed session ID, not tracking actual users
  country_code TEXT,

  -- Device info (aggregated only)
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- REDACTION LOGS
-- Track what information has been redacted and why
-- =============================================================================

CREATE TABLE story_redaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES success_stories(id) ON DELETE CASCADE,

  -- What was redacted
  field_name TEXT NOT NULL,
  original_value_hash TEXT, -- Hash only, not actual value
  redacted_by UUID NOT NULL REFERENCES profiles(id),

  -- Reason
  redaction_reason TEXT NOT NULL,
  redaction_type TEXT NOT NULL, -- 'privacy', 'legal', 'family_request', 'security'

  -- Reversibility
  is_reversible BOOLEAN DEFAULT FALSE,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES profiles(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Success stories indexes
CREATE INDEX idx_success_stories_case ON success_stories(case_id);
CREATE INDEX idx_success_stories_status ON success_stories(status);
CREATE INDEX idx_success_stories_visibility ON success_stories(visibility);
CREATE INDEX idx_success_stories_published ON success_stories(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_success_stories_featured ON success_stories(featured_on_homepage) WHERE featured_on_homepage = TRUE;
CREATE INDEX idx_success_stories_slug ON success_stories(slug) WHERE slug IS NOT NULL;

-- Consent indexes
CREATE INDEX idx_story_consent_story ON story_consent(story_id);
CREATE INDEX idx_story_consent_consenter ON story_consent(consenter_id);
CREATE INDEX idx_story_consent_granted ON story_consent(is_granted) WHERE is_granted = TRUE;
CREATE INDEX idx_story_consent_withdrawn ON story_consent(withdrawn_at) WHERE withdrawn_at IS NOT NULL;

-- Approval indexes
CREATE INDEX idx_story_approvals_story ON story_approvals(story_id);
CREATE INDEX idx_story_approvals_reviewer ON story_approvals(reviewer_id);
CREATE INDEX idx_story_approvals_status ON story_approvals(status);
CREATE INDEX idx_story_approvals_pending ON story_approvals(status, deadline_at) WHERE status = 'pending';

-- Thank you messages indexes
CREATE INDEX idx_thank_you_case ON family_thank_you_messages(case_id);
CREATE INDEX idx_thank_you_recipient ON family_thank_you_messages(recipient_id);
CREATE INDEX idx_thank_you_public ON family_thank_you_messages(is_public) WHERE is_public = TRUE;

-- Media templates indexes
CREATE INDEX idx_media_templates_story ON story_media_templates(story_id);
CREATE INDEX idx_media_templates_type ON story_media_templates(template_type);
CREATE INDEX idx_media_templates_approved ON story_media_templates(is_approved) WHERE is_approved = TRUE;

-- Metrics indexes
CREATE INDEX idx_success_metrics_period ON success_metrics(metric_period, period_start DESC);

-- Interactions indexes
CREATE INDEX idx_story_interactions_story ON story_interactions(story_id);
CREATE INDEX idx_story_interactions_type ON story_interactions(interaction_type);
CREATE INDEX idx_story_interactions_date ON story_interactions(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE success_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_thank_you_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_media_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_redaction_logs ENABLE ROW LEVEL SECURITY;

-- Public can view published stories
CREATE POLICY "Public can view published stories" ON success_stories
  FOR SELECT USING (status = 'published' AND visibility = 'public');

-- Case reporters can view/manage their stories
CREATE POLICY "Case owners can view their stories" ON success_stories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = success_stories.case_id
      AND cases.reporter_id = auth.uid()
    )
  );

CREATE POLICY "Case owners can create stories" ON success_stories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = success_stories.case_id
      AND cases.reporter_id = auth.uid()
    )
  );

CREATE POLICY "Case owners can update their stories" ON success_stories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = success_stories.case_id
      AND cases.reporter_id = auth.uid()
    )
  );

-- Staff can manage all stories
CREATE POLICY "Staff can manage stories" ON success_stories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'law_enforcement')
    )
  );

-- Consent policies
CREATE POLICY "Users can view their consent records" ON story_consent
  FOR SELECT USING (consenter_id = auth.uid());

CREATE POLICY "Users can manage their consent" ON story_consent
  FOR ALL USING (consenter_id = auth.uid());

CREATE POLICY "Staff can manage consent records" ON story_consent
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'law_enforcement')
    )
  );

-- Approval policies
CREATE POLICY "Reviewers can view their approvals" ON story_approvals
  FOR SELECT USING (reviewer_id = auth.uid());

CREATE POLICY "Reviewers can update their approvals" ON story_approvals
  FOR UPDATE USING (reviewer_id = auth.uid());

CREATE POLICY "Staff can manage approvals" ON story_approvals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'law_enforcement')
    )
  );

-- Thank you message policies
CREATE POLICY "Senders can manage their messages" ON family_thank_you_messages
  FOR ALL USING (sender_id = auth.uid());

CREATE POLICY "Recipients can view their messages" ON family_thank_you_messages
  FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Public can view public messages" ON family_thank_you_messages
  FOR SELECT USING (is_public = TRUE AND approved_at IS NOT NULL);

-- Media templates policies
CREATE POLICY "Public can view approved templates" ON story_media_templates
  FOR SELECT USING (
    is_approved = TRUE
    AND EXISTS (
      SELECT 1 FROM success_stories
      WHERE success_stories.id = story_media_templates.story_id
      AND success_stories.status = 'published'
      AND success_stories.visibility = 'public'
    )
  );

CREATE POLICY "Staff can manage templates" ON story_media_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'law_enforcement', 'journalist')
    )
  );

-- Metrics are public (anonymized)
CREATE POLICY "Public can view metrics" ON success_metrics
  FOR SELECT USING (TRUE);

CREATE POLICY "Staff can manage metrics" ON success_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin')
    )
  );

-- Interactions can be inserted by anyone
CREATE POLICY "Anyone can create interactions" ON story_interactions
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Staff can view interactions" ON story_interactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin')
    )
  );

-- Redaction logs are admin only
CREATE POLICY "Admins can manage redaction logs" ON story_redaction_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin')
    )
  );

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Generate URL-friendly slug
CREATE OR REPLACE FUNCTION generate_story_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Create base slug from title
  base_slug := LOWER(REGEXP_REPLACE(NEW.title, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
  base_slug := SUBSTRING(base_slug FROM 1 FOR 50);

  final_slug := base_slug;

  -- Check for uniqueness and append number if needed
  WHILE EXISTS (SELECT 1 FROM success_stories WHERE slug = final_slug AND id != NEW.id) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update story view count
CREATE OR REPLACE FUNCTION increment_story_view()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.interaction_type = 'view' THEN
    UPDATE success_stories
    SET view_count = view_count + 1
    WHERE id = NEW.story_id;
  ELSIF NEW.interaction_type = 'share' THEN
    UPDATE success_stories
    SET share_count = share_count + 1
    WHERE id = NEW.story_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check all required consents before publishing
CREATE OR REPLACE FUNCTION check_story_consents()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    -- Check if all required consents are granted
    IF EXISTS (
      SELECT 1 FROM story_consent
      WHERE story_id = NEW.id
      AND (is_granted = FALSE OR withdrawn_at IS NOT NULL)
    ) THEN
      RAISE EXCEPTION 'Cannot publish story: not all consents are granted or some have been withdrawn';
    END IF;

    -- Check if all approvals are complete
    IF EXISTS (
      SELECT 1 FROM story_approvals
      WHERE story_id = NEW.id
      AND status NOT IN ('approved')
    ) THEN
      RAISE EXCEPTION 'Cannot publish story: not all approvals are complete';
    END IF;

    NEW.published_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate and update success metrics
CREATE OR REPLACE FUNCTION calculate_success_metrics(
  p_period TEXT,
  p_start DATE,
  p_end DATE
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO success_metrics (
    metric_period,
    period_start,
    period_end,
    total_cases_resolved,
    found_alive_safe,
    found_alive_injured,
    reunited_with_family,
    voluntary_return,
    minors_found,
    adults_found,
    seniors_found,
    indigenous_cases_resolved,
    average_resolution_days,
    median_resolution_days,
    stories_published
  )
  SELECT
    p_period,
    p_start,
    p_end,
    COUNT(*) FILTER (WHERE status IN ('resolved', 'closed') AND disposition IS NOT NULL),
    COUNT(*) FILTER (WHERE disposition = 'found_alive_safe'),
    COUNT(*) FILTER (WHERE disposition = 'found_alive_injured'),
    COUNT(*) FILTER (WHERE disposition IN ('found_alive_safe', 'returned_voluntarily')),
    COUNT(*) FILTER (WHERE disposition = 'returned_voluntarily'),
    COUNT(*) FILTER (WHERE is_minor = TRUE AND disposition IS NOT NULL),
    COUNT(*) FILTER (WHERE is_minor = FALSE AND is_elderly = FALSE AND disposition IS NOT NULL),
    COUNT(*) FILTER (WHERE is_elderly = TRUE AND disposition IS NOT NULL),
    COUNT(*) FILTER (WHERE is_indigenous = TRUE AND disposition IS NOT NULL),
    AVG(EXTRACT(DAY FROM resolution_date - last_seen_date)) FILTER (WHERE resolution_date IS NOT NULL),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM resolution_date - last_seen_date)) FILTER (WHERE resolution_date IS NOT NULL),
    (SELECT COUNT(*) FROM success_stories WHERE status = 'published' AND published_at BETWEEN p_start AND p_end)
  FROM cases
  WHERE resolution_date BETWEEN p_start AND p_end
  ON CONFLICT (metric_period, period_start, period_end)
  DO UPDATE SET
    total_cases_resolved = EXCLUDED.total_cases_resolved,
    found_alive_safe = EXCLUDED.found_alive_safe,
    found_alive_injured = EXCLUDED.found_alive_injured,
    reunited_with_family = EXCLUDED.reunited_with_family,
    voluntary_return = EXCLUDED.voluntary_return,
    minors_found = EXCLUDED.minors_found,
    adults_found = EXCLUDED.adults_found,
    seniors_found = EXCLUDED.seniors_found,
    indigenous_cases_resolved = EXCLUDED.indigenous_cases_resolved,
    average_resolution_days = EXCLUDED.average_resolution_days,
    median_resolution_days = EXCLUDED.median_resolution_days,
    stories_published = EXCLUDED.stories_published,
    calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-generate slug for stories
CREATE TRIGGER generate_story_slug_trigger
  BEFORE INSERT OR UPDATE OF title ON success_stories
  FOR EACH ROW EXECUTE FUNCTION generate_story_slug();

-- Update timestamps
CREATE TRIGGER update_success_stories_updated_at
  BEFORE UPDATE ON success_stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_story_consent_updated_at
  BEFORE UPDATE ON story_consent
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_story_approvals_updated_at
  BEFORE UPDATE ON story_approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_thank_you_messages_updated_at
  BEFORE UPDATE ON family_thank_you_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_templates_updated_at
  BEFORE UPDATE ON story_media_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Increment view/share counts
CREATE TRIGGER increment_story_counts_trigger
  AFTER INSERT ON story_interactions
  FOR EACH ROW EXECUTE FUNCTION increment_story_view();

-- Validate consents before publishing
CREATE TRIGGER check_story_consents_trigger
  BEFORE UPDATE OF status ON success_stories
  FOR EACH ROW EXECUTE FUNCTION check_story_consents();

-- Audit logging for stories
CREATE TRIGGER audit_success_stories
  AFTER INSERT OR UPDATE OR DELETE ON success_stories
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_story_consent
  AFTER INSERT OR UPDATE OR DELETE ON story_consent
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON success_stories TO service_role;
GRANT ALL ON story_consent TO service_role;
GRANT ALL ON story_approvals TO service_role;
GRANT ALL ON family_thank_you_messages TO service_role;
GRANT ALL ON story_media_templates TO service_role;
GRANT ALL ON success_metrics TO service_role;
GRANT ALL ON story_interactions TO service_role;
GRANT ALL ON story_redaction_logs TO service_role;
