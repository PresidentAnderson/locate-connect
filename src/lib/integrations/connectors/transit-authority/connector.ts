/**
 * Transit Authority Connector
 * Connects to transit authority systems (STM, etc.) for sighting access
 */

import { BaseConnector, type BaseConnectorOptions } from '../../connector-framework';
import type {
  TransitSighting,
  TransitAuthorityConfig,
} from '@/types';

export interface SightingSearchParams {
  caseId: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  location?: {
    stations?: string[];
    lines?: string[];
    area?: {
      latitude: number;
      longitude: number;
      radiusKm: number;
    };
  };
  description?: {
    ageRange?: string;
    gender?: string;
    clothing?: string;
    accessories?: string;
    distinguishingFeatures?: string;
  };
  sightingTypes?: ('camera' | 'fare_card' | 'operator_report' | 'passenger_report')[];
}

export interface SightingSearchResult {
  sightings: TransitSighting[];
  searchId: string;
  totalResults: number;
  searchedStations: number;
}

export interface CameraAccessRequest {
  caseId: string;
  station: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  reason: string;
  requestorId: string;
  requestorAgency: string;
}

/**
 * Transit Authority Connector
 */
export class TransitAuthorityConnector extends BaseConnector {
  private transitConfig?: TransitAuthorityConfig;

  constructor(options: BaseConnectorOptions) {
    super(options);
    this.transitConfig = options.config.customConfig as TransitAuthorityConfig | undefined;
  }

  /**
   * Search for potential sightings
   */
  async searchSightings(params: SightingSearchParams): Promise<SightingSearchResult> {
    const response = await this.execute<SightingSearchResult>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/sightings/search',
      body: {
        caseId: params.caseId,
        dateRange: params.dateRange,
        location: params.location,
        description: params.description,
        sightingTypes: params.sightingTypes || ['camera', 'operator_report'],
        authority: this.transitConfig?.authority,
      },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Sighting search failed');
    }

    return response.data!;
  }

  /**
   * Get sighting details
   */
  async getSightingDetails(sightingId: string): Promise<TransitSighting> {
    const response = await this.execute<TransitSighting>({
      id: crypto.randomUUID(),
      method: 'GET',
      path: `/api/v1/sightings/${sightingId}`,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get sighting details');
    }

    return response.data!;
  }

  /**
   * Request camera footage access
   */
  async requestCameraAccess(
    request: CameraAccessRequest
  ): Promise<{
    requestId: string;
    status: 'pending' | 'approved' | 'denied';
    estimatedResponseTime?: string;
  }> {
    const response = await this.execute<{
      requestId: string;
      status: 'pending' | 'approved' | 'denied';
      estimatedResponseTime?: string;
    }>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/camera/access-request',
      body: request,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Camera access request failed');
    }

    return response.data!;
  }

  /**
   * Get camera footage URLs (after approval)
   */
  async getCameraFootage(
    requestId: string
  ): Promise<{
    status: 'available' | 'processing' | 'expired';
    clips?: Array<{
      url: string;
      timestamp: string;
      duration: number;
      station: string;
      camera: string;
      expiresAt: string;
    }>;
  }> {
    const response = await this.execute<{
      status: 'available' | 'processing' | 'expired';
      clips?: Array<{
        url: string;
        timestamp: string;
        duration: number;
        station: string;
        camera: string;
        expiresAt: string;
      }>;
    }>({
      id: crypto.randomUUID(),
      method: 'GET',
      path: `/api/v1/camera/footage/${requestId}`,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get camera footage');
    }

    return response.data!;
  }

  /**
   * Search fare card activity
   */
  async searchFareCardActivity(params: {
    caseId: string;
    fareCardId?: string;
    dateRange: {
      startDate: string;
      endDate: string;
    };
    stations?: string[];
  }): Promise<{
    activity: Array<{
      timestamp: string;
      station: string;
      type: 'entry' | 'exit' | 'transfer';
      line?: string;
    }>;
    cardId: string;
  }> {
    const response = await this.execute<{
      activity: Array<{
        timestamp: string;
        station: string;
        type: 'entry' | 'exit' | 'transfer';
        line?: string;
      }>;
      cardId: string;
    }>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/farecard/search',
      body: params,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Fare card search failed');
    }

    return response.data!;
  }

  /**
   * Report a sighting (from operator or passenger)
   */
  async reportSighting(report: {
    caseId: string;
    reporterType: 'operator' | 'passenger';
    reporterId?: string;
    location: {
      station?: string;
      line?: string;
      vehicleId?: string;
      latitude?: number;
      longitude?: number;
    };
    timestamp: string;
    description: string;
    contactInfo?: {
      phone?: string;
      email?: string;
    };
  }): Promise<{ sightingId: string }> {
    const response = await this.execute<{ sightingId: string }>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/sightings/report',
      body: {
        ...report,
        authority: this.transitConfig?.authority,
      },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Sighting report failed');
    }

    return response.data!;
  }

  /**
   * Update sighting status
   */
  async updateSightingStatus(
    sightingId: string,
    status: 'investigating' | 'verified' | 'false_positive' | 'resolved',
    notes?: string
  ): Promise<void> {
    const response = await this.execute({
      id: crypto.randomUUID(),
      method: 'PATCH',
      path: `/api/v1/sightings/${sightingId}/status`,
      body: { status, notes },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Status update failed');
    }
  }

  /**
   * Get network overview (stations, lines)
   */
  async getNetworkInfo(): Promise<{
    lines: Array<{
      id: string;
      name: string;
      color: string;
      stations: string[];
    }>;
    stations: Array<{
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      lines: string[];
      hasCamera: boolean;
    }>;
  }> {
    const response = await this.execute<{
      lines: Array<{
        id: string;
        name: string;
        color: string;
        stations: string[];
      }>;
      stations: Array<{
        id: string;
        name: string;
        latitude: number;
        longitude: number;
        lines: string[];
        hasCamera: boolean;
      }>;
    }>({
      id: crypto.randomUUID(),
      method: 'GET',
      path: '/api/v1/network/info',
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get network info');
    }

    return response.data!;
  }

  /**
   * Subscribe to real-time sighting alerts
   */
  async subscribeToAlerts(
    caseId: string,
    criteria: {
      stations?: string[];
      lines?: string[];
      description?: SightingSearchParams['description'];
    }
  ): Promise<{ subscriptionId: string }> {
    const response = await this.execute<{ subscriptionId: string }>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/alerts/subscribe',
      body: {
        caseId,
        criteria,
        authority: this.transitConfig?.authority,
      },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Alert subscription failed');
    }

    return response.data!;
  }

  /**
   * Health check for transit authority
   */
  protected async doHealthCheck(): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Health check failed: HTTP ${response.status}`);
    }
  }
}

/**
 * Create a transit authority connector
 */
export function createTransitAuthorityConnector(
  options: BaseConnectorOptions
): TransitAuthorityConnector {
  return new TransitAuthorityConnector(options);
}
