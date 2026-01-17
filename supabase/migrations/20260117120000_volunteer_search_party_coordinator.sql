-- LocateConnect Database Schema
-- Migration: Volunteer Search Party Coordinator (LC-FEAT-027)
-- Tools for organizing and coordinating volunteer search parties

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE search_event_status AS ENUM ('planning', 'registration_open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE volunteer_status AS ENUM ('registered', 'checked_in', 'active', 'checked_out', 'no_show');
CREATE TYPE zone_status AS ENUM ('unassigned', 'assigned', 'in_progress', 'cleared', 'needs_review');
CREATE TYPE incident_type AS ENUM ('injury', 'medical', 'found_evidence', 'possible_sighting', 'equipment', 'weather', 'other');
CREATE TYPE incident_severity AS ENUM ('minor', 'moderate', 'serious', 'critical');
CREATE TYPE finding_type AS ENUM ('evidence', 'poi', 'note', 'hazard');
CREATE TYPE team_status AS ENUM ('standby', 'deployed', 'returning', 'debriefing');
CREATE TYPE check_in_type AS ENUM ('manual', 'automatic', 'sos_response');
CREATE TYPE sos_status AS ENUM ('active', 'acknowledged', 'resolved', 'false_alarm');
CREATE TYPE difficulty_level AS ENUM ('easy', 'moderate', 'difficult', 'strenuous');
CREATE TYPE briefing_category AS ENUM ('safety', 'protocol', 'communication', 'legal', 'weather');

-- =============================================================================
-- SEARCH EVENTS TABLE
-- =============================================================================

CREATE TABLE search_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status search_event_status DEFAULT 'planning',
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  meeting_point_address TEXT NOT NULL,
  meeting_point_lat DECIMAL(10, 8),
  meeting_point_lng DECIMAL(11, 8),
  search_area_description TEXT,
  search_area_bounds JSONB, -- {north, south, east, west}
  max_volunteers INTEGER,
  current_volunteers INTEGER DEFAULT 0,
  minimum_age INTEGER DEFAULT 18,
  requires_waiver BOOLEAN DEFAULT TRUE,
  waiver_url TEXT,
  equipment_provided TEXT[] DEFAULT '{}',
  equipment_required TEXT[] DEFAULT '{}',
  weather_conditions TEXT,
  terrain_type TEXT[] DEFAULT '{}',
  difficulty_level difficulty_level DEFAULT 'moderate',
  accessibility_notes TEXT,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  law_enforcement_liaison TEXT,
  law_enforcement_phone TEXT,
  organizer_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_events_case_id ON search_events(case_id);
CREATE INDEX idx_search_events_status ON search_events(status);
CREATE INDEX idx_search_events_event_date ON search_events(event_date);
CREATE INDEX idx_search_events_organizer_id ON search_events(organizer_id);

-- =============================================================================
-- SEARCH VOLUNTEERS TABLE
-- =============================================================================

CREATE TABLE search_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES search_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  status volunteer_status DEFAULT 'registered',
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES profiles(id),
  checked_out_at TIMESTAMPTZ,
  assigned_zone_id UUID,
  buddy_id UUID REFERENCES search_volunteers(id),
  has_signed_waiver BOOLEAN DEFAULT FALSE,
  waiver_signed_at TIMESTAMPTZ,
  has_completed_briefing BOOLEAN DEFAULT FALSE,
  briefing_completed_at TIMESTAMPTZ,
  special_skills TEXT[] DEFAULT '{}',
  has_first_aid_training BOOLEAN DEFAULT FALSE,
  has_sar_training BOOLEAN DEFAULT FALSE,
  physical_limitations TEXT,
  equipment_brought TEXT[] DEFAULT '{}',
  notes TEXT,
  last_gps_lat DECIMAL(10, 8),
  last_gps_lng DECIMAL(11, 8),
  last_gps_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_volunteers_event_id ON search_volunteers(event_id);
CREATE INDEX idx_search_volunteers_user_id ON search_volunteers(user_id);
CREATE INDEX idx_search_volunteers_status ON search_volunteers(status);
CREATE INDEX idx_search_volunteers_assigned_zone_id ON search_volunteers(assigned_zone_id);

-- =============================================================================
-- SEARCH ZONES TABLE
-- =============================================================================

CREATE TABLE search_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES search_events(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  zone_code TEXT NOT NULL,
  description TEXT,
  status zone_status DEFAULT 'unassigned',
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  bounds JSONB NOT NULL, -- {north, south, east, west}
  polygon_coords JSONB, -- [{lat, lng}, ...]
  terrain_type TEXT[] DEFAULT '{}',
  estimated_search_time_minutes INTEGER,
  assigned_team_id UUID,
  team_leader_id UUID REFERENCES search_volunteers(id),
  search_started_at TIMESTAMPTZ,
  search_completed_at TIMESTAMPTZ,
  coverage_percentage INTEGER DEFAULT 0 CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, zone_code)
);

CREATE INDEX idx_search_zones_event_id ON search_zones(event_id);
CREATE INDEX idx_search_zones_status ON search_zones(status);
CREATE INDEX idx_search_zones_priority ON search_zones(priority);
CREATE INDEX idx_search_zones_assigned_team_id ON search_zones(assigned_team_id);

-- =============================================================================
-- ZONE FINDINGS TABLE
-- =============================================================================

CREATE TABLE zone_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES search_zones(id) ON DELETE CASCADE,
  finding_type finding_type NOT NULL,
  description TEXT NOT NULL,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  photo_urls TEXT[] DEFAULT '{}',
  reported_by UUID NOT NULL REFERENCES search_volunteers(id),
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  is_significant BOOLEAN DEFAULT FALSE,
  forwarded_to_le BOOLEAN DEFAULT FALSE,
  forwarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_zone_findings_zone_id ON zone_findings(zone_id);
CREATE INDEX idx_zone_findings_finding_type ON zone_findings(finding_type);
CREATE INDEX idx_zone_findings_is_significant ON zone_findings(is_significant);

-- =============================================================================
-- SEARCH TEAMS TABLE
-- =============================================================================

CREATE TABLE search_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES search_events(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  team_leader_id UUID NOT NULL REFERENCES search_volunteers(id),
  radio_channel TEXT,
  status team_status DEFAULT 'standby',
  deployed_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_teams_event_id ON search_teams(event_id);
CREATE INDEX idx_search_teams_team_leader_id ON search_teams(team_leader_id);
CREATE INDEX idx_search_teams_status ON search_teams(status);

-- =============================================================================
-- TEAM MEMBERS TABLE (junction table)
-- =============================================================================

CREATE TABLE team_members (
  team_id UUID NOT NULL REFERENCES search_teams(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES search_volunteers(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, volunteer_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_volunteer_id ON team_members(volunteer_id);

-- =============================================================================
-- TEAM ZONE ASSIGNMENTS TABLE (junction table)
-- =============================================================================

CREATE TABLE team_zone_assignments (
  team_id UUID NOT NULL REFERENCES search_teams(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES search_zones(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, zone_id)
);

CREATE INDEX idx_team_zone_assignments_team_id ON team_zone_assignments(team_id);
CREATE INDEX idx_team_zone_assignments_zone_id ON team_zone_assignments(zone_id);

-- =============================================================================
-- SAFETY BRIEFING ITEMS TABLE
-- =============================================================================

CREATE TABLE safety_briefing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES search_events(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_required BOOLEAN DEFAULT TRUE,
  requires_acknowledgment BOOLEAN DEFAULT TRUE,
  category briefing_category DEFAULT 'safety',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, order_number)
);

CREATE INDEX idx_safety_briefing_items_event_id ON safety_briefing_items(event_id);

-- =============================================================================
-- VOLUNTEER CHECK-INS TABLE
-- =============================================================================

CREATE TABLE volunteer_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES search_events(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES search_volunteers(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_in_location JSONB, -- {lat, lng}
  check_in_type check_in_type DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_volunteer_check_ins_event_id ON volunteer_check_ins(event_id);
CREATE INDEX idx_volunteer_check_ins_volunteer_id ON volunteer_check_ins(volunteer_id);
CREATE INDEX idx_volunteer_check_ins_check_in_time ON volunteer_check_ins(check_in_time);

-- =============================================================================
-- SEARCH INCIDENTS TABLE
-- =============================================================================

CREATE TABLE search_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES search_events(id) ON DELETE CASCADE,
  incident_type incident_type NOT NULL,
  severity incident_severity NOT NULL,
  description TEXT NOT NULL,
  location JSONB, -- {lat, lng}
  reported_by UUID NOT NULL REFERENCES search_volunteers(id),
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  response_actions TEXT[] DEFAULT '{}',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  requires_follow_up BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_incidents_event_id ON search_incidents(event_id);
CREATE INDEX idx_search_incidents_incident_type ON search_incidents(incident_type);
CREATE INDEX idx_search_incidents_severity ON search_incidents(severity);
CREATE INDEX idx_search_incidents_reported_by ON search_incidents(reported_by);

-- =============================================================================
-- INCIDENT AFFECTED VOLUNTEERS TABLE (junction table)
-- =============================================================================

CREATE TABLE incident_affected_volunteers (
  incident_id UUID NOT NULL REFERENCES search_incidents(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES search_volunteers(id) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, volunteer_id)
);

CREATE INDEX idx_incident_affected_volunteers_incident_id ON incident_affected_volunteers(incident_id);
CREATE INDEX idx_incident_affected_volunteers_volunteer_id ON incident_affected_volunteers(volunteer_id);

-- =============================================================================
-- SOS ALERTS TABLE
-- =============================================================================

CREATE TABLE sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES search_events(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES search_volunteers(id) ON DELETE CASCADE,
  volunteer_name TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  status sos_status DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sos_alerts_event_id ON sos_alerts(event_id);
CREATE INDEX idx_sos_alerts_volunteer_id ON sos_alerts(volunteer_id);
CREATE INDEX idx_sos_alerts_status ON sos_alerts(status);
CREATE INDEX idx_sos_alerts_triggered_at ON sos_alerts(triggered_at);

-- =============================================================================
-- SEARCH EVENT MESSAGES TABLE
-- =============================================================================

CREATE TABLE search_event_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES search_events(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_broadcast BOOLEAN DEFAULT TRUE,
  target_team_id UUID REFERENCES search_teams(id),
  target_volunteer_id UUID REFERENCES search_volunteers(id),
  priority TEXT CHECK (priority IN ('normal', 'high', 'urgent')) DEFAULT 'normal',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_event_messages_event_id ON search_event_messages(event_id);
CREATE INDEX idx_search_event_messages_sender_id ON search_event_messages(sender_id);
CREATE INDEX idx_search_event_messages_sent_at ON search_event_messages(sent_at);

-- =============================================================================
-- VOLUNTEER GPS POSITIONS TABLE
-- =============================================================================

CREATE TABLE volunteer_gps_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES search_volunteers(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES search_events(id) ON DELETE CASCADE,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(8, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(8, 2),
  battery_level INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_volunteer_gps_positions_volunteer_id ON volunteer_gps_positions(volunteer_id);
CREATE INDEX idx_volunteer_gps_positions_event_id ON volunteer_gps_positions(event_id);
CREATE INDEX idx_volunteer_gps_positions_timestamp ON volunteer_gps_positions(timestamp);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update search_events.updated_at
CREATE OR REPLACE FUNCTION update_search_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_events_updated_at
  BEFORE UPDATE ON search_events
  FOR EACH ROW
  EXECUTE FUNCTION update_search_events_updated_at();

-- Update search_volunteers.updated_at
CREATE OR REPLACE FUNCTION update_search_volunteers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_volunteers_updated_at
  BEFORE UPDATE ON search_volunteers
  FOR EACH ROW
  EXECUTE FUNCTION update_search_volunteers_updated_at();

-- Update search_zones.updated_at
CREATE OR REPLACE FUNCTION update_search_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_zones_updated_at
  BEFORE UPDATE ON search_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_search_zones_updated_at();

-- Update zone_findings.updated_at
CREATE OR REPLACE FUNCTION update_zone_findings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_zone_findings_updated_at
  BEFORE UPDATE ON zone_findings
  FOR EACH ROW
  EXECUTE FUNCTION update_zone_findings_updated_at();

-- Update search_teams.updated_at
CREATE OR REPLACE FUNCTION update_search_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_teams_updated_at
  BEFORE UPDATE ON search_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_search_teams_updated_at();

-- Update search_incidents.updated_at
CREATE OR REPLACE FUNCTION update_search_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_incidents_updated_at
  BEFORE UPDATE ON search_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_search_incidents_updated_at();

-- Update sos_alerts.updated_at
CREATE OR REPLACE FUNCTION update_sos_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sos_alerts_updated_at
  BEFORE UPDATE ON sos_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_sos_alerts_updated_at();

-- Update safety_briefing_items.updated_at
CREATE OR REPLACE FUNCTION update_safety_briefing_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_safety_briefing_items_updated_at
  BEFORE UPDATE ON safety_briefing_items
  FOR EACH ROW
  EXECUTE FUNCTION update_safety_briefing_items_updated_at();

-- Update volunteer count in search_events when volunteer status changes
CREATE OR REPLACE FUNCTION update_event_volunteer_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate current volunteers for the event
  UPDATE search_events
  SET current_volunteers = (
    SELECT COUNT(*)
    FROM search_volunteers
    WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
    AND status IN ('registered', 'checked_in', 'active')
  )
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_volunteer_count
  AFTER INSERT OR UPDATE OR DELETE ON search_volunteers
  FOR EACH ROW
  EXECUTE FUNCTION update_event_volunteer_count();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_zone_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_briefing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_affected_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_event_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_gps_positions ENABLE ROW LEVEL SECURITY;

-- Search Events Policies
CREATE POLICY "Public can view active search events"
  ON search_events FOR SELECT
  USING (status IN ('registration_open', 'in_progress'));

CREATE POLICY "Organizers can manage their events"
  ON search_events FOR ALL
  USING (auth.uid() = organizer_id);

CREATE POLICY "Law enforcement can view all events"
  ON search_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Search Volunteers Policies
CREATE POLICY "Users can register as volunteers"
  ON search_volunteers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Volunteers can view their own registration"
  ON search_volunteers FOR SELECT
  USING (auth.uid() = user_id OR email = auth.email());

CREATE POLICY "Event organizers can manage volunteers"
  ON search_volunteers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM search_events
      WHERE id = event_id
      AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Volunteers in same event can view each other"
  ON search_volunteers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM search_volunteers sv
      WHERE sv.event_id = search_volunteers.event_id
      AND sv.user_id = auth.uid()
    )
  );

-- Search Zones Policies
CREATE POLICY "Public can view zones for active events"
  ON search_zones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM search_events
      WHERE id = event_id
      AND status IN ('registration_open', 'in_progress')
    )
  );

CREATE POLICY "Event organizers can manage zones"
  ON search_zones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM search_events
      WHERE id = event_id
      AND organizer_id = auth.uid()
    )
  );

-- Zone Findings Policies
CREATE POLICY "Volunteers can create findings"
  ON zone_findings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM search_volunteers
      WHERE id = reported_by
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Event participants can view findings"
  ON zone_findings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM search_zones sz
      JOIN search_events se ON sz.event_id = se.id
      WHERE sz.id = zone_id
      AND (
        se.organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM search_volunteers
          WHERE event_id = se.id
          AND user_id = auth.uid()
        )
      )
    )
  );

-- Search Teams Policies
CREATE POLICY "Event participants can view teams"
  ON search_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM search_events
      WHERE id = event_id
      AND (
        organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM search_volunteers
          WHERE event_id = search_events.id
          AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Event organizers can manage teams"
  ON search_teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM search_events
      WHERE id = event_id
      AND organizer_id = auth.uid()
    )
  );

-- Team Members Policies
CREATE POLICY "Team members can view their memberships"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM search_volunteers
      WHERE id = volunteer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Event organizers can manage team memberships"
  ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM search_teams st
      JOIN search_events se ON st.event_id = se.id
      WHERE st.id = team_id
      AND se.organizer_id = auth.uid()
    )
  );

-- Team Zone Assignments Policies
CREATE POLICY "Event participants can view zone assignments"
  ON team_zone_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM search_teams st
      JOIN search_events se ON st.event_id = se.id
      WHERE st.id = team_id
      AND (
        se.organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM search_volunteers
          WHERE event_id = se.id
          AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Event organizers can manage zone assignments"
  ON team_zone_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM search_teams st
      JOIN search_events se ON st.event_id = se.id
      WHERE st.id = team_id
      AND se.organizer_id = auth.uid()
    )
  );

-- Safety Briefing Items Policies
CREATE POLICY "Public can view briefing items"
  ON safety_briefing_items FOR SELECT
  USING (true);

CREATE POLICY "Event organizers can manage briefing items"
  ON safety_briefing_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM search_events
      WHERE id = event_id
      AND organizer_id = auth.uid()
    )
  );

-- Volunteer Check-ins Policies
CREATE POLICY "Volunteers can create their own check-ins"
  ON volunteer_check_ins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM search_volunteers
      WHERE id = volunteer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Event participants can view check-ins"
  ON volunteer_check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM search_events
      WHERE id = event_id
      AND (
        organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM search_volunteers
          WHERE event_id = search_events.id
          AND user_id = auth.uid()
        )
      )
    )
  );

-- Search Incidents Policies
CREATE POLICY "Volunteers can report incidents"
  ON search_incidents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM search_volunteers
      WHERE id = reported_by
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Event participants can view incidents"
  ON search_incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM search_events
      WHERE id = event_id
      AND (
        organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM search_volunteers
          WHERE event_id = search_events.id
          AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Event organizers can manage incidents"
  ON search_incidents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM search_events
      WHERE id = event_id
      AND organizer_id = auth.uid()
    )
  );

-- SOS Alerts Policies
CREATE POLICY "Volunteers can trigger SOS alerts"
  ON sos_alerts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM search_volunteers
      WHERE id = volunteer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Event participants can view SOS alerts"
  ON sos_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM search_events
      WHERE id = event_id
      AND (
        organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM search_volunteers
          WHERE event_id = search_events.id
          AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Event organizers can manage SOS alerts"
  ON sos_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM search_events
      WHERE id = event_id
      AND organizer_id = auth.uid()
    )
  );

-- Search Event Messages Policies
CREATE POLICY "Event participants can view messages"
  ON search_event_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM search_events
      WHERE id = event_id
      AND (
        organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM search_volunteers
          WHERE event_id = search_events.id
          AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Event organizers can send messages"
  ON search_event_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM search_events
      WHERE id = event_id
      AND organizer_id = auth.uid()
    )
  );

-- Volunteer GPS Positions Policies
CREATE POLICY "Volunteers can update their position"
  ON volunteer_gps_positions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM search_volunteers
      WHERE id = volunteer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Event participants can view GPS positions"
  ON volunteer_gps_positions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM search_events
      WHERE id = event_id
      AND (
        organizer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM search_volunteers
          WHERE event_id = search_events.id
          AND user_id = auth.uid()
        )
      )
    )
  );

-- Incident Affected Volunteers Policies
CREATE POLICY "Linked to incident policies"
  ON incident_affected_volunteers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM search_incidents si
      JOIN search_events se ON si.event_id = se.id
      WHERE si.id = incident_id
      AND (
        se.organizer_id = auth.uid()
        OR si.reported_by IN (
          SELECT id FROM search_volunteers WHERE user_id = auth.uid()
        )
      )
    )
  );

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE search_events IS 'Search party events for coordinating volunteer searches';
COMMENT ON TABLE search_volunteers IS 'Volunteers registered for search events';
COMMENT ON TABLE search_zones IS 'Search grid zones for systematic area coverage';
COMMENT ON TABLE zone_findings IS 'Evidence and findings discovered in zones';
COMMENT ON TABLE search_teams IS 'Organized teams of volunteers with assigned zones';
COMMENT ON TABLE team_members IS 'Junction table for team membership';
COMMENT ON TABLE team_zone_assignments IS 'Junction table for team zone assignments';
COMMENT ON TABLE safety_briefing_items IS 'Safety briefing checklist items for events';
COMMENT ON TABLE volunteer_check_ins IS 'Check-in records for volunteer attendance tracking';
COMMENT ON TABLE search_incidents IS 'Incidents reported during search operations';
COMMENT ON TABLE incident_affected_volunteers IS 'Junction table for incident-volunteer relationships';
COMMENT ON TABLE sos_alerts IS 'Emergency SOS alerts from volunteers in the field';
COMMENT ON TABLE search_event_messages IS 'Communication messages for event coordination';
COMMENT ON TABLE volunteer_gps_positions IS 'Real-time GPS tracking data for volunteers';
