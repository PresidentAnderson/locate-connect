ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS intake_metadata JSONB DEFAULT '{}'::jsonb;
