-- Migration: Enhance jurisdiction profiles with full configuration
-- Date: 2026-01-17
-- Purpose: Add complete jurisdiction profile support including integrations, legal requirements, and enhanced contact info

-- Add new columns to jurisdictions table for full profile support
ALTER TABLE jurisdictions
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en' CHECK (language IN ('en', 'fr', 'both')),
ADD COLUMN IF NOT EXISTS integrations JSONB DEFAULT '{
  "hospitalRegistry": false,
  "morgueRegistry": false,
  "borderServices": false,
  "detentionFacilities": false,
  "socialServices": false,
  "transitAuthority": false
}'::jsonb,
ADD COLUMN IF NOT EXISTS legal_requirements JSONB DEFAULT '{
  "waitingPeriodHours": 24,
  "parentalConsentRequired": true,
  "dataRetentionDays": 180,
  "privacyLawReference": "Local privacy laws apply",
  "mandatoryReporting": []
}'::jsonb,
ADD COLUMN IF NOT EXISTS emergency_line TEXT DEFAULT '911',
ADD COLUMN IF NOT EXISTS non_emergency_line TEXT,
ADD COLUMN IF NOT EXISTS missing_persons_unit_phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comment for documentation
COMMENT ON COLUMN jurisdictions.language IS 'Preferred language(s) for the jurisdiction: en, fr, or both';
COMMENT ON COLUMN jurisdictions.integrations IS 'JSON object defining available integrations (hospital, morgue, border services, etc.)';
COMMENT ON COLUMN jurisdictions.legal_requirements IS 'JSON object defining legal requirements (waiting period, consent, retention, privacy law, mandatory reporting)';
COMMENT ON COLUMN jurisdictions.emergency_line IS 'Emergency contact phone number (typically 911)';
COMMENT ON COLUMN jurisdictions.non_emergency_line IS 'Non-emergency contact phone number';
COMMENT ON COLUMN jurisdictions.missing_persons_unit_phone IS 'Direct line to missing persons unit';
COMMENT ON COLUMN jurisdictions.address IS 'Physical address of the jurisdiction headquarters';

-- Update existing SPVM jurisdiction with complete profile
UPDATE jurisdictions
SET
  language = 'both',
  integrations = '{
    "hospitalRegistry": true,
    "morgueRegistry": true,
    "borderServices": true,
    "detentionFacilities": true,
    "socialServices": true,
    "transitAuthority": true
  }'::jsonb,
  legal_requirements = '{
    "waitingPeriodHours": 0,
    "parentalConsentRequired": false,
    "dataRetentionDays": 365,
    "privacyLawReference": "Loi sur la protection des renseignements personnels (Quebec)",
    "mandatoryReporting": ["hospitals", "schools", "social_services"]
  }'::jsonb,
  emergency_line = '911',
  non_emergency_line = '514-280-2222',
  missing_persons_unit_phone = '514-280-2222',
  address = '1441 rue Saint-Urbain, Montréal, QC',
  priority_weights = '{
    "ageUnder12": 30,
    "age12to17": 20,
    "ageOver65": 15,
    "mentalHealthCondition": 25,
    "medicalDependency": 30,
    "suicidalRisk": 35,
    "suspectedAbduction": 40,
    "domesticViolenceHistory": 25,
    "outOfCharacter": 15,
    "noFinancialResources": 10,
    "adverseWeather": 10,
    "missingOver24Hours": 10,
    "missingOver48Hours": 20,
    "missingOver72Hours": 30,
    "thresholds": {
      "priority0": 80,
      "priority1": 60,
      "priority2": 40,
      "priority3": 20
    }
  }'::jsonb
WHERE code = 'SPVM';

-- Create a generic fallback jurisdiction if it doesn't exist
INSERT INTO jurisdictions (code, name, name_fr, type, region, province, country, language, priority_weights, integrations, legal_requirements, emergency_line)
VALUES (
  'GENERIC',
  'Generic Profile',
  'Profil Générique',
  'fallback',
  'Unknown',
  NULL,
  'Unknown',
  'en',
  '{
    "ageUnder12": 25,
    "age12to17": 15,
    "ageOver65": 10,
    "mentalHealthCondition": 20,
    "medicalDependency": 25,
    "suicidalRisk": 30,
    "suspectedAbduction": 35,
    "domesticViolenceHistory": 20,
    "outOfCharacter": 10,
    "noFinancialResources": 5,
    "adverseWeather": 5,
    "missingOver24Hours": 5,
    "missingOver48Hours": 15,
    "missingOver72Hours": 25,
    "thresholds": {
      "priority0": 75,
      "priority1": 55,
      "priority2": 35,
      "priority3": 15
    }
  }'::jsonb,
  '{
    "hospitalRegistry": false,
    "morgueRegistry": false,
    "borderServices": false,
    "detentionFacilities": false,
    "socialServices": false,
    "transitAuthority": false
  }'::jsonb,
  '{
    "waitingPeriodHours": 24,
    "parentalConsentRequired": true,
    "dataRetentionDays": 180,
    "privacyLawReference": "Local privacy laws apply",
    "mandatoryReporting": []
  }'::jsonb,
  '911'
)
ON CONFLICT (code) DO UPDATE SET
  language = EXCLUDED.language,
  priority_weights = EXCLUDED.priority_weights,
  integrations = EXCLUDED.integrations,
  legal_requirements = EXCLUDED.legal_requirements,
  emergency_line = EXCLUDED.emergency_line;

-- Create index for faster jurisdiction lookups by region
CREATE INDEX IF NOT EXISTS idx_jurisdictions_region ON jurisdictions(region) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jurisdictions_province ON jurisdictions(province) WHERE is_active = true;
