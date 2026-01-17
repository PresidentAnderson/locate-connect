/**
 * Law Enforcement Services Module
 * Export all law enforcement panel services
 */

// Lead Management
export {
  leadManagementService,
  type CreateLeadInput,
  type UpdateLeadInput,
  type LeadFilters,
  type LeadListResult,
} from "../lead-management-service";

// Voice Memos
export {
  voiceMemoService,
  type CreateVoiceMemoInput,
  type VoiceMemoFilters,
} from "../voice-memo-service";

// Geofencing
export {
  geofencingService,
  type CreateGeofenceInput,
  type LocationUpdate,
} from "../geofencing-service";

// Vehicle Tracking
export {
  vehicleTrackingService,
  type CreateVehicleInput,
  type ReportSightingInput,
  type CreateAlertInput,
} from "../vehicle-tracking-service";

// Campaign Management
export {
  campaignService,
  type CreateCampaignInput,
  type UpdateCampaignInput,
} from "../campaign-service";

// Shift Handoffs
export {
  shiftHandoffService,
  type CreateHandoffInput,
  type HandoffFilters,
} from "../shift-handoff-service";

// Case Dispositions
export {
  dispositionService,
  type CreateDispositionInput,
} from "../disposition-service";

// Volunteer Coordinator
export {
  volunteerCoordinatorService,
  type CreateSearchPartyInput,
  type RegisterVolunteerInput,
  type ReportFindingInput,
} from "../volunteer-coordinator-service";

// Voice Commands
export {
  voiceCommandsService,
} from "../voice-commands-service";
