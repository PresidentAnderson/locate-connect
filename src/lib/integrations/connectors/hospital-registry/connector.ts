/**
 * Hospital Registry Connector
 * Connects to hospital registries to search for John/Jane Doe patients
 */

import { BaseConnector, type BaseConnectorOptions } from '../../connector-framework';
import type {
  ConnectorRequest,
  ConnectorResponse,
  HealthCheckResult,
  HospitalPatientMatch,
  HospitalRegistryConfig,
} from '@/types';

export interface PatientSearchParams {
  caseId: string;
  description?: {
    ageRange?: string;
    gender?: string;
    height?: string;
    weight?: string;
    hairColor?: string;
    eyeColor?: string;
    distinguishingMarks?: string;
  };
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  location?: {
    region?: string;
    hospital?: string;
  };
}

export interface PatientSearchResult {
  matches: HospitalPatientMatch[];
  searchId: string;
  totalResults: number;
  searchedHospitals: number;
}

/**
 * Hospital Registry Connector
 */
export class HospitalRegistryConnector extends BaseConnector {
  private hospitalConfig?: HospitalRegistryConfig;

  constructor(options: BaseConnectorOptions) {
    super(options);
    this.hospitalConfig = options.config.customConfig as HospitalRegistryConfig | undefined;
  }

  /**
   * Search for potential patient matches
   */
  async searchPatients(params: PatientSearchParams): Promise<PatientSearchResult> {
    const response = await this.execute<PatientSearchResult>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/patients/search',
      body: {
        caseId: params.caseId,
        criteria: {
          physicalDescription: params.description,
          admissionDateRange: params.dateRange,
          location: params.location,
          patientType: 'unidentified', // John/Jane Doe
        },
      },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Patient search failed');
    }

    return response.data!;
  }

  /**
   * Get details for a specific match
   */
  async getMatchDetails(matchId: string): Promise<HospitalPatientMatch> {
    const response = await this.execute<HospitalPatientMatch>({
      id: crypto.randomUUID(),
      method: 'GET',
      path: `/api/v1/matches/${matchId}`,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get match details');
    }

    return response.data!;
  }

  /**
   * Request additional information for a match
   */
  async requestInformation(
    matchId: string,
    request: {
      type: 'photos' | 'medical_records' | 'contact_info';
      reason: string;
      caseId: string;
      requestorId: string;
    }
  ): Promise<{ requestId: string; status: string }> {
    const response = await this.execute<{ requestId: string; status: string }>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: `/api/v1/matches/${matchId}/information-request`,
      body: request,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Information request failed');
    }

    return response.data!;
  }

  /**
   * Update match verification status
   */
  async updateVerificationStatus(
    matchId: string,
    status: 'verified' | 'rejected',
    notes?: string
  ): Promise<void> {
    const response = await this.execute({
      id: crypto.randomUUID(),
      method: 'PATCH',
      path: `/api/v1/matches/${matchId}/verification`,
      body: { status, notes },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Verification update failed');
    }
  }

  /**
   * Subscribe to real-time patient alerts
   */
  async subscribeToAlerts(
    caseId: string,
    criteria: PatientSearchParams['description']
  ): Promise<{ subscriptionId: string }> {
    const response = await this.execute<{ subscriptionId: string }>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/alerts/subscribe',
      body: { caseId, criteria },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Alert subscription failed');
    }

    return response.data!;
  }

  /**
   * Health check for hospital registry
   */
  protected async doHealthCheck(): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Health check failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 'healthy') {
      throw new Error(`Registry unhealthy: ${data.message}`);
    }
  }
}

/**
 * Create a hospital registry connector
 */
export function createHospitalRegistryConnector(
  options: BaseConnectorOptions
): HospitalRegistryConnector {
  return new HospitalRegistryConnector(options);
}
