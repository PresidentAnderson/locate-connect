-- LocateConnect Facial Recognition System Migration (LC-FEAT-030)
-- AI Facial Recognition Integration with comprehensive privacy controls

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE facial_recognition_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE face_match_status AS ENUM (
  'pending_review',
  'under_review',
  'confirmed',
  'rejected',
  'false_positive',
  'inconclusive'
);

CREATE TYPE photo_quality_grade AS ENUM (
  'excellent',
  'good',
  'fair',
  'poor',
  'unusable'
);

CREATE TYPE consent_type AS ENUM (
  'photo_upload',
  'facial_recognition',
  'age_progression',
  'database_storage',
  'third_party_sharing',
  'research_use'
);

CREATE TYPE consent_status AS ENUM (
  'pending',
  'granted',
  'denied',
  'withdrawn',
  'expired'
);

CREATE TYPE bias_test_category AS ENUM (
  'age',
  'gender',
  'ethnicity',
  'lighting',
  'angle',
  'resolution'
);

-- =============================================================================
-- PHOTO SUBMISSIONS TABLE
-- =============================================================================

CREATE TABLE photo_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,

  -- Submission details
  submitted_by UUID NOT NULL REFERENCES profiles(id),
  submission_source TEXT NOT NULL, -- 'family_upload', 'law_enforcement', 'tip', 'partner_database'

  -- Photo metadata
  original_filename TEXT,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type TEXT,

  -- Image characteristics
  width_px INTEGER,
  height_px INTEGER,
  color_depth INTEGER,
  has_face_detected BOOLEAN DEFAULT FALSE,
  face_count INTEGER DEFAULT 0,
  face_bounding_boxes JSONB, -- Array of {x, y, width, height} for each face

  -- Quality assessment
  quality_grade photo_quality_grade,
  quality_score INTEGER, -- 0-100
  quality_factors JSONB, -- {lighting, focus, resolution, face_visibility, occlusion}
  enhancement_applied BOOLEAN DEFAULT FALSE,
  enhanced_file_url TEXT,

  -- Processing
  is_processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  face_encoding BYTEA, -- Encrypted facial feature vector
  face_encoding_version TEXT, -- Model version used

  -- EXIF/metadata
  photo_taken_at TIMESTAMPTZ,
  photo_location JSONB, -- {latitude, longitude, location_name}
  camera_make TEXT,
  camera_model TEXT,
  exif_data JSONB,

  -- Consent and compliance
  consent_record_id UUID REFERENCES consent_records(id),
  is_consent_verified BOOLEAN DEFAULT FALSE,

  -- Data retention
  retention_expires_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FACIAL RECOGNITION REQUESTS TABLE
-- =============================================================================

CREATE TABLE facial_recognition_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE,

  -- Request details
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  photo_submission_id UUID NOT NULL REFERENCES photo_submissions(id),
  requested_by UUID NOT NULL REFERENCES profiles(id),

  -- Request type
  request_type TEXT NOT NULL, -- 'match_search', 'verification', 'age_progression'
  priority TEXT DEFAULT 'normal', -- 'critical', 'high', 'normal', 'low'

  -- Search parameters
  search_scope JSONB, -- {databases: [], regions: [], date_range: {}}
  confidence_threshold INTEGER DEFAULT 70, -- Minimum match confidence to report
  max_results INTEGER DEFAULT 10,

  -- Status
  status facial_recognition_status DEFAULT 'pending',

  -- Processing
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,
  ai_provider TEXT, -- 'internal', 'aws_rekognition', 'azure_face', etc.
  ai_model_version TEXT,

  -- Results summary
  total_matches_found INTEGER DEFAULT 0,
  high_confidence_matches INTEGER DEFAULT 0,

  -- Compliance
  compliance_check_passed BOOLEAN,
  compliance_notes TEXT,

  -- Error handling
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Audit
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FACE MATCHES TABLE
-- =============================================================================

CREATE TABLE face_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to request
  recognition_request_id UUID NOT NULL REFERENCES facial_recognition_requests(id) ON DELETE CASCADE,

  -- Source and target photos
  source_photo_id UUID NOT NULL REFERENCES photo_submissions(id),
  matched_photo_id UUID REFERENCES photo_submissions(id),
  matched_case_id UUID REFERENCES cases(id),

  -- External match (if from partner database)
  external_source TEXT, -- Partner database name
  external_reference_id TEXT,
  external_photo_url TEXT,

  -- Match scoring
  confidence_score INTEGER NOT NULL, -- 0-100
  similarity_score DECIMAL(5, 4), -- 0.0000-1.0000

  -- Facial features analysis
  facial_landmarks_match JSONB, -- Detailed landmark comparison
  feature_vector_distance DECIMAL(10, 6),

  -- Demographic estimation (for verification)
  estimated_age_range JSONB, -- {min, max}
  estimated_gender TEXT,
  estimated_ethnicity TEXT, -- For bias monitoring only

  -- Review workflow
  status face_match_status DEFAULT 'pending_review',
  reviewer_id UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  review_outcome TEXT, -- 'match', 'no_match', 'possible_match'

  -- Secondary review (for high-stakes matches)
  requires_secondary_review BOOLEAN DEFAULT FALSE,
  secondary_reviewer_id UUID REFERENCES profiles(id),
  secondary_reviewed_at TIMESTAMPTZ,
  secondary_review_notes TEXT,
  secondary_review_outcome TEXT,

  -- Notification
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  notification_method TEXT, -- 'email', 'sms', 'in_app'

  -- False positive tracking
  marked_as_false_positive BOOLEAN DEFAULT FALSE,
  false_positive_reason TEXT,
  used_for_training BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- AGE PROGRESSION REQUESTS TABLE
-- =============================================================================

CREATE TABLE age_progression_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE,

  -- Request details
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  source_photo_id UUID NOT NULL REFERENCES photo_submissions(id),
  requested_by UUID NOT NULL REFERENCES profiles(id),

  -- Age progression parameters
  source_age INTEGER NOT NULL, -- Age in source photo
  target_ages INTEGER[] NOT NULL, -- Array of target ages to generate

  -- Additional parameters
  include_variations BOOLEAN DEFAULT FALSE, -- Hair style, facial hair, weight variations
  variation_parameters JSONB, -- {hair_styles: [], facial_hair: boolean, weight_range: []}

  -- Status
  status facial_recognition_status DEFAULT 'pending',

  -- Processing
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,
  ai_provider TEXT,
  ai_model_version TEXT,

  -- Results
  images_generated INTEGER DEFAULT 0,
  result_photos JSONB, -- Array of {target_age, file_url, confidence}

  -- Quality review
  quality_reviewed BOOLEAN DEFAULT FALSE,
  quality_reviewer_id UUID REFERENCES profiles(id),
  quality_score INTEGER, -- 0-100
  quality_notes TEXT,

  -- Approval workflow
  requires_approval BOOLEAN DEFAULT TRUE,
  approved BOOLEAN,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Usage tracking
  used_in_case BOOLEAN DEFAULT FALSE,
  public_distribution_approved BOOLEAN DEFAULT FALSE,

  -- Error handling
  error_code TEXT,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MATCH REVIEWS TABLE
-- =============================================================================

CREATE TABLE match_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  face_match_id UUID NOT NULL REFERENCES face_matches(id) ON DELETE CASCADE,

  -- Review details
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  reviewer_role TEXT NOT NULL, -- 'investigator', 'supervisor', 'specialist'
  review_type TEXT NOT NULL, -- 'initial', 'secondary', 'appeal'

  -- Decision
  decision TEXT NOT NULL, -- 'confirm_match', 'reject_match', 'needs_investigation', 'escalate'
  confidence_level TEXT, -- 'high', 'medium', 'low'

  -- Analysis
  analysis_notes TEXT,
  supporting_evidence JSONB, -- References to additional evidence
  comparison_points JSONB, -- Specific facial features compared

  -- Time tracking
  review_started_at TIMESTAMPTZ,
  review_completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,

  -- Quality metrics
  comparison_tool_used TEXT,
  comparison_images_viewed INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CONSENT RECORDS TABLE
-- =============================================================================

ALTER TABLE consent_records
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS subject_case_id UUID REFERENCES cases(id),
  ADD COLUMN IF NOT EXISTS subject_name TEXT,
  ADD COLUMN IF NOT EXISTS subject_email TEXT,
  ADD COLUMN IF NOT EXISTS subject_relationship TEXT,
  ADD COLUMN IF NOT EXISTS consent_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS scope_description TEXT,
  ADD COLUMN IF NOT EXISTS allowed_uses JSONB,
  ADD COLUMN IF NOT EXISTS restricted_uses JSONB,
  ADD COLUMN IF NOT EXISTS consent_method TEXT,
  ADD COLUMN IF NOT EXISTS consent_document_url TEXT,
  ADD COLUMN IF NOT EXISTS electronic_signature TEXT,
  ADD COLUMN IF NOT EXISTS witness_name TEXT,
  ADD COLUMN IF NOT EXISTS witness_email TEXT,
  ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS identity_verification_method TEXT,
  ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS identity_verified_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS compliance_framework TEXT,
  ADD COLUMN IF NOT EXISTS data_processing_basis TEXT;

-- =============================================================================
-- PARTNER DATABASE CONFIGURATIONS TABLE
-- =============================================================================

CREATE TABLE partner_databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Partner identification
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  organization TEXT,
  country TEXT,

  -- Connection details
  api_endpoint TEXT,
  api_version TEXT,
  authentication_method TEXT, -- 'api_key', 'oauth2', 'certificate'
  credentials_encrypted JSONB, -- Encrypted connection credentials

  -- Capabilities
  supports_search BOOLEAN DEFAULT TRUE,
  supports_verification BOOLEAN DEFAULT TRUE,
  supports_real_time BOOLEAN DEFAULT FALSE,
  batch_search_limit INTEGER,

  -- Data sharing agreement
  agreement_signed_at TIMESTAMPTZ,
  agreement_expires_at TIMESTAMPTZ,
  agreement_document_url TEXT,
  data_usage_restrictions JSONB,

  -- Status
  is_active BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  last_health_check_at TIMESTAMPTZ,
  health_status TEXT, -- 'healthy', 'degraded', 'offline'

  -- Statistics
  total_searches INTEGER DEFAULT 0,
  total_matches_found INTEGER DEFAULT 0,
  average_response_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- BIAS TESTING AND MITIGATION TABLE
-- =============================================================================

CREATE TABLE bias_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Test identification
  test_name TEXT NOT NULL,
  test_version TEXT NOT NULL,
  test_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Model under test
  ai_provider TEXT NOT NULL,
  ai_model_version TEXT NOT NULL,

  -- Test parameters
  test_category bias_test_category NOT NULL,
  test_subcategory TEXT, -- e.g., 'asian', '18-25', 'low_light'
  test_dataset_id TEXT,
  sample_size INTEGER NOT NULL,

  -- Results
  overall_accuracy DECIMAL(5, 4),
  false_positive_rate DECIMAL(5, 4),
  false_negative_rate DECIMAL(5, 4),
  demographic_parity_score DECIMAL(5, 4),
  equalized_odds_score DECIMAL(5, 4),

  -- Detailed breakdown
  confusion_matrix JSONB,
  performance_by_subgroup JSONB,

  -- Comparison to baseline
  baseline_accuracy DECIMAL(5, 4),
  deviation_from_baseline DECIMAL(5, 4),

  -- Pass/fail
  meets_threshold BOOLEAN,
  threshold_used DECIMAL(5, 4),

  -- Mitigation
  mitigation_required BOOLEAN DEFAULT FALSE,
  mitigation_actions JSONB,
  mitigation_applied_at TIMESTAMPTZ,

  -- Review
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FACIAL RECOGNITION AUDIT LOG TABLE
-- Specialized audit log for facial recognition activities
-- =============================================================================

CREATE TABLE facial_recognition_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Action details
  action TEXT NOT NULL, -- 'photo_upload', 'search_initiated', 'match_reviewed', etc.
  action_category TEXT NOT NULL, -- 'processing', 'review', 'consent', 'export'

  -- Actor
  user_id UUID REFERENCES profiles(id),
  user_role TEXT,

  -- Resource
  resource_type TEXT NOT NULL, -- 'photo_submission', 'face_match', 'consent_record', etc.
  resource_id UUID NOT NULL,

  -- Related entities
  case_id UUID REFERENCES cases(id),
  recognition_request_id UUID REFERENCES facial_recognition_requests(id),

  -- Action details
  action_details JSONB,
  previous_state JSONB,
  new_state JSONB,

  -- Compliance
  compliance_relevant BOOLEAN DEFAULT FALSE,
  compliance_frameworks TEXT[], -- Array of applicable frameworks
  personal_data_accessed BOOLEAN DEFAULT FALSE,
  biometric_data_accessed BOOLEAN DEFAULT FALSE,

  -- Request context
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- NOTIFICATION RECORDS FOR MATCHES
-- =============================================================================

CREATE TABLE match_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  face_match_id UUID NOT NULL REFERENCES face_matches(id) ON DELETE CASCADE,

  -- Recipient
  recipient_id UUID REFERENCES profiles(id),
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_type TEXT NOT NULL, -- 'investigator', 'family', 'law_enforcement'

  -- Notification details
  notification_type TEXT NOT NULL, -- 'new_match', 'review_required', 'match_confirmed'
  channel TEXT NOT NULL, -- 'email', 'sms', 'push', 'in_app'
  priority TEXT DEFAULT 'normal',

  -- Content
  subject TEXT,
  message_body TEXT,
  message_template_id TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'read'
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Error handling
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DATA RETENTION TRACKING
-- =============================================================================

CREATE TABLE facial_data_retention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Data reference
  data_type TEXT NOT NULL, -- 'photo_submission', 'face_encoding', 'match_result'
  data_id UUID NOT NULL,

  -- Retention policy
  retention_policy_id TEXT NOT NULL,
  retention_period_days INTEGER NOT NULL,

  -- Dates
  data_created_at TIMESTAMPTZ NOT NULL,
  scheduled_deletion_at TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'extended', 'deleted', 'archived'

  -- Extension
  extended_until TIMESTAMPTZ,
  extension_reason TEXT,
  extended_by UUID REFERENCES profiles(id),

  -- Deletion
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id),
  deletion_certificate TEXT,

  -- Legal hold
  under_legal_hold BOOLEAN DEFAULT FALSE,
  legal_hold_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Photo submissions
CREATE INDEX idx_photo_submissions_case ON photo_submissions(case_id);
CREATE INDEX idx_photo_submissions_submitted_by ON photo_submissions(submitted_by);
CREATE INDEX idx_photo_submissions_quality ON photo_submissions(quality_grade);
CREATE INDEX idx_photo_submissions_processed ON photo_submissions(is_processed) WHERE is_processed = FALSE;
CREATE INDEX idx_photo_submissions_consent ON photo_submissions(consent_record_id);

-- Facial recognition requests
CREATE INDEX idx_fr_requests_case ON facial_recognition_requests(case_id);
CREATE INDEX idx_fr_requests_photo ON facial_recognition_requests(photo_submission_id);
CREATE INDEX idx_fr_requests_status ON facial_recognition_requests(status);
CREATE INDEX idx_fr_requests_pending ON facial_recognition_requests(status) WHERE status = 'pending';
CREATE INDEX idx_fr_requests_created ON facial_recognition_requests(created_at DESC);

-- Face matches
CREATE INDEX idx_face_matches_request ON face_matches(recognition_request_id);
CREATE INDEX idx_face_matches_source ON face_matches(source_photo_id);
CREATE INDEX idx_face_matches_status ON face_matches(status);
CREATE INDEX idx_face_matches_pending ON face_matches(status) WHERE status = 'pending_review';
CREATE INDEX idx_face_matches_confidence ON face_matches(confidence_score DESC);
CREATE INDEX idx_face_matches_case ON face_matches(matched_case_id);

-- Age progression requests
CREATE INDEX idx_age_progression_case ON age_progression_requests(case_id);
CREATE INDEX idx_age_progression_status ON age_progression_requests(status);
CREATE INDEX idx_age_progression_approval ON age_progression_requests(requires_approval, approved) WHERE requires_approval = TRUE;

-- Match reviews
CREATE INDEX idx_match_reviews_match ON match_reviews(face_match_id);
CREATE INDEX idx_match_reviews_reviewer ON match_reviews(reviewer_id);

-- Consent records
CREATE INDEX idx_consent_subject ON consent_records(subject_id);
CREATE INDEX idx_consent_case ON consent_records(subject_case_id);
CREATE INDEX idx_consent_status ON consent_records(consent_status);
CREATE INDEX idx_consent_type ON consent_records(consent_type);
CREATE INDEX idx_consent_active ON consent_records(consent_status) WHERE consent_status = 'granted';

-- Audit logs
CREATE INDEX idx_fr_audit_action ON facial_recognition_audit_logs(action);
CREATE INDEX idx_fr_audit_user ON facial_recognition_audit_logs(user_id);
CREATE INDEX idx_fr_audit_resource ON facial_recognition_audit_logs(resource_type, resource_id);
CREATE INDEX idx_fr_audit_case ON facial_recognition_audit_logs(case_id);
CREATE INDEX idx_fr_audit_created ON facial_recognition_audit_logs(created_at DESC);
CREATE INDEX idx_fr_audit_compliance ON facial_recognition_audit_logs(compliance_relevant) WHERE compliance_relevant = TRUE;

-- Match notifications
CREATE INDEX idx_match_notifications_match ON match_notifications(face_match_id);
CREATE INDEX idx_match_notifications_recipient ON match_notifications(recipient_id);
CREATE INDEX idx_match_notifications_status ON match_notifications(status);

-- Data retention
CREATE INDEX idx_fr_retention_scheduled ON facial_data_retention(scheduled_deletion_at) WHERE status = 'active';
CREATE INDEX idx_fr_retention_legal_hold ON facial_data_retention(under_legal_hold) WHERE under_legal_hold = TRUE;

-- Bias testing
CREATE INDEX idx_bias_test_model ON bias_test_results(ai_provider, ai_model_version);
CREATE INDEX idx_bias_test_category ON bias_test_results(test_category);
CREATE INDEX idx_bias_test_date ON bias_test_results(test_date DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE photo_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE facial_recognition_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE age_progression_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE bias_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE facial_recognition_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE facial_data_retention ENABLE ROW LEVEL SECURITY;

-- Photo submissions policies
CREATE POLICY "Users can view their own photo submissions" ON photo_submissions
  FOR SELECT USING (submitted_by = auth.uid());

CREATE POLICY "Users can view photos for their cases" ON photo_submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = photo_submissions.case_id AND cases.reporter_id = auth.uid())
  );

CREATE POLICY "LE can view all photo submissions" ON photo_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

CREATE POLICY "Users can upload photos for their cases" ON photo_submissions
  FOR INSERT WITH CHECK (
    submitted_by = auth.uid() AND
    EXISTS (SELECT 1 FROM cases WHERE cases.id = photo_submissions.case_id AND cases.reporter_id = auth.uid())
  );

CREATE POLICY "LE can upload photos" ON photo_submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Face matches policies
CREATE POLICY "LE can view face matches" ON face_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

CREATE POLICY "LE can update face matches" ON face_matches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Consent records policies
CREATE POLICY "Users can view their own consent records" ON consent_records
  FOR SELECT USING (subject_id = auth.uid());

CREATE POLICY "Users can manage their own consent" ON consent_records
  FOR ALL USING (subject_id = auth.uid());

CREATE POLICY "LE can view consent records for cases" ON consent_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Facial recognition requests policies
CREATE POLICY "Users can view their FR requests" ON facial_recognition_requests
  FOR SELECT USING (requested_by = auth.uid());

CREATE POLICY "LE can view all FR requests" ON facial_recognition_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

CREATE POLICY "LE can create FR requests" ON facial_recognition_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Audit logs policies (admin only)
CREATE POLICY "Admins can view FR audit logs" ON facial_recognition_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Match reviews policies
CREATE POLICY "LE can manage match reviews" ON match_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Partner databases (admin only)
CREATE POLICY "Admins can manage partner databases" ON partner_databases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Bias test results (admin only)
CREATE POLICY "Admins can view bias test results" ON bias_test_results
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

-- Generate FR request number
CREATE OR REPLACE FUNCTION generate_fr_request_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 8) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM facial_recognition_requests
  WHERE request_number LIKE 'FR-' || year_part || '-%';

  NEW.request_number := 'FR-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate age progression request number
CREATE OR REPLACE FUNCTION generate_ap_request_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 8) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM age_progression_requests
  WHERE request_number LIKE 'AP-' || year_part || '-%';

  NEW.request_number := 'AP-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create FR audit log
CREATE OR REPLACE FUNCTION create_fr_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  action_name TEXT;
  category_name TEXT;
BEGIN
  -- Determine action and category based on table and operation
  IF TG_TABLE_NAME = 'photo_submissions' THEN
    category_name := 'processing';
    IF TG_OP = 'INSERT' THEN action_name := 'photo_uploaded';
    ELSIF TG_OP = 'UPDATE' THEN action_name := 'photo_updated';
    ELSIF TG_OP = 'DELETE' THEN action_name := 'photo_deleted';
    END IF;
  ELSIF TG_TABLE_NAME = 'facial_recognition_requests' THEN
    category_name := 'processing';
    IF TG_OP = 'INSERT' THEN action_name := 'search_initiated';
    ELSIF TG_OP = 'UPDATE' THEN action_name := 'search_updated';
    END IF;
  ELSIF TG_TABLE_NAME = 'face_matches' THEN
    category_name := 'processing';
    IF TG_OP = 'INSERT' THEN action_name := 'match_found';
    ELSIF TG_OP = 'UPDATE' THEN action_name := 'match_reviewed';
    END IF;
  ELSIF TG_TABLE_NAME = 'consent_records' THEN
    category_name := 'consent';
    IF TG_OP = 'INSERT' THEN action_name := 'consent_recorded';
    ELSIF TG_OP = 'UPDATE' THEN action_name := 'consent_updated';
    END IF;
  ELSE
    action_name := TG_OP;
    category_name := 'other';
  END IF;

  INSERT INTO facial_recognition_audit_logs (
    action,
    action_category,
    user_id,
    resource_type,
    resource_id,
    previous_state,
    new_state,
    compliance_relevant,
    biometric_data_accessed
  )
  VALUES (
    action_name,
    category_name,
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    TRUE,
    TRUE
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate retention date
CREATE OR REPLACE FUNCTION calculate_retention_date(
  p_data_type TEXT,
  p_case_status TEXT DEFAULT 'active'
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  retention_days INTEGER;
BEGIN
  -- Default retention periods (configurable)
  CASE p_data_type
    WHEN 'photo_submission' THEN
      IF p_case_status = 'resolved' THEN
        retention_days := 365 * 7; -- 7 years for resolved cases
      ELSE
        retention_days := 365 * 25; -- 25 years for active/cold cases
      END IF;
    WHEN 'face_encoding' THEN
      retention_days := 365 * 7;
    WHEN 'match_result' THEN
      retention_days := 365 * 10;
    ELSE
      retention_days := 365 * 5;
  END CASE;

  RETURN NOW() + (retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Request number generation
CREATE TRIGGER generate_fr_request_number_trigger
  BEFORE INSERT ON facial_recognition_requests
  FOR EACH ROW EXECUTE FUNCTION generate_fr_request_number();

CREATE TRIGGER generate_ap_request_number_trigger
  BEFORE INSERT ON age_progression_requests
  FOR EACH ROW EXECUTE FUNCTION generate_ap_request_number();

-- Updated at triggers
CREATE TRIGGER update_photo_submissions_updated_at
  BEFORE UPDATE ON photo_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fr_requests_updated_at
  BEFORE UPDATE ON facial_recognition_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_face_matches_updated_at
  BEFORE UPDATE ON face_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_age_progression_updated_at
  BEFORE UPDATE ON age_progression_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_databases_updated_at
  BEFORE UPDATE ON partner_databases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fr_retention_updated_at
  BEFORE UPDATE ON facial_data_retention
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- FR Audit logging triggers
CREATE TRIGGER audit_photo_submissions
  AFTER INSERT OR UPDATE OR DELETE ON photo_submissions
  FOR EACH ROW EXECUTE FUNCTION create_fr_audit_log();

CREATE TRIGGER audit_facial_recognition_requests
  AFTER INSERT OR UPDATE ON facial_recognition_requests
  FOR EACH ROW EXECUTE FUNCTION create_fr_audit_log();

CREATE TRIGGER audit_face_matches
  AFTER INSERT OR UPDATE ON face_matches
  FOR EACH ROW EXECUTE FUNCTION create_fr_audit_log();

CREATE TRIGGER audit_consent_records
  AFTER INSERT OR UPDATE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION create_fr_audit_log();

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
