/**
 * Border Services Connector
 * Connects to border services (CBSA/ICE/CBP) for crossing detection
 */

import { BaseConnector, type BaseConnectorOptions } from '../../connector-framework';
import type {
  ConnectorResponse,
  BorderCrossingAlert,
  BorderServicesConfig,
} from '@/types';

export interface WatchlistEntry {
  caseId: string;
  personName?: string;
  dateOfBirth?: string;
  passportNumbers?: string[];
  otherDocuments?: string[];
  physicalDescription?: {
    height?: string;
    weight?: string;
    hairColor?: string;
    eyeColor?: string;
    distinguishingMarks?: string;
  };
  alertLevel: 'critical' | 'high' | 'medium' | 'low';
  notes?: string;
}

export interface CrossingSearchParams {
  caseId: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  portOfEntry?: string;
  direction?: 'inbound' | 'outbound' | 'both';
  country?: string;
}

export interface CrossingSearchResult {
  crossings: BorderCrossingAlert[];
  searchId: string;
  totalResults: number;
}

/**
 * Border Services Connector
 */
export class BorderServicesConnector extends BaseConnector {
  private borderConfig?: BorderServicesConfig;

  constructor(options: BaseConnectorOptions) {
    super(options);
    this.borderConfig = options.config.customConfig as BorderServicesConfig | undefined;
  }

  /**
   * Add a person to the watchlist
   */
  async addToWatchlist(entry: WatchlistEntry): Promise<{ watchlistId: string }> {
    const response = await this.execute<{ watchlistId: string }>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/watchlist',
      body: {
        ...entry,
        agency: this.borderConfig?.agency,
        requestingJurisdiction: this.borderConfig?.region,
      },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to add to watchlist');
    }

    return response.data!;
  }

  /**
   * Remove from watchlist
   */
  async removeFromWatchlist(watchlistId: string, reason: string): Promise<void> {
    const response = await this.execute({
      id: crypto.randomUUID(),
      method: 'DELETE',
      path: `/api/v1/watchlist/${watchlistId}`,
      body: { reason },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to remove from watchlist');
    }
  }

  /**
   * Update watchlist entry
   */
  async updateWatchlist(
    watchlistId: string,
    updates: Partial<WatchlistEntry>
  ): Promise<void> {
    const response = await this.execute({
      id: crypto.randomUUID(),
      method: 'PATCH',
      path: `/api/v1/watchlist/${watchlistId}`,
      body: updates,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update watchlist');
    }
  }

  /**
   * Search for border crossings
   */
  async searchCrossings(params: CrossingSearchParams): Promise<CrossingSearchResult> {
    const response = await this.execute<CrossingSearchResult>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/crossings/search',
      body: {
        caseId: params.caseId,
        dateRange: params.dateRange,
        portOfEntry: params.portOfEntry,
        direction: params.direction || 'both',
        country: params.country,
        agency: this.borderConfig?.agency,
      },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Crossing search failed');
    }

    return response.data!;
  }

  /**
   * Get crossing alert details
   */
  async getAlertDetails(alertId: string): Promise<BorderCrossingAlert> {
    const response = await this.execute<BorderCrossingAlert>({
      id: crypto.randomUUID(),
      method: 'GET',
      path: `/api/v1/alerts/${alertId}`,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get alert details');
    }

    return response.data!;
  }

  /**
   * Acknowledge a crossing alert
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgement: {
      userId: string;
      action: string;
      notes?: string;
    }
  ): Promise<void> {
    const response = await this.execute({
      id: crypto.randomUUID(),
      method: 'POST',
      path: `/api/v1/alerts/${alertId}/acknowledge`,
      body: acknowledgement,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to acknowledge alert');
    }
  }

  /**
   * Request international coordination
   */
  async requestCoordination(request: {
    caseId: string;
    targetCountry: string;
    urgency: 'routine' | 'urgent' | 'emergency';
    details: string;
    contactInfo: {
      name: string;
      agency: string;
      phone: string;
      email: string;
    };
  }): Promise<{ coordinationId: string; status: string }> {
    const response = await this.execute<{ coordinationId: string; status: string }>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/coordination/request',
      body: {
        ...request,
        originAgency: this.borderConfig?.agency,
        originRegion: this.borderConfig?.region,
      },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Coordination request failed');
    }

    return response.data!;
  }

  /**
   * Subscribe to real-time crossing alerts
   */
  async subscribeToAlerts(caseId: string): Promise<{ subscriptionId: string }> {
    const response = await this.execute<{ subscriptionId: string }>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/alerts/subscribe',
      body: {
        caseId,
        agency: this.borderConfig?.agency,
      },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Alert subscription failed');
    }

    return response.data!;
  }

  /**
   * Health check for border services
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
 * Create a border services connector
 */
export function createBorderServicesConnector(
  options: BaseConnectorOptions
): BorderServicesConnector {
  return new BorderServicesConnector(options);
}
