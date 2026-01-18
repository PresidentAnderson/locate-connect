/**
 * Morgue/Coroner Registry Connector
 * Connects to morgue and coroner registries for unidentified remains matching
 */

import { BaseConnector, type BaseConnectorOptions } from '../../connector-framework';
import type {
  UnidentifiedRemainsMatch,
  MorgueRegistryConfig,
} from '@/types';

export interface RemainsSearchParams {
  caseId: string;
  description?: {
    estimatedAge?: string;
    gender?: string;
    height?: string;
    weight?: string;
    hairColor?: string;
    eyeColor?: string;
    dentalInfo?: string;
    distinguishingMarks?: string;
    tattoos?: string;
  };
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  location?: {
    region?: string;
    jurisdiction?: string;
    radius?: number; // km
  };
  matchTypes?: ('dna' | 'dental' | 'physical' | 'circumstantial')[];
}

export interface RemainsSearchResult {
  matches: UnidentifiedRemainsMatch[];
  searchId: string;
  totalResults: number;
  searchedJurisdictions: string[];
}

export interface DNAComparisonRequest {
  caseId: string;
  sampleType: 'familial' | 'direct';
  sampleInfo: {
    collectionDate: string;
    collector: string;
    labReference?: string;
  };
  remainsId: string;
}

/**
 * Morgue Registry Connector
 */
export class MorgueRegistryConnector extends BaseConnector {
  private morgueConfig?: MorgueRegistryConfig;

  constructor(options: BaseConnectorOptions) {
    super(options);
    this.morgueConfig = options.config.customConfig as MorgueRegistryConfig | undefined;
  }

  /**
   * Search for potential remains matches
   */
  async searchRemains(params: RemainsSearchParams): Promise<RemainsSearchResult> {
    const response = await this.execute<RemainsSearchResult>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/remains/search',
      body: {
        caseId: params.caseId,
        physicalDescription: params.description,
        discoveryDateRange: params.dateRange,
        location: params.location,
        matchTypes: params.matchTypes || ['physical', 'circumstantial'],
        requestingJurisdiction: this.morgueConfig?.jurisdiction,
      },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Remains search failed');
    }

    return response.data!;
  }

  /**
   * Get details for a specific match
   */
  async getMatchDetails(matchId: string): Promise<UnidentifiedRemainsMatch> {
    const response = await this.execute<UnidentifiedRemainsMatch>({
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
   * Request DNA comparison
   */
  async requestDNAComparison(
    request: DNAComparisonRequest
  ): Promise<{ comparisonId: string; status: string; estimatedTime?: string }> {
    const response = await this.execute<{
      comparisonId: string;
      status: string;
      estimatedTime?: string;
    }>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/dna/comparison-request',
      body: {
        ...request,
        requestingJurisdiction: this.morgueConfig?.jurisdiction,
      },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'DNA comparison request failed');
    }

    return response.data!;
  }

  /**
   * Get DNA comparison status
   */
  async getDNAComparisonStatus(
    comparisonId: string
  ): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: 'match' | 'no_match' | 'inconclusive';
    confidence?: number;
    completedAt?: string;
  }> {
    const response = await this.execute<{
      status: 'pending' | 'processing' | 'completed' | 'failed';
      result?: 'match' | 'no_match' | 'inconclusive';
      confidence?: number;
      completedAt?: string;
    }>({
      id: crypto.randomUUID(),
      method: 'GET',
      path: `/api/v1/dna/comparison/${comparisonId}`,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get comparison status');
    }

    return response.data!;
  }

  /**
   * Request dental records comparison
   */
  async requestDentalComparison(request: {
    caseId: string;
    remainsId: string;
    dentalRecords: string; // URL or reference
    notes?: string;
  }): Promise<{ comparisonId: string }> {
    const response = await this.execute<{ comparisonId: string }>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/dental/comparison-request',
      body: request,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Dental comparison request failed');
    }

    return response.data!;
  }

  /**
   * Update match verification status
   */
  async updateVerificationStatus(
    matchId: string,
    status: 'verified' | 'excluded' | 'confirmed',
    evidence?: {
      type: 'dna' | 'dental' | 'visual' | 'other';
      details: string;
    }
  ): Promise<void> {
    const response = await this.execute({
      id: crypto.randomUUID(),
      method: 'PATCH',
      path: `/api/v1/matches/${matchId}/verification`,
      body: { status, evidence },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Verification update failed');
    }
  }

  /**
   * Subscribe to new remains alerts
   */
  async subscribeToAlerts(
    caseId: string,
    criteria: RemainsSearchParams['description']
  ): Promise<{ subscriptionId: string }> {
    const response = await this.execute<{ subscriptionId: string }>({
      id: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/alerts/subscribe',
      body: {
        caseId,
        criteria,
        jurisdiction: this.morgueConfig?.jurisdiction,
      },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Alert subscription failed');
    }

    return response.data!;
  }

  /**
   * Health check for morgue registry
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
 * Create a morgue registry connector
 */
export function createMorgueRegistryConnector(
  options: BaseConnectorOptions
): MorgueRegistryConnector {
  return new MorgueRegistryConnector(options);
}
