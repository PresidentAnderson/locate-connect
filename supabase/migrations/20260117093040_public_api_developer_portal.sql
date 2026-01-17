-- LocateConnect Public API & Developer Portal Schema
-- Migration: 004_public_api_developer_portal
-- LC-FEAT-036

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE api_access_level AS ENUM ('public', 'partner', 'law_enforcement');
CREATE TYPE api_key_status AS ENUM ('active', 'revoked', 'expired', 'suspended');
CREATE TYPE oauth_grant_type AS ENUM ('authorization_code', 'client_credentials', 'refresh_token');
CREATE TYPE webhook_event_type AS ENUM (
  'case.created',
  'case.updated',
  'case.resolved',
  'case.status_changed',
  'lead.created',
  'lead.verified',
  'tip.received',
  'alert.amber_issued',
  'alert.silver_issued'
);
CREATE TYPE webhook_status AS ENUM ('active', 'inactive', 'failed', 'suspended');
CREATE TYPE support_ticket_status AS ENUM ('open', 'in_progress', 'waiting_response', 'resolved', 'closed');
CREATE TYPE support_ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- =============================================================================
-- API APPLICATIONS TABLE
-- =============================================================================

CREATE TABLE api_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  website_url TEXT,
  callback_urls TEXT[] DEFAULT '{}',
  logo_url TEXT,
  access_level api_access_level DEFAULT 'public',

  -- Rate limiting configuration
  rate_limit_requests_per_minute INTEGER DEFAULT 60,
  rate_limit_requests_per_day INTEGER DEFAULT 10000,
  quota_monthly INTEGER DEFAULT 100000,

  -- Verification for higher access levels
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  verification_notes TEXT,

  -- Organization info for partner/LE access
  organization_name TEXT,
  organization_type TEXT,
  organization_contact_email TEXT,
  organization_contact_phone TEXT,

  -- Terms acceptance
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- API KEYS TABLE
-- =============================================================================

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES api_applications(id) ON DELETE CASCADE,

  -- Key identification
  key_prefix TEXT NOT NULL, -- First 8 chars of key for identification
  key_hash TEXT NOT NULL, -- SHA-256 hash of the full key
  name TEXT,
  description TEXT,

  -- Access control
  status api_key_status DEFAULT 'active',
  access_level api_access_level DEFAULT 'public',
  scopes TEXT[] DEFAULT '{}', -- Specific permissions
  allowed_ip_addresses INET[] DEFAULT '{}',

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  last_used_ip INET,
  usage_count INTEGER DEFAULT 0,

  -- Expiration
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES profiles(id),
  revoke_reason TEXT
);

-- =============================================================================
-- OAUTH CLIENTS TABLE
-- =============================================================================

CREATE TABLE oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES api_applications(id) ON DELETE CASCADE,

  client_id TEXT UNIQUE NOT NULL,
  client_secret_hash TEXT NOT NULL,

  -- OAuth configuration
  grant_types oauth_grant_type[] DEFAULT '{authorization_code}',
  redirect_uris TEXT[] NOT NULL,
  scopes TEXT[] DEFAULT '{}',

  -- Token configuration
  access_token_ttl_seconds INTEGER DEFAULT 3600, -- 1 hour
  refresh_token_ttl_seconds INTEGER DEFAULT 2592000, -- 30 days

  is_confidential BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- OAUTH AUTHORIZATION CODES TABLE
-- =============================================================================

CREATE TABLE oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  code_hash TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}',

  code_challenge TEXT,
  code_challenge_method TEXT,

  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- OAUTH ACCESS TOKENS TABLE
-- =============================================================================

CREATE TABLE oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  token_hash TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}',

  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- OAUTH REFRESH TOKENS TABLE
-- =============================================================================

CREATE TABLE oauth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token_id UUID NOT NULL REFERENCES oauth_access_tokens(id) ON DELETE CASCADE,

  token_hash TEXT NOT NULL,

  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- WEBHOOKS TABLE
-- =============================================================================

CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES api_applications(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  endpoint_url TEXT NOT NULL,

  -- Events configuration
  events webhook_event_type[] NOT NULL,

  -- Security
  secret_hash TEXT NOT NULL, -- For signature verification

  -- Filtering (optional)
  filter_jurisdictions UUID[] DEFAULT '{}',
  filter_priority_levels TEXT[] DEFAULT '{}',
  filter_case_statuses TEXT[] DEFAULT '{}',

  -- Status and retry configuration
  status webhook_status DEFAULT 'active',
  max_retries INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  timeout_seconds INTEGER DEFAULT 30,

  -- Statistics
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_failure_reason TEXT,
  consecutive_failures INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- WEBHOOK DELIVERIES TABLE
-- =============================================================================

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,

  event_type webhook_event_type NOT NULL,
  payload JSONB NOT NULL,

  -- Delivery status
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Response tracking
  response_status_code INTEGER,
  response_body TEXT,
  response_headers JSONB,
  response_time_ms INTEGER,

  -- Timing
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,

  is_successful BOOLEAN DEFAULT FALSE,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- API USAGE LOGS TABLE
-- =============================================================================

CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  oauth_token_id UUID REFERENCES oauth_access_tokens(id) ON DELETE SET NULL,
  application_id UUID REFERENCES api_applications(id) ON DELETE SET NULL,

  -- Request details
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  query_params JSONB,

  -- Response details
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  response_size_bytes INTEGER,

  -- Client info
  ip_address INET,
  user_agent TEXT,

  -- Rate limiting
  rate_limit_remaining INTEGER,
  quota_remaining INTEGER,

  -- Error tracking
  error_code TEXT,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- API RATE LIMITS TABLE (for tracking current usage)
-- =============================================================================

CREATE TABLE api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES api_applications(id) ON DELETE CASCADE,

  -- Minute-level tracking
  minute_window TIMESTAMPTZ NOT NULL,
  minute_count INTEGER DEFAULT 0,

  -- Daily tracking
  day_window DATE NOT NULL,
  day_count INTEGER DEFAULT 0,

  -- Monthly tracking
  month_window DATE NOT NULL,
  month_count INTEGER DEFAULT 0,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(application_id, minute_window),
  UNIQUE(application_id, day_window),
  UNIQUE(application_id, month_window)
);

-- =============================================================================
-- DEVELOPER SUPPORT TICKETS TABLE
-- =============================================================================

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES api_applications(id) ON DELETE SET NULL,
  submitter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  ticket_number TEXT UNIQUE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'api_issue', 'feature_request', 'documentation', 'billing', 'other'

  status support_ticket_status DEFAULT 'open',
  priority support_ticket_priority DEFAULT 'medium',

  assigned_to UUID REFERENCES profiles(id),

  -- Resolution
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),

  -- Feedback
  satisfaction_rating INTEGER, -- 1-5
  feedback TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SUPPORT TICKET MESSAGES TABLE
-- =============================================================================

CREATE TABLE support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- Staff-only notes

  attachments JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- API DOCUMENTATION VERSIONS TABLE
-- =============================================================================

CREATE TABLE api_documentation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- OpenAPI spec
  openapi_spec JSONB NOT NULL,

  -- Status
  is_current BOOLEAN DEFAULT FALSE,
  is_deprecated BOOLEAN DEFAULT FALSE,
  deprecation_notice TEXT,
  sunset_date DATE,

  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CODE EXAMPLES TABLE
-- =============================================================================

CREATE TABLE code_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL, -- 'javascript', 'python', 'curl', 'ruby', 'go', 'java', 'csharp', 'php'
  category TEXT NOT NULL, -- 'authentication', 'cases', 'leads', 'webhooks', etc.

  code TEXT NOT NULL,

  -- Related API endpoint
  endpoint TEXT,
  method TEXT,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_api_applications_owner ON api_applications(owner_id);
CREATE INDEX idx_api_applications_access_level ON api_applications(access_level);
CREATE INDEX idx_api_applications_is_active ON api_applications(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_api_keys_application ON api_keys(application_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_status ON api_keys(status);

CREATE INDEX idx_oauth_clients_application ON oauth_clients(application_id);
CREATE INDEX idx_oauth_clients_client_id ON oauth_clients(client_id);

CREATE INDEX idx_oauth_auth_codes_client ON oauth_authorization_codes(client_id);
CREATE INDEX idx_oauth_auth_codes_user ON oauth_authorization_codes(user_id);
CREATE INDEX idx_oauth_auth_codes_expires ON oauth_authorization_codes(expires_at);

CREATE INDEX idx_oauth_access_tokens_client ON oauth_access_tokens(client_id);
CREATE INDEX idx_oauth_access_tokens_user ON oauth_access_tokens(user_id);
CREATE INDEX idx_oauth_access_tokens_expires ON oauth_access_tokens(expires_at);

CREATE INDEX idx_webhooks_application ON webhooks(application_id);
CREATE INDEX idx_webhooks_status ON webhooks(status);
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_scheduled ON webhook_deliveries(scheduled_at);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) WHERE is_successful = FALSE;

CREATE INDEX idx_api_usage_logs_application ON api_usage_logs(application_id);
CREATE INDEX idx_api_usage_logs_created ON api_usage_logs(created_at DESC);
CREATE INDEX idx_api_usage_logs_endpoint ON api_usage_logs(endpoint, method);

CREATE INDEX idx_api_rate_limits_application_minute ON api_rate_limits(application_id, minute_window);
CREATE INDEX idx_api_rate_limits_application_day ON api_rate_limits(application_id, day_window);

CREATE INDEX idx_support_tickets_submitter ON support_tickets(submitter_id);
CREATE INDEX idx_support_tickets_application ON support_tickets(application_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to);

CREATE INDEX idx_code_examples_language ON code_examples(language);
CREATE INDEX idx_code_examples_category ON code_examples(category);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

ALTER TABLE api_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_documentation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_examples ENABLE ROW LEVEL SECURITY;

-- API Applications policies
CREATE POLICY "Users can view their own applications" ON api_applications
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create applications" ON api_applications
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own applications" ON api_applications
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own applications" ON api_applications
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Admins can view all applications" ON api_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Admins can update any application" ON api_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- API Keys policies
CREATE POLICY "Users can view their application keys" ON api_keys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM api_applications a
      WHERE a.id = api_keys.application_id
      AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create keys for their applications" ON api_keys
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM api_applications a
      WHERE a.id = api_keys.application_id
      AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their application keys" ON api_keys
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM api_applications a
      WHERE a.id = api_keys.application_id
      AND a.owner_id = auth.uid()
    )
  );

-- OAuth Clients policies
CREATE POLICY "Users can view their OAuth clients" ON oauth_clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM api_applications a
      WHERE a.id = oauth_clients.application_id
      AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their OAuth clients" ON oauth_clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM api_applications a
      WHERE a.id = oauth_clients.application_id
      AND a.owner_id = auth.uid()
    )
  );

-- Webhooks policies
CREATE POLICY "Users can view their webhooks" ON webhooks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM api_applications a
      WHERE a.id = webhooks.application_id
      AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their webhooks" ON webhooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM api_applications a
      WHERE a.id = webhooks.application_id
      AND a.owner_id = auth.uid()
    )
  );

-- Webhook Deliveries policies
CREATE POLICY "Users can view their webhook deliveries" ON webhook_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM webhooks w
      JOIN api_applications a ON a.id = w.application_id
      WHERE w.id = webhook_deliveries.webhook_id
      AND a.owner_id = auth.uid()
    )
  );

-- API Usage Logs policies
CREATE POLICY "Users can view their usage logs" ON api_usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM api_applications a
      WHERE a.id = api_usage_logs.application_id
      AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all usage logs" ON api_usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Support Tickets policies
CREATE POLICY "Users can view their own tickets" ON support_tickets
  FOR SELECT USING (submitter_id = auth.uid());

CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT WITH CHECK (submitter_id = auth.uid());

CREATE POLICY "Users can update their own tickets" ON support_tickets
  FOR UPDATE USING (submitter_id = auth.uid());

CREATE POLICY "Staff can view all tickets" ON support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Staff can update all tickets" ON support_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Support Ticket Messages policies
CREATE POLICY "Users can view messages on their tickets" ON support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
      AND (t.submitter_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'developer')
      ))
    )
    AND (is_internal = FALSE OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    ))
  );

CREATE POLICY "Users can add messages to their tickets" ON support_ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
      AND t.submitter_id = auth.uid()
    )
    AND is_internal = FALSE
  );

CREATE POLICY "Staff can add messages to any ticket" ON support_ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Documentation policies (public read)
CREATE POLICY "Anyone can view published documentation" ON api_documentation_versions
  FOR SELECT USING (is_current = TRUE OR is_deprecated = FALSE);

CREATE POLICY "Admins can manage documentation" ON api_documentation_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

-- Code Examples policies (public read)
CREATE POLICY "Anyone can view published examples" ON code_examples
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Admins can manage code examples" ON code_examples
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

-- Generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 10) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM support_tickets
  WHERE ticket_number LIKE 'LCST-' || year_part || '-%';

  NEW.ticket_number := 'LCST-' || year_part || '-' || LPAD(sequence_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update rate limits
CREATE OR REPLACE FUNCTION update_rate_limits(
  p_application_id UUID
)
RETURNS TABLE (
  minute_remaining INTEGER,
  day_remaining INTEGER,
  month_remaining INTEGER
) AS $$
DECLARE
  v_app api_applications%ROWTYPE;
  v_minute_window TIMESTAMPTZ;
  v_day_window DATE;
  v_month_window DATE;
  v_minute_count INTEGER;
  v_day_count INTEGER;
  v_month_count INTEGER;
BEGIN
  -- Get application limits
  SELECT * INTO v_app FROM api_applications WHERE id = p_application_id;

  -- Calculate windows
  v_minute_window := date_trunc('minute', NOW());
  v_day_window := CURRENT_DATE;
  v_month_window := date_trunc('month', CURRENT_DATE)::DATE;

  -- Upsert minute counter
  INSERT INTO api_rate_limits (application_id, minute_window, minute_count, day_window, day_count, month_window, month_count)
  VALUES (p_application_id, v_minute_window, 1, v_day_window, 1, v_month_window, 1)
  ON CONFLICT (application_id, minute_window)
  DO UPDATE SET minute_count = api_rate_limits.minute_count + 1, updated_at = NOW()
  RETURNING minute_count INTO v_minute_count;

  -- Update day counter
  UPDATE api_rate_limits
  SET day_count = day_count + 1
  WHERE application_id = p_application_id AND day_window = v_day_window;

  IF NOT FOUND THEN
    v_day_count := 1;
  ELSE
    SELECT day_count INTO v_day_count
    FROM api_rate_limits
    WHERE application_id = p_application_id AND day_window = v_day_window
    LIMIT 1;
  END IF;

  -- Update month counter
  UPDATE api_rate_limits
  SET month_count = month_count + 1
  WHERE application_id = p_application_id AND month_window = v_month_window;

  IF NOT FOUND THEN
    v_month_count := 1;
  ELSE
    SELECT month_count INTO v_month_count
    FROM api_rate_limits
    WHERE application_id = p_application_id AND month_window = v_month_window
    LIMIT 1;
  END IF;

  -- Return remaining limits
  RETURN QUERY SELECT
    v_app.rate_limit_requests_per_minute - v_minute_count,
    v_app.rate_limit_requests_per_day - COALESCE(v_day_count, 0),
    v_app.quota_monthly - COALESCE(v_month_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Check rate limits
CREATE OR REPLACE FUNCTION check_rate_limits(
  p_application_id UUID
)
RETURNS TABLE (
  is_allowed BOOLEAN,
  minute_remaining INTEGER,
  day_remaining INTEGER,
  month_remaining INTEGER,
  retry_after_seconds INTEGER
) AS $$
DECLARE
  v_app api_applications%ROWTYPE;
  v_minute_window TIMESTAMPTZ;
  v_day_window DATE;
  v_month_window DATE;
  v_minute_count INTEGER;
  v_day_count INTEGER;
  v_month_count INTEGER;
BEGIN
  -- Get application limits
  SELECT * INTO v_app FROM api_applications WHERE id = p_application_id;

  -- Calculate windows
  v_minute_window := date_trunc('minute', NOW());
  v_day_window := CURRENT_DATE;
  v_month_window := date_trunc('month', CURRENT_DATE)::DATE;

  -- Get current counts
  SELECT COALESCE(minute_count, 0), COALESCE(day_count, 0), COALESCE(month_count, 0)
  INTO v_minute_count, v_day_count, v_month_count
  FROM api_rate_limits
  WHERE application_id = p_application_id
    AND minute_window = v_minute_window
  LIMIT 1;

  -- Check limits
  IF v_minute_count >= v_app.rate_limit_requests_per_minute THEN
    RETURN QUERY SELECT
      FALSE,
      0,
      v_app.rate_limit_requests_per_day - COALESCE(v_day_count, 0),
      v_app.quota_monthly - COALESCE(v_month_count, 0),
      EXTRACT(EPOCH FROM (v_minute_window + INTERVAL '1 minute' - NOW()))::INTEGER;
  ELSIF v_day_count >= v_app.rate_limit_requests_per_day THEN
    RETURN QUERY SELECT
      FALSE,
      v_app.rate_limit_requests_per_minute - COALESCE(v_minute_count, 0),
      0,
      v_app.quota_monthly - COALESCE(v_month_count, 0),
      EXTRACT(EPOCH FROM (v_day_window + INTERVAL '1 day' - NOW()))::INTEGER;
  ELSIF v_month_count >= v_app.quota_monthly THEN
    RETURN QUERY SELECT
      FALSE,
      v_app.rate_limit_requests_per_minute - COALESCE(v_minute_count, 0),
      v_app.rate_limit_requests_per_day - COALESCE(v_day_count, 0),
      0,
      EXTRACT(EPOCH FROM (v_month_window + INTERVAL '1 month' - NOW()))::INTEGER;
  ELSE
    RETURN QUERY SELECT
      TRUE,
      v_app.rate_limit_requests_per_minute - COALESCE(v_minute_count, 0),
      v_app.rate_limit_requests_per_day - COALESCE(v_day_count, 0),
      v_app.quota_monthly - COALESCE(v_month_count, 0),
      0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_api_applications_updated_at BEFORE UPDATE ON api_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_clients_updated_at BEFORE UPDATE ON oauth_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_documentation_versions_updated_at BEFORE UPDATE ON api_documentation_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_code_examples_updated_at BEFORE UPDATE ON code_examples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER generate_ticket_number_trigger BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- =============================================================================
-- GRANTS FOR SERVICE ROLE
-- =============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
