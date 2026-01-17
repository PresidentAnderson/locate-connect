-- Lead Management System Enhancement
-- Adds priority, type, notes, and attachments support for leads

-- Add lead_type enum
CREATE TYPE lead_type AS ENUM (
  'social_media',
  'email_opened',
  'location',
  'witness',
  'hospital',
  'detention',
  'other'
);

-- Add priority_level and lead_type columns to leads table
ALTER TABLE leads
  ADD COLUMN priority_level priority_level DEFAULT 'p3_low',
  ADD COLUMN lead_type lead_type DEFAULT 'other';

-- Create lead_notes table for tracking notes on leads
CREATE TABLE lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create lead_attachments table for files attached to leads
CREATE TABLE lead_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  url TEXT NOT NULL,
  description TEXT,
  is_evidence BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_leads_priority ON leads(priority_level);
CREATE INDEX idx_leads_type ON leads(lead_type);
CREATE INDEX idx_lead_notes_lead ON lead_notes(lead_id);
CREATE INDEX idx_lead_notes_author ON lead_notes(author_id);
CREATE INDEX idx_lead_attachments_lead ON lead_attachments(lead_id);
CREATE INDEX idx_lead_attachments_uploaded_by ON lead_attachments(uploaded_by);

-- Add RLS policies for lead_notes
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead notes for cases they can access"
  ON lead_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN cases c ON l.case_id = c.id
      WHERE l.id = lead_notes.lead_id
      AND (
        c.reporter_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM case_assignments ca
          WHERE ca.case_id = c.id
          AND ca.user_id = auth.uid()
          AND ca.is_active = TRUE
        )
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
          AND p.role IN ('law_enforcement', 'admin')
        )
      )
    )
  );

CREATE POLICY "Law enforcement and admins can create lead notes"
  ON lead_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('law_enforcement', 'admin')
    )
  );

CREATE POLICY "Authors can update their own lead notes"
  ON lead_notes FOR UPDATE
  USING (author_id = auth.uid());

-- Add RLS policies for lead_attachments
ALTER TABLE lead_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead attachments for cases they can access"
  ON lead_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN cases c ON l.case_id = c.id
      WHERE l.id = lead_attachments.lead_id
      AND (
        c.reporter_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM case_assignments ca
          WHERE ca.case_id = c.id
          AND ca.user_id = auth.uid()
          AND ca.is_active = TRUE
        )
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
          AND p.role IN ('law_enforcement', 'admin')
        )
      )
    )
  );

CREATE POLICY "Law enforcement and admins can upload lead attachments"
  ON lead_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('law_enforcement', 'admin')
    )
  );

-- Add RLS policies for leads table (if not already present)
-- This ensures proper access control for the enhanced features
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'leads' AND policyname = 'Users can view leads for accessible cases'
  ) THEN
    ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view leads for accessible cases"
      ON leads FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM cases c
          WHERE c.id = leads.case_id
          AND (
            c.reporter_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM case_assignments ca
              WHERE ca.case_id = c.id
              AND ca.user_id = auth.uid()
              AND ca.is_active = TRUE
            )
            OR EXISTS (
              SELECT 1 FROM profiles p
              WHERE p.id = auth.uid()
              AND p.role IN ('law_enforcement', 'admin')
            )
          )
        )
      );
    
    CREATE POLICY "Law enforcement and admins can create leads"
      ON leads FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('law_enforcement', 'admin')
        )
      );
    
    CREATE POLICY "Law enforcement and admins can update leads"
      ON leads FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('law_enforcement', 'admin')
        )
      );
    
    CREATE POLICY "Law enforcement and admins can delete leads"
      ON leads FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('law_enforcement', 'admin')
        )
      );
  END IF;
END $$;
