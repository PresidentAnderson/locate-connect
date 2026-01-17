-- Migration: Add other language fields for case intake
-- Author: Codex
-- Date: 2026-01-17

ALTER TABLE cases ADD COLUMN IF NOT EXISTS reporter_other_language TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS subject_other_language TEXT;
