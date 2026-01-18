/**
 * External Service Connectors
 * Specific connectors for healthcare, border, morgue, and transit integrations
 */

export {
  HospitalRegistryConnector,
  createHospitalRegistryConnector,
  type PatientSearchParams,
  type PatientSearchResult,
} from './hospital-registry/connector';

export {
  BorderServicesConnector,
  createBorderServicesConnector,
  type WatchlistEntry,
  type CrossingSearchParams,
  type CrossingSearchResult,
} from './border-services/connector';

export {
  MorgueRegistryConnector,
  createMorgueRegistryConnector,
  type RemainsSearchParams,
  type RemainsSearchResult,
  type DNAComparisonRequest,
} from './morgue-registry/connector';

export {
  TransitAuthorityConnector,
  createTransitAuthorityConnector,
  type SightingSearchParams,
  type SightingSearchResult,
  type CameraAccessRequest,
} from './transit-authority/connector';
