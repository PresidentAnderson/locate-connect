/**
 * Family Liaison & Support Resources Types (LC-FEAT-029)
 * Comprehensive support system for families of missing persons
 */

export type LiaisonType = 'law_enforcement' | 'social_worker' | 'volunteer' | 'advocate';
export type ResourceCategory = 'mental_health' | 'financial' | 'legal' | 'media' | 'peer_support' | 'grief' | 'practical';
export type CheckInFrequency = 'daily' | 'every_other_day' | 'weekly' | 'biweekly' | 'monthly' | 'as_needed';
export type SupportGroupType = 'in_person' | 'virtual' | 'hybrid';

export interface FamilyLiaison {
  id: string;
  caseId: string;
  userId: string;
  liaisonType: LiaisonType;
  isPrimary: boolean;
  assignedAt: string;
  assignedBy: string;
  unassignedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined relations
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    organization?: string;
    title?: string;
  };
}

export interface FamilyContact {
  id: string;
  caseId: string;
  relationship: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  isPrimaryContact: boolean;
  preferredContactMethod: 'email' | 'phone' | 'sms' | 'in_person';
  preferredLanguage: string;
  accessibilityNeeds?: string;
  notificationPreferences: {
    caseUpdates: boolean;
    mediaAlerts: boolean;
    checkInReminders: boolean;
    resourceSuggestions: boolean;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledCheckIn {
  id: string;
  caseId: string;
  familyContactId: string;
  liaisonId: string;
  frequency: CheckInFrequency;
  scheduledDate: string;
  scheduledTime?: string;
  contactMethod: 'phone' | 'video' | 'in_person' | 'email';
  status: 'scheduled' | 'completed' | 'missed' | 'rescheduled' | 'cancelled';
  completedAt?: string;
  notes?: string;
  followUpRequired: boolean;
  followUpNotes?: string;
  nextCheckInDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportResource {
  id: string;
  name: string;
  nameFr?: string;
  category: ResourceCategory;
  subcategory?: string;
  description: string;
  descriptionFr?: string;
  organizationName?: string;
  website?: string;
  phone?: string;
  tollFreePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  servesProvinces: string[];
  servesNationally: boolean;
  isAvailable24_7: boolean;
  operatingHours?: string;
  languages: string[];
  eligibilityNotes?: string;
  costInfo?: string;
  isFree: boolean;
  isVerified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  tags: string[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupportGroup {
  id: string;
  name: string;
  description?: string;
  groupType: SupportGroupType;
  category: 'missing_persons_families' | 'grief_support' | 'trauma_survivors' | 'general';
  organizationName?: string;
  facilitatorName?: string;
  facilitatorCredentials?: string;
  meetingFrequency: string;
  meetingDay?: string;
  meetingTime?: string;
  timezone?: string;
  location?: string;
  virtualPlatform?: string;
  virtualLink?: string;
  maxParticipants?: number;
  currentParticipants?: number;
  isOpenEnrollment: boolean;
  registrationRequired: boolean;
  registrationUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  servesProvinces: string[];
  languages: string[];
  isFree: boolean;
  costInfo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PeerSupportMatch {
  id: string;
  seekingFamilyContactId: string;
  supportingFamilyContactId: string;
  matchedAt: string;
  matchedBy?: string;
  status: 'pending' | 'active' | 'paused' | 'ended';
  supportType: 'phone' | 'email' | 'in_person' | 'virtual';
  frequencyPreference?: string;
  notes?: string;
  endedAt?: string;
  endReason?: string;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
  // Joined relations
  seekingFamily?: FamilyContact;
  supportingFamily?: FamilyContact;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  nameFr?: string;
  templateType: 'missing_poster' | 'press_release' | 'social_media' | 'flyer' | 'thank_you' | 'update';
  description?: string;
  content: string;
  contentFr?: string;
  placeholders: string[];
  thumbnailUrl?: string;
  fileFormat: 'docx' | 'pdf' | 'png' | 'html';
  isDefault: boolean;
  category?: string;
  createdBy?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedDocument {
  id: string;
  caseId: string;
  templateId: string;
  templateName: string;
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  generatedBy: string;
  generatedAt: string;
  placeholderValues: Record<string, string>;
  notes?: string;
}

export interface FamilyMessage {
  id: string;
  caseId: string;
  senderId: string;
  senderType: 'liaison' | 'family' | 'system';
  recipientId?: string;
  subject?: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  isUrgent: boolean;
  attachments: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }[];
  createdAt: string;
}

export interface CaseProgressReport {
  id: string;
  caseId: string;
  reportType: 'weekly' | 'monthly' | 'milestone' | 'custom';
  periodStart: string;
  periodEnd: string;
  summary: string;
  activitiesCompleted: string[];
  leadsFollowed: number;
  tipsReceived: number;
  mediaOutreach?: string;
  upcomingActivities: string[];
  familyQuestions: string[];
  questionsAnswered: string[];
  generatedBy: string;
  generatedAt: string;
  sentToFamily: boolean;
  sentAt?: string;
  familyFeedback?: string;
}

export interface FamilySupportDashboard {
  caseId: string;
  primaryLiaison?: FamilyLiaison;
  familyContacts: FamilyContact[];
  upcomingCheckIns: ScheduledCheckIn[];
  recentMessages: FamilyMessage[];
  recommendedResources: SupportResource[];
  availableSupportGroups: SupportGroup[];
  peerMatches: PeerSupportMatch[];
  recentDocuments: GeneratedDocument[];
  progressReports: CaseProgressReport[];
}

// Display helpers
export const LIAISON_TYPE_LABELS: Record<LiaisonType, string> = {
  law_enforcement: 'Law Enforcement Officer',
  social_worker: 'Social Worker',
  volunteer: 'Trained Volunteer',
  advocate: 'Victim Advocate',
};

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  mental_health: 'Mental Health',
  financial: 'Financial Assistance',
  legal: 'Legal Aid',
  media: 'Media & Communication',
  peer_support: 'Peer Support',
  grief: 'Grief Counseling',
  practical: 'Practical Support',
};

export const CHECK_IN_FREQUENCY_LABELS: Record<CheckInFrequency, string> = {
  daily: 'Daily',
  every_other_day: 'Every Other Day',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  as_needed: 'As Needed',
};
