-- =============================================================================
-- AMBER Alert External Distribution System
-- LC-FEAT-026: AMBER Alert Integration
-- =============================================================================

-- Distribution channel types
CREATE TYPE amber_distribution_channel AS ENUM (
  'wea',           -- Wireless Emergency Alert
  'eas',           -- Emergency Alert System
  'highway_signs', -- Highway Digital Signage
  'social_media',  -- Social Media Platforms
  'partner_alert', -- Partner Organizations
  'media_outlet',  -- News/Media Organizations
  'email',         -- Email Distribution List
  'sms',           -- SMS Distribution
  'push_notification', -- Mobile Push
  'api_webhook'    -- External API Callbacks
);

-- Distribution status
CREATE TYPE amber_distribution_status AS ENUM (
  'pending',
  'queued',
  'sending',
  'sent',
  'delivered',
  'failed',
  'cancelled',
  'expired'
);

-- Social media platforms
CREATE TYPE social_platform AS ENUM (
  'twitter',
  'facebook',
  'instagram',
  'linkedin',
  'tiktok'
);

-- =============================================================================
-- AMBER Alert Records (extends cases table flag)
-- =============================================================================

CREATE TABLE amber_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Alert Details
  alert_number TEXT UNIQUE, -- e.g., "AMBER-2026-AB-001"
  alert_status TEXT DEFAULT 'active', -- active, cancelled, resolved

  -- Child Information (snapshot at time of alert)
  child_name TEXT NOT NULL,
  child_age INTEGER,
  child_gender TEXT,
  child_description TEXT,
  child_photo_url TEXT,

  -- Abduction Details
  abduction_date DATE NOT NULL,
  abduction_time TIME,
  abduction_location TEXT NOT NULL,
  abduction_city TEXT NOT NULL,
  abduction_province TEXT NOT NULL,
  abduction_circumstances TEXT,

  -- Suspect Information
  suspect_name TEXT,
  suspect_description TEXT,
  suspect_photo_url TEXT,
  suspect_relationship TEXT,

  -- Vehicle Information
  vehicle_involved BOOLEAN DEFAULT FALSE,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_color TEXT,
  vehicle_license_plate TEXT,
  vehicle_license_province TEXT,

  -- Geographic Distribution
  target_provinces TEXT[] DEFAULT '{}',
  target_radius_km INTEGER,
  target_coordinates POINT,

  -- Distribution Preferences (from form)
  distribution_channels amber_distribution_channel[] DEFAULT '{}',

  -- Requesting Officer
  requesting_officer_id UUID REFERENCES profiles(id),
  requesting_officer_name TEXT NOT NULL,
  requesting_officer_badge TEXT,
  requesting_officer_phone TEXT NOT NULL,
  requesting_officer_agency TEXT NOT NULL,

  -- Timestamps
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  cancelled_reason TEXT,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Distribution Records (tracks each channel distribution)
-- =============================================================================

CREATE TABLE amber_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amber_alert_id UUID NOT NULL REFERENCES amber_alerts(id) ON DELETE CASCADE,

  -- Channel Information
  channel amber_distribution_channel NOT NULL,
  channel_config JSONB DEFAULT '{}', -- Channel-specific config

  -- Target Information
  target_id TEXT, -- External ID (partner_id, media_id, platform, etc)
  target_name TEXT,
  target_contact TEXT, -- email, phone, endpoint URL

  -- Status Tracking
  status amber_distribution_status DEFAULT 'pending',
  status_message TEXT,

  -- Delivery Details
  queued_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- Response Data
  external_id TEXT, -- ID from external system
  external_response JSONB,
  delivery_confirmation JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Distribution Log (audit trail)
-- =============================================================================

CREATE TABLE amber_distribution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amber_alert_id UUID NOT NULL REFERENCES amber_alerts(id) ON DELETE CASCADE,
  distribution_id UUID REFERENCES amber_distributions(id) ON DELETE SET NULL,

  -- Event Details
  event_type TEXT NOT NULL, -- created, sent, delivered, failed, retry, cancelled
  channel amber_distribution_channel,
  target_name TEXT,

  -- Status Change
  old_status amber_distribution_status,
  new_status amber_distribution_status,

  -- Details
  message TEXT,
  metadata JSONB DEFAULT '{}',

  -- Actor
  actor_id UUID REFERENCES profiles(id),
  actor_type TEXT, -- user, system, webhook

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Media Contacts (news outlets, stations for distribution)
-- =============================================================================

CREATE TABLE media_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization Info
  organization_name TEXT NOT NULL,
  organization_type TEXT NOT NULL, -- tv_station, radio_station, newspaper, online_news, wire_service
  coverage_area TEXT[], -- Provinces/regions covered

  -- Contact Details
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  api_endpoint TEXT, -- For automated distribution
  api_key_id UUID REFERENCES integration_credentials(id),

  -- Distribution Preferences
  preferred_channels TEXT[] DEFAULT '{}', -- email, api, fax
  accepts_amber_alerts BOOLEAN DEFAULT TRUE,
  accepts_silver_alerts BOOLEAN DEFAULT TRUE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Social Media Accounts (for automated posting)
-- =============================================================================

CREATE TABLE social_media_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Platform Info
  platform social_platform NOT NULL,
  account_name TEXT NOT NULL,
  account_id TEXT, -- Platform-specific ID

  -- Credentials
  credential_id UUID REFERENCES integration_credentials(id),

  -- Settings
  auto_post_amber BOOLEAN DEFAULT TRUE,
  auto_post_silver BOOLEAN DEFAULT FALSE,
  post_template TEXT,
  hashtags TEXT[] DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_connected BOOLEAN DEFAULT FALSE,
  last_post_at TIMESTAMPTZ,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Distribution Channel Configuration
-- =============================================================================

CREATE TABLE distribution_channel_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel amber_distribution_channel NOT NULL UNIQUE,

  -- Status
  is_enabled BOOLEAN DEFAULT TRUE,
  requires_approval BOOLEAN DEFAULT FALSE,

  -- Rate Limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 500,
  rate_limit_per_day INTEGER DEFAULT 5000,

  -- Retry Configuration
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  retry_backoff_multiplier NUMERIC DEFAULT 2.0,

  -- Integration
  integration_id UUID REFERENCES integrations(id),
  credential_id UUID REFERENCES integration_credentials(id),
  endpoint_url TEXT,
  endpoint_config JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- AMBER Alerts
CREATE INDEX idx_amber_alerts_case ON amber_alerts(case_id);
CREATE INDEX idx_amber_alerts_status ON amber_alerts(alert_status);
CREATE INDEX idx_amber_alerts_province ON amber_alerts(abduction_province);
CREATE INDEX idx_amber_alerts_issued ON amber_alerts(issued_at DESC);
CREATE INDEX idx_amber_alerts_target_provinces ON amber_alerts USING GIN (target_provinces);

-- Distributions
CREATE INDEX idx_amber_dist_alert ON amber_distributions(amber_alert_id);
CREATE INDEX idx_amber_dist_channel ON amber_distributions(channel);
CREATE INDEX idx_amber_dist_status ON amber_distributions(status);
CREATE INDEX idx_amber_dist_pending ON amber_distributions(status, next_retry_at)
  WHERE status IN ('pending', 'queued', 'failed');

-- Distribution Log
CREATE INDEX idx_amber_dist_log_alert ON amber_distribution_log(amber_alert_id);
CREATE INDEX idx_amber_dist_log_dist ON amber_distribution_log(distribution_id);
CREATE INDEX idx_amber_dist_log_created ON amber_distribution_log(created_at DESC);

-- Media Contacts
CREATE INDEX idx_media_contacts_type ON media_contacts(organization_type);
CREATE INDEX idx_media_contacts_coverage ON media_contacts USING GIN (coverage_area);
CREATE INDEX idx_media_contacts_active ON media_contacts(is_active) WHERE is_active = TRUE;

-- Social Media Accounts
CREATE INDEX idx_social_accounts_platform ON social_media_accounts(platform);
CREATE INDEX idx_social_accounts_active ON social_media_accounts(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE amber_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE amber_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE amber_distribution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_channel_config ENABLE ROW LEVEL SECURITY;

-- AMBER Alerts - Law enforcement and admin access
CREATE POLICY amber_alerts_le_select ON amber_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY amber_alerts_le_insert ON amber_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY amber_alerts_admin_update ON amber_alerts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
    OR requesting_officer_id = auth.uid()
  );

-- Distributions - Same as alerts
CREATE POLICY amber_dist_le_all ON amber_distributions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Distribution Log - Read-only for LE
CREATE POLICY amber_dist_log_le_select ON amber_distribution_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY amber_dist_log_system_insert ON amber_distribution_log
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE); -- System can always insert logs

-- Media Contacts - Admin only for management
CREATE POLICY media_contacts_admin_all ON media_contacts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

CREATE POLICY media_contacts_le_select ON media_contacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'law_enforcement'
    )
  );

-- Social Media Accounts - Admin only
CREATE POLICY social_accounts_admin_all ON social_media_accounts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

-- Channel Config - Admin only
CREATE POLICY channel_config_admin_all ON distribution_channel_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

CREATE POLICY channel_config_le_select ON distribution_channel_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'law_enforcement'
    )
  );

-- =============================================================================
-- Triggers
-- =============================================================================

-- Update timestamps
CREATE TRIGGER tr_amber_alerts_updated
  BEFORE UPDATE ON amber_alerts
  FOR EACH ROW EXECUTE FUNCTION update_partner_timestamp();

CREATE TRIGGER tr_amber_distributions_updated
  BEFORE UPDATE ON amber_distributions
  FOR EACH ROW EXECUTE FUNCTION update_partner_timestamp();

CREATE TRIGGER tr_media_contacts_updated
  BEFORE UPDATE ON media_contacts
  FOR EACH ROW EXECUTE FUNCTION update_partner_timestamp();

CREATE TRIGGER tr_social_accounts_updated
  BEFORE UPDATE ON social_media_accounts
  FOR EACH ROW EXECUTE FUNCTION update_partner_timestamp();

CREATE TRIGGER tr_channel_config_updated
  BEFORE UPDATE ON distribution_channel_config
  FOR EACH ROW EXECUTE FUNCTION update_partner_timestamp();

-- Generate AMBER alert number
CREATE OR REPLACE FUNCTION generate_amber_alert_number()
RETURNS TRIGGER AS $$
DECLARE
  province_code TEXT;
  year_part TEXT;
  sequence_num INTEGER;
  new_number TEXT;
BEGIN
  -- Get province code (first 2 letters)
  province_code := UPPER(LEFT(NEW.abduction_province, 2));

  -- Get year
  year_part := TO_CHAR(NOW(), 'YYYY');

  -- Get next sequence number for this province/year
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(alert_number, '-', 4) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM amber_alerts
  WHERE alert_number LIKE 'AMBER-' || year_part || '-' || province_code || '-%';

  -- Format: AMBER-2026-AB-001
  new_number := 'AMBER-' || year_part || '-' || province_code || '-' || LPAD(sequence_num::TEXT, 3, '0');

  NEW.alert_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_amber_alert_number
  BEFORE INSERT ON amber_alerts
  FOR EACH ROW
  WHEN (NEW.alert_number IS NULL)
  EXECUTE FUNCTION generate_amber_alert_number();

-- Log distribution status changes
CREATE OR REPLACE FUNCTION log_distribution_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO amber_distribution_log (
      amber_alert_id,
      distribution_id,
      event_type,
      channel,
      target_name,
      old_status,
      new_status,
      message,
      actor_type
    ) VALUES (
      NEW.amber_alert_id,
      NEW.id,
      'status_change',
      NEW.channel,
      NEW.target_name,
      OLD.status,
      NEW.status,
      NEW.status_message,
      'system'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_distribution_status
  AFTER UPDATE ON amber_distributions
  FOR EACH ROW EXECUTE FUNCTION log_distribution_status_change();

-- =============================================================================
-- Functions
-- =============================================================================

-- Get distribution summary for an alert
CREATE OR REPLACE FUNCTION get_amber_distribution_summary(p_alert_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'queued', COUNT(*) FILTER (WHERE status = 'queued'),
    'sending', COUNT(*) FILTER (WHERE status = 'sending'),
    'sent', COUNT(*) FILTER (WHERE status = 'sent'),
    'delivered', COUNT(*) FILTER (WHERE status = 'delivered'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'by_channel', (
      SELECT json_object_agg(channel, cnt)
      FROM (
        SELECT channel, COUNT(*) as cnt
        FROM amber_distributions
        WHERE amber_alert_id = p_alert_id
        GROUP BY channel
      ) c
    )
  ) INTO result
  FROM amber_distributions
  WHERE amber_alert_id = p_alert_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending distributions for retry
CREATE OR REPLACE FUNCTION get_pending_amber_distributions(p_limit INTEGER DEFAULT 100)
RETURNS SETOF amber_distributions AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM amber_distributions
  WHERE status IN ('pending', 'failed')
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    AND retry_count < max_retries
  ORDER BY
    CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
    created_at ASC
  LIMIT p_limit
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Initial Data - Channel Configuration
-- =============================================================================

INSERT INTO distribution_channel_config (channel, is_enabled, requires_approval, rate_limit_per_minute, max_retries)
VALUES
  ('partner_alert', TRUE, FALSE, 100, 3),
  ('email', TRUE, FALSE, 60, 3),
  ('push_notification', TRUE, FALSE, 200, 3),
  ('api_webhook', TRUE, FALSE, 50, 5),
  ('social_media', TRUE, TRUE, 10, 2),
  ('wea', FALSE, TRUE, 1, 1),  -- Requires special authorization
  ('eas', FALSE, TRUE, 1, 1),  -- Requires special authorization
  ('highway_signs', FALSE, TRUE, 5, 2),
  ('sms', TRUE, FALSE, 100, 3),
  ('media_outlet', TRUE, FALSE, 30, 3)
ON CONFLICT (channel) DO NOTHING;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE amber_alerts IS 'AMBER Alert records with full details for distribution';
COMMENT ON TABLE amber_distributions IS 'Individual distribution attempts per channel/recipient';
COMMENT ON TABLE amber_distribution_log IS 'Audit log of all distribution events';
COMMENT ON TABLE media_contacts IS 'Media organizations for alert distribution';
COMMENT ON TABLE social_media_accounts IS 'Connected social media accounts for automated posting';
COMMENT ON TABLE distribution_channel_config IS 'Configuration for each distribution channel';

COMMENT ON FUNCTION get_amber_distribution_summary IS 'Returns distribution statistics for an AMBER alert';
COMMENT ON FUNCTION get_pending_amber_distributions IS 'Returns pending distributions ready for retry';
