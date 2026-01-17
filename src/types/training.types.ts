/**
 * Training & Onboarding Module Types
 * LC-FEAT-023: Training system for public users, law enforcement, and administrators
 */

// =============================================================================
// ENUMS
// =============================================================================

export type TrainingAudience = "public" | "law_enforcement" | "admin" | "all";

export type TrainingContentType =
  | "lesson"
  | "video"
  | "interactive"
  | "quiz"
  | "walkthrough";

export type TrainingStatus = "draft" | "published" | "archived";

export type ProgressStatus = "not_started" | "in_progress" | "completed";

export type CertificationStatus = "active" | "expired" | "revoked";

export type BadgeType = "completion" | "achievement" | "milestone";

export type QuestionType = "multiple_choice" | "true_false" | "multi_select";

// =============================================================================
// CONTENT STRUCTURES
// =============================================================================

export interface LessonSection {
  type: "text" | "heading" | "list" | "callout" | "image" | "code";
  content?: string;
  items?: string[];
  variant?: "info" | "warning" | "success" | "danger";
  imageUrl?: string;
  caption?: string;
  level?: 1 | 2 | 3;
}

export interface LessonContent {
  sections: LessonSection[];
}

export interface InteractiveStep {
  title: string;
  content: string;
  action?: "highlight" | "form-demo" | "upload-demo" | "submit-demo" | "click";
  target?: string;
  completionCriteria?: string;
}

export interface InteractiveContent {
  steps: InteractiveStep[];
}

export interface QuizOption {
  id: number;
  text: string;
}

// =============================================================================
// CORE ENTITIES
// =============================================================================

export interface TrainingTrack {
  id: string;
  slug: string;
  title: string;
  titleFr?: string;
  description?: string;
  descriptionFr?: string;
  audience: TrainingAudience;
  icon?: string;
  color?: string;
  estimatedDurationMinutes: number;
  isRequired: boolean;
  isCertificationTrack: boolean;
  certificationValidDays?: number;
  passPercentage: number;
  displayOrder: number;
  status: TrainingStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  modules?: TrainingModule[];
  badge?: TrainingBadge;
}

export interface TrainingModule {
  id: string;
  trackId: string;
  slug: string;
  title: string;
  titleFr?: string;
  description?: string;
  descriptionFr?: string;
  estimatedDurationMinutes: number;
  displayOrder: number;
  isRequired: boolean;
  prerequisites: string[]; // Module IDs
  status: TrainingStatus;
  createdAt: string;
  updatedAt: string;
  // Relations
  track?: TrainingTrack;
  lessons?: TrainingLesson[];
  quizzes?: TrainingQuiz[];
}

export interface TrainingLesson {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  titleFr?: string;
  contentType: TrainingContentType;
  content: LessonContent | InteractiveContent | Record<string, unknown>;
  contentFr?: LessonContent | InteractiveContent | Record<string, unknown>;
  videoUrl?: string;
  videoDurationSeconds?: number;
  estimatedDurationMinutes: number;
  displayOrder: number;
  isRequired: boolean;
  status: TrainingStatus;
  createdAt: string;
  updatedAt: string;
  // Relations
  module?: TrainingModule;
}

export interface TrainingQuiz {
  id: string;
  moduleId: string;
  title: string;
  titleFr?: string;
  description?: string;
  descriptionFr?: string;
  passPercentage: number;
  maxAttempts: number;
  timeLimitMinutes?: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showCorrectAnswers: boolean;
  displayOrder: number;
  status: TrainingStatus;
  createdAt: string;
  updatedAt: string;
  // Relations
  questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  question: string;
  questionFr?: string;
  questionType: QuestionType;
  options: QuizOption[];
  optionsFr?: QuizOption[];
  correctAnswers: number[]; // Indices of correct options
  explanation?: string;
  explanationFr?: string;
  points: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// PROGRESS TRACKING
// =============================================================================

export interface TrainingTrackProgress {
  id: string;
  userId: string;
  trackId: string;
  status: ProgressStatus;
  progressPercentage: number;
  startedAt?: string;
  completedAt?: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  track?: TrainingTrack;
}

export interface TrainingModuleProgress {
  id: string;
  userId: string;
  moduleId: string;
  status: ProgressStatus;
  progressPercentage: number;
  startedAt?: string;
  completedAt?: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  module?: TrainingModule;
}

export interface TrainingLessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  status: ProgressStatus;
  timeSpentSeconds: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  lesson?: TrainingLesson;
}

// =============================================================================
// QUIZ ATTEMPTS
// =============================================================================

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  attemptNumber: number;
  scorePercentage?: number;
  passed: boolean;
  startedAt: string;
  completedAt?: string;
  timeSpentSeconds?: number;
  createdAt: string;
  // Relations
  quiz?: TrainingQuiz;
  answers?: QuizAnswer[];
}

export interface QuizAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedAnswers: number[]; // Indices of selected options
  isCorrect?: boolean;
  pointsEarned: number;
  answeredAt: string;
  // Relations
  question?: QuizQuestion;
}

// =============================================================================
// CERTIFICATIONS
// =============================================================================

export interface TrainingCertification {
  id: string;
  userId: string;
  trackId: string;
  certificateNumber: string;
  issuedAt: string;
  expiresAt?: string;
  status: CertificationStatus;
  finalScorePercentage?: number;
  verificationHash?: string;
  pdfUrl?: string;
  metadata: Record<string, unknown>;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  track?: TrainingTrack;
}

// =============================================================================
// BADGES
// =============================================================================

export interface TrainingBadge {
  id: string;
  trackId?: string;
  slug: string;
  name: string;
  nameFr?: string;
  description?: string;
  descriptionFr?: string;
  iconUrl?: string;
  badgeType: BadgeType;
  criteria: Record<string, unknown>;
  points: number;
  isPublic: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
  certificationId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  // Relations
  badge?: TrainingBadge;
  certification?: TrainingCertification;
}

// =============================================================================
// REMINDERS
// =============================================================================

export type ReminderType = "expiring_soon" | "expired" | "refresher_due";

export interface TrainingReminder {
  id: string;
  userId: string;
  trackId: string;
  certificationId?: string;
  reminderType: ReminderType;
  reminderDate: string;
  sentAt?: string;
  dismissedAt?: string;
  notificationId?: string;
  createdAt: string;
}

// =============================================================================
// WALKTHROUGH
// =============================================================================

export interface WalkthroughProgress {
  id: string;
  userId: string;
  walkthroughId: string;
  currentStep: number;
  completedSteps: number[];
  isCompleted: boolean;
  startedAt: string;
  completedAt?: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// API TYPES
// =============================================================================

export interface TrainingTrackWithProgress extends TrainingTrack {
  progress?: TrainingTrackProgress;
  certification?: TrainingCertification;
}

export interface TrainingModuleWithProgress extends TrainingModule {
  progress?: TrainingModuleProgress;
  completedLessons: number;
  totalLessons: number;
}

export interface TrainingLessonWithProgress extends TrainingLesson {
  progress?: TrainingLessonProgress;
}

export interface TrainingDashboardData {
  tracks: TrainingTrackWithProgress[];
  recentActivity: TrainingTrackProgress[];
  certifications: TrainingCertification[];
  badges: UserBadge[];
  reminders: TrainingReminder[];
  stats: TrainingStats;
}

export interface TrainingStats {
  totalTracksCompleted: number;
  totalModulesCompleted: number;
  totalLessonsCompleted: number;
  totalTimeSpentMinutes: number;
  averageQuizScore: number;
  activeCertifications: number;
  totalBadgesEarned: number;
}

export interface QuizSubmission {
  quizId: string;
  answers: {
    questionId: string;
    selectedAnswers: number[];
  }[];
}

export interface QuizResult {
  attemptId: string;
  scorePercentage: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
  totalPoints: number;
  feedback: {
    questionId: string;
    isCorrect: boolean;
    correctAnswers: number[];
    explanation?: string;
  }[];
}

export interface LessonCompletionData {
  lessonId: string;
  timeSpentSeconds: number;
}

export interface ModuleCompletionData {
  moduleId: string;
  quizScore?: number;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface TrackCardProps {
  track: TrainingTrackWithProgress;
  onStart?: () => void;
  onContinue?: () => void;
  onViewCertificate?: () => void;
}

export interface ModuleListProps {
  modules: TrainingModuleWithProgress[];
  currentModuleId?: string;
  onSelectModule: (moduleId: string) => void;
}

export interface LessonViewerProps {
  lesson: TrainingLessonWithProgress;
  onComplete: (data: LessonCompletionData) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export interface QuizViewerProps {
  quiz: TrainingQuiz;
  questions: QuizQuestion[];
  onSubmit: (submission: QuizSubmission) => Promise<QuizResult>;
  onComplete: () => void;
}

export interface ProgressBarProps {
  percentage: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  color?: string;
}

export interface BadgeDisplayProps {
  badge: TrainingBadge;
  earned?: boolean;
  earnedAt?: string;
  size?: "sm" | "md" | "lg";
}

export interface CertificateViewProps {
  certification: TrainingCertification;
  onDownload?: () => void;
  onShare?: () => void;
}

// =============================================================================
// AUDIENCE-SPECIFIC MODULE DEFINITIONS
// =============================================================================

export interface PublicTrainingModules {
  howToFileReport: TrainingModule;
  whatInfoToGather: TrainingModule;
  workingWithLE: TrainingModule;
  privacySafety: TrainingModule;
}

export interface LETrainingModules {
  platformNavigation: TrainingModule;
  caseManagement: TrainingModule;
  integrationFeatures: TrainingModule;
  realtimeFeed: TrainingModule;
  jurisdictionCoordination: TrainingModule;
}

export interface AdminTrainingModules {
  systemConfiguration: TrainingModule;
  userManagement: TrainingModule;
  complianceMonitoring: TrainingModule;
  reportGeneration: TrainingModule;
}
