-- Cold Case Revival System Migration
-- LC-FEAT-028: Specialized workflow for reviewing and reviving cold cases
-- =============================================================================

-- =============================================================================
-- NEW ENUMS
-- =============================================================================

-- Cold case classification criteria
CREATE TYPE cold_case_classification AS ENUM (
  'auto_classified',      -- Automatically classified based on criteria
  'manually_classified',  -- Manually marked as cold case
  'reclassified_active',  -- Previously cold, now active again
  'under_review'          -- Currently being reviewed for revival
);

-- Review cycle frequency
CREATE TYPE review_frequency AS ENUM (
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
  'biennial'
);

-- DNA submission status
CREATE TYPE dna_submission_status AS ENUM (
  'not_submitted',
  'pending_submission',
  'submitted',
  'match_found',
  'no_match',
  'resubmission_pending',
  'resubmitted'
);

-- Campaign type for re-engagement
CREATE TYPE campaign_type AS ENUM (
  'social_media',
  'press_release',
  'billboard',
  'tv_spot',
  'radio_spot',
  'anniversary_push',
  'community_event',
  'podcast_feature',
  'documentary',
  'reward_increase'
);

-- Campaign status
CREATE TYPE campaign_status AS ENUM (
  'draft',
  'scheduled',
  'active',
  'completed',
  'cancelled'
);

-- Review checklist item status
CREATE TYPE checklist_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'skipped',
  'not_applicable'
);

-- Pattern match confidence level
CREATE TYPE pattern_confidence AS ENUM (
  'low',
  'medium',
  'high',
  'very_high'
);

-- =============================================================================
-- COLD CASE PROFILES TABLE
-- Main table tracking cold case metadata and revival status
-- =============================================================================

CREATE TABLE cold_case_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Classification
  classification cold_case_classification DEFAULT 'auto_classified',
  classified_at TIMESTAMPTZ DEFAULT NOW(),
  classified_by UUID REFERENCES profiles(id),
  classification_reason TEXT,

  -- Cold case timing
  became_cold_at TIMESTAMPTZ NOT NULL,
  total_days_missing INTEGER,

  -- Auto-classification criteria met
  criteria_no_leads_90_days BOOLEAN DEFAULT FALSE,
  criteria_no_tips_60_days BOOLEAN DEFAULT FALSE,
  criteria_no_activity_180_days BOOLEAN DEFAULT FALSE,
  criteria_manually_marked BOOLEAN DEFAULT FALSE,
  criteria_resource_constraints BOOLEAN DEFAULT FALSE,

  -- Review scheduling
  review_frequency review_frequency DEFAULT 'annual',
  last_review_date DATE,
  next_review_date DATE,
  reviews_completed INTEGER DEFAULT 0,

  -- Current review assignment
  current_reviewer_id UUID REFERENCES profiles(id),
  review_started_at TIMESTAMPTZ,
  review_due_date DATE,

  -- Revival tracking
  revival_attempts INTEGER DEFAULT 0,
  last_revival_attempt DATE,
  revival_success_count INTEGER DEFAULT 0,

  -- DNA tracking
  dna_submission_status dna_submission_status DEFAULT 'not_submitted',
  dna_last_submitted_at TIMESTAMPTZ,
  dna_database_checked TEXT[], -- Array of databases checked (CODIS, ancestry, etc.)
  dna_samples_available BOOLEAN DEFAULT FALSE,

  -- Anniversary tracking
  anniversary_date DATE, -- Date of disappearance for annual pushes
  last_anniversary_campaign DATE,
  next_anniversary_campaign DATE,

  -- Cross-reference tracking
  potentially_linked_cases UUID[], -- Array of case IDs that may be related
  linked_resolved_cases UUID[], -- Resolved cases that may provide insights

  -- AI pattern matching
  pattern_match_enabled BOOLEAN DEFAULT TRUE,
  last_pattern_analysis TIMESTAMPTZ,
  pattern_clusters TEXT[], -- Cluster IDs from pattern matching

  -- Case file digitization
  digitization_status TEXT DEFAULT 'not_started',
  digitization_progress INTEGER DEFAULT 0, -- Percentage
  physical_files_location TEXT,
  digitized_at TIMESTAMPTZ,
  digitized_by UUID REFERENCES profiles(id),

  -- Family contact
  family_notified_of_cold_status BOOLEAN DEFAULT FALSE,
  family_notification_date DATE,
  family_contact_preference TEXT,
  family_last_contact_date DATE,
  family_opted_out_notifications BOOLEAN DEFAULT FALSE,

  -- Notes and metadata
  revival_notes TEXT,
  special_circumstances TEXT,
  media_restrictions JSONB DEFAULT '{}',

  -- Priority scoring for revival
  revival_priority_score INTEGER DEFAULT 0,
  revival_priority_factors JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(case_id)
);

-- =============================================================================
-- COLD CASE PROFILES VIEW
-- Derived fields that depend on current date
-- =============================================================================

CREATE OR REPLACE VIEW v_cold_case_profiles AS
SELECT
  cold_case_profiles.*,
  (CURRENT_DATE - cold_case_profiles.became_cold_at::DATE)::INTEGER AS days_since_cold
FROM cold_case_profiles;

-- =============================================================================
-- COLD CASE REVIEWS TABLE
-- Track individual review sessions
-- =============================================================================

CREATE TABLE cold_case_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cold_case_profile_id UUID NOT NULL REFERENCES cold_case_profiles(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Review metadata
  review_number INTEGER NOT NULL,
  review_type TEXT DEFAULT 'periodic', -- periodic, special, anniversary, tip_triggered

  -- Reviewer info
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),

  -- Review timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  due_date DATE,

  -- Review status
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, deferred

  -- Review outcomes
  new_leads_identified INTEGER DEFAULT 0,
  new_evidence_found BOOLEAN DEFAULT FALSE,
  new_evidence_description TEXT,
  dna_resubmission_recommended BOOLEAN DEFAULT FALSE,
  campaign_recommended BOOLEAN DEFAULT FALSE,
  recommended_campaign_type campaign_type,
  escalation_recommended BOOLEAN DEFAULT FALSE,
  escalation_reason TEXT,

  -- Revival decision
  revival_recommended BOOLEAN DEFAULT FALSE,
  revival_decision TEXT, -- revive, maintain_cold, archive
  revival_justification TEXT,

  -- Cross-reference findings
  cross_references_checked INTEGER DEFAULT 0,
  related_cases_identified UUID[],

  -- Pattern matching results
  pattern_matches_found INTEGER DEFAULT 0,
  pattern_match_details JSONB DEFAULT '[]',

  -- Summary
  summary TEXT,
  recommendations TEXT,
  next_steps TEXT,

  -- Family notification
  family_notified BOOLEAN DEFAULT FALSE,
  family_notification_date DATE,
  family_notification_method TEXT,
  family_response TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- REVIEW CHECKLIST ITEMS TABLE
-- Standardized checklist for cold case reviews
-- =============================================================================

CREATE TABLE cold_case_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES cold_case_reviews(id) ON DELETE CASCADE,

  -- Checklist item details
  category TEXT NOT NULL, -- evidence, witnesses, technology, databases, family, media
  item_order INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,

  -- Status tracking
  status checklist_status DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),

  -- Results
  result_summary TEXT,
  findings TEXT,
  action_required BOOLEAN DEFAULT FALSE,
  action_description TEXT,

  -- Notes
  notes TEXT,
  attachments JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- REVIEWER ROTATION TABLE
-- Manage reviewer assignments and rotation
-- =============================================================================

CREATE TABLE cold_case_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES profiles(id),

  -- Reviewer qualifications
  is_active BOOLEAN DEFAULT TRUE,
  specializations TEXT[], -- Array of specializations (child, elderly, indigenous, etc.)
  max_concurrent_reviews INTEGER DEFAULT 5,

  -- Assignment tracking
  current_assignments INTEGER DEFAULT 0,
  total_reviews_completed INTEGER DEFAULT 0,
  total_revivals_achieved INTEGER DEFAULT 0,

  -- Rotation scheduling
  last_assignment_date DATE,
  next_available_date DATE,
  rotation_priority INTEGER DEFAULT 0, -- Lower = higher priority for next assignment

  -- Performance metrics
  average_review_duration_days NUMERIC(5, 2),
  revival_success_rate NUMERIC(5, 2),

  -- Preferences
  preferred_case_types TEXT[],
  excluded_jurisdictions UUID[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(reviewer_id)
);

-- =============================================================================
-- RE-ENGAGEMENT CAMPAIGNS TABLE
-- Track social media and publicity campaigns
-- =============================================================================

CREATE TABLE cold_case_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cold_case_profile_id UUID NOT NULL REFERENCES cold_case_profiles(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Campaign details
  campaign_type campaign_type NOT NULL,
  campaign_name TEXT NOT NULL,
  campaign_description TEXT,

  -- Scheduling
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,

  -- Status
  status campaign_status DEFAULT 'draft',

  -- Anniversary-specific
  is_anniversary_campaign BOOLEAN DEFAULT FALSE,
  anniversary_year INTEGER,
  years_since_disappearance INTEGER,

  -- Target metrics
  target_reach INTEGER,
  target_tips INTEGER,
  target_shares INTEGER,

  -- Actual results
  actual_reach INTEGER DEFAULT 0,
  actual_tips_generated INTEGER DEFAULT 0,
  actual_shares INTEGER DEFAULT 0,
  actual_leads_generated INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5, 2),

  -- Platform-specific data
  platforms TEXT[], -- facebook, twitter, instagram, tiktok, etc.
  platform_metrics JSONB DEFAULT '{}',

  -- Content
  content_headline TEXT,
  content_body TEXT,
  content_media_urls TEXT[],
  content_hashtags TEXT[],

  -- Budget
  budget_allocated NUMERIC(10, 2),
  budget_spent NUMERIC(10, 2),

  -- Approval
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  family_approved BOOLEAN DEFAULT FALSE,
  family_approval_date DATE,

  -- Post-campaign
  post_campaign_analysis TEXT,
  lessons_learned TEXT,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DNA SUBMISSIONS TABLE
-- Track DNA database submissions and re-submissions
-- =============================================================================

CREATE TABLE cold_case_dna_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cold_case_profile_id UUID NOT NULL REFERENCES cold_case_profiles(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Submission details
  database_name TEXT NOT NULL, -- CODIS, ancestry services, familial DNA, etc.
  submission_type TEXT NOT NULL, -- initial, resubmission, familial
  submission_reference TEXT,

  -- Sample info
  sample_type TEXT, -- blood, hair, touch DNA, etc.
  sample_quality TEXT,
  sample_location TEXT,

  -- Timing
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES profiles(id),
  expected_result_date DATE,
  result_received_at TIMESTAMPTZ,

  -- Results
  status dna_submission_status DEFAULT 'pending_submission',
  result_summary TEXT,
  match_found BOOLEAN DEFAULT FALSE,
  match_details TEXT,
  match_confidence TEXT,

  -- Follow-up
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT,
  follow_up_completed_at TIMESTAMPTZ,

  -- Documentation
  documentation_url TEXT,
  chain_of_custody_verified BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- NEW EVIDENCE FLAGS TABLE
-- Track new evidence discovered for cold cases
-- =============================================================================

CREATE TABLE cold_case_new_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cold_case_profile_id UUID NOT NULL REFERENCES cold_case_profiles(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Evidence details
  evidence_type TEXT NOT NULL, -- physical, digital, witness, forensic, documentary
  evidence_source TEXT NOT NULL,
  evidence_description TEXT NOT NULL,

  -- Discovery
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  discovered_by UUID REFERENCES profiles(id),
  discovery_context TEXT,

  -- Assessment
  significance_level TEXT DEFAULT 'medium', -- low, medium, high, critical
  potential_impact TEXT,
  verification_status TEXT DEFAULT 'unverified', -- unverified, verified, disputed
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,

  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processing_notes TEXT,

  -- Related to revival
  triggered_review BOOLEAN DEFAULT FALSE,
  review_id UUID REFERENCES cold_case_reviews(id),

  -- Documentation
  documentation_urls TEXT[],
  chain_of_custody TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PATTERN MATCHES TABLE
-- AI-assisted pattern matching results
-- =============================================================================

CREATE TABLE cold_case_pattern_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  matched_case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Match details
  match_type TEXT NOT NULL, -- geographic, demographic, temporal, modus_operandi, circumstantial
  confidence_level pattern_confidence NOT NULL,
  confidence_score NUMERIC(5, 4), -- 0.0000 to 1.0000

  -- Pattern details
  matching_factors JSONB NOT NULL, -- Array of factors that matched
  similarity_score NUMERIC(5, 4),

  -- Geographic patterns
  geographic_proximity_km NUMERIC(10, 2),
  same_jurisdiction BOOLEAN DEFAULT FALSE,
  same_region BOOLEAN DEFAULT FALSE,

  -- Temporal patterns
  temporal_proximity_days INTEGER,
  same_time_of_year BOOLEAN DEFAULT FALSE,
  same_day_of_week BOOLEAN DEFAULT FALSE,

  -- Demographic patterns
  age_similarity BOOLEAN DEFAULT FALSE,
  gender_match BOOLEAN DEFAULT FALSE,
  other_demographic_matches TEXT[],

  -- Analysis
  analysis_date TIMESTAMPTZ DEFAULT NOW(),
  analysis_version TEXT,
  algorithm_used TEXT,

  -- Human review
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_determination TEXT, -- confirmed, possible, rejected
  review_notes TEXT,

  -- Action taken
  investigation_opened BOOLEAN DEFAULT FALSE,
  investigation_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(source_case_id, matched_case_id, match_type)
);

-- =============================================================================
-- COLD CASE METRICS TABLE
-- Track cold case program metrics
-- =============================================================================

CREATE TABLE cold_case_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Time period
  period_type TEXT NOT NULL, -- daily, weekly, monthly, quarterly, annual
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Case counts
  total_cold_cases INTEGER DEFAULT 0,
  new_cold_cases INTEGER DEFAULT 0,
  revived_cases INTEGER DEFAULT 0,
  resolved_cold_cases INTEGER DEFAULT 0,

  -- Age distribution
  cases_1_2_years INTEGER DEFAULT 0,
  cases_2_5_years INTEGER DEFAULT 0,
  cases_5_10_years INTEGER DEFAULT 0,
  cases_10_plus_years INTEGER DEFAULT 0,
  average_case_age_days NUMERIC(10, 2),
  oldest_case_days INTEGER,

  -- Review metrics
  reviews_scheduled INTEGER DEFAULT 0,
  reviews_completed INTEGER DEFAULT 0,
  reviews_overdue INTEGER DEFAULT 0,
  average_review_duration_days NUMERIC(5, 2),

  -- Campaign metrics
  campaigns_launched INTEGER DEFAULT 0,
  total_campaign_reach INTEGER DEFAULT 0,
  tips_from_campaigns INTEGER DEFAULT 0,
  leads_from_campaigns INTEGER DEFAULT 0,

  -- DNA metrics
  dna_submissions INTEGER DEFAULT 0,
  dna_matches_found INTEGER DEFAULT 0,
  dna_resubmissions INTEGER DEFAULT 0,

  -- Pattern matching
  pattern_matches_found INTEGER DEFAULT 0,
  pattern_matches_confirmed INTEGER DEFAULT 0,

  -- Resource allocation
  reviewer_hours_allocated NUMERIC(10, 2),
  campaign_budget_spent NUMERIC(10, 2),

  -- Success rates
  revival_success_rate NUMERIC(5, 2),
  review_to_revival_rate NUMERIC(5, 2),
  campaign_effectiveness_rate NUMERIC(5, 2),

  computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DEFAULT REVIEW CHECKLIST TEMPLATE
-- =============================================================================

CREATE TABLE cold_case_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template details
  template_name TEXT NOT NULL,
  template_description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Items stored as JSONB array
  items JSONB NOT NULL DEFAULT '[]',
  -- Example item: {"category": "evidence", "order": 1, "name": "Review physical evidence", "description": "..."}

  -- Usage
  case_types TEXT[], -- Applicable case types

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default checklist template
INSERT INTO cold_case_checklist_templates (template_name, template_description, is_default, items) VALUES
(
  'Standard Cold Case Review',
  'Default comprehensive checklist for cold case reviews',
  TRUE,
  '[
    {"category": "evidence", "order": 1, "name": "Review all physical evidence", "description": "Examine all physical evidence collected during initial investigation"},
    {"category": "evidence", "order": 2, "name": "Check for new forensic techniques", "description": "Identify if new forensic technologies can be applied to existing evidence"},
    {"category": "evidence", "order": 3, "name": "DNA evidence assessment", "description": "Evaluate DNA samples for resubmission to expanded databases"},
    {"category": "witnesses", "order": 4, "name": "Re-interview key witnesses", "description": "Contact and re-interview witnesses who may have new information"},
    {"category": "witnesses", "order": 5, "name": "Identify new potential witnesses", "description": "Search for witnesses not previously identified"},
    {"category": "technology", "order": 6, "name": "Social media analysis", "description": "Review social media for new information or leads"},
    {"category": "technology", "order": 7, "name": "Digital footprint check", "description": "Search for digital activity related to missing person"},
    {"category": "technology", "order": 8, "name": "Surveillance footage review", "description": "Check for any new or previously unreviewed footage"},
    {"category": "databases", "order": 9, "name": "CPIC/NCIC database check", "description": "Query national missing persons and unidentified remains databases"},
    {"category": "databases", "order": 10, "name": "NamUs comparison", "description": "Cross-reference with NamUs unidentified persons database"},
    {"category": "databases", "order": 11, "name": "Hospital/morgue records", "description": "Check hospital admissions and morgue records"},
    {"category": "databases", "order": 12, "name": "Incarceration records", "description": "Search correctional facility records"},
    {"category": "family", "order": 13, "name": "Family contact", "description": "Contact family for updates and new information"},
    {"category": "family", "order": 14, "name": "Obtain updated family DNA", "description": "Request family DNA samples for familial searching"},
    {"category": "media", "order": 15, "name": "Assess publicity opportunities", "description": "Evaluate potential for anniversary or other media campaigns"},
    {"category": "media", "order": 16, "name": "Social media re-engagement plan", "description": "Develop plan for social media publicity push"},
    {"category": "crossref", "order": 17, "name": "Cross-reference with resolved cases", "description": "Compare with recently resolved cases for patterns"},
    {"category": "crossref", "order": 18, "name": "Pattern analysis review", "description": "Review AI pattern matching results for related cases"},
    {"category": "admin", "order": 19, "name": "Case file digitization status", "description": "Ensure all case files are digitized and accessible"},
    {"category": "admin", "order": 20, "name": "Resource allocation review", "description": "Assess if additional resources should be allocated"}
  ]'
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_cold_case_profiles_case ON cold_case_profiles(case_id);
CREATE INDEX idx_cold_case_profiles_classification ON cold_case_profiles(classification);
CREATE INDEX idx_cold_case_profiles_next_review ON cold_case_profiles(next_review_date);
CREATE INDEX idx_cold_case_profiles_reviewer ON cold_case_profiles(current_reviewer_id);
CREATE INDEX idx_cold_case_profiles_dna_status ON cold_case_profiles(dna_submission_status);
CREATE INDEX idx_cold_case_profiles_anniversary ON cold_case_profiles(anniversary_date);
CREATE INDEX idx_cold_case_profiles_revival_priority ON cold_case_profiles(revival_priority_score DESC);

CREATE INDEX idx_cold_case_reviews_profile ON cold_case_reviews(cold_case_profile_id);
CREATE INDEX idx_cold_case_reviews_case ON cold_case_reviews(case_id);
CREATE INDEX idx_cold_case_reviews_reviewer ON cold_case_reviews(reviewer_id);
CREATE INDEX idx_cold_case_reviews_status ON cold_case_reviews(status);
CREATE INDEX idx_cold_case_reviews_due ON cold_case_reviews(due_date);

CREATE INDEX idx_cold_case_checklist_review ON cold_case_checklist_items(review_id);
CREATE INDEX idx_cold_case_checklist_status ON cold_case_checklist_items(status);

CREATE INDEX idx_cold_case_reviewers_active ON cold_case_reviewers(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_cold_case_reviewers_rotation ON cold_case_reviewers(rotation_priority, next_available_date);

CREATE INDEX idx_cold_case_campaigns_profile ON cold_case_campaigns(cold_case_profile_id);
CREATE INDEX idx_cold_case_campaigns_case ON cold_case_campaigns(case_id);
CREATE INDEX idx_cold_case_campaigns_status ON cold_case_campaigns(status);
CREATE INDEX idx_cold_case_campaigns_scheduled ON cold_case_campaigns(scheduled_start);
CREATE INDEX idx_cold_case_campaigns_anniversary ON cold_case_campaigns(is_anniversary_campaign) WHERE is_anniversary_campaign = TRUE;

CREATE INDEX idx_cold_case_dna_profile ON cold_case_dna_submissions(cold_case_profile_id);
CREATE INDEX idx_cold_case_dna_case ON cold_case_dna_submissions(case_id);
CREATE INDEX idx_cold_case_dna_status ON cold_case_dna_submissions(status);

CREATE INDEX idx_cold_case_evidence_profile ON cold_case_new_evidence(cold_case_profile_id);
CREATE INDEX idx_cold_case_evidence_case ON cold_case_new_evidence(case_id);
CREATE INDEX idx_cold_case_evidence_significance ON cold_case_new_evidence(significance_level);
CREATE INDEX idx_cold_case_evidence_unprocessed ON cold_case_new_evidence(processed) WHERE processed = FALSE;

CREATE INDEX idx_cold_case_patterns_source ON cold_case_pattern_matches(source_case_id);
CREATE INDEX idx_cold_case_patterns_matched ON cold_case_pattern_matches(matched_case_id);
CREATE INDEX idx_cold_case_patterns_confidence ON cold_case_pattern_matches(confidence_level);
CREATE INDEX idx_cold_case_patterns_unreviewed ON cold_case_pattern_matches(reviewed) WHERE reviewed = FALSE;

CREATE INDEX idx_cold_case_metrics_period ON cold_case_metrics(period_type, period_start);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE cold_case_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_case_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_case_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_case_reviewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_case_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_case_dna_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_case_new_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_case_pattern_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_case_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_case_checklist_templates ENABLE ROW LEVEL SECURITY;

-- Cold case profiles - LE and admin can view/manage
CREATE POLICY "LE can view cold case profiles" ON cold_case_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

CREATE POLICY "LE can manage cold case profiles" ON cold_case_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Case owners can view their cold case profile
CREATE POLICY "Case owners can view their cold case profile" ON cold_case_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = cold_case_profiles.case_id
      AND c.reporter_id = auth.uid()
    )
  );

-- Reviews - LE access
CREATE POLICY "LE can view reviews" ON cold_case_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can manage reviews" ON cold_case_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Checklist items - same as reviews
CREATE POLICY "LE can view checklist items" ON cold_case_checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can manage checklist items" ON cold_case_checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Reviewers - admin only for management, LE can view
CREATE POLICY "Anyone can view reviewers" ON cold_case_reviewers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Admin can manage reviewers" ON cold_case_reviewers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Campaigns - LE can view, admin/LE can manage
CREATE POLICY "LE can view campaigns" ON cold_case_campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can manage campaigns" ON cold_case_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- DNA submissions - LE access
CREATE POLICY "LE can view DNA submissions" ON cold_case_dna_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can manage DNA submissions" ON cold_case_dna_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- New evidence - LE access
CREATE POLICY "LE can view new evidence" ON cold_case_new_evidence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can manage new evidence" ON cold_case_new_evidence
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Pattern matches - LE access
CREATE POLICY "LE can view pattern matches" ON cold_case_pattern_matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can manage pattern matches" ON cold_case_pattern_matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Metrics - LE and admin can view
CREATE POLICY "LE can view metrics" ON cold_case_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Admin can manage metrics" ON cold_case_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Checklist templates - all authenticated users can view, admin can manage
CREATE POLICY "All can view templates" ON cold_case_checklist_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage templates" ON cold_case_checklist_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to auto-classify cold cases
CREATE OR REPLACE FUNCTION auto_classify_cold_cases()
RETURNS INTEGER AS $$
DECLARE
  classified_count INTEGER := 0;
  case_record RECORD;
BEGIN
  -- Find active cases that meet cold case criteria
  FOR case_record IN
    SELECT c.id, c.last_seen_date
    FROM cases c
    WHERE c.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM cold_case_profiles ccp WHERE ccp.case_id = c.id
    )
    AND (
      -- No leads in 90 days
      NOT EXISTS (
        SELECT 1 FROM leads l
        WHERE l.case_id = c.id
        AND l.created_at > NOW() - INTERVAL '90 days'
      )
      OR
      -- No tips in 60 days
      NOT EXISTS (
        SELECT 1 FROM tips t
        WHERE t.case_id = c.id
        AND t.created_at > NOW() - INTERVAL '60 days'
      )
      OR
      -- No case updates in 180 days
      NOT EXISTS (
        SELECT 1 FROM case_updates cu
        WHERE cu.case_id = c.id
        AND cu.created_at > NOW() - INTERVAL '180 days'
      )
    )
    -- Only cases older than 6 months
    AND c.last_seen_date < NOW() - INTERVAL '180 days'
  LOOP
    -- Create cold case profile
    INSERT INTO cold_case_profiles (
      case_id,
      classification,
      became_cold_at,
      total_days_missing,
      criteria_no_leads_90_days,
      criteria_no_tips_60_days,
      criteria_no_activity_180_days,
      anniversary_date,
      next_review_date
    ) VALUES (
      case_record.id,
      'auto_classified',
      NOW(),
      EXTRACT(DAY FROM (NOW() - case_record.last_seen_date))::INTEGER,
      NOT EXISTS (
        SELECT 1 FROM leads l
        WHERE l.case_id = case_record.id
        AND l.created_at > NOW() - INTERVAL '90 days'
      ),
      NOT EXISTS (
        SELECT 1 FROM tips t
        WHERE t.case_id = case_record.id
        AND t.created_at > NOW() - INTERVAL '60 days'
      ),
      NOT EXISTS (
        SELECT 1 FROM case_updates cu
        WHERE cu.case_id = case_record.id
        AND cu.created_at > NOW() - INTERVAL '180 days'
      ),
      case_record.last_seen_date::DATE,
      (NOW() + INTERVAL '1 year')::DATE
    );

    -- Update case status to cold
    UPDATE cases SET status = 'cold' WHERE id = case_record.id;

    classified_count := classified_count + 1;
  END LOOP;

  RETURN classified_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate revival priority score
CREATE OR REPLACE FUNCTION calculate_revival_priority(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  profile RECORD;
  c RECORD;
  score INTEGER := 0;
  factors JSONB := '[]';
BEGIN
  -- Get the cold case profile
  SELECT * INTO profile FROM cold_case_profiles WHERE id = profile_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Get the associated case
  SELECT * INTO c FROM cases WHERE id = profile.case_id;

  -- Factor 1: New evidence (high priority)
  IF EXISTS (
    SELECT 1 FROM cold_case_new_evidence
    WHERE cold_case_profile_id = profile_id
    AND processed = FALSE
    AND significance_level IN ('high', 'critical')
  ) THEN
    score := score + 50;
    factors := factors || '[{"factor": "new_high_priority_evidence", "weight": 50}]'::JSONB;
  END IF;

  -- Factor 2: DNA match potential
  IF profile.dna_samples_available AND profile.dna_submission_status IN ('not_submitted', 'resubmission_pending') THEN
    score := score + 30;
    factors := factors || '[{"factor": "dna_submission_pending", "weight": 30}]'::JSONB;
  END IF;

  -- Factor 3: Pattern matches found
  IF EXISTS (
    SELECT 1 FROM cold_case_pattern_matches
    WHERE source_case_id = profile.case_id
    AND reviewed = FALSE
    AND confidence_level IN ('high', 'very_high')
  ) THEN
    score := score + 40;
    factors := factors || '[{"factor": "high_confidence_pattern_match", "weight": 40}]'::JSONB;
  END IF;

  -- Factor 4: Upcoming anniversary
  IF profile.anniversary_date IS NOT NULL AND
     profile.anniversary_date >= CURRENT_DATE AND
     profile.anniversary_date <= CURRENT_DATE + INTERVAL '30 days' THEN
    score := score + 25;
    factors := factors || '[{"factor": "upcoming_anniversary", "weight": 25}]'::JSONB;
  END IF;

  -- Factor 5: Linked to recently resolved case
  IF array_length(profile.linked_resolved_cases, 1) > 0 THEN
    score := score + 35;
    factors := factors || '[{"factor": "linked_to_resolved_case", "weight": 35}]'::JSONB;
  END IF;

  -- Factor 6: Minor case
  IF c.is_minor THEN
    score := score + 20;
    factors := factors || '[{"factor": "missing_minor", "weight": 20}]'::JSONB;
  END IF;

  -- Factor 7: Indigenous case (MMIWG priority)
  IF c.is_indigenous THEN
    score := score + 20;
    factors := factors || '[{"factor": "indigenous_case", "weight": 20}]'::JSONB;
  END IF;

  -- Factor 8: Time overdue for review
  IF profile.next_review_date < CURRENT_DATE THEN
    score := score + 15 + (CURRENT_DATE - profile.next_review_date);
    factors := factors || ('[{"factor": "review_overdue", "weight": ' || (15 + (CURRENT_DATE - profile.next_review_date)) || '}]')::JSONB;
  END IF;

  -- Update the profile
  UPDATE cold_case_profiles
  SET revival_priority_score = score,
      revival_priority_factors = factors,
      updated_at = NOW()
  WHERE id = profile_id;

  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign reviewer with rotation
CREATE OR REPLACE FUNCTION assign_cold_case_reviewer(profile_id UUID, assigned_by_id UUID)
RETURNS UUID AS $$
DECLARE
  reviewer RECORD;
  review_id UUID;
  review_num INTEGER;
BEGIN
  -- Find next available reviewer based on rotation priority
  SELECT * INTO reviewer
  FROM cold_case_reviewers
  WHERE is_active = TRUE
  AND current_assignments < max_concurrent_reviews
  AND (next_available_date IS NULL OR next_available_date <= CURRENT_DATE)
  ORDER BY rotation_priority ASC, last_assignment_date ASC NULLS FIRST
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No available reviewers';
  END IF;

  -- Get next review number
  SELECT COALESCE(MAX(review_number), 0) + 1 INTO review_num
  FROM cold_case_reviews
  WHERE cold_case_profile_id = profile_id;

  -- Create the review
  INSERT INTO cold_case_reviews (
    cold_case_profile_id,
    case_id,
    review_number,
    reviewer_id,
    assigned_by,
    due_date
  )
  SELECT
    profile_id,
    ccp.case_id,
    review_num,
    reviewer.reviewer_id,
    assigned_by_id,
    (CURRENT_DATE + INTERVAL '30 days')::DATE
  FROM cold_case_profiles ccp
  WHERE ccp.id = profile_id
  RETURNING id INTO review_id;

  -- Update cold case profile
  UPDATE cold_case_profiles
  SET current_reviewer_id = reviewer.reviewer_id,
      review_started_at = NOW(),
      review_due_date = (CURRENT_DATE + INTERVAL '30 days')::DATE,
      updated_at = NOW()
  WHERE id = profile_id;

  -- Update reviewer stats
  UPDATE cold_case_reviewers
  SET current_assignments = current_assignments + 1,
      last_assignment_date = CURRENT_DATE,
      rotation_priority = rotation_priority + 1,
      updated_at = NOW()
  WHERE id = reviewer.id;

  RETURN review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a review
CREATE OR REPLACE FUNCTION complete_cold_case_review(
  p_review_id UUID,
  p_revival_recommended BOOLEAN,
  p_revival_decision TEXT,
  p_summary TEXT
)
RETURNS VOID AS $$
DECLARE
  review RECORD;
  profile RECORD;
BEGIN
  -- Get the review
  SELECT * INTO review FROM cold_case_reviews WHERE id = p_review_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found';
  END IF;

  -- Get the profile
  SELECT * INTO profile FROM cold_case_profiles WHERE id = review.cold_case_profile_id;

  -- Update the review
  UPDATE cold_case_reviews
  SET completed_at = NOW(),
      status = 'completed',
      revival_recommended = p_revival_recommended,
      revival_decision = p_revival_decision,
      summary = p_summary,
      updated_at = NOW()
  WHERE id = p_review_id;

  -- Update the profile
  UPDATE cold_case_profiles
  SET current_reviewer_id = NULL,
      review_started_at = NULL,
      review_due_date = NULL,
      last_review_date = CURRENT_DATE,
      next_review_date = CASE profile.review_frequency
        WHEN 'monthly' THEN (CURRENT_DATE + INTERVAL '1 month')::DATE
        WHEN 'quarterly' THEN (CURRENT_DATE + INTERVAL '3 months')::DATE
        WHEN 'semi_annual' THEN (CURRENT_DATE + INTERVAL '6 months')::DATE
        WHEN 'annual' THEN (CURRENT_DATE + INTERVAL '1 year')::DATE
        WHEN 'biennial' THEN (CURRENT_DATE + INTERVAL '2 years')::DATE
      END,
      reviews_completed = reviews_completed + 1,
      updated_at = NOW()
  WHERE id = review.cold_case_profile_id;

  -- Update reviewer stats
  UPDATE cold_case_reviewers
  SET current_assignments = current_assignments - 1,
      total_reviews_completed = total_reviews_completed + 1,
      updated_at = NOW()
  WHERE reviewer_id = review.reviewer_id;

  -- If revival recommended, update case status and classification
  IF p_revival_recommended AND p_revival_decision = 'revive' THEN
    UPDATE cases SET status = 'active' WHERE id = review.case_id;
    UPDATE cold_case_profiles
    SET classification = 'reclassified_active',
        revival_attempts = revival_attempts + 1,
        last_revival_attempt = CURRENT_DATE,
        revival_success_count = revival_success_count + 1,
        updated_at = NOW()
    WHERE id = review.cold_case_profile_id;

    -- Update reviewer revival count
    UPDATE cold_case_reviewers
    SET total_revivals_achieved = total_revivals_achieved + 1
    WHERE reviewer_id = review.reviewer_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create checklist items from template
CREATE OR REPLACE FUNCTION create_review_checklist(
  p_review_id UUID,
  p_template_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  template RECORD;
  item JSONB;
  item_count INTEGER := 0;
BEGIN
  -- Get template (use default if not specified)
  IF p_template_id IS NULL THEN
    SELECT * INTO template
    FROM cold_case_checklist_templates
    WHERE is_default = TRUE AND is_active = TRUE
    LIMIT 1;
  ELSE
    SELECT * INTO template
    FROM cold_case_checklist_templates
    WHERE id = p_template_id AND is_active = TRUE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No checklist template found';
  END IF;

  -- Create checklist items from template
  FOR item IN SELECT * FROM jsonb_array_elements(template.items)
  LOOP
    INSERT INTO cold_case_checklist_items (
      review_id,
      category,
      item_order,
      item_name,
      item_description
    ) VALUES (
      p_review_id,
      item->>'category',
      (item->>'order')::INTEGER,
      item->>'name',
      item->>'description'
    );
    item_count := item_count + 1;
  END LOOP;

  RETURN item_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at
CREATE TRIGGER update_cold_case_profiles_updated_at
  BEFORE UPDATE ON cold_case_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cold_case_reviews_updated_at
  BEFORE UPDATE ON cold_case_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cold_case_checklist_updated_at
  BEFORE UPDATE ON cold_case_checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cold_case_reviewers_updated_at
  BEFORE UPDATE ON cold_case_reviewers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cold_case_campaigns_updated_at
  BEFORE UPDATE ON cold_case_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cold_case_dna_updated_at
  BEFORE UPDATE ON cold_case_dna_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cold_case_evidence_updated_at
  BEFORE UPDATE ON cold_case_new_evidence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cold_case_patterns_updated_at
  BEFORE UPDATE ON cold_case_pattern_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cold_case_templates_updated_at
  BEFORE UPDATE ON cold_case_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit logging
CREATE TRIGGER audit_cold_case_profiles
  AFTER INSERT OR UPDATE OR DELETE ON cold_case_profiles
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_cold_case_reviews
  AFTER INSERT OR UPDATE OR DELETE ON cold_case_reviews
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_cold_case_campaigns
  AFTER INSERT OR UPDATE OR DELETE ON cold_case_campaigns
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_cold_case_dna
  AFTER INSERT OR UPDATE OR DELETE ON cold_case_dna_submissions
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_cold_case_evidence
  AFTER INSERT OR UPDATE OR DELETE ON cold_case_new_evidence
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
