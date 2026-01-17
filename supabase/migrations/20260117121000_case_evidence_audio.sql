-- Case Evidence and Chain of Custody
-- LC-FEAT-011: Voice memo and audio evidence

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE evidence_item_type AS ENUM ('audio', 'image', 'video', 'document');
CREATE TYPE transcript_status AS ENUM ('not_requested', 'pending', 'completed', 'failed');
CREATE TYPE custody_event_type AS ENUM (
  'uploaded',
  'accessed',
  'downloaded',
  'transcription_created',
  'transcript_edited'
);

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE case_evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id),
  item_type evidence_item_type NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  storage_bucket TEXT DEFAULT 'case-evidence',
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER,
  transcript_text TEXT,
  transcript_status transcript_status DEFAULT 'not_requested',
  transcript_provider TEXT,
  transcript_confidence DECIMAL(5,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE evidence_custody_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_item_id UUID NOT NULL REFERENCES case_evidence_items(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),
  event_type custody_event_type NOT NULL,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_case_evidence_items_updated_at
  BEFORE UPDATE ON case_evidence_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_case_evidence_items_case_id ON case_evidence_items(case_id);
CREATE INDEX idx_case_evidence_items_type ON case_evidence_items(item_type);
CREATE INDEX idx_evidence_custody_events_case_id ON evidence_custody_events(case_id);
CREATE INDEX idx_evidence_custody_events_item_id ON evidence_custody_events(evidence_item_id);
