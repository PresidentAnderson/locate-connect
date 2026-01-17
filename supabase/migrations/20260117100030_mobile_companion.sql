-- Migration: Mobile App Companion Features
-- LC-FEAT-031: PWA, Push Notifications, Offline Sync, WebAuthn
-- Created: 2026-01-17

-- Enable PostGIS for geospatial fields
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- Push Notification Subscriptions
-- ============================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    expiration_time TIMESTAMPTZ,
    device_name TEXT,
    device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
    browser TEXT,
    platform TEXT,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_push_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_push_subscription_updated
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_push_subscription_timestamp();

-- ============================================
-- WebAuthn Credentials
-- ============================================

CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key BYTEA NOT NULL,
    counter BIGINT DEFAULT 0,
    device_type TEXT CHECK (device_type IN ('platform', 'cross-platform')),
    transports TEXT[],
    backed_up BOOLEAN DEFAULT false,
    device_name TEXT,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX idx_webauthn_credentials_credential_id ON webauthn_credentials(credential_id);

-- Challenge storage for WebAuthn ceremonies
CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webauthn_challenges_user_id ON webauthn_challenges(user_id);
CREATE INDEX idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);

-- Cleanup old challenges
CREATE OR REPLACE FUNCTION cleanup_expired_webauthn_challenges()
RETURNS void AS $$
BEGIN
    DELETE FROM webauthn_challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Offline Sync Queue
-- ============================================

CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    payload JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    client_timestamp TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offline_sync_queue_user_status ON offline_sync_queue(user_id, status);
CREATE INDEX idx_offline_sync_queue_priority ON offline_sync_queue(priority DESC, created_at ASC) WHERE status = 'pending';

-- ============================================
-- Mobile Field Data Entries
-- ============================================

CREATE TABLE IF NOT EXISTS field_data_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN (
        'sighting', 'witness_interview', 'location_check',
        'vehicle_check', 'evidence_log', 'status_update', 'general_note'
    )),
    data JSONB NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    location_accuracy FLOAT,
    location_address TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_synced BOOLEAN DEFAULT false,
    synced_at TIMESTAMPTZ,
    offline_id TEXT,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_field_data_entries_case_id ON field_data_entries(case_id);
CREATE INDEX idx_field_data_entries_user_id ON field_data_entries(user_id);
CREATE INDEX idx_field_data_entries_type ON field_data_entries(entry_type);
CREATE INDEX idx_field_data_entries_location ON field_data_entries USING GIST(location);
CREATE INDEX idx_field_data_entries_synced ON field_data_entries(is_synced) WHERE is_synced = false;

-- ============================================
-- Mobile Evidence Uploads
-- ============================================

CREATE TABLE IF NOT EXISTS mobile_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    field_entry_id UUID REFERENCES field_data_entries(id) ON DELETE SET NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'audio', 'document')),
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    storage_path TEXT,
    storage_bucket TEXT DEFAULT 'evidence',
    thumbnail_path TEXT,
    duration_seconds INTEGER,
    capture_location GEOGRAPHY(POINT, 4326),
    capture_timestamp TIMESTAMPTZ,
    device_info JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mobile_evidence_case_id ON mobile_evidence(case_id);
CREATE INDEX idx_mobile_evidence_user_id ON mobile_evidence(user_id);
CREATE INDEX idx_mobile_evidence_type ON mobile_evidence(file_type);
CREATE INDEX idx_mobile_evidence_location ON mobile_evidence USING GIST(capture_location);

-- ============================================
-- GPS-Tagged Tips
-- ============================================

CREATE TABLE IF NOT EXISTS gps_tagged_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    tip_id UUID REFERENCES tips(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    location_accuracy FLOAT,
    altitude FLOAT,
    heading FLOAT,
    speed FLOAT,
    address TEXT,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    device_info JSONB,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    verification_notes TEXT
);

CREATE INDEX idx_gps_tagged_tips_case_id ON gps_tagged_tips(case_id);
CREATE INDEX idx_gps_tagged_tips_tip_id ON gps_tagged_tips(tip_id);
CREATE INDEX idx_gps_tagged_tips_location ON gps_tagged_tips USING GIST(location);
CREATE INDEX idx_gps_tagged_tips_captured_at ON gps_tagged_tips(captured_at);

-- ============================================
-- Geofence Zones for Nearby Alerts
-- ============================================

CREATE TABLE IF NOT EXISTS geofence_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    zone_type TEXT NOT NULL CHECK (zone_type IN ('last_seen', 'search_area', 'alert_zone', 'exclusion_zone')),
    geometry GEOGRAPHY(POLYGON, 4326) NOT NULL,
    radius_meters FLOAT,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    alert_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_geofence_zones_case_id ON geofence_zones(case_id);
CREATE INDEX idx_geofence_zones_geometry ON geofence_zones USING GIST(geometry);
CREATE INDEX idx_geofence_zones_active ON geofence_zones(is_active) WHERE is_active = true;

-- ============================================
-- User Location History (for geofencing)
-- ============================================

CREATE TABLE IF NOT EXISTS user_location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    accuracy FLOAT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT CHECK (source IN ('gps', 'network', 'ip', 'manual')),
    device_info JSONB
);

CREATE INDEX idx_user_location_history_user_id ON user_location_history(user_id);
CREATE INDEX idx_user_location_history_location ON user_location_history USING GIST(location);
CREATE INDEX idx_user_location_history_recorded_at ON user_location_history(recorded_at DESC);

-- Cleanup old location history (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_location_history()
RETURNS void AS $$
BEGIN
    DELETE FROM user_location_history
    WHERE recorded_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Voice Note Transcriptions
-- ============================================

CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    field_entry_id UUID REFERENCES field_data_entries(id) ON DELETE SET NULL,
    audio_storage_path TEXT NOT NULL,
    audio_duration_seconds INTEGER NOT NULL,
    transcript TEXT,
    transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
    transcription_confidence FLOAT,
    language TEXT DEFAULT 'en',
    is_reviewed BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_notes_user_id ON voice_notes(user_id);
CREATE INDEX idx_voice_notes_case_id ON voice_notes(case_id);
CREATE INDEX idx_voice_notes_status ON voice_notes(transcription_status);

-- ============================================
-- Mobile Device Registrations
-- ============================================

CREATE TABLE IF NOT EXISTS mobile_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT CHECK (device_type IN ('ios', 'android', 'web')),
    os_version TEXT,
    app_version TEXT,
    push_subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
    last_active_at TIMESTAMPTZ,
    is_trusted BOOLEAN DEFAULT false,
    trusted_at TIMESTAMPTZ,
    trusted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_mobile_devices_user_id ON mobile_devices(user_id);
CREATE INDEX idx_mobile_devices_last_active ON mobile_devices(last_active_at DESC);

-- ============================================
-- Notification Delivery Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS push_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    error_message TEXT,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'clicked', 'dismissed', 'failed'))
);

CREATE INDEX idx_push_notification_logs_user_id ON push_notification_logs(user_id);
CREATE INDEX idx_push_notification_logs_subscription ON push_notification_logs(subscription_id);
CREATE INDEX idx_push_notification_logs_sent_at ON push_notification_logs(sent_at DESC);
CREATE INDEX idx_push_notification_logs_case_id ON push_notification_logs(case_id);

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Push Subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_select ON push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY push_subscriptions_insert ON push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_subscriptions_update ON push_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY push_subscriptions_delete ON push_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- WebAuthn Credentials
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY webauthn_credentials_select ON webauthn_credentials
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY webauthn_credentials_insert ON webauthn_credentials
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY webauthn_credentials_delete ON webauthn_credentials
    FOR DELETE USING (auth.uid() = user_id);

-- Field Data Entries
ALTER TABLE field_data_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY field_data_entries_select ON field_data_entries
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'law_enforcement', 'case_manager')
        )
    );

CREATE POLICY field_data_entries_insert ON field_data_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY field_data_entries_update ON field_data_entries
    FOR UPDATE USING (auth.uid() = user_id);

-- Mobile Evidence
ALTER TABLE mobile_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY mobile_evidence_select ON mobile_evidence
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'law_enforcement', 'case_manager')
        )
    );

CREATE POLICY mobile_evidence_insert ON mobile_evidence
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- GPS Tagged Tips
ALTER TABLE gps_tagged_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY gps_tagged_tips_select ON gps_tagged_tips
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tips t
            WHERE t.id = tip_id
            AND (t.tipster_id = auth.uid() OR EXISTS (
                SELECT 1 FROM user_roles ur
                WHERE ur.user_id = auth.uid()
                AND ur.role IN ('admin', 'law_enforcement', 'tip_reviewer')
            ))
        )
    );

-- User Location History
ALTER TABLE user_location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_location_history_select ON user_location_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_location_history_insert ON user_location_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Voice Notes
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY voice_notes_select ON voice_notes
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'law_enforcement', 'case_manager')
        )
    );

CREATE POLICY voice_notes_insert ON voice_notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mobile Devices
ALTER TABLE mobile_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY mobile_devices_select ON mobile_devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY mobile_devices_insert ON mobile_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY mobile_devices_update ON mobile_devices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY mobile_devices_delete ON mobile_devices
    FOR DELETE USING (auth.uid() = user_id);

-- Push Notification Logs
ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_notification_logs_select ON push_notification_logs
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
        )
    );

-- ============================================
-- Helper Functions
-- ============================================

-- Function to check if user is within a geofence
CREATE OR REPLACE FUNCTION is_user_in_geofence(
    p_user_location GEOGRAPHY,
    p_case_id UUID
)
RETURNS TABLE(zone_id UUID, zone_name TEXT, zone_type TEXT)
AS $$
BEGIN
    RETURN QUERY
    SELECT gz.id, gz.name, gz.zone_type
    FROM geofence_zones gz
    WHERE gz.case_id = p_case_id
    AND gz.is_active = true
    AND gz.alert_enabled = true
    AND ST_Intersects(gz.geometry, p_user_location);
END;
$$ LANGUAGE plpgsql;

-- Function to find nearby cases
CREATE OR REPLACE FUNCTION find_nearby_cases(
    p_latitude FLOAT,
    p_longitude FLOAT,
    p_radius_km FLOAT DEFAULT 50
)
RETURNS TABLE(
    case_id UUID,
    person_name TEXT,
    distance_km FLOAT,
    last_seen_location TEXT,
    priority TEXT
)
AS $$
DECLARE
    user_point GEOGRAPHY;
BEGIN
    user_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;

    RETURN QUERY
    SELECT
        c.id as case_id,
        c.person_name,
        ST_Distance(user_point, c.last_seen_location::geography) / 1000 as distance_km,
        c.last_seen_address as last_seen_location,
        c.priority
    FROM cases c
    WHERE c.status = 'active'
    AND c.last_seen_location IS NOT NULL
    AND ST_DWithin(
        c.last_seen_location::geography,
        user_point,
        p_radius_km * 1000
    )
    ORDER BY distance_km ASC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function to process offline sync queue
CREATE OR REPLACE FUNCTION process_offline_sync_item(p_sync_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_item RECORD;
    v_success BOOLEAN := false;
BEGIN
    SELECT * INTO v_item FROM offline_sync_queue WHERE id = p_sync_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Mark as processing
    UPDATE offline_sync_queue SET status = 'processing' WHERE id = p_sync_id;

    -- Process based on entity type (simplified example)
    -- In production, this would have specific handlers for each entity type
    BEGIN
        -- Example: If it's a field data entry
        IF v_item.entity_type = 'field_data_entry' THEN
            INSERT INTO field_data_entries (
                id, case_id, user_id, entry_type, data,
                location, offline_id, is_synced, synced_at
            )
            SELECT
                COALESCE((v_item.payload->>'id')::uuid, gen_random_uuid()),
                (v_item.payload->>'case_id')::uuid,
                v_item.user_id,
                v_item.payload->>'entry_type',
                v_item.payload->'data',
                ST_SetSRID(ST_MakePoint(
                    (v_item.payload->'location'->>'longitude')::float,
                    (v_item.payload->'location'->>'latitude')::float
                ), 4326)::geography,
                v_item.entity_id,
                true,
                NOW()
            ON CONFLICT (id) DO UPDATE SET
                data = EXCLUDED.data,
                is_synced = true,
                synced_at = NOW(),
                updated_at = NOW();
        END IF;

        v_success := true;
        UPDATE offline_sync_queue SET
            status = 'completed',
            processed_at = NOW()
        WHERE id = p_sync_id;

    EXCEPTION WHEN OTHERS THEN
        UPDATE offline_sync_queue SET
            status = CASE WHEN retry_count >= max_retries THEN 'failed' ELSE 'pending' END,
            retry_count = retry_count + 1,
            error_message = SQLERRM
        WHERE id = p_sync_id;
        v_success := false;
    END;

    RETURN v_success;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE push_subscriptions IS 'Web Push notification subscriptions for PWA';
COMMENT ON TABLE webauthn_credentials IS 'WebAuthn credentials for biometric authentication';
COMMENT ON TABLE field_data_entries IS 'Mobile field data entries from LE investigators';
COMMENT ON TABLE mobile_evidence IS 'Evidence captured via mobile devices';
COMMENT ON TABLE gps_tagged_tips IS 'GPS location data attached to tips';
COMMENT ON TABLE geofence_zones IS 'Geographic zones for nearby case alerts';
COMMENT ON TABLE voice_notes IS 'Voice recordings with transcriptions';
COMMENT ON TABLE mobile_devices IS 'Registered mobile devices per user';
