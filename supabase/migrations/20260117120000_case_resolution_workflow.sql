-- Case Resolution Workflow Schema
-- LC-FEAT-008: Case resolution workflow

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE case_resolution_type AS ENUM (
  'found_safe',
  'found_deceased',
  'unfounded',
  'duplicate',
  'cancelled',
  'transferred',
  'other'
);

CREATE TYPE case_resolution_status AS ENUM (
  'draft',
  'pending_le_signoff',
  'signed_off',
  'closed'
);

CREATE TYPE retention_status AS ENUM (
  'active',
  'purge_scheduled',
  'on_hold'
);

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE case_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  resolution_type case_resolution_type,
  outcome_notes TEXT,
  status case_resolution_status DEFAULT 'draft',

  submitted_for_signoff_by UUID REFERENCES profiles(id),
  submitted_for_signoff_at TIMESTAMPTZ,
  le_signed_off_by UUID REFERENCES profiles(id),
  le_signed_off_at TIMESTAMPTZ,
  closed_by UUID REFERENCES profiles(id),
  closed_at TIMESTAMPTZ,

  success_story_consent BOOLEAN DEFAULT FALSE,
  success_story_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE case_resolution_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  resolution_id UUID REFERENCES case_resolutions(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  storage_bucket TEXT DEFAULT 'case-evidence',
  storage_path TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE case_resolution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  resolution_id UUID REFERENCES case_resolutions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id),
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE case_retention_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  retention_status retention_status DEFAULT 'active',
  scheduled_purge_at TIMESTAMPTZ,
  legal_hold BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE case_resolution_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_type case_resolution_type UNIQUE NOT NULL,
  total_closed INTEGER DEFAULT 0,
  last_closed_at TIMESTAMPTZ
);

ALTER TABLE cases
  ADD COLUMN is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN locked_at TIMESTAMPTZ,
  ADD COLUMN locked_by UUID REFERENCES profiles(id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_case_resolutions_updated_at
  BEFORE UPDATE ON case_resolutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_retention_flags_updated_at
  BEFORE UPDATE ON case_retention_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_case_resolution_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO case_resolution_stats (resolution_type, total_closed, last_closed_at)
    VALUES (NEW.resolution_type, 1, NOW())
    ON CONFLICT (resolution_type)
    DO UPDATE SET
      total_closed = case_resolution_stats.total_closed + 1,
      last_closed_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER case_resolution_stats_on_close
  AFTER UPDATE ON case_resolutions
  FOR EACH ROW EXECUTE FUNCTION update_case_resolution_stats();

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_case_resolutions_case_id ON case_resolutions(case_id);
CREATE INDEX idx_case_resolution_events_case_id ON case_resolution_events(case_id);
CREATE INDEX idx_case_resolution_documents_case_id ON case_resolution_documents(case_id);
CREATE INDEX idx_case_retention_flags_case_id ON case_retention_flags(case_id);
