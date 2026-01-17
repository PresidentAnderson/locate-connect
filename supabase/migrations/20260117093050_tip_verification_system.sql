-- LocateConnect Database Schema
-- Tip Verification System Migration (LC-FEAT-034)
-- Automated tip verification, scoring, and prioritization

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE tip_verification_status AS ENUM (
  'unverified',
  'auto_verified',
  'pending_review',
  'verified',
  'partially_verified',
  'unverifiable',
  'rejected'
);

CREATE TYPE tip_priority_bucket AS ENUM (
  'critical',
  'high',
  'medium',
  'low',
  'spam'
);

CREATE TYPE tipster_reliability_tier AS ENUM (
  'new',
  'unrated',
  'low',
  'moderate',
  'high',
  'verified_source'
);

CREATE TYPE verification_method AS ENUM (
  'photo_metadata',
  'geolocation',
  'text_sentiment',
  'pattern_matching',
  'cross_reference',
  'time_plausibility',
  'duplicate_detection',
  'manual_review'
);

CREATE TYPE hoax_indicator_type AS ENUM (
  'known_scam_pattern',
  'suspicious_metadata',
  'impossible_timeline',
  'conflicting_location',
  'repeated_false_reports',
  'spam_signature',
  'ai_generated_content',
  'stock_photo_detected'
);

-- =============================================================================
-- TIPSTER PROFILES TABLE
-- Tracks reliability and history of tipsters
-- =============================================================================

CREATE TABLE tipster_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity (can be linked to user or anonymous)
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  anonymous_id TEXT UNIQUE, -- Hash of IP + user agent for anonymous tracking

  -- Contact info for anonymous tipsters
  email TEXT,
  phone TEXT,
  preferred_contact_method TEXT,

  -- Reliability metrics
  reliability_tier tipster_reliability_tier DEFAULT 'new',
  reliability_score INTEGER DEFAULT 50 CHECK (reliability_score >= 0 AND reliability_score <= 100),

  -- History metrics
  total_tips INTEGER DEFAULT 0,
  verified_tips INTEGER DEFAULT 0,
  partially_verified_tips INTEGER DEFAULT 0,
  false_tips INTEGER DEFAULT 0,
  spam_tips INTEGER DEFAULT 0,
  tips_leading_to_resolution INTEGER DEFAULT 0,

  -- Behavioral patterns
  average_response_time INTERVAL,
  provides_photos BOOLEAN DEFAULT FALSE,
  provides_detailed_info BOOLEAN DEFAULT FALSE,
  consistent_location_reporting BOOLEAN DEFAULT FALSE,

  -- Trust factors
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  blocked_at TIMESTAMPTZ,
  blocked_by UUID REFERENCES profiles(id),

  -- Notes
  internal_notes TEXT,

  -- Timestamps
  first_tip_at TIMESTAMPTZ,
  last_tip_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TIP VERIFICATION RECORDS TABLE
-- Stores verification analysis for each tip
-- =============================================================================

CREATE TABLE tip_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id UUID NOT NULL REFERENCES tips(id) ON DELETE CASCADE,

  -- Verification status
  verification_status tip_verification_status DEFAULT 'unverified',
  priority_bucket tip_priority_bucket DEFAULT 'medium',

  -- Credibility scoring
  credibility_score INTEGER DEFAULT 50 CHECK (credibility_score >= 0 AND credibility_score <= 100),
  credibility_factors JSONB DEFAULT '[]',

  -- Individual verification scores
  photo_verification_score INTEGER CHECK (photo_verification_score >= 0 AND photo_verification_score <= 100),
  location_verification_score INTEGER CHECK (location_verification_score >= 0 AND location_verification_score <= 100),
  time_plausibility_score INTEGER CHECK (time_plausibility_score >= 0 AND time_plausibility_score <= 100),
  text_analysis_score INTEGER CHECK (text_analysis_score >= 0 AND text_analysis_score <= 100),
  cross_reference_score INTEGER CHECK (cross_reference_score >= 0 AND cross_reference_score <= 100),
  tipster_reliability_score INTEGER CHECK (tipster_reliability_score >= 0 AND tipster_reliability_score <= 100),

  -- Verification methods used
  verification_methods verification_method[] DEFAULT '{}',

  -- Photo analysis results
  photo_metadata JSONB, -- EXIF data, GPS, timestamp
  photo_analysis_notes TEXT,
  photo_is_original BOOLEAN,
  photo_location_matches BOOLEAN,
  photo_timestamp_matches BOOLEAN,

  -- Location verification
  location_verified BOOLEAN,
  location_confidence DOUBLE PRECISION,
  location_source TEXT, -- IP geolocation, GPS, user-provided
  distance_from_last_seen_km DOUBLE PRECISION,

  -- Time plausibility
  time_plausible BOOLEAN,
  time_plausibility_notes TEXT,
  travel_time_feasible BOOLEAN,

  -- Text analysis
  sentiment_score DOUBLE PRECISION, -- -1 to 1
  text_coherence_score DOUBLE PRECISION,
  detail_richness_score DOUBLE PRECISION,
  consistency_score DOUBLE PRECISION,

  -- Duplicate detection
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_tip_ids UUID[],
  similarity_scores JSONB, -- {tip_id: similarity_score}

  -- Cross-reference results
  matches_existing_leads BOOLEAN DEFAULT FALSE,
  matching_lead_ids UUID[],
  matches_known_locations BOOLEAN DEFAULT FALSE,
  matches_suspect_description BOOLEAN DEFAULT FALSE,

  -- Hoax/spam detection
  hoax_indicators hoax_indicator_type[] DEFAULT '{}',
  spam_score INTEGER DEFAULT 0 CHECK (spam_score >= 0 AND spam_score <= 100),
  hoax_detection_notes TEXT,

  -- AI analysis
  ai_summary TEXT,
  ai_confidence DOUBLE PRECISION,
  ai_recommendations TEXT[],

  -- Automated actions taken
  auto_triaged BOOLEAN DEFAULT FALSE,
  auto_triage_reason TEXT,
  auto_follow_up_sent BOOLEAN DEFAULT FALSE,
  follow_up_sent_at TIMESTAMPTZ,

  -- Review workflow
  requires_human_review BOOLEAN DEFAULT TRUE,
  review_priority INTEGER DEFAULT 5, -- 1-10, lower is higher priority
  review_deadline TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  reviewer_override_score INTEGER,

  -- Timestamps
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TIP ATTACHMENTS TABLE
-- Photos and files attached to tips
-- =============================================================================

CREATE TABLE tip_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id UUID NOT NULL REFERENCES tips(id) ON DELETE CASCADE,

  -- File info
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Metadata extraction
  extracted_metadata JSONB,
  exif_data JSONB,
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  photo_taken_at TIMESTAMPTZ,
  device_info TEXT,

  -- Analysis results
  is_stock_photo BOOLEAN,
  is_ai_generated BOOLEAN,
  is_manipulated BOOLEAN,
  manipulation_confidence DOUBLE PRECISION,
  reverse_image_search_results JSONB,

  -- Face detection (for matching)
  faces_detected INTEGER DEFAULT 0,
  face_match_confidence DOUBLE PRECISION,
  matches_missing_person BOOLEAN,

  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,

  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- VERIFICATION RULES TABLE
-- Configurable rules for automated verification
-- =============================================================================

CREATE TABLE verification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule identification
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL, -- 'scoring', 'spam', 'priority', 'workflow'

  -- Rule conditions (JSONB for flexibility)
  conditions JSONB NOT NULL,
  -- Example: {"field": "spam_score", "operator": ">", "value": 80}

  -- Rule actions
  actions JSONB NOT NULL,
  -- Example: {"set_priority": "spam", "require_review": false}

  -- Weights
  score_weight INTEGER DEFAULT 10,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Jurisdiction-specific
  jurisdiction_id UUID REFERENCES jurisdictions(id),

  -- Audit
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- KNOWN SCAM PATTERNS TABLE
-- Database of known hoax/scam patterns for detection
-- =============================================================================

CREATE TABLE scam_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pattern identification
  name TEXT NOT NULL,
  description TEXT,
  pattern_type TEXT NOT NULL, -- 'text', 'image', 'behavior', 'location'

  -- Pattern matching
  pattern_data JSONB NOT NULL,
  -- For text: regex patterns, keywords
  -- For image: hash signatures, known URLs
  -- For behavior: submission patterns
  -- For location: known false locations

  -- Confidence
  confidence_threshold DOUBLE PRECISION DEFAULT 0.8,

  -- Stats
  times_detected INTEGER DEFAULT 0,
  last_detected_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  created_by UUID REFERENCES profiles(id),
  source TEXT, -- Where this pattern was identified
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TIP FOLLOW-UPS TABLE
-- Automated and manual follow-up requests
-- =============================================================================

CREATE TABLE tip_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id UUID NOT NULL REFERENCES tips(id) ON DELETE CASCADE,
  tipster_profile_id UUID REFERENCES tipster_profiles(id),

  -- Follow-up type
  follow_up_type TEXT NOT NULL, -- 'clarification', 'photo_request', 'location_confirm', 'additional_info'

  -- Request content
  subject TEXT,
  message TEXT NOT NULL,
  requested_info TEXT[],

  -- Delivery
  sent_via TEXT NOT NULL, -- 'email', 'sms', 'in_app'
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Response
  responded_at TIMESTAMPTZ,
  response_content TEXT,
  response_attachments UUID[], -- References to tip_attachments

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'responded', 'expired'
  expires_at TIMESTAMPTZ,

  -- Automation
  is_automated BOOLEAN DEFAULT FALSE,
  triggered_by_rule UUID REFERENCES verification_rules(id),

  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- VERIFICATION QUEUE TABLE
-- Human review queue for tips requiring manual verification
-- =============================================================================

CREATE TABLE verification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id UUID NOT NULL REFERENCES tips(id) ON DELETE CASCADE,
  tip_verification_id UUID REFERENCES tip_verifications(id) ON DELETE CASCADE,

  -- Queue management
  queue_type TEXT DEFAULT 'standard', -- 'critical', 'high_priority', 'standard', 'low_priority'
  priority INTEGER DEFAULT 5, -- 1-10

  -- Assignment
  assigned_to UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,
  assignment_reason TEXT,

  -- Review status
  status TEXT DEFAULT 'pending', -- 'pending', 'in_review', 'completed', 'escalated', 'expired'
  review_started_at TIMESTAMPTZ,
  review_completed_at TIMESTAMPTZ,

  -- SLA tracking
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT FALSE,

  -- Review outcome
  outcome TEXT, -- 'verified', 'rejected', 'escalated', 'needs_more_info'
  outcome_notes TEXT,

  -- Escalation
  escalated_to UUID REFERENCES profiles(id),
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,

  -- Timestamps
  entered_queue_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ADD NEW COLUMNS TO EXISTING TIPS TABLE
-- =============================================================================

ALTER TABLE tips ADD COLUMN IF NOT EXISTS tipster_profile_id UUID REFERENCES tipster_profiles(id);
ALTER TABLE tips ADD COLUMN IF NOT EXISTS verification_id UUID; -- Will be set after verification record created
ALTER TABLE tips ADD COLUMN IF NOT EXISTS priority_bucket tip_priority_bucket DEFAULT 'medium';
ALTER TABLE tips ADD COLUMN IF NOT EXISTS auto_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS auto_verification_score INTEGER;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS requires_human_review BOOLEAN DEFAULT TRUE;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'web'; -- 'web', 'phone', 'email', 'social_media', 'partner_api'
ALTER TABLE tips ADD COLUMN IF NOT EXISTS source_reference TEXT;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE tips ADD COLUMN IF NOT EXISTS attachments_count INTEGER DEFAULT 0;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Tipster profiles
CREATE INDEX idx_tipster_profiles_user ON tipster_profiles(user_id);
CREATE INDEX idx_tipster_profiles_anonymous ON tipster_profiles(anonymous_id);
CREATE INDEX idx_tipster_profiles_reliability ON tipster_profiles(reliability_tier, reliability_score DESC);
CREATE INDEX idx_tipster_profiles_blocked ON tipster_profiles(is_blocked) WHERE is_blocked = TRUE;

-- Tip verifications
CREATE INDEX idx_tip_verifications_tip ON tip_verifications(tip_id);
CREATE INDEX idx_tip_verifications_status ON tip_verifications(verification_status);
CREATE INDEX idx_tip_verifications_priority ON tip_verifications(priority_bucket);
CREATE INDEX idx_tip_verifications_credibility ON tip_verifications(credibility_score DESC);
CREATE INDEX idx_tip_verifications_requires_review ON tip_verifications(requires_human_review) WHERE requires_human_review = TRUE;
CREATE INDEX idx_tip_verifications_duplicates ON tip_verifications(is_duplicate) WHERE is_duplicate = TRUE;

-- Tip attachments
CREATE INDEX idx_tip_attachments_tip ON tip_attachments(tip_id);
CREATE INDEX idx_tip_attachments_gps ON tip_attachments(gps_latitude, gps_longitude) WHERE gps_latitude IS NOT NULL;

-- Verification rules
CREATE INDEX idx_verification_rules_type ON verification_rules(rule_type);
CREATE INDEX idx_verification_rules_active ON verification_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_verification_rules_jurisdiction ON verification_rules(jurisdiction_id);

-- Scam patterns
CREATE INDEX idx_scam_patterns_type ON scam_patterns(pattern_type);
CREATE INDEX idx_scam_patterns_active ON scam_patterns(is_active) WHERE is_active = TRUE;

-- Follow-ups
CREATE INDEX idx_tip_follow_ups_tip ON tip_follow_ups(tip_id);
CREATE INDEX idx_tip_follow_ups_tipster ON tip_follow_ups(tipster_profile_id);
CREATE INDEX idx_tip_follow_ups_status ON tip_follow_ups(status);
CREATE INDEX idx_tip_follow_ups_pending ON tip_follow_ups(status, expires_at) WHERE status IN ('pending', 'sent');

-- Verification queue
CREATE INDEX idx_verification_queue_tip ON verification_queue(tip_id);
CREATE INDEX idx_verification_queue_assigned ON verification_queue(assigned_to);
CREATE INDEX idx_verification_queue_status ON verification_queue(status);
CREATE INDEX idx_verification_queue_priority ON verification_queue(queue_type, priority);
CREATE INDEX idx_verification_queue_pending ON verification_queue(status, priority, sla_deadline) WHERE status = 'pending';

-- Tips table updates
CREATE INDEX idx_tips_priority_bucket ON tips(priority_bucket);
CREATE INDEX idx_tips_tipster_profile ON tips(tipster_profile_id);
CREATE INDEX idx_tips_requires_review ON tips(requires_human_review) WHERE requires_human_review = TRUE;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

ALTER TABLE tipster_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scam_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_queue ENABLE ROW LEVEL SECURITY;

-- Tipster profiles policies
CREATE POLICY "Tipsters can view own profile" ON tipster_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "LE can view all tipster profiles" ON tipster_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can manage tipster profiles" ON tipster_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Tip verifications policies
CREATE POLICY "LE can view verifications" ON tip_verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can manage verifications" ON tip_verifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Tip attachments policies
CREATE POLICY "LE can view attachments" ON tip_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Anyone can create attachments with tip" ON tip_attachments
  FOR INSERT WITH CHECK (TRUE);

-- Verification rules policies (admin only)
CREATE POLICY "Admin can manage verification rules" ON verification_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

CREATE POLICY "LE can view verification rules" ON verification_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Scam patterns policies (admin only)
CREATE POLICY "Admin can manage scam patterns" ON scam_patterns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

CREATE POLICY "LE can view scam patterns" ON scam_patterns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Follow-ups policies
CREATE POLICY "LE can manage follow-ups" ON tip_follow_ups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Verification queue policies
CREATE POLICY "LE can view verification queue" ON verification_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can manage verification queue" ON verification_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Update tipster reliability after verification
CREATE OR REPLACE FUNCTION update_tipster_reliability()
RETURNS TRIGGER AS $$
DECLARE
  tipster_id UUID;
  new_score INTEGER;
  new_tier tipster_reliability_tier;
BEGIN
  -- Get tipster profile ID from the tip
  SELECT tipster_profile_id INTO tipster_id
  FROM tips
  WHERE id = NEW.tip_id;

  IF tipster_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Update tip counts based on verification status
  IF NEW.verification_status = 'verified' AND (OLD.verification_status IS NULL OR OLD.verification_status != 'verified') THEN
    UPDATE tipster_profiles
    SET
      verified_tips = verified_tips + 1,
      last_tip_at = NOW()
    WHERE id = tipster_id;
  ELSIF NEW.verification_status = 'partially_verified' AND (OLD.verification_status IS NULL OR OLD.verification_status != 'partially_verified') THEN
    UPDATE tipster_profiles
    SET
      partially_verified_tips = partially_verified_tips + 1,
      last_tip_at = NOW()
    WHERE id = tipster_id;
  ELSIF NEW.verification_status = 'rejected' AND (OLD.verification_status IS NULL OR OLD.verification_status != 'rejected') THEN
    UPDATE tipster_profiles
    SET
      false_tips = false_tips + 1,
      last_tip_at = NOW()
    WHERE id = tipster_id;
  END IF;

  -- Recalculate reliability score
  SELECT
    CASE
      WHEN total_tips = 0 THEN 50
      ELSE LEAST(100, GREATEST(0,
        50 +
        (verified_tips * 10) +
        (partially_verified_tips * 5) +
        (tips_leading_to_resolution * 20) -
        (false_tips * 15) -
        (spam_tips * 25)
      ))
    END INTO new_score
  FROM tipster_profiles
  WHERE id = tipster_id;

  -- Determine tier
  new_tier := CASE
    WHEN new_score >= 90 THEN 'verified_source'::tipster_reliability_tier
    WHEN new_score >= 75 THEN 'high'::tipster_reliability_tier
    WHEN new_score >= 50 THEN 'moderate'::tipster_reliability_tier
    WHEN new_score >= 25 THEN 'low'::tipster_reliability_tier
    ELSE 'unrated'::tipster_reliability_tier
  END;

  UPDATE tipster_profiles
  SET
    reliability_score = new_score,
    reliability_tier = new_tier,
    updated_at = NOW()
  WHERE id = tipster_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate overall credibility score
CREATE OR REPLACE FUNCTION calculate_credibility_score(verification_record tip_verifications)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 50;
  factors_count INTEGER := 0;
BEGIN
  -- Photo verification (weight: 20%)
  IF verification_record.photo_verification_score IS NOT NULL THEN
    score := score + (verification_record.photo_verification_score - 50) * 0.2;
    factors_count := factors_count + 1;
  END IF;

  -- Location verification (weight: 20%)
  IF verification_record.location_verification_score IS NOT NULL THEN
    score := score + (verification_record.location_verification_score - 50) * 0.2;
    factors_count := factors_count + 1;
  END IF;

  -- Time plausibility (weight: 15%)
  IF verification_record.time_plausibility_score IS NOT NULL THEN
    score := score + (verification_record.time_plausibility_score - 50) * 0.15;
    factors_count := factors_count + 1;
  END IF;

  -- Text analysis (weight: 15%)
  IF verification_record.text_analysis_score IS NOT NULL THEN
    score := score + (verification_record.text_analysis_score - 50) * 0.15;
    factors_count := factors_count + 1;
  END IF;

  -- Cross-reference (weight: 15%)
  IF verification_record.cross_reference_score IS NOT NULL THEN
    score := score + (verification_record.cross_reference_score - 50) * 0.15;
    factors_count := factors_count + 1;
  END IF;

  -- Tipster reliability (weight: 15%)
  IF verification_record.tipster_reliability_score IS NOT NULL THEN
    score := score + (verification_record.tipster_reliability_score - 50) * 0.15;
    factors_count := factors_count + 1;
  END IF;

  -- Spam penalty
  IF verification_record.spam_score > 50 THEN
    score := score - (verification_record.spam_score - 50);
  END IF;

  -- Hoax indicator penalty
  IF array_length(verification_record.hoax_indicators, 1) > 0 THEN
    score := score - (array_length(verification_record.hoax_indicators, 1) * 10);
  END IF;

  -- Duplicate penalty
  IF verification_record.is_duplicate THEN
    score := score - 20;
  END IF;

  RETURN LEAST(100, GREATEST(0, score));
END;
$$ LANGUAGE plpgsql;

-- Determine priority bucket based on credibility and case factors
CREATE OR REPLACE FUNCTION determine_priority_bucket(
  credibility INTEGER,
  case_priority priority_level,
  has_photo BOOLEAN,
  has_location BOOLEAN,
  tipster_tier tipster_reliability_tier
)
RETURNS tip_priority_bucket AS $$
BEGIN
  -- Spam detection
  IF credibility < 20 THEN
    RETURN 'spam'::tip_priority_bucket;
  END IF;

  -- Critical priority
  IF credibility >= 80 AND case_priority IN ('p0_critical', 'p1_high') THEN
    RETURN 'critical'::tip_priority_bucket;
  END IF;

  IF credibility >= 70 AND case_priority = 'p0_critical' THEN
    RETURN 'critical'::tip_priority_bucket;
  END IF;

  -- High priority
  IF credibility >= 70 AND case_priority IN ('p0_critical', 'p1_high', 'p2_medium') THEN
    RETURN 'high'::tip_priority_bucket;
  END IF;

  IF credibility >= 60 AND tipster_tier IN ('verified_source', 'high') THEN
    RETURN 'high'::tip_priority_bucket;
  END IF;

  IF credibility >= 60 AND has_photo AND has_location THEN
    RETURN 'high'::tip_priority_bucket;
  END IF;

  -- Medium priority
  IF credibility >= 40 THEN
    RETURN 'medium'::tip_priority_bucket;
  END IF;

  -- Low priority
  RETURN 'low'::tip_priority_bucket;
END;
$$ LANGUAGE plpgsql;

-- Get or create tipster profile from tip submission
CREATE OR REPLACE FUNCTION get_or_create_tipster_profile(
  p_user_id UUID,
  p_anonymous_id TEXT,
  p_email TEXT,
  p_phone TEXT
)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Try to find by user_id first
  IF p_user_id IS NOT NULL THEN
    SELECT id INTO profile_id
    FROM tipster_profiles
    WHERE user_id = p_user_id;

    IF profile_id IS NOT NULL THEN
      UPDATE tipster_profiles
      SET
        total_tips = total_tips + 1,
        last_tip_at = NOW(),
        updated_at = NOW()
      WHERE id = profile_id;
      RETURN profile_id;
    END IF;
  END IF;

  -- Try to find by anonymous_id
  IF p_anonymous_id IS NOT NULL THEN
    SELECT id INTO profile_id
    FROM tipster_profiles
    WHERE anonymous_id = p_anonymous_id;

    IF profile_id IS NOT NULL THEN
      UPDATE tipster_profiles
      SET
        total_tips = total_tips + 1,
        last_tip_at = NOW(),
        updated_at = NOW()
      WHERE id = profile_id;
      RETURN profile_id;
    END IF;
  END IF;

  -- Create new profile
  INSERT INTO tipster_profiles (
    user_id,
    anonymous_id,
    email,
    phone,
    total_tips,
    first_tip_at,
    last_tip_at
  ) VALUES (
    p_user_id,
    p_anonymous_id,
    p_email,
    p_phone,
    1,
    NOW(),
    NOW()
  )
  RETURNING id INTO profile_id;

  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at triggers
CREATE TRIGGER update_tipster_profiles_updated_at BEFORE UPDATE ON tipster_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tip_verifications_updated_at BEFORE UPDATE ON tip_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_rules_updated_at BEFORE UPDATE ON verification_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scam_patterns_updated_at BEFORE UPDATE ON scam_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tip_follow_ups_updated_at BEFORE UPDATE ON tip_follow_ups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_queue_updated_at BEFORE UPDATE ON verification_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update tipster reliability on verification status change
CREATE TRIGGER trigger_update_tipster_reliability
  AFTER INSERT OR UPDATE OF verification_status ON tip_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_tipster_reliability();

-- Audit logging triggers
CREATE TRIGGER audit_tip_verifications AFTER INSERT OR UPDATE OR DELETE ON tip_verifications
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_tipster_profiles AFTER INSERT OR UPDATE OR DELETE ON tipster_profiles
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- =============================================================================
-- SEED DATA: Default Verification Rules
-- =============================================================================

INSERT INTO verification_rules (name, description, rule_type, conditions, actions, score_weight, is_active) VALUES
-- Scoring rules
('High tipster reliability bonus', 'Boost score for verified tipsters', 'scoring',
 '{"field": "tipster_reliability_tier", "operator": "in", "value": ["verified_source", "high"]}',
 '{"score_modifier": 15}', 15, TRUE),

('Photo with GPS bonus', 'Boost score when photo has valid GPS data', 'scoring',
 '{"field": "photo_has_gps", "operator": "=", "value": true}',
 '{"score_modifier": 10}', 10, TRUE),

('Detailed description bonus', 'Boost score for detailed tip content', 'scoring',
 '{"field": "content_length", "operator": ">", "value": 200}',
 '{"score_modifier": 5}', 5, TRUE),

-- Spam rules
('Known spam pattern', 'Flag tips matching known spam patterns', 'spam',
 '{"field": "matches_spam_pattern", "operator": "=", "value": true}',
 '{"set_priority": "spam", "spam_score_add": 50}', 50, TRUE),

('Repeated false reporter', 'Flag tips from users with history of false reports', 'spam',
 '{"field": "tipster_false_tip_rate", "operator": ">", "value": 0.5}',
 '{"spam_score_add": 30, "require_review": true}', 30, TRUE),

-- Priority rules
('Critical case high credibility', 'Auto-prioritize high credibility tips on critical cases', 'priority',
 '{"and": [{"field": "case_priority", "operator": "=", "value": "p0_critical"}, {"field": "credibility_score", "operator": ">=", "value": 70}]}',
 '{"set_priority": "critical", "require_review": true, "sla_hours": 1}', 0, TRUE),

('Photo match detected', 'Prioritize tips with potential face match', 'priority',
 '{"field": "face_match_confidence", "operator": ">", "value": 0.7}',
 '{"set_priority": "critical", "require_review": true, "sla_hours": 2}', 0, TRUE),

-- Workflow rules
('Low credibility auto-triage', 'Auto-triage low credibility tips', 'workflow',
 '{"field": "credibility_score", "operator": "<", "value": 30}',
 '{"auto_triage": true, "set_priority": "low", "require_review": false}', 0, TRUE),

('Anonymous tip review', 'Require review for anonymous tips on high priority cases', 'workflow',
 '{"and": [{"field": "is_anonymous", "operator": "=", "value": true}, {"field": "case_priority", "operator": "in", "value": ["p0_critical", "p1_high"]}]}',
 '{"require_review": true, "review_priority": 3}', 0, TRUE);

-- =============================================================================
-- SEED DATA: Default Scam Patterns
-- =============================================================================

INSERT INTO scam_patterns (name, description, pattern_type, pattern_data, confidence_threshold, is_active) VALUES
('Money request scam', 'Tips that request money or gift cards', 'text',
 '{"keywords": ["wire money", "gift card", "western union", "bitcoin", "crypto", "payment required", "reward claim"], "case_insensitive": true}',
 0.7, TRUE),

('Generic vague location', 'Suspiciously vague location descriptions', 'text',
 '{"patterns": ["somewhere near", "I think I saw", "might have been", "looked like"], "min_matches": 2}',
 0.6, TRUE),

('Copy-paste detector', 'Detect copy-pasted content from other sources', 'text',
 '{"check_web_similarity": true, "threshold": 0.9}',
 0.85, TRUE),

('Stock photo detection', 'Detect known stock photos', 'image',
 '{"check_stock_databases": true, "check_reverse_search": true}',
 0.8, TRUE),

('Impossible travel', 'Sighting location impossible given timeline', 'behavior',
 '{"check_travel_feasibility": true, "max_speed_kmh": 200}',
 0.9, TRUE),

('Rapid-fire submissions', 'Multiple tips submitted too quickly', 'behavior',
 '{"max_tips_per_hour": 5, "max_tips_per_day": 20}',
 0.8, TRUE);

-- =============================================================================
-- GRANTS FOR SERVICE ROLE
-- =============================================================================

GRANT ALL ON tipster_profiles TO service_role;
GRANT ALL ON tip_verifications TO service_role;
GRANT ALL ON tip_attachments TO service_role;
GRANT ALL ON verification_rules TO service_role;
GRANT ALL ON scam_patterns TO service_role;
GRANT ALL ON tip_follow_ups TO service_role;
GRANT ALL ON verification_queue TO service_role;
