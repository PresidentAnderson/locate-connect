-- LocateConnect Built-in Integration Templates
-- Migration: Populate integration marketplace with official templates
-- Issue #51: Integration marketplace/templates

-- =============================================================================
-- BUILT-IN TEMPLATES
-- =============================================================================

INSERT INTO integration_templates (
  name, description, category, provider, version,
  config_template, credential_requirements, endpoints_template,
  documentation, setup_guide, tags,
  is_official, is_verified, is_published
) VALUES

-- Quebec Hospital Network
(
  'Quebec Hospital Network',
  'Connect to the Quebec Hospital Registry to search for unidentified patients and receive admission alerts for missing persons.',
  'healthcare',
  'Sante Quebec',
  '1.0.0',
  '{"baseUrl": "https://api.santeqc.gouv.qc.ca", "authType": "oauth2", "timeout": 30000, "rateLimit": {"requestsPerMinute": 60, "requestsPerHour": 1000}}',
  '[{"name": "client_id", "type": "string", "description": "OAuth2 Client ID from Sante Quebec portal", "required": true}, {"name": "client_secret", "type": "password", "description": "OAuth2 Client Secret", "required": true}]',
  '[{"name": "search_patients", "method": "POST", "path": "/v1/patients/search", "description": "Search for patients matching criteria"}, {"name": "get_patient", "method": "GET", "path": "/v1/patients/{id}", "description": "Get patient details by ID"}, {"name": "subscribe_alerts", "method": "POST", "path": "/v1/alerts/subscribe", "description": "Subscribe to admission alerts"}]',
  'https://docs.santeqc.gouv.qc.ca/api',
  'To set up this integration:\n1. Register at the Sante Quebec Developer Portal\n2. Create an application and obtain OAuth2 credentials\n3. Submit a data access request for missing persons search\n4. Wait for approval (typically 5-10 business days)',
  ARRAY['quebec', 'hospital', 'healthcare', 'patient-search'],
  true, true, true
),

-- CBSA Border Services
(
  'CBSA Border Services',
  'Receive real-time alerts when individuals matching missing persons cross Canadian borders.',
  'border_services',
  'Canada Border Services Agency',
  '1.0.0',
  '{"baseUrl": "https://api.cbsa-asfc.gc.ca", "authType": "certificate", "timeout": 45000, "rateLimit": {"requestsPerMinute": 30, "requestsPerHour": 500}}',
  '[{"name": "certificate", "type": "file", "description": "X.509 client certificate (.pem)", "required": true}, {"name": "private_key", "type": "file", "description": "Private key for certificate", "required": true}, {"name": "api_key", "type": "password", "description": "CBSA API Key", "required": true}]',
  '[{"name": "register_watch", "method": "POST", "path": "/v2/watchlist/register", "description": "Register a person on the border watchlist"}, {"name": "get_crossings", "method": "GET", "path": "/v2/crossings", "description": "Get recent border crossings matching criteria"}, {"name": "alert_webhook", "method": "POST", "path": "/v2/alerts/webhook", "description": "Configure webhook for real-time alerts"}]',
  'https://api.cbsa-asfc.gc.ca/docs',
  'This integration requires:\n1. Law enforcement partnership agreement with CBSA\n2. Secure certificate provisioning\n3. Approval from CBSA Information Sharing unit\n4. Annual security compliance audit',
  ARRAY['canada', 'border', 'cbsa', 'watchlist', 'law-enforcement'],
  true, true, true
),

-- STM Transit Montreal
(
  'STM Transit Montreal',
  'Access Montreal public transit data including camera feeds, fare card activity, and station alerts.',
  'transportation',
  'Societe de transport de Montreal',
  '1.0.0',
  '{"baseUrl": "https://api.stm.info", "authType": "api_key", "timeout": 20000, "rateLimit": {"requestsPerMinute": 120, "requestsPerHour": 2000}}',
  '[{"name": "api_key", "type": "password", "description": "STM Partner API Key", "required": true}, {"name": "partner_id", "type": "string", "description": "Partner organization ID", "required": true}]',
  '[{"name": "search_sightings", "method": "POST", "path": "/v1/sightings/search", "description": "Search for transit sightings"}, {"name": "get_station_cameras", "method": "GET", "path": "/v1/stations/{id}/cameras", "description": "Get camera feeds for a station"}, {"name": "fare_activity", "method": "GET", "path": "/v1/fare/activity", "description": "Query fare card activity"}]',
  'https://developers.stm.info/api-reference',
  'To integrate with STM:\n1. Apply for partnership status at partenaires.stm.info\n2. Sign data sharing agreement\n3. Complete privacy impact assessment\n4. Receive API credentials',
  ARRAY['montreal', 'transit', 'stm', 'metro', 'bus'],
  true, true, true
),

-- SPVM Law Enforcement
(
  'SPVM Integration',
  'Two-way integration with Service de police de la Ville de Montreal for case coordination.',
  'law_enforcement',
  'SPVM',
  '1.0.0',
  '{"baseUrl": "https://secure.spvm.qc.ca/api", "authType": "oauth2", "timeout": 30000, "rateLimit": {"requestsPerMinute": 30, "requestsPerHour": 300}}',
  '[{"name": "client_id", "type": "string", "description": "SPVM OAuth2 Client ID", "required": true}, {"name": "client_secret", "type": "password", "description": "OAuth2 Client Secret", "required": true}, {"name": "badge_number", "type": "string", "description": "Authorized officer badge number", "required": true}]',
  '[{"name": "create_alert", "method": "POST", "path": "/v1/alerts", "description": "Create a missing person alert"}, {"name": "update_case", "method": "PATCH", "path": "/v1/cases/{id}", "description": "Update case information"}, {"name": "get_reports", "method": "GET", "path": "/v1/reports", "description": "Get related police reports"}]',
  'https://secure.spvm.qc.ca/docs',
  'SPVM integration requires:\n1. Memorandum of Understanding (MOU)\n2. Officer authorization and training\n3. Secure network connection\n4. Regular compliance audits',
  ARRAY['montreal', 'police', 'spvm', 'law-enforcement'],
  true, true, true
),

-- Quebec Coroner Office
(
  'Quebec Coroner Registry',
  'Access the Quebec Coroner database for unidentified remains matching.',
  'government',
  'Bureau du coroner du Quebec',
  '1.0.0',
  '{"baseUrl": "https://api.coroner.gouv.qc.ca", "authType": "api_key", "timeout": 45000, "rateLimit": {"requestsPerMinute": 20, "requestsPerHour": 200}}',
  '[{"name": "api_key", "type": "password", "description": "Coroner Registry API Key", "required": true}, {"name": "organization_id", "type": "string", "description": "Authorized organization ID", "required": true}]',
  '[{"name": "search_remains", "method": "POST", "path": "/v1/remains/search", "description": "Search unidentified remains database"}, {"name": "get_case", "method": "GET", "path": "/v1/cases/{id}", "description": "Get case details"}, {"name": "submit_match", "method": "POST", "path": "/v1/matches", "description": "Submit potential match for verification"}]',
  'https://coroner.gouv.qc.ca/api-docs',
  'Access requirements:\n1. Law enforcement or approved organization status\n2. Background verification\n3. Data handling certification\n4. Quarterly access review',
  ARRAY['quebec', 'coroner', 'morgue', 'unidentified'],
  true, true, true
),

-- Red Cross Shelters
(
  'Canadian Red Cross Shelters',
  'Connect to Red Cross shelter network for missing persons who may be seeking emergency services.',
  'social_services',
  'Canadian Red Cross',
  '1.0.0',
  '{"baseUrl": "https://api.redcross.ca", "authType": "bearer", "timeout": 30000, "rateLimit": {"requestsPerMinute": 60, "requestsPerHour": 1000}}',
  '[{"name": "bearer_token", "type": "password", "description": "Red Cross Partner API Token", "required": true}]',
  '[{"name": "search_registrations", "method": "POST", "path": "/v1/shelters/search", "description": "Search shelter registrations"}, {"name": "get_shelter", "method": "GET", "path": "/v1/shelters/{id}", "description": "Get shelter details"}, {"name": "subscribe_alerts", "method": "POST", "path": "/v1/alerts/subscribe", "description": "Subscribe to registration alerts"}]',
  'https://developers.redcross.ca',
  'Partnership setup:\n1. Contact Red Cross partnership team\n2. Sign data sharing agreement\n3. Complete volunteer training module\n4. Receive API credentials',
  ARRAY['canada', 'shelter', 'red-cross', 'humanitarian'],
  true, true, true
),

-- NCMEC Integration
(
  'NCMEC Database',
  'National Center for Missing & Exploited Children database integration for cross-border cases.',
  'data_provider',
  'NCMEC',
  '1.0.0',
  '{"baseUrl": "https://api.ncmec.org", "authType": "api_key", "timeout": 30000, "rateLimit": {"requestsPerMinute": 30, "requestsPerHour": 500}}',
  '[{"name": "api_key", "type": "password", "description": "NCMEC Partner API Key", "required": true}, {"name": "organization_id", "type": "string", "description": "NCMEC Partner Organization ID", "required": true}]',
  '[{"name": "search_cases", "method": "POST", "path": "/v2/cases/search", "description": "Search NCMEC case database"}, {"name": "get_case", "method": "GET", "path": "/v2/cases/{id}", "description": "Get case details"}, {"name": "submit_sighting", "method": "POST", "path": "/v2/sightings", "description": "Submit a sighting report"}]',
  'https://api.ncmec.org/docs',
  'NCMEC integration requirements:\n1. Law enforcement agency partnership\n2. Background check completion\n3. Annual compliance certification\n4. Secure data handling protocols',
  ARRAY['usa', 'canada', 'ncmec', 'children', 'missing-persons'],
  true, true, true
);

-- Update usage counts for demo purposes
UPDATE integration_templates SET usage_count = floor(random() * 500 + 50)::int WHERE is_official = true;
UPDATE integration_templates SET rating = (random() * 1.5 + 3.5)::decimal(2,1) WHERE is_official = true;
UPDATE integration_templates SET rating_count = floor(random() * 100 + 10)::int WHERE is_official = true;
