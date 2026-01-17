-- =====================================================================================
-- Morgue/Coroner Registry Integration
-- LC-M5-003
-- 
-- Sensitive system for matching missing persons with unidentified remains.
-- Implements strict access controls and audit logging.
-- =====================================================================================

-- =====================================================================================
-- TABLES
-- =====================================================================================

-- Unidentified remains records from morgues/coroners
CREATE TABLE IF NOT EXISTS public.unidentified_remains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number TEXT NOT NULL,
    morgue_id TEXT NOT NULL,
    morgue_name TEXT NOT NULL,
    morgue_jurisdiction TEXT NOT NULL,
    coroner_id TEXT,
    
    -- Discovery information
    discovery_date DATE NOT NULL,
    discovery_location TEXT NOT NULL,
    discovery_city TEXT NOT NULL,
    discovery_province TEXT NOT NULL,
    discovery_latitude DECIMAL(10, 8),
    discovery_longitude DECIMAL(11, 8),
    
    -- Status
    status TEXT NOT NULL CHECK (status IN (
        'unidentified', 'pending_identification', 'identified', 'claimed', 'buried_unclaimed'
    )),
    cause_of_death TEXT NOT NULL CHECK (cause_of_death IN (
        'undetermined', 'natural', 'accident', 'suicide', 'homicide', 'pending_investigation'
    )),
    estimated_death_date DATE,
    estimated_death_date_earliest DATE,
    estimated_death_date_latest DATE,
    
    -- Physical description
    estimated_age INTEGER,
    estimated_age_min INTEGER,
    estimated_age_max INTEGER,
    sex TEXT CHECK (sex IN ('male', 'female', 'undetermined')),
    race TEXT,
    ethnicity TEXT,
    height_cm DECIMAL(5, 2),
    height_min_cm DECIMAL(5, 2),
    height_max_cm DECIMAL(5, 2),
    weight_kg DECIMAL(5, 2),
    weight_min_kg DECIMAL(5, 2),
    weight_max_kg DECIMAL(5, 2),
    hair_color TEXT,
    hair_length TEXT,
    eye_color TEXT,
    build TEXT,
    
    -- Identifying marks and features (JSONB for flexibility)
    tattoos JSONB DEFAULT '[]'::jsonb,
    scars JSONB DEFAULT '[]'::jsonb,
    piercings JSONB DEFAULT '[]'::jsonb,
    birthmarks JSONB DEFAULT '[]'::jsonb,
    
    -- Medical/dental
    dental_records_available BOOLEAN DEFAULT false,
    dental_work JSONB DEFAULT '[]'::jsonb,
    medical_implants JSONB DEFAULT '[]'::jsonb,
    unique_features JSONB DEFAULT '[]'::jsonb,
    
    -- Clothing and personal effects
    clothing JSONB DEFAULT '[]'::jsonb,
    jewelry JSONB DEFAULT '[]'::jsonb,
    personal_effects JSONB DEFAULT '[]'::jsonb,
    
    -- DNA information
    dna_available BOOLEAN DEFAULT false,
    dna_profile_reference TEXT,
    
    -- Investigation details
    investigating_agency TEXT NOT NULL,
    lead_investigator TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    
    -- Privacy & access control
    restricted_access BOOLEAN DEFAULT true,
    access_requires_approval BOOLEAN DEFAULT true,
    media_releasable BOOLEAN DEFAULT false,
    
    -- Additional notes
    notes TEXT,
    
    -- Metadata
    entered_by UUID REFERENCES auth.users(id),
    entered_at TIMESTAMPTZ DEFAULT now(),
    last_updated_by UUID REFERENCES auth.users(id),
    last_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Morgue registry queries (for tracking searches)
CREATE TABLE IF NOT EXISTS public.morgue_registry_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    query_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    queried_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Search criteria (stored as JSONB for flexibility)
    search_criteria JSONB NOT NULL,
    
    -- Results
    results_count INTEGER DEFAULT 0,
    matches_found JSONB DEFAULT '[]'::jsonb, -- Array of remains IDs
    
    -- Notes
    notes TEXT,
    
    -- Follow-up
    requires_follow_up BOOLEAN DEFAULT false,
    follow_up_assigned_to UUID REFERENCES auth.users(id),
    follow_up_completed BOOLEAN DEFAULT false,
    follow_up_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Matches between missing persons and unidentified remains
CREATE TABLE IF NOT EXISTS public.morgue_registry_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    remains_id UUID NOT NULL REFERENCES public.unidentified_remains(id) ON DELETE CASCADE,
    
    -- Match details
    match_confidence TEXT NOT NULL CHECK (match_confidence IN (
        'low', 'medium', 'high', 'very_high', 'confirmed'
    )),
    match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
    matched_features JSONB DEFAULT '[]'::jsonb,
    
    -- Match rationale
    physical_match_details TEXT,
    location_proximity_km DECIMAL(10, 2),
    timeline_alignment TEXT,
    
    -- Investigation
    status TEXT NOT NULL DEFAULT 'potential' CHECK (status IN (
        'potential', 'under_investigation', 'ruled_out', 'confirmed', 'family_notified'
    )),
    investigated_by UUID REFERENCES auth.users(id),
    investigation_date TIMESTAMPTZ,
    investigation_notes TEXT,
    
    -- DNA comparison
    dna_comparison_requested BOOLEAN DEFAULT false,
    dna_comparison_requested_date TIMESTAMPTZ,
    dna_comparison_status TEXT CHECK (dna_comparison_status IN (
        'not_collected', 'collected', 'submitted_to_lab', 'in_analysis',
        'results_pending', 'results_available', 'match_found', 'no_match', 'inconclusive'
    )),
    dna_comparison_result TEXT CHECK (dna_comparison_result IN ('match', 'no_match', 'inconclusive')),
    dna_comparison_notes TEXT,
    
    -- Notification
    family_notified BOOLEAN DEFAULT false,
    family_notified_date TIMESTAMPTZ,
    notified_by UUID REFERENCES auth.users(id),
    notification_method TEXT CHECK (notification_method IN ('in_person', 'phone', 'liaison')),
    
    -- Resolution
    confirmed_match BOOLEAN DEFAULT false,
    confirmed_date TIMESTAMPTZ,
    confirmed_by UUID REFERENCES auth.users(id),
    closure_notes TEXT,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(case_id, remains_id)
);

-- DNA sample coordination for matching
CREATE TABLE IF NOT EXISTS public.dna_sample_coordination (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.morgue_registry_matches(id) ON DELETE SET NULL,
    
    -- Sample information
    sample_type TEXT NOT NULL CHECK (sample_type IN (
        'blood', 'tissue', 'bone', 'tooth', 'hair', 'other'
    )),
    sample_source TEXT NOT NULL CHECK (sample_source IN (
        'family_member', 'personal_item', 'remains'
    )),
    
    -- Family sample details (for comparison)
    family_member_id UUID REFERENCES public.family_contacts(id),
    family_relationship TEXT,
    
    -- Lab details
    lab_name TEXT,
    lab_case_number TEXT,
    submitted_date DATE,
    expected_results_date DATE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'not_collected' CHECK (status IN (
        'not_collected', 'collected', 'submitted_to_lab', 'in_analysis',
        'results_pending', 'results_available', 'match_found', 'no_match', 'inconclusive'
    )),
    priority TEXT DEFAULT 'routine' CHECK (priority IN ('routine', 'high', 'urgent')),
    
    -- Results
    results_received_date DATE,
    results_available BOOLEAN DEFAULT false,
    match_found BOOLEAN,
    match_confidence_percentage DECIMAL(5, 2),
    
    -- Privacy
    consent_obtained BOOLEAN DEFAULT false,
    consent_date DATE,
    consent_document_url TEXT,
    
    -- Chain of custody
    collected_by TEXT,
    collected_date DATE,
    chain_of_custody_log JSONB DEFAULT '[]'::jsonb,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    coordinated_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT consent_date_required CHECK (
        consent_obtained = false OR consent_date IS NOT NULL
    )
);

-- Sensitive notifications for potential matches
CREATE TABLE IF NOT EXISTS public.morgue_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES public.morgue_registry_matches(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'potential_match', 'dna_results', 'confirmation', 'ruled_out'
    )),
    sensitivity TEXT NOT NULL CHECK (sensitivity IN (
        'standard', 'high', 'critical', 'requires_in_person'
    )),
    
    -- Recipients
    primary_liaison_id UUID NOT NULL REFERENCES auth.users(id),
    family_contact_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_time TIME,
    delivery_method TEXT NOT NULL CHECK (delivery_method IN (
        'in_person', 'phone', 'video_call', 'liaison_facilitated'
    )),
    
    -- Location (for in-person)
    meeting_location TEXT,
    
    -- Support
    grief_counselor_present BOOLEAN DEFAULT false,
    grief_counselor_id UUID REFERENCES auth.users(id),
    additional_support_staff JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'delivered', 'postponed', 'cancelled'
    )),
    delivered_date TIMESTAMPTZ,
    delivered_by UUID REFERENCES auth.users(id),
    
    -- Follow-up
    family_reaction TEXT,
    immediate_support TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_scheduled_date DATE,
    
    -- Resources provided
    resources_provided JSONB DEFAULT '[]'::jsonb,
    grief_support_offered JSONB DEFAULT '[]'::jsonb,
    
    -- Notes
    notes TEXT,
    sensitive_notes TEXT, -- Extra restricted access
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grief support resources specific to morgue/coroner cases
CREATE TABLE IF NOT EXISTS public.grief_support_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN (
        'counseling', 'support_group', 'crisis_hotline', 
        'funeral_assistance', 'legal_aid', 'spiritual_care'
    )),
    name TEXT NOT NULL,
    name_fr TEXT,
    description TEXT NOT NULL,
    description_fr TEXT,
    
    -- Organization
    organization_name TEXT NOT NULL,
    specializes_in_trauma BOOLEAN DEFAULT false,
    specializes_in_violent_death BOOLEAN DEFAULT false,
    specializes_in_unidentified_remains BOOLEAN DEFAULT false,
    
    -- Contact
    phone TEXT,
    toll_free_phone TEXT,
    crisis_line TEXT,
    email TEXT,
    website TEXT,
    
    -- Availability
    available_24_7 BOOLEAN DEFAULT false,
    operating_hours TEXT,
    response_time TEXT,
    
    -- Location
    serves_provinces JSONB DEFAULT '[]'::jsonb,
    serves_nationally BOOLEAN DEFAULT false,
    in_person_available BOOLEAN DEFAULT false,
    virtual_available BOOLEAN DEFAULT false,
    
    -- Language & accessibility
    languages JSONB DEFAULT '["en", "fr"]'::jsonb,
    accessibility_features JSONB DEFAULT '[]'::jsonb,
    
    -- Cost
    is_free BOOLEAN DEFAULT false,
    cost_info TEXT,
    financial_assistance_available BOOLEAN DEFAULT false,
    
    -- Eligibility
    eligibility_notes TEXT,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Family liaison protocols for morgue cases
CREATE TABLE IF NOT EXISTS public.morgue_liaison_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.morgue_registry_matches(id) ON DELETE SET NULL,
    
    -- Liaison assignment
    primary_liaison_id UUID NOT NULL REFERENCES auth.users(id),
    backup_liaison_id UUID REFERENCES auth.users(id),
    grief_specialist_id UUID REFERENCES auth.users(id),
    
    -- Communication plan
    preferred_contact_method TEXT NOT NULL CHECK (preferred_contact_method IN (
        'phone', 'in_person', 'video', 'liaison_visit'
    )),
    contact_frequency TEXT NOT NULL CHECK (contact_frequency IN (
        'daily', 'every_other_day', 'weekly', 'as_needed'
    )),
    family_preferences TEXT,
    
    -- Support plan
    grief_support_resources_provided JSONB DEFAULT '[]'::jsonb,
    counseling_referrals_made JSONB DEFAULT '[]'::jsonb,
    financial_assistance_referrals JSONB DEFAULT '[]'::jsonb,
    legal_aid_referrals JSONB DEFAULT '[]'::jsonb,
    
    -- Check-ins
    scheduled_check_ins JSONB DEFAULT '[]'::jsonb,
    last_check_in_date DATE,
    next_check_in_date DATE,
    
    -- Special considerations
    cultural_considerations TEXT,
    language_needs TEXT,
    accessibility_needs TEXT,
    trauma_informed_care BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    suspended_reason TEXT,
    closed_date DATE,
    closed_reason TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(case_id, match_id)
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

CREATE INDEX idx_unidentified_remains_status ON public.unidentified_remains(status);
CREATE INDEX idx_unidentified_remains_province ON public.unidentified_remains(discovery_province);
CREATE INDEX idx_unidentified_remains_morgue ON public.unidentified_remains(morgue_id);
CREATE INDEX idx_unidentified_remains_discovery_date ON public.unidentified_remains(discovery_date);
CREATE INDEX idx_unidentified_remains_dna ON public.unidentified_remains(dna_available) WHERE dna_available = true;

CREATE INDEX idx_morgue_queries_case ON public.morgue_registry_queries(case_id);
CREATE INDEX idx_morgue_queries_date ON public.morgue_registry_queries(query_date);
CREATE INDEX idx_morgue_queries_follow_up ON public.morgue_registry_queries(requires_follow_up) WHERE requires_follow_up = true;

CREATE INDEX idx_morgue_matches_case ON public.morgue_registry_matches(case_id);
CREATE INDEX idx_morgue_matches_remains ON public.morgue_registry_matches(remains_id);
CREATE INDEX idx_morgue_matches_status ON public.morgue_registry_matches(status);
CREATE INDEX idx_morgue_matches_confirmed ON public.morgue_registry_matches(confirmed_match) WHERE confirmed_match = true;

CREATE INDEX idx_dna_coordination_case ON public.dna_sample_coordination(case_id);
CREATE INDEX idx_dna_coordination_match ON public.dna_sample_coordination(match_id);
CREATE INDEX idx_dna_coordination_status ON public.dna_sample_coordination(status);

CREATE INDEX idx_morgue_notifications_case ON public.morgue_notifications(case_id);
CREATE INDEX idx_morgue_notifications_match ON public.morgue_notifications(match_id);
CREATE INDEX idx_morgue_notifications_status ON public.morgue_notifications(status);
CREATE INDEX idx_morgue_notifications_scheduled ON public.morgue_notifications(scheduled_date) WHERE status = 'scheduled';

CREATE INDEX idx_grief_support_type ON public.grief_support_resources(type);
CREATE INDEX idx_grief_support_active ON public.grief_support_resources(is_active) WHERE is_active = true;

CREATE INDEX idx_morgue_liaison_case ON public.morgue_liaison_protocols(case_id);
CREATE INDEX idx_morgue_liaison_active ON public.morgue_liaison_protocols(is_active) WHERE is_active = true;

-- =====================================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================================

ALTER TABLE public.unidentified_remains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.morgue_registry_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.morgue_registry_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dna_sample_coordination ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.morgue_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grief_support_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.morgue_liaison_protocols ENABLE ROW LEVEL SECURITY;

-- Unidentified remains: Only authorized law enforcement and admins
CREATE POLICY "Authorized users can view unidentified remains"
    ON public.unidentified_remains FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

CREATE POLICY "Authorized users can insert unidentified remains"
    ON public.unidentified_remains FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

CREATE POLICY "Authorized users can update unidentified remains"
    ON public.unidentified_remains FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

-- Morgue registry queries: Only authorized users for cases they can access
CREATE POLICY "Users can view their morgue queries"
    ON public.morgue_registry_queries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

CREATE POLICY "Authorized users can create morgue queries"
    ON public.morgue_registry_queries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

CREATE POLICY "Users can update their morgue queries"
    ON public.morgue_registry_queries FOR UPDATE
    USING (
        queried_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer')
        )
    );

-- Morgue registry matches: Highly restricted
CREATE POLICY "Authorized users can view matches"
    ON public.morgue_registry_matches FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

CREATE POLICY "Authorized users can create matches"
    ON public.morgue_registry_matches FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

CREATE POLICY "Authorized users can update matches"
    ON public.morgue_registry_matches FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

-- DNA coordination: Restricted access
CREATE POLICY "Authorized users can view DNA coordination"
    ON public.dna_sample_coordination FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

CREATE POLICY "Authorized users can create DNA coordination"
    ON public.dna_sample_coordination FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

CREATE POLICY "Authorized users can update DNA coordination"
    ON public.dna_sample_coordination FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

-- Morgue notifications: Very restricted
CREATE POLICY "Authorized users can view notifications"
    ON public.morgue_notifications FOR SELECT
    USING (
        primary_liaison_id = auth.uid()
        OR grief_counselor_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

CREATE POLICY "Authorized users can create notifications"
    ON public.morgue_notifications FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

CREATE POLICY "Liaisons can update their notifications"
    ON public.morgue_notifications FOR UPDATE
    USING (
        primary_liaison_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer')
        )
    );

-- Grief support resources: Public read, admin write
CREATE POLICY "Anyone can view active grief support resources"
    ON public.grief_support_resources FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage grief support resources"
    ON public.grief_support_resources FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer')
        )
    );

-- Morgue liaison protocols: Restricted to assigned liaisons and admins
CREATE POLICY "Liaisons can view their protocols"
    ON public.morgue_liaison_protocols FOR SELECT
    USING (
        primary_liaison_id = auth.uid()
        OR backup_liaison_id = auth.uid()
        OR grief_specialist_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

CREATE POLICY "Authorized users can create liaison protocols"
    ON public.morgue_liaison_protocols FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'law_enforcement')
        )
    );

CREATE POLICY "Liaisons can update their protocols"
    ON public.morgue_liaison_protocols FOR UPDATE
    USING (
        primary_liaison_id = auth.uid()
        OR backup_liaison_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer')
        )
    );

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Update timestamp triggers
CREATE TRIGGER update_unidentified_remains_updated_at
    BEFORE UPDATE ON public.unidentified_remains
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_morgue_queries_updated_at
    BEFORE UPDATE ON public.morgue_registry_queries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_morgue_matches_updated_at
    BEFORE UPDATE ON public.morgue_registry_matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dna_coordination_updated_at
    BEFORE UPDATE ON public.dna_sample_coordination
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_morgue_notifications_updated_at
    BEFORE UPDATE ON public.morgue_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grief_support_updated_at
    BEFORE UPDATE ON public.grief_support_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_morgue_liaison_updated_at
    BEFORE UPDATE ON public.morgue_liaison_protocols
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE public.unidentified_remains IS 'Sensitive registry of unidentified remains from morgues and coroners - restricted access';
COMMENT ON TABLE public.morgue_registry_queries IS 'Track all queries to the morgue registry for audit purposes';
COMMENT ON TABLE public.morgue_registry_matches IS 'Potential matches between missing persons and unidentified remains';
COMMENT ON TABLE public.dna_sample_coordination IS 'DNA sample collection and comparison coordination';
COMMENT ON TABLE public.morgue_notifications IS 'Sensitive notifications to families about potential matches';
COMMENT ON TABLE public.grief_support_resources IS 'Specialized grief support resources for families dealing with morgue/coroner cases';
COMMENT ON TABLE public.morgue_liaison_protocols IS 'Family liaison protocols specific to morgue/coroner cases requiring sensitive handling';
