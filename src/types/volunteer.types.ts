/**
 * Volunteer Search Party Coordinator Types (LC-FEAT-027)
 * Tools for organizing and coordinating volunteer search parties
 */

export type SearchEventStatus = 'planning' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled';
export type VolunteerStatus = 'registered' | 'checked_in' | 'active' | 'checked_out' | 'no_show';
export type ZoneStatus = 'unassigned' | 'assigned' | 'in_progress' | 'cleared' | 'needs_review';
export type IncidentType = 'injury' | 'medical' | 'found_evidence' | 'possible_sighting' | 'equipment' | 'weather' | 'other';

// Status constants for API use
export const SEARCH_EVENT_STATUSES = {
  PLANNING: 'planning' as SearchEventStatus,
  REGISTRATION_OPEN: 'registration_open' as SearchEventStatus,
  IN_PROGRESS: 'in_progress' as SearchEventStatus,
  COMPLETED: 'completed' as SearchEventStatus,
  CANCELLED: 'cancelled' as SearchEventStatus,
};

export const VOLUNTEER_STATUSES = {
  REGISTERED: 'registered' as VolunteerStatus,
  CHECKED_IN: 'checked_in' as VolunteerStatus,
  ACTIVE: 'active' as VolunteerStatus,
  CHECKED_OUT: 'checked_out' as VolunteerStatus,
  NO_SHOW: 'no_show' as VolunteerStatus,
};

export interface SearchEvent {
  id: string;
  caseId: string;
  name: string;
  description?: string;
  status: SearchEventStatus;
  eventDate: string;
  startTime: string;
  endTime?: string;
  meetingPointAddress: string;
  meetingPointLat?: number;
  meetingPointLng?: number;
  searchAreaDescription?: string;
  searchAreaBounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  maxVolunteers?: number;
  currentVolunteers: number;
  minimumAge?: number;
  requiresWaiver: boolean;
  waiverUrl?: string;
  equipmentProvided: string[];
  equipmentRequired: string[];
  weatherConditions?: string;
  terrainType: string[];
  difficultyLevel: 'easy' | 'moderate' | 'difficult' | 'strenuous';
  accessibilityNotes?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  lawEnforcementLiaison?: string;
  lawEnforcementPhone?: string;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchEventInput {
  caseId: string;
  name: string;
  description?: string;
  eventDate: string;
  startTime: string;
  endTime?: string;
  meetingPointAddress: string;
  meetingPointLat?: number;
  meetingPointLng?: number;
  searchAreaDescription?: string;
  maxVolunteers?: number;
  minimumAge?: number;
  requiresWaiver?: boolean;
  equipmentProvided?: string[];
  equipmentRequired?: string[];
  terrainType?: string[];
  difficultyLevel?: 'easy' | 'moderate' | 'difficult' | 'strenuous';
  accessibilityNotes?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface SearchVolunteer {
  id: string;
  eventId: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  status: VolunteerStatus;
  registeredAt: string;
  checkedInAt?: string;
  checkedInBy?: string;
  checkedOutAt?: string;
  assignedZoneId?: string;
  buddyId?: string;
  hasSignedWaiver: boolean;
  waiverSignedAt?: string;
  hasCompletedBriefing: boolean;
  briefingCompletedAt?: string;
  specialSkills: string[];
  hasFirstAidTraining: boolean;
  hasSARTraining: boolean;
  physicalLimitations?: string;
  equipmentBrought: string[];
  notes?: string;
  lastGpsLat?: number;
  lastGpsLng?: number;
  lastGpsUpdate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchZone {
  id: string;
  eventId: string;
  zoneName: string;
  zoneCode: string;
  description?: string;
  status: ZoneStatus;
  priority: 'high' | 'medium' | 'low';
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  polygonCoords?: { lat: number; lng: number }[];
  terrainType: string[];
  estimatedSearchTimeMinutes?: number;
  assignedTeamId?: string;
  assignedVolunteerIds: string[];
  teamLeaderId?: string;
  searchStartedAt?: string;
  searchCompletedAt?: string;
  coveragePercentage?: number;
  notes?: string;
  findings: ZoneFinding[];
  createdAt: string;
  updatedAt: string;
}

export interface ZoneFinding {
  id: string;
  zoneId: string;
  findingType: 'evidence' | 'poi' | 'note' | 'hazard';
  description: string;
  lat?: number;
  lng?: number;
  photoUrls: string[];
  reportedBy: string;
  reportedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  isSignificant: boolean;
  forwardedToLE: boolean;
  forwardedAt?: string;
}

export interface SearchTeam {
  id: string;
  eventId: string;
  teamName: string;
  teamLeaderId: string;
  memberIds: string[];
  assignedZoneIds: string[];
  radioChannel?: string;
  status: 'standby' | 'deployed' | 'returning' | 'debriefing';
  deployedAt?: string;
  returnedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined relations
  leader?: SearchVolunteer;
  members?: SearchVolunteer[];
}

export interface SafetyBriefingItem {
  id: string;
  eventId: string;
  orderNumber: number;
  title: string;
  content: string;
  isRequired: boolean;
  requiresAcknowledgment: boolean;
  category: 'safety' | 'protocol' | 'communication' | 'legal' | 'weather';
}

export interface VolunteerCheckIn {
  id: string;
  eventId: string;
  volunteerId: string;
  checkInTime: string;
  checkInLocation?: { lat: number; lng: number };
  checkInType: 'manual' | 'automatic' | 'sos_response';
  notes?: string;
}

export interface SearchIncident {
  id: string;
  eventId: string;
  incidentType: IncidentType;
  severity: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  location?: { lat: number; lng: number };
  reportedBy: string;
  reportedAt: string;
  affectedVolunteerIds: string[];
  responseActions: string[];
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  requiresFollowUp: boolean;
  followUpNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SOSAlert {
  id: string;
  eventId: string;
  volunteerId: string;
  volunteerName: string;
  lat: number;
  lng: number;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'false_alarm';
  notes?: string;
}

export interface SearchEventStats {
  eventId: string;
  totalRegistered: number;
  totalCheckedIn: number;
  totalActive: number;
  totalCheckedOut: number;
  totalNoShow: number;
  zonesTotal: number;
  zonesCleared: number;
  zonesInProgress: number;
  coveragePercentage: number;
  findingsCount: number;
  significantFindingsCount: number;
  incidentsCount: number;
  sosAlertsCount: number;
  searchDurationMinutes: number;
}

export interface VolunteerGPSPosition {
  volunteerId: string;
  volunteerName: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: string;
  batteryLevel?: number;
  isActive: boolean;
}

export interface SearchEventDashboard {
  event: SearchEvent;
  stats: SearchEventStats;
  zones: SearchZone[];
  teams: SearchTeam[];
  activeVolunteers: SearchVolunteer[];
  volunteerPositions: VolunteerGPSPosition[];
  activeSOSAlerts: SOSAlert[];
  recentIncidents: SearchIncident[];
  weatherForecast?: {
    condition: string;
    temperature: number;
    windSpeed: number;
    precipitation: number;
    sunrise: string;
    sunset: string;
  };
}

// Display helpers
export const EVENT_STATUS_LABELS: Record<SearchEventStatus, string> = {
  planning: 'Planning',
  registration_open: 'Registration Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const VOLUNTEER_STATUS_LABELS: Record<VolunteerStatus, string> = {
  registered: 'Registered',
  checked_in: 'Checked In',
  active: 'Active in Field',
  checked_out: 'Checked Out',
  no_show: 'No Show',
};

export const ZONE_STATUS_LABELS: Record<ZoneStatus, string> = {
  unassigned: 'Unassigned',
  assigned: 'Assigned',
  in_progress: 'Search in Progress',
  cleared: 'Cleared',
  needs_review: 'Needs Review',
};

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  injury: 'Injury',
  medical: 'Medical Emergency',
  found_evidence: 'Found Evidence',
  possible_sighting: 'Possible Sighting',
  equipment: 'Equipment Issue',
  weather: 'Weather Related',
  other: 'Other',
};
