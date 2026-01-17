-- Migration: Ensure gen_random_bytes is available for notification tokens
-- Author: Codex
-- Date: 2026-01-17

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'gen_random_bytes'
      AND n.nspname = 'extensions'
  ) THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public.gen_random_bytes(len integer)
      RETURNS bytea
      LANGUAGE sql
      IMMUTABLE
      AS $fn$ SELECT extensions.gen_random_bytes($1); $fn$';
  END IF;
END $$;
