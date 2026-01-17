-- Lead Management System Migration

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
    CREATE TYPE lead_status AS ENUM ('new', 'investigating', 'verified', 'dismissed', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_priority') THEN
    CREATE TYPE lead_priority AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_source') THEN
    CREATE TYPE lead_source AS ENUM (
      'social_media',
      'email_opened',
      'location',
      'witness',
      'hospital',
      'detention',
      'tip',
      'surveillance',
      'other'
    );
  END IF;
END $$;

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status lead_status NOT NULL DEFAULT 'new',
  priority lead_priority NOT NULL DEFAULT 'medium',
  source lead_source NOT NULL,
  source_details TEXT,
  assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_address TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by_id UUID REFERENCES profiles(id),
  dismissed_at TIMESTAMPTZ,
  dismissed_by_id UUID REFERENCES profiles(id),
  dismissal_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id)
);

-- Lead notes table
CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id)
);

-- Lead attachments table
CREATE TABLE IF NOT EXISTS lead_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by_id UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_case_id ON leads(case_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_attachments_lead_id ON lead_attachments(lead_id);

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_attachments ENABLE ROW LEVEL SECURITY;

-- Leads policies
CREATE POLICY "LE can view all leads" ON leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Case reporters can view their case leads" ON leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = leads.case_id
      AND c.reporter_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create leads" ON leads
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "LE can update leads" ON leads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can delete leads" ON leads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Lead notes policies
CREATE POLICY "LE can view all lead notes" ON lead_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Non-internal notes visible to case reporters" ON lead_notes
  FOR SELECT USING (
    NOT is_internal AND EXISTS (
      SELECT 1 FROM leads l
      JOIN cases c ON c.id = l.case_id
      WHERE l.id = lead_notes.lead_id
      AND c.reporter_id = auth.uid()
    )
  );

CREATE POLICY "LE can create lead notes" ON lead_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Lead attachments policies
CREATE POLICY "LE can view lead attachments" ON lead_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "LE can add lead attachments" ON lead_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('law_enforcement', 'admin', 'developer')
    )
  );

-- Update trigger for leads
CREATE OR REPLACE FUNCTION update_lead_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lead_updated_at ON leads;
CREATE TRIGGER trigger_update_lead_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_updated_at();
