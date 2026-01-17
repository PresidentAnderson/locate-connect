-- Case Intake v1 + Lifecycle Status + Cold Case Revival Triggers

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'case_lifecycle_status') THEN
    CREATE TYPE case_lifecycle_status AS ENUM ('open', 'inactive', 'cold', 'revived', 'closed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'last_seen_confidence') THEN
    CREATE TYPE last_seen_confidence AS ENUM ('unknown', 'low', 'medium', 'high');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'last_seen_witness_type') THEN
    CREATE TYPE last_seen_witness_type AS ENUM (
      'unknown',
      'self_reported',
      'family',
      'friend',
      'public',
      'law_enforcement',
      'camera',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'revival_trigger_type') THEN
    CREATE TYPE revival_trigger_type AS ENUM (
      'eligibility_engine',
      'new_tip',
      'new_evidence',
      'family_request',
      'anniversary',
      'pattern_match',
      'admin_review',
      'manual'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'revival_trigger_source') THEN
    CREATE TYPE revival_trigger_source AS ENUM (
      'system',
      'family',
      'law_enforcement',
      'partner',
      'public',
      'admin'
    );
  END IF;
END $$;

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS lifecycle_status case_lifecycle_status DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS last_seen_location_confidence last_seen_confidence DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_seen_witness_type last_seen_witness_type DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS intake_reported_facts JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS intake_unverified_notes JSONB DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION enforce_case_lifecycle_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lifecycle_status IS NULL OR OLD.lifecycle_status IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.lifecycle_status = OLD.lifecycle_status THEN
    RETURN NEW;
  END IF;

  CASE OLD.lifecycle_status
    WHEN 'open' THEN
      IF NEW.lifecycle_status NOT IN ('inactive', 'cold', 'closed') THEN
        RAISE EXCEPTION 'Invalid lifecycle transition from % to %', OLD.lifecycle_status, NEW.lifecycle_status;
      END IF;
    WHEN 'inactive' THEN
      IF NEW.lifecycle_status NOT IN ('cold', 'revived', 'closed') THEN
        RAISE EXCEPTION 'Invalid lifecycle transition from % to %', OLD.lifecycle_status, NEW.lifecycle_status;
      END IF;
    WHEN 'cold' THEN
      IF NEW.lifecycle_status NOT IN ('revived', 'closed') THEN
        RAISE EXCEPTION 'Invalid lifecycle transition from % to %', OLD.lifecycle_status, NEW.lifecycle_status;
      END IF;
    WHEN 'revived' THEN
      IF NEW.lifecycle_status NOT IN ('inactive', 'closed') THEN
        RAISE EXCEPTION 'Invalid lifecycle transition from % to %', OLD.lifecycle_status, NEW.lifecycle_status;
      END IF;
    WHEN 'closed' THEN
      RAISE EXCEPTION 'Closed cases cannot transition to %', NEW.lifecycle_status;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_case_lifecycle_transition ON cases;

CREATE TRIGGER enforce_case_lifecycle_transition
  BEFORE UPDATE OF lifecycle_status ON cases
  FOR EACH ROW
  EXECUTE FUNCTION enforce_case_lifecycle_transition();

CREATE TABLE IF NOT EXISTS cold_case_revival_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  cold_case_profile_id UUID REFERENCES cold_case_profiles(id) ON DELETE SET NULL,
  trigger_type revival_trigger_type NOT NULL,
  trigger_source revival_trigger_source NOT NULL DEFAULT 'system',
  summary TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cold_case_revival_triggers_case
  ON cold_case_revival_triggers(case_id);
CREATE INDEX IF NOT EXISTS idx_cold_case_revival_triggers_profile
  ON cold_case_revival_triggers(cold_case_profile_id);
CREATE INDEX IF NOT EXISTS idx_cold_case_revival_triggers_created_at
  ON cold_case_revival_triggers(created_at DESC);

ALTER TABLE cold_case_revival_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "LE can view revival triggers" ON cold_case_revival_triggers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Case owners can view revival triggers" ON cold_case_revival_triggers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = cold_case_revival_triggers.case_id
      AND c.reporter_id = auth.uid()
    )
  );

CREATE POLICY "LE can create revival triggers" ON cold_case_revival_triggers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );
