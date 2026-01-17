-- LocateConnect Database Schema
-- Notification Preferences Migration (LC-FEAT-040)

-- Enums
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push', 'in_app', 'browser');
CREATE TYPE notification_frequency AS ENUM ('immediate', 'daily_digest', 'weekly_digest');
CREATE TYPE notification_type AS ENUM (
  'case_status_update',
  'new_lead_tip',
  'comment_reply',
  'system_announcement',
  'nearby_case_alert',
  'scheduled_reminder'
);

-- Global notification preferences per user
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  browser_enabled BOOLEAN DEFAULT TRUE,
  email_address TEXT,
  phone_number TEXT,
  default_frequency notification_frequency DEFAULT 'immediate',
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  quiet_hours_timezone TEXT DEFAULT 'America/Toronto',
  channel_priority JSONB DEFAULT '["in_app", "push", "email", "sms", "browser"]'::jsonb,
  digest_time TIME DEFAULT '09:00',
  digest_day_of_week INTEGER DEFAULT 1, -- 0=Sunday, 1=Monday, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Per-notification-type preferences
CREATE TABLE notification_type_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN,
  sms_enabled BOOLEAN,
  push_enabled BOOLEAN,
  in_app_enabled BOOLEAN,
  browser_enabled BOOLEAN,
  frequency notification_frequency,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

-- Per-case notification preferences
CREATE TABLE case_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN,
  sms_enabled BOOLEAN,
  push_enabled BOOLEAN,
  in_app_enabled BOOLEAN,
  browser_enabled BOOLEAN,
  frequency notification_frequency,
  notify_status_updates BOOLEAN DEFAULT TRUE,
  notify_new_leads BOOLEAN DEFAULT TRUE,
  notify_comments BOOLEAN DEFAULT TRUE,
  notify_assignments BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, case_id)
);

-- Unsubscribe tokens for email/sms one-click unsubscribe
CREATE TABLE notification_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  channel notification_channel,
  notification_type notification_type,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  unsubscribe_all BOOLEAN DEFAULT FALSE,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push notification subscriptions (browser/mobile)
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,
  browser TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Notification queue for scheduled/digest delivery
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification delivery log for analytics
CREATE TABLE notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  subject TEXT,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX idx_notification_type_prefs_user ON notification_type_preferences(user_id);
CREATE INDEX idx_case_notification_prefs_user ON case_notification_preferences(user_id);
CREATE INDEX idx_case_notification_prefs_case ON case_notification_preferences(case_id);
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX idx_notification_queue_user ON notification_queue(user_id);
CREATE INDEX idx_notification_delivery_user ON notification_delivery_log(user_id);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX idx_notification_unsubscribes_token ON notification_unsubscribes(token);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER notification_type_preferences_updated_at
  BEFORE UPDATE ON notification_type_preferences
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER case_notification_preferences_updated_at
  BEFORE UPDATE ON case_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

-- Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_type_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own notification preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own type preferences"
  ON notification_type_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own type preferences"
  ON notification_type_preferences FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own case notification preferences"
  ON case_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own case notification preferences"
  ON case_notification_preferences FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own unsubscribes"
  ON notification_unsubscribes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notification queue"
  ON notification_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own delivery log"
  ON notification_delivery_log FOR SELECT
  USING (auth.uid() = user_id);

-- Service role grants for server-side operations
GRANT ALL ON notification_preferences TO service_role;
GRANT ALL ON notification_type_preferences TO service_role;
GRANT ALL ON case_notification_preferences TO service_role;
GRANT ALL ON notification_unsubscribes TO service_role;
GRANT ALL ON push_subscriptions TO service_role;
GRANT ALL ON notification_queue TO service_role;
GRANT ALL ON notification_delivery_log TO service_role;
