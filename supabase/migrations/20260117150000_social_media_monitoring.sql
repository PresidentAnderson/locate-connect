-- =============================================================================
-- Social Media Monitoring System
-- LC-M4-002
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE social_media_platform AS ENUM (
  'facebook',
  'instagram',
  'twitter',
  'tiktok',
  'linkedin',
  'other'
);

CREATE TYPE social_activity_type AS ENUM (
  'post',
  'story',
  'comment',
  'like',
  'share',
  'login',
  'location_tag',
  'profile_update',
  'friend_added',
  'group_joined',
  'event_rsvp',
  'live_video',
  'reel',
  'other'
);

CREATE TYPE monitoring_status AS ENUM (
  'active',
  'paused',
  'stopped',
  'error'
);

-- =============================================================================
-- SOCIAL MEDIA MONITORED ACCOUNTS TABLE
-- =============================================================================

CREATE TABLE social_media_monitored_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Account information
  platform social_media_platform NOT NULL,
  username TEXT NOT NULL,
  profile_url TEXT,
  display_name TEXT,
  profile_photo_url TEXT,

  -- Monitoring status
  monitoring_status monitoring_status DEFAULT 'active',
  monitoring_started_at TIMESTAMPTZ DEFAULT NOW(),
  monitoring_stopped_at TIMESTAMPTZ,
  started_by UUID NOT NULL REFERENCES profiles(id),
  stopped_by UUID REFERENCES profiles(id),

  -- Activity tracking
  last_activity_at TIMESTAMPTZ,
  total_activities_detected INTEGER DEFAULT 0,

  -- Webhook configuration
  webhook_subscription_id TEXT,
  webhook_active BOOLEAN DEFAULT FALSE,
  webhook_verified_at TIMESTAMPTZ,

  -- Error tracking
  last_error_at TIMESTAMPTZ,
  last_error_message TEXT,
  consecutive_errors INTEGER DEFAULT 0,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(case_id, platform, username)
);

-- =============================================================================
-- SOCIAL MEDIA ACTIVITY EVENTS TABLE
-- =============================================================================

CREATE TABLE social_media_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitored_account_id UUID NOT NULL REFERENCES social_media_monitored_accounts(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Activity details
  activity_type social_activity_type NOT NULL,
  activity_timestamp TIMESTAMPTZ NOT NULL,

  -- Content
  content_preview TEXT,
  content_url TEXT,
  media_type TEXT,
  media_url TEXT,

  -- Location information (if tagged)
  location_name TEXT,
  location_latitude DOUBLE PRECISION,
  location_longitude DOUBLE PRECISION,

  -- Engagement metrics
  engagement_likes INTEGER DEFAULT 0,
  engagement_comments INTEGER DEFAULT 0,
  engagement_shares INTEGER DEFAULT 0,
  engagement_views INTEGER DEFAULT 0,

  -- Raw data storage
  raw_data JSONB,

  -- Processing status
  is_processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,

  -- Lead generation
  generated_lead_id UUID REFERENCES leads(id),

  -- Alert status
  alert_sent BOOLEAN DEFAULT FALSE,
  alert_sent_at TIMESTAMPTZ,
  alert_priority TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(monitored_account_id, activity_type, activity_timestamp, content_url)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Monitored accounts indexes
CREATE INDEX idx_social_monitored_accounts_case ON social_media_monitored_accounts(case_id);
CREATE INDEX idx_social_monitored_accounts_platform ON social_media_monitored_accounts(platform);
CREATE INDEX idx_social_monitored_accounts_status ON social_media_monitored_accounts(monitoring_status);
CREATE INDEX idx_social_monitored_accounts_started_by ON social_media_monitored_accounts(started_by);
CREATE INDEX idx_social_monitored_accounts_active ON social_media_monitored_accounts(case_id, monitoring_status)
  WHERE monitoring_status = 'active';

-- Activity events indexes
CREATE INDEX idx_social_activity_events_account ON social_media_activity_events(monitored_account_id);
CREATE INDEX idx_social_activity_events_case ON social_media_activity_events(case_id);
CREATE INDEX idx_social_activity_events_type ON social_media_activity_events(activity_type);
CREATE INDEX idx_social_activity_events_timestamp ON social_media_activity_events(activity_timestamp DESC);
CREATE INDEX idx_social_activity_events_location ON social_media_activity_events(location_latitude, location_longitude)
  WHERE location_latitude IS NOT NULL;
CREATE INDEX idx_social_activity_events_unprocessed ON social_media_activity_events(is_processed, created_at)
  WHERE is_processed = FALSE;
CREATE INDEX idx_social_activity_events_no_alert ON social_media_activity_events(alert_sent, activity_type)
  WHERE alert_sent = FALSE;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE social_media_monitored_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_activity_events ENABLE ROW LEVEL SECURITY;

-- Monitored accounts: Case owners can view their own data
CREATE POLICY "Case owners can view their monitored accounts" ON social_media_monitored_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = social_media_monitored_accounts.case_id
      AND cases.reporter_id = auth.uid()
    )
  );

-- Monitored accounts: LE can view all
CREATE POLICY "LE can view all monitored accounts" ON social_media_monitored_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Monitored accounts: LE can insert
CREATE POLICY "LE can create monitored accounts" ON social_media_monitored_accounts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Monitored accounts: LE can update
CREATE POLICY "LE can update monitored accounts" ON social_media_monitored_accounts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Activity events: Case owners can view their own data
CREATE POLICY "Case owners can view their activity events" ON social_media_activity_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = social_media_activity_events.case_id
      AND cases.reporter_id = auth.uid()
    )
  );

-- Activity events: LE can view all
CREATE POLICY "LE can view all activity events" ON social_media_activity_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- Activity events: System can insert (via service role for webhook processing)
CREATE POLICY "Service role can insert activity events" ON social_media_activity_events
  FOR INSERT WITH CHECK (TRUE);

-- Activity events: LE can update
CREATE POLICY "LE can update activity events" ON social_media_activity_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
      AND p.is_verified = TRUE
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated at trigger for monitored accounts
CREATE TRIGGER update_social_monitored_accounts_updated_at
  BEFORE UPDATE ON social_media_monitored_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- GRANTS FOR SERVICE ROLE
-- =============================================================================

GRANT ALL ON social_media_monitored_accounts TO service_role;
GRANT ALL ON social_media_activity_events TO service_role;
