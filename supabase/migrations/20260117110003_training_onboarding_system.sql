-- ============================================================================
-- Training & Onboarding Modules System
-- LC-FEAT-023: Training system for public users, law enforcement, and administrators
-- ============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE training_audience AS ENUM (
  'public',
  'law_enforcement',
  'admin',
  'all'
);

CREATE TYPE training_content_type AS ENUM (
  'lesson',
  'video',
  'interactive',
  'quiz',
  'walkthrough'
);

CREATE TYPE training_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE progress_status AS ENUM (
  'not_started',
  'in_progress',
  'completed'
);

CREATE TYPE certification_status AS ENUM (
  'active',
  'expired',
  'revoked'
);

-- =============================================================================
-- TRAINING TRACKS (High-level training paths)
-- =============================================================================

CREATE TABLE training_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  title_fr TEXT,
  description TEXT,
  description_fr TEXT,
  audience training_audience NOT NULL,
  icon TEXT, -- Icon identifier for UI
  color TEXT, -- Color code for UI theming
  estimated_duration_minutes INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE, -- Required for role access
  is_certification_track BOOLEAN DEFAULT FALSE, -- Issues certification on completion
  certification_valid_days INTEGER, -- Days until certification expires
  pass_percentage INTEGER DEFAULT 80, -- Minimum % to pass quizzes
  display_order INTEGER DEFAULT 0,
  status training_status DEFAULT 'draft',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TRAINING MODULES (Sections within tracks)
-- =============================================================================

CREATE TABLE training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES training_tracks(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  title_fr TEXT,
  description TEXT,
  description_fr TEXT,
  estimated_duration_minutes INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE, -- Must complete to finish track
  prerequisites JSONB DEFAULT '[]', -- Array of module IDs that must be completed first
  status training_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(track_id, slug)
);

-- =============================================================================
-- TRAINING LESSONS (Individual content items within modules)
-- =============================================================================

CREATE TABLE training_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  title_fr TEXT,
  content_type training_content_type NOT NULL,
  content JSONB NOT NULL DEFAULT '{}', -- Flexible content structure
  content_fr JSONB, -- French version of content
  video_url TEXT, -- URL for video content
  video_duration_seconds INTEGER,
  estimated_duration_minutes INTEGER DEFAULT 5,
  display_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE,
  status training_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, slug)
);

-- =============================================================================
-- TRAINING QUIZZES (Assessment questions)
-- =============================================================================

CREATE TABLE training_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_fr TEXT,
  description TEXT,
  description_fr TEXT,
  pass_percentage INTEGER DEFAULT 80,
  max_attempts INTEGER DEFAULT 3, -- 0 = unlimited
  time_limit_minutes INTEGER, -- NULL = no limit
  shuffle_questions BOOLEAN DEFAULT TRUE,
  shuffle_answers BOOLEAN DEFAULT TRUE,
  show_correct_answers BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  status training_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- QUIZ QUESTIONS
-- =============================================================================

CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES training_quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_fr TEXT,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice', -- multiple_choice, true_false, multi_select
  options JSONB NOT NULL DEFAULT '[]', -- Array of answer options
  options_fr JSONB, -- French version of options
  correct_answers JSONB NOT NULL DEFAULT '[]', -- Array of correct option indices
  explanation TEXT, -- Shown after answering
  explanation_fr TEXT,
  points INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- USER PROGRESS TRACKING
-- =============================================================================

-- Track-level progress
CREATE TABLE training_track_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES training_tracks(id) ON DELETE CASCADE,
  status progress_status DEFAULT 'not_started',
  progress_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

-- Module-level progress
CREATE TABLE training_module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  status progress_status DEFAULT 'not_started',
  progress_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Lesson-level progress
CREATE TABLE training_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
  status progress_status DEFAULT 'not_started',
  time_spent_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- =============================================================================
-- QUIZ ATTEMPTS & ANSWERS
-- =============================================================================

CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES training_quizzes(id) ON DELETE CASCADE,
  attempt_number INTEGER DEFAULT 1,
  score_percentage INTEGER,
  passed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_answers JSONB NOT NULL DEFAULT '[]', -- Array of selected option indices
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CERTIFICATIONS
-- =============================================================================

CREATE TABLE training_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES training_tracks(id) ON DELETE CASCADE,
  certificate_number TEXT UNIQUE NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status certification_status DEFAULT 'active',
  final_score_percentage INTEGER,
  verification_hash TEXT UNIQUE, -- For certificate verification
  pdf_url TEXT, -- Generated PDF certificate
  metadata JSONB DEFAULT '{}', -- Additional certification data
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES profiles(id),
  revoke_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CERTIFICATION BADGES
-- =============================================================================

CREATE TABLE training_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES training_tracks(id) ON DELETE SET NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_fr TEXT,
  description TEXT,
  description_fr TEXT,
  icon_url TEXT,
  badge_type TEXT NOT NULL DEFAULT 'completion', -- completion, achievement, milestone
  criteria JSONB DEFAULT '{}', -- Criteria for earning badge
  points INTEGER DEFAULT 0, -- Gamification points
  is_public BOOLEAN DEFAULT TRUE, -- Show on public profile
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES training_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  certification_id UUID REFERENCES training_certifications(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- =============================================================================
-- REFRESHER REMINDERS
-- =============================================================================

CREATE TABLE training_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES training_tracks(id) ON DELETE CASCADE,
  certification_id UUID REFERENCES training_certifications(id) ON DELETE SET NULL,
  reminder_type TEXT NOT NULL, -- expiring_soon, expired, refresher_due
  reminder_date TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INTERACTIVE WALKTHROUGH STATE
-- =============================================================================

CREATE TABLE walkthrough_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  walkthrough_id TEXT NOT NULL, -- Identifier for the walkthrough
  current_step INTEGER DEFAULT 0,
  completed_steps JSONB DEFAULT '[]', -- Array of completed step numbers
  is_completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, walkthrough_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Training tracks
CREATE INDEX idx_training_tracks_audience ON training_tracks(audience);
CREATE INDEX idx_training_tracks_status ON training_tracks(status);
CREATE INDEX idx_training_tracks_required ON training_tracks(is_required) WHERE is_required = TRUE;

-- Training modules
CREATE INDEX idx_training_modules_track ON training_modules(track_id);
CREATE INDEX idx_training_modules_status ON training_modules(status);

-- Training lessons
CREATE INDEX idx_training_lessons_module ON training_lessons(module_id);
CREATE INDEX idx_training_lessons_type ON training_lessons(content_type);

-- Progress tracking
CREATE INDEX idx_track_progress_user ON training_track_progress(user_id);
CREATE INDEX idx_track_progress_track ON training_track_progress(track_id);
CREATE INDEX idx_track_progress_status ON training_track_progress(status);

CREATE INDEX idx_module_progress_user ON training_module_progress(user_id);
CREATE INDEX idx_module_progress_module ON training_module_progress(module_id);

CREATE INDEX idx_lesson_progress_user ON training_lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON training_lesson_progress(lesson_id);

-- Quiz attempts
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);

-- Certifications
CREATE INDEX idx_certifications_user ON training_certifications(user_id);
CREATE INDEX idx_certifications_track ON training_certifications(track_id);
CREATE INDEX idx_certifications_status ON training_certifications(status);
CREATE INDEX idx_certifications_expires ON training_certifications(expires_at);

-- Badges
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);

-- Reminders
CREATE INDEX idx_reminders_user ON training_reminders(user_id);
CREATE INDEX idx_reminders_date ON training_reminders(reminder_date);
CREATE INDEX idx_reminders_pending ON training_reminders(reminder_date) WHERE sent_at IS NULL;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE training_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_track_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE walkthrough_progress ENABLE ROW LEVEL SECURITY;

-- Training tracks - published tracks visible to appropriate audiences
CREATE POLICY "Published tracks visible to all" ON training_tracks
  FOR SELECT USING (status = 'published' AND (audience = 'all' OR audience = 'public'));

CREATE POLICY "LE can view LE tracks" ON training_tracks
  FOR SELECT USING (
    status = 'published' AND audience = 'law_enforcement'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('law_enforcement', 'admin', 'developer')
    )
  );

CREATE POLICY "Admins can view admin tracks" ON training_tracks
  FOR SELECT USING (
    status = 'published' AND audience = 'admin'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Admins can manage all tracks" ON training_tracks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

-- Training modules - follow track visibility
CREATE POLICY "Modules visible with track access" ON training_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_tracks t
      WHERE t.id = training_modules.track_id
      AND t.status = 'published'
    )
  );

CREATE POLICY "Admins can manage modules" ON training_modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

-- Training lessons - follow module visibility
CREATE POLICY "Lessons visible with module access" ON training_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_modules m
      JOIN training_tracks t ON t.id = m.track_id
      WHERE m.id = training_lessons.module_id
      AND m.status = 'published'
      AND t.status = 'published'
    )
  );

CREATE POLICY "Admins can manage lessons" ON training_lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

-- Quizzes - follow module visibility
CREATE POLICY "Quizzes visible with module access" ON training_quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_modules m
      JOIN training_tracks t ON t.id = m.track_id
      WHERE m.id = training_quizzes.module_id
      AND m.status = 'published'
      AND t.status = 'published'
    )
  );

CREATE POLICY "Admins can manage quizzes" ON training_quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

-- Quiz questions - admins can see answers, others see questions only
CREATE POLICY "Users can view quiz questions" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_quizzes q
      JOIN training_modules m ON m.id = q.module_id
      JOIN training_tracks t ON t.id = m.track_id
      WHERE q.id = quiz_questions.quiz_id
      AND q.status = 'published'
    )
  );

CREATE POLICY "Admins can manage questions" ON quiz_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

-- Progress - users can only see/modify their own
CREATE POLICY "Users manage own track progress" ON training_track_progress
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users manage own module progress" ON training_module_progress
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users manage own lesson progress" ON training_lesson_progress
  FOR ALL USING (user_id = auth.uid());

-- Admins can view all progress for reporting
CREATE POLICY "Admins view all track progress" ON training_track_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Admins view all module progress" ON training_module_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Admins view all lesson progress" ON training_lesson_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

-- Quiz attempts - users manage own
CREATE POLICY "Users manage own quiz attempts" ON quiz_attempts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins view all quiz attempts" ON quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Users manage own quiz answers" ON quiz_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts WHERE id = quiz_answers.attempt_id AND user_id = auth.uid()
    )
  );

-- Certifications
CREATE POLICY "Users view own certifications" ON training_certifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins manage certifications" ON training_certifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

-- Public certification verification (by hash)
CREATE POLICY "Anyone can verify certifications" ON training_certifications
  FOR SELECT USING (status = 'active' AND verification_hash IS NOT NULL);

-- Badges
CREATE POLICY "Public badges visible" ON training_badges
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins manage badges" ON training_badges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Users view own badges" ON user_badges
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Public badges visible" ON user_badges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_badges WHERE id = user_badges.badge_id AND is_public = TRUE
    )
  );

-- Reminders - users manage own
CREATE POLICY "Users manage own reminders" ON training_reminders
  FOR ALL USING (user_id = auth.uid());

-- Walkthrough progress - users manage own
CREATE POLICY "Users manage own walkthrough progress" ON walkthrough_progress
  FOR ALL USING (user_id = auth.uid());

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Generate certificate number
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(certificate_number FROM 10) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM training_certifications
  WHERE certificate_number LIKE 'LC-CERT-' || year_part || '-%';

  NEW.certificate_number := 'LC-CERT-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');

  -- Generate verification hash
  NEW.verification_hash := encode(gen_random_bytes(16), 'hex');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate module progress
CREATE OR REPLACE FUNCTION calculate_module_progress(p_user_id UUID, p_module_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_lessons
  FROM training_lessons
  WHERE module_id = p_module_id AND is_required = TRUE AND status = 'published';

  IF total_lessons = 0 THEN
    RETURN 100;
  END IF;

  SELECT COUNT(*) INTO completed_lessons
  FROM training_lesson_progress lp
  JOIN training_lessons l ON l.id = lp.lesson_id
  WHERE lp.user_id = p_user_id
    AND l.module_id = p_module_id
    AND l.is_required = TRUE
    AND lp.status = 'completed';

  RETURN ROUND((completed_lessons::NUMERIC / total_lessons::NUMERIC) * 100);
END;
$$ LANGUAGE plpgsql;

-- Calculate track progress
CREATE OR REPLACE FUNCTION calculate_track_progress(p_user_id UUID, p_track_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_modules INTEGER;
  completed_modules INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_modules
  FROM training_modules
  WHERE track_id = p_track_id AND is_required = TRUE AND status = 'published';

  IF total_modules = 0 THEN
    RETURN 100;
  END IF;

  SELECT COUNT(*) INTO completed_modules
  FROM training_module_progress mp
  JOIN training_modules m ON m.id = mp.module_id
  WHERE mp.user_id = p_user_id
    AND m.track_id = p_track_id
    AND m.is_required = TRUE
    AND mp.status = 'completed';

  RETURN ROUND((completed_modules::NUMERIC / total_modules::NUMERIC) * 100);
END;
$$ LANGUAGE plpgsql;

-- Update module progress when lesson is completed
CREATE OR REPLACE FUNCTION update_module_progress_on_lesson()
RETURNS TRIGGER AS $$
DECLARE
  v_module_id UUID;
  v_progress INTEGER;
  v_all_completed BOOLEAN;
BEGIN
  -- Get module ID for this lesson
  SELECT module_id INTO v_module_id
  FROM training_lessons WHERE id = NEW.lesson_id;

  -- Calculate new progress
  v_progress := calculate_module_progress(NEW.user_id, v_module_id);

  -- Check if all required lessons are completed
  v_all_completed := v_progress = 100;

  -- Update or insert module progress
  INSERT INTO training_module_progress (user_id, module_id, status, progress_percentage, started_at, completed_at, last_activity_at)
  VALUES (
    NEW.user_id,
    v_module_id,
    CASE WHEN v_all_completed THEN 'completed'::progress_status ELSE 'in_progress'::progress_status END,
    v_progress,
    COALESCE(NEW.started_at, NOW()),
    CASE WHEN v_all_completed THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (user_id, module_id) DO UPDATE SET
    status = CASE WHEN v_all_completed THEN 'completed'::progress_status ELSE 'in_progress'::progress_status END,
    progress_percentage = v_progress,
    completed_at = CASE WHEN v_all_completed AND training_module_progress.completed_at IS NULL THEN NOW() ELSE training_module_progress.completed_at END,
    last_activity_at = NOW(),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update track progress when module is completed
CREATE OR REPLACE FUNCTION update_track_progress_on_module()
RETURNS TRIGGER AS $$
DECLARE
  v_track_id UUID;
  v_progress INTEGER;
  v_all_completed BOOLEAN;
BEGIN
  -- Get track ID for this module
  SELECT track_id INTO v_track_id
  FROM training_modules WHERE id = NEW.module_id;

  -- Calculate new progress
  v_progress := calculate_track_progress(NEW.user_id, v_track_id);

  -- Check if all required modules are completed
  v_all_completed := v_progress = 100;

  -- Update or insert track progress
  INSERT INTO training_track_progress (user_id, track_id, status, progress_percentage, started_at, completed_at, last_activity_at)
  VALUES (
    NEW.user_id,
    v_track_id,
    CASE WHEN v_all_completed THEN 'completed'::progress_status ELSE 'in_progress'::progress_status END,
    v_progress,
    COALESCE(NEW.started_at, NOW()),
    CASE WHEN v_all_completed THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (user_id, track_id) DO UPDATE SET
    status = CASE WHEN v_all_completed THEN 'completed'::progress_status ELSE 'in_progress'::progress_status END,
    progress_percentage = v_progress,
    completed_at = CASE WHEN v_all_completed AND training_track_progress.completed_at IS NULL THEN NOW() ELSE training_track_progress.completed_at END,
    last_activity_at = NOW(),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Certificate number generation
CREATE TRIGGER generate_certificate_number_trigger
  BEFORE INSERT ON training_certifications
  FOR EACH ROW EXECUTE FUNCTION generate_certificate_number();

-- Progress update triggers
CREATE TRIGGER update_module_progress_trigger
  AFTER INSERT OR UPDATE ON training_lesson_progress
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_module_progress_on_lesson();

CREATE TRIGGER update_track_progress_trigger
  AFTER INSERT OR UPDATE ON training_module_progress
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_track_progress_on_module();

-- Updated at triggers
CREATE TRIGGER update_training_tracks_updated_at BEFORE UPDATE ON training_tracks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_modules_updated_at BEFORE UPDATE ON training_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_lessons_updated_at BEFORE UPDATE ON training_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_quizzes_updated_at BEFORE UPDATE ON training_quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_track_progress_updated_at BEFORE UPDATE ON training_track_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_progress_updated_at BEFORE UPDATE ON training_module_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON training_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certifications_updated_at BEFORE UPDATE ON training_certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON training_badges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_walkthrough_progress_updated_at BEFORE UPDATE ON walkthrough_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED DATA: Default Training Tracks & Content
-- =============================================================================

-- Public User Training Track
INSERT INTO training_tracks (slug, title, title_fr, description, description_fr, audience, icon, color, estimated_duration_minutes, is_required, is_certification_track, status, display_order)
VALUES
  ('public-orientation', 'Getting Started with LocateConnect', 'Premiers pas avec LocateConnect', 'Learn how to effectively use LocateConnect to file reports and work with authorities.', 'Apprenez a utiliser efficacement LocateConnect pour deposer des signalements et collaborer avec les autorites.', 'public', 'academic-cap', 'cyan', 30, false, false, 'published', 1),

  ('law-enforcement-essentials', 'Law Enforcement Platform Training', 'Formation pour les forces de l''ordre', 'Comprehensive training on platform features, case management, and investigation tools.', 'Formation complete sur les fonctionnalites de la plateforme, la gestion des dossiers et les outils d''enquete.', 'law_enforcement', 'shield-check', 'blue', 120, true, true, 'published', 2),

  ('admin-certification', 'Administrator Certification', 'Certification Administrateur', 'Complete training for system administrators covering configuration, compliance, and user management.', 'Formation complete pour les administrateurs systeme couvrant la configuration, la conformite et la gestion des utilisateurs.', 'admin', 'cog', 'purple', 180, true, true, 'published', 3);

-- Public Track Modules
INSERT INTO training_modules (track_id, slug, title, title_fr, description, description_fr, estimated_duration_minutes, display_order, status)
SELECT
  t.id,
  m.slug,
  m.title,
  m.title_fr,
  m.description,
  m.description_fr,
  m.duration,
  m.display_order,
  'published'
FROM training_tracks t
CROSS JOIN (VALUES
  ('how-to-file-report', 'How to File a Report', 'Comment deposer un signalement', 'Step-by-step guide to filing a missing person report.', 'Guide etape par etape pour deposer un signalement de personne disparue.', 10, 1),
  ('gathering-information', 'What Information to Gather', 'Quelles informations rassembler', 'Essential information needed for an effective report.', 'Informations essentielles pour un signalement efficace.', 8, 2),
  ('working-with-le', 'Working with Law Enforcement', 'Collaborer avec les forces de l''ordre', 'How to effectively communicate and coordinate with authorities.', 'Comment communiquer et coordonner efficacement avec les autorites.', 7, 3),
  ('privacy-safety', 'Privacy and Safety Guidelines', 'Directives de confidentialite et de securite', 'Important guidelines for protecting privacy and staying safe.', 'Directives importantes pour proteger la vie privee et rester en securite.', 5, 4)
) AS m(slug, title, title_fr, description, description_fr, duration, display_order)
WHERE t.slug = 'public-orientation';

-- Law Enforcement Track Modules
INSERT INTO training_modules (track_id, slug, title, title_fr, description, description_fr, estimated_duration_minutes, display_order, status)
SELECT
  t.id,
  m.slug,
  m.title,
  m.title_fr,
  m.description,
  m.description_fr,
  m.duration,
  m.display_order,
  'published'
FROM training_tracks t
CROSS JOIN (VALUES
  ('platform-navigation', 'Platform Navigation Tour', 'Visite guidee de la plateforme', 'Complete walkthrough of the LocateConnect interface and features.', 'Presentation complete de l''interface et des fonctionnalites de LocateConnect.', 20, 1),
  ('case-management', 'Case Management Workflows', 'Flux de gestion des dossiers', 'Learn efficient case management from intake to resolution.', 'Apprenez la gestion efficace des dossiers de l''admission a la resolution.', 30, 2),
  ('integration-features', 'Integration Features Overview', 'Apercu des fonctionnalites d''integration', 'Overview of integration capabilities with external systems.', 'Apercu des capacites d''integration avec les systemes externes.', 25, 3),
  ('realtime-feed', 'Real-time Feed Usage', 'Utilisation du flux en temps reel', 'Maximizing the real-time alerts and notifications system.', 'Maximiser le systeme d''alertes et de notifications en temps reel.', 20, 4),
  ('jurisdiction-coordination', 'Jurisdiction Coordination', 'Coordination entre juridictions', 'Effective multi-jurisdiction case coordination.', 'Coordination efficace des dossiers multi-juridictions.', 25, 5)
) AS m(slug, title, title_fr, description, description_fr, duration, display_order)
WHERE t.slug = 'law-enforcement-essentials';

-- Admin Track Modules
INSERT INTO training_modules (track_id, slug, title, title_fr, description, description_fr, estimated_duration_minutes, display_order, status)
SELECT
  t.id,
  m.slug,
  m.title,
  m.title_fr,
  m.description,
  m.description_fr,
  m.duration,
  m.display_order,
  'published'
FROM training_tracks t
CROSS JOIN (VALUES
  ('system-configuration', 'System Configuration', 'Configuration du systeme', 'Configure system settings, integrations, and security policies.', 'Configurer les parametres du systeme, les integrations et les politiques de securite.', 45, 1),
  ('user-management', 'User Management', 'Gestion des utilisateurs', 'User account management, roles, and permissions.', 'Gestion des comptes utilisateurs, des roles et des permissions.', 40, 2),
  ('compliance-monitoring', 'Compliance Monitoring', 'Surveillance de la conformite', 'Audit trails, compliance reports, and regulatory adherence.', 'Pistes d''audit, rapports de conformite et respect de la reglementation.', 50, 3),
  ('report-generation', 'Report Generation', 'Generation de rapports', 'Creating and customizing system reports and analytics.', 'Creation et personnalisation des rapports systeme et des analyses.', 45, 4)
) AS m(slug, title, title_fr, description, description_fr, duration, display_order)
WHERE t.slug = 'admin-certification';

-- Sample lessons for the first public module
INSERT INTO training_lessons (module_id, slug, title, title_fr, content_type, content, content_fr, estimated_duration_minutes, display_order, status)
SELECT
  m.id,
  l.slug,
  l.title,
  l.title_fr,
  l.content_type::training_content_type,
  l.content::jsonb,
  l.content_fr::jsonb,
  l.duration,
  l.display_order,
  'published'
FROM training_modules m
JOIN training_tracks t ON t.id = m.track_id
CROSS JOIN (VALUES
  ('intro', 'Introduction', 'Introduction', 'lesson',
    '{"sections": [{"type": "text", "content": "Filing a missing person report is an important step in locating your loved one. This lesson will guide you through the entire process."}, {"type": "callout", "variant": "info", "content": "The sooner you file a report, the better the chances of a successful outcome."}]}',
    '{"sections": [{"type": "text", "content": "Deposer un signalement de personne disparue est une etape importante pour retrouver votre proche. Cette lecon vous guidera tout au long du processus."}, {"type": "callout", "variant": "info", "content": "Plus tot vous deposez un signalement, meilleures sont les chances de succes."}]}',
    2, 1),
  ('when-to-file', 'When to File a Report', 'Quand deposer un signalement', 'lesson',
    '{"sections": [{"type": "text", "content": "You can file a missing person report immediately - there is no waiting period. Common misconceptions suggest you must wait 24-48 hours, but this is not true."}, {"type": "list", "items": ["File immediately if you believe someone is in danger", "There is NO required waiting period", "Trust your instincts - if something feels wrong, report it"]}]}',
    '{"sections": [{"type": "text", "content": "Vous pouvez deposer un signalement immediatement - il n''y a pas de delai d''attente. Des idees recues suggerent qu''il faut attendre 24-48 heures, mais c''est faux."}, {"type": "list", "items": ["Deposez immediatement si vous pensez que quelqu''un est en danger", "Il n''y a PAS de delai d''attente obligatoire", "Faites confiance a votre instinct - si quelque chose vous semble anormal, signalez-le"]}]}',
    3, 2),
  ('filing-process', 'The Filing Process', 'Le processus de depot', 'interactive',
    '{"steps": [{"title": "Start New Report", "content": "Click the ''New Report'' button to begin", "action": "highlight", "target": "#new-report-button"}, {"title": "Enter Basic Information", "content": "Fill in the missing person''s name, age, and physical description", "action": "form-demo"}, {"title": "Add Photos", "content": "Upload clear, recent photos of the missing person", "action": "upload-demo"}, {"title": "Describe Circumstances", "content": "Provide details about when and where they were last seen", "action": "form-demo"}, {"title": "Submit Report", "content": "Review your information and submit the report", "action": "submit-demo"}]}',
    '{"steps": [{"title": "Commencer un nouveau signalement", "content": "Cliquez sur le bouton ''Nouveau signalement'' pour commencer", "action": "highlight", "target": "#new-report-button"}, {"title": "Entrer les informations de base", "content": "Remplissez le nom, l''age et la description physique de la personne disparue", "action": "form-demo"}, {"title": "Ajouter des photos", "content": "Telechargez des photos claires et recentes de la personne disparue", "action": "upload-demo"}, {"title": "Decrire les circonstances", "content": "Fournissez des details sur quand et ou elle a ete vue pour la derniere fois", "action": "form-demo"}, {"title": "Soumettre le signalement", "content": "Verifiez vos informations et soumettez le signalement", "action": "submit-demo"}]}',
    5, 3)
) AS l(slug, title, title_fr, content_type, content, content_fr, duration, display_order)
WHERE t.slug = 'public-orientation' AND m.slug = 'how-to-file-report';

-- Default badges
INSERT INTO training_badges (track_id, slug, name, name_fr, description, description_fr, badge_type, points, is_public, display_order)
SELECT
  t.id,
  b.slug,
  b.name,
  b.name_fr,
  b.description,
  b.description_fr,
  b.badge_type,
  b.points,
  b.is_public,
  b.display_order
FROM training_tracks t
RIGHT JOIN (VALUES
  ('public-orientation', 'reporter-ready', 'Reporter Ready', 'Signaleur Pret', 'Completed public user orientation', 'A complete l''orientation utilisateur public', 'completion', 100, true, 1),
  ('law-enforcement-essentials', 'le-certified', 'LE Certified Officer', 'Agent Certifie', 'Completed law enforcement certification', 'A complete la certification des forces de l''ordre', 'completion', 500, true, 2),
  ('admin-certification', 'system-admin', 'Certified System Administrator', 'Administrateur Systeme Certifie', 'Completed administrator certification', 'A complete la certification administrateur', 'completion', 750, true, 3),
  (NULL, 'first-steps', 'First Steps', 'Premiers Pas', 'Started your first training module', 'A commence votre premier module de formation', 'milestone', 25, true, 4),
  (NULL, 'quick-learner', 'Quick Learner', 'Apprenant Rapide', 'Completed a module in under 10 minutes', 'A complete un module en moins de 10 minutes', 'achievement', 50, true, 5),
  (NULL, 'perfect-score', 'Perfect Score', 'Score Parfait', 'Achieved 100% on a quiz', 'A obtenu 100% a un quiz', 'achievement', 100, true, 6)
) AS b(track_slug, slug, name, name_fr, description, description_fr, badge_type, points, is_public, display_order)
ON t.slug = b.track_slug;

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
