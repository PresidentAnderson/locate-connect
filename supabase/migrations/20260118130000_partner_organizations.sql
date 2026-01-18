-- =============================================================================
-- Partner Organizations System
-- LC-FEAT-024: Partner Organization Portal
-- =============================================================================

-- Partner organization types
CREATE TYPE partner_org_type AS ENUM (
  'shelter',
  'hospital',
  'transit',
  'school',
  'business',
  'nonprofit',
  'government',
  'other'
);

-- Partner status
CREATE TYPE partner_status AS ENUM (
  'active',
  'pending',
  'inactive',
  'suspended'
);

-- Partner access levels
CREATE TYPE partner_access_level AS ENUM (
  'view_only',
  'submit_tips',
  'case_updates',
  'full_access'
);

-- Partner activity types
CREATE TYPE partner_activity_type AS ENUM (
  'tip_submitted',
  'case_viewed',
  'resource_shared',
  'alert_acknowledged',
  'login',
  'api_access',
  'data_export'
);

-- =============================================================================
-- Partner Organizations Table
-- =============================================================================

CREATE TABLE partner_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name TEXT NOT NULL,
  type partner_org_type NOT NULL,
  status partner_status DEFAULT 'pending',
  description TEXT,
  logo_url TEXT,

  -- Contact Information
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,

  -- Address
  address TEXT NOT NULL,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Canada',

  -- Online
  website TEXT,

  -- Access Control
  access_level partner_access_level DEFAULT 'view_only',
  allowed_provinces TEXT[] DEFAULT '{}',
  allowed_case_types TEXT[] DEFAULT '{}',
  can_submit_tips BOOLEAN DEFAULT FALSE,
  can_view_updates BOOLEAN DEFAULT FALSE,
  can_access_api BOOLEAN DEFAULT FALSE,

  -- Metrics (denormalized for performance)
  tips_submitted_count INTEGER DEFAULT 0,
  cases_assisted_count INTEGER DEFAULT 0,

  -- API Access
  api_key_hash TEXT,
  api_key_prefix TEXT,
  api_rate_limit INTEGER DEFAULT 1000,

  -- Verification
  verification_document_url TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),

  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  agreement_signed_at TIMESTAMPTZ,
  agreement_version TEXT,

  -- Timestamps
  last_activity_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Partner Members (Users associated with a partner org)
-- =============================================================================

CREATE TABLE partner_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Member info (for invited but not yet registered users)
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'member', -- admin, member, viewer

  -- Permissions
  can_submit_tips BOOLEAN DEFAULT TRUE,
  can_view_cases BOOLEAN DEFAULT TRUE,
  can_manage_members BOOLEAN DEFAULT FALSE,
  can_access_api BOOLEAN DEFAULT FALSE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- Timestamps
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(partner_id, email)
);

-- =============================================================================
-- Partner Activity Log
-- =============================================================================

CREATE TABLE partner_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_organizations(id) ON DELETE CASCADE,
  member_id UUID REFERENCES partner_members(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Activity details
  activity_type partner_activity_type NOT NULL,
  description TEXT NOT NULL,

  -- Related entities
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  tip_id UUID REFERENCES tips(id) ON DELETE SET NULL,

  -- Metadata
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Partner Case Access (which cases a partner can access)
-- =============================================================================

CREATE TABLE partner_case_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_organizations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Access details
  granted_by UUID REFERENCES profiles(id),
  access_reason TEXT,
  access_level TEXT DEFAULT 'view', -- view, contribute, full

  -- Time-bound access
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES profiles(id),

  -- Flags
  is_active BOOLEAN DEFAULT TRUE,
  notify_on_updates BOOLEAN DEFAULT TRUE,

  UNIQUE(partner_id, case_id)
);

-- =============================================================================
-- Partner Tips (tips submitted by partners)
-- =============================================================================

CREATE TABLE partner_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_organizations(id) ON DELETE CASCADE,
  member_id UUID REFERENCES partner_members(id) ON DELETE SET NULL,
  tip_id UUID NOT NULL REFERENCES tips(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

  -- Partner-specific info
  internal_reference TEXT,
  submitter_role TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Partner Alerts (alerts sent to partners)
-- =============================================================================

CREATE TABLE partner_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_organizations(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,

  -- Alert details
  alert_type TEXT NOT NULL, -- amber_alert, silver_alert, general_alert, bulletin
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- low, normal, high, critical

  -- Distribution
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES partner_members(id),

  -- Delivery
  delivery_method TEXT DEFAULT 'in_app', -- in_app, email, api_webhook
  delivery_status TEXT DEFAULT 'sent', -- sent, delivered, read, failed
  webhook_response JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Partner API Keys
-- =============================================================================

CREATE TABLE partner_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_organizations(id) ON DELETE CASCADE,

  -- Key details
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 8 chars for identification
  key_hash TEXT NOT NULL, -- SHA-256 hash of full key

  -- Permissions (scopes)
  scopes TEXT[] DEFAULT '{}',
  allowed_ips TEXT[],

  -- Limits
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,

  -- Expiry
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES profiles(id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Partner organizations
CREATE INDEX idx_partner_orgs_type ON partner_organizations(type);
CREATE INDEX idx_partner_orgs_status ON partner_organizations(status);
CREATE INDEX idx_partner_orgs_province ON partner_organizations(province);
CREATE INDEX idx_partner_orgs_access_level ON partner_organizations(access_level);
CREATE INDEX idx_partner_orgs_created ON partner_organizations(created_at DESC);
CREATE INDEX idx_partner_orgs_last_activity ON partner_organizations(last_activity_at DESC NULLS LAST);

-- Partner members
CREATE INDEX idx_partner_members_partner ON partner_members(partner_id);
CREATE INDEX idx_partner_members_user ON partner_members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_partner_members_email ON partner_members(email);

-- Activity log
CREATE INDEX idx_partner_activity_partner ON partner_activity_log(partner_id);
CREATE INDEX idx_partner_activity_type ON partner_activity_log(activity_type);
CREATE INDEX idx_partner_activity_case ON partner_activity_log(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX idx_partner_activity_created ON partner_activity_log(created_at DESC);

-- Case access
CREATE INDEX idx_partner_case_access_partner ON partner_case_access(partner_id);
CREATE INDEX idx_partner_case_access_case ON partner_case_access(case_id);
CREATE INDEX idx_partner_case_access_active ON partner_case_access(partner_id, case_id) WHERE is_active = TRUE;

-- Partner tips
CREATE INDEX idx_partner_tips_partner ON partner_tips(partner_id);
CREATE INDEX idx_partner_tips_case ON partner_tips(case_id);

-- Partner alerts
CREATE INDEX idx_partner_alerts_partner ON partner_alerts(partner_id);
CREATE INDEX idx_partner_alerts_case ON partner_alerts(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX idx_partner_alerts_type ON partner_alerts(alert_type);
CREATE INDEX idx_partner_alerts_unack ON partner_alerts(partner_id) WHERE acknowledged_at IS NULL;

-- API keys
CREATE INDEX idx_partner_api_keys_partner ON partner_api_keys(partner_id);
CREATE INDEX idx_partner_api_keys_prefix ON partner_api_keys(key_prefix);
CREATE INDEX idx_partner_api_keys_active ON partner_api_keys(partner_id) WHERE is_active = TRUE;

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE partner_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_case_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_api_keys ENABLE ROW LEVEL SECURITY;

-- Admin/developer full access to partner organizations
CREATE POLICY partner_orgs_admin_all ON partner_organizations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

-- Law enforcement can view active partners
CREATE POLICY partner_orgs_le_select ON partner_organizations
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'law_enforcement'
    )
  );

-- Partner members can view their own organization
CREATE POLICY partner_orgs_member_select ON partner_organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partner_members
      WHERE partner_members.partner_id = partner_organizations.id
      AND partner_members.user_id = auth.uid()
      AND partner_members.is_active = TRUE
    )
  );

-- Partner members policies
CREATE POLICY partner_members_admin_all ON partner_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

CREATE POLICY partner_members_self_select ON partner_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY partner_members_org_admin_all ON partner_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partner_members pm
      WHERE pm.partner_id = partner_members.partner_id
      AND pm.user_id = auth.uid()
      AND pm.can_manage_members = TRUE
      AND pm.is_active = TRUE
    )
  );

-- Activity log policies
CREATE POLICY partner_activity_admin_select ON partner_activity_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer', 'law_enforcement')
    )
  );

CREATE POLICY partner_activity_member_select ON partner_activity_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partner_members pm
      WHERE pm.partner_id = partner_activity_log.partner_id
      AND pm.user_id = auth.uid()
      AND pm.is_active = TRUE
    )
  );

CREATE POLICY partner_activity_insert ON partner_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM partner_members pm
      WHERE pm.partner_id = partner_activity_log.partner_id
      AND pm.user_id = auth.uid()
      AND pm.is_active = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

-- Case access policies
CREATE POLICY partner_case_access_admin_all ON partner_case_access
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer', 'law_enforcement')
    )
  );

CREATE POLICY partner_case_access_member_select ON partner_case_access
  FOR SELECT
  TO authenticated
  USING (
    is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND EXISTS (
      SELECT 1 FROM partner_members pm
      WHERE pm.partner_id = partner_case_access.partner_id
      AND pm.user_id = auth.uid()
      AND pm.is_active = TRUE
    )
  );

-- Partner tips policies
CREATE POLICY partner_tips_admin_all ON partner_tips
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer', 'law_enforcement')
    )
  );

CREATE POLICY partner_tips_member_select ON partner_tips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partner_members pm
      WHERE pm.partner_id = partner_tips.partner_id
      AND pm.user_id = auth.uid()
      AND pm.is_active = TRUE
    )
  );

CREATE POLICY partner_tips_member_insert ON partner_tips
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM partner_members pm
      WHERE pm.partner_id = partner_tips.partner_id
      AND pm.user_id = auth.uid()
      AND pm.is_active = TRUE
      AND pm.can_submit_tips = TRUE
    )
  );

-- Partner alerts policies
CREATE POLICY partner_alerts_admin_all ON partner_alerts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer', 'law_enforcement')
    )
  );

CREATE POLICY partner_alerts_member_select ON partner_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partner_members pm
      WHERE pm.partner_id = partner_alerts.partner_id
      AND pm.user_id = auth.uid()
      AND pm.is_active = TRUE
    )
  );

CREATE POLICY partner_alerts_member_ack ON partner_alerts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partner_members pm
      WHERE pm.partner_id = partner_alerts.partner_id
      AND pm.user_id = auth.uid()
      AND pm.is_active = TRUE
    )
  )
  WITH CHECK (
    -- Can only update acknowledged_at and acknowledged_by
    acknowledged_at IS NOT NULL
  );

-- API keys policies
CREATE POLICY partner_api_keys_admin_all ON partner_api_keys
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

CREATE POLICY partner_api_keys_org_admin_all ON partner_api_keys
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partner_members pm
      WHERE pm.partner_id = partner_api_keys.partner_id
      AND pm.user_id = auth.uid()
      AND pm.can_access_api = TRUE
      AND pm.is_active = TRUE
    )
  );

-- =============================================================================
-- Triggers
-- =============================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_partner_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_partner_orgs_updated
  BEFORE UPDATE ON partner_organizations
  FOR EACH ROW EXECUTE FUNCTION update_partner_timestamp();

CREATE TRIGGER tr_partner_members_updated
  BEFORE UPDATE ON partner_members
  FOR EACH ROW EXECUTE FUNCTION update_partner_timestamp();

-- Update tip count when partner_tips is inserted
CREATE OR REPLACE FUNCTION update_partner_tip_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE partner_organizations
  SET tips_submitted_count = tips_submitted_count + 1,
      last_activity_at = NOW()
  WHERE id = NEW.partner_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_partner_tips_count
  AFTER INSERT ON partner_tips
  FOR EACH ROW EXECUTE FUNCTION update_partner_tip_count();

-- Update case assisted count when partner_case_access is inserted
CREATE OR REPLACE FUNCTION update_partner_case_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = TRUE THEN
    UPDATE partner_organizations
    SET cases_assisted_count = cases_assisted_count + 1,
        last_activity_at = NOW()
    WHERE id = NEW.partner_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_partner_case_count
  AFTER INSERT ON partner_case_access
  FOR EACH ROW EXECUTE FUNCTION update_partner_case_count();

-- Log activity when partner member logs in
CREATE OR REPLACE FUNCTION log_partner_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_login_at IS DISTINCT FROM OLD.last_login_at THEN
    INSERT INTO partner_activity_log (partner_id, member_id, user_id, activity_type, description)
    VALUES (NEW.partner_id, NEW.id, NEW.user_id, 'login', 'Member logged in');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_partner_member_login
  AFTER UPDATE ON partner_members
  FOR EACH ROW EXECUTE FUNCTION log_partner_activity();

-- =============================================================================
-- Functions
-- =============================================================================

-- Get partner dashboard stats
CREATE OR REPLACE FUNCTION get_partner_dashboard_stats(p_partner_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_tips', (SELECT tips_submitted_count FROM partner_organizations WHERE id = p_partner_id),
    'cases_assisted', (SELECT cases_assisted_count FROM partner_organizations WHERE id = p_partner_id),
    'active_members', (SELECT COUNT(*) FROM partner_members WHERE partner_id = p_partner_id AND is_active = TRUE),
    'unread_alerts', (SELECT COUNT(*) FROM partner_alerts WHERE partner_id = p_partner_id AND acknowledged_at IS NULL),
    'recent_activity', (
      SELECT json_agg(row_to_json(a))
      FROM (
        SELECT activity_type, description, created_at
        FROM partner_activity_log
        WHERE partner_id = p_partner_id
        ORDER BY created_at DESC
        LIMIT 10
      ) a
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_partner_dashboard_stats(UUID) TO authenticated;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE partner_organizations IS 'Community partner organizations that collaborate on missing persons cases';
COMMENT ON TABLE partner_members IS 'Members/users associated with partner organizations';
COMMENT ON TABLE partner_activity_log IS 'Audit log of partner activities';
COMMENT ON TABLE partner_case_access IS 'Case-level access grants for partners';
COMMENT ON TABLE partner_tips IS 'Tips submitted by partners, linked to main tips table';
COMMENT ON TABLE partner_alerts IS 'Alerts sent to partners (AMBER, Silver, bulletins)';
COMMENT ON TABLE partner_api_keys IS 'API keys for partner programmatic access';
