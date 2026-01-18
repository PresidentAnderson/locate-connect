/**
 * Response Aggregator
 * Aggregates responses from multiple integrations
 */

import type { AggregationConfig, ConnectorResponse } from '@/types';

export interface AggregationResult<T = unknown> {
  success: boolean;
  data: T;
  sources: Array<{
    integrationId: string;
    success: boolean;
    contributedFields?: string[];
  }>;
  metadata: {
    aggregationType: AggregationConfig['type'];
    totalSources: number;
    successfulSources: number;
    timestamp: string;
  };
}

/**
 * Response Aggregator Service
 */
export class ResponseAggregator {
  /**
   * Aggregate responses from multiple integrations
   */
  aggregate<T>(
    responses: Array<{
      integrationId: string;
      response: ConnectorResponse<unknown>;
    }>,
    config: AggregationConfig = { type: 'merge' }
  ): AggregationResult<T> {
    const successfulResponses = responses.filter((r) => r.response.success);

    let data: T;
    const sources: AggregationResult['sources'] = [];

    switch (config.type) {
      case 'first':
        data = this.aggregateFirst<T>(successfulResponses, sources);
        break;

      case 'all':
        data = this.aggregateAll<T>(successfulResponses, sources);
        break;

      case 'merge':
        data = this.aggregateMerge<T>(
          successfulResponses,
          sources,
          config.mergeStrategy || 'shallow'
        );
        break;

      case 'custom':
        data = this.aggregateCustom<T>(
          successfulResponses,
          sources,
          config.customAggregator
        );
        break;

      default:
        data = this.aggregateMerge<T>(successfulResponses, sources, 'shallow');
    }

    // Apply deduplication if configured
    if (config.deduplicationField && Array.isArray(data)) {
      data = this.deduplicate(data, config.deduplicationField) as unknown as T;
    }

    return {
      success: successfulResponses.length > 0,
      data,
      sources,
      metadata: {
        aggregationType: config.type,
        totalSources: responses.length,
        successfulSources: successfulResponses.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Aggregate using "first successful" strategy
   */
  private aggregateFirst<T>(
    responses: Array<{
      integrationId: string;
      response: ConnectorResponse<unknown>;
    }>,
    sources: AggregationResult['sources']
  ): T {
    if (responses.length === 0) {
      return null as unknown as T;
    }

    const first = responses[0];
    sources.push({
      integrationId: first.integrationId,
      success: true,
    });

    return first.response.data as T;
  }

  /**
   * Aggregate using "all" strategy (returns array)
   */
  private aggregateAll<T>(
    responses: Array<{
      integrationId: string;
      response: ConnectorResponse<unknown>;
    }>,
    sources: AggregationResult['sources']
  ): T {
    const results: unknown[] = [];

    for (const { integrationId, response } of responses) {
      results.push(response.data);
      sources.push({
        integrationId,
        success: true,
      });
    }

    return results as unknown as T;
  }

  /**
   * Aggregate using "merge" strategy
   */
  private aggregateMerge<T>(
    responses: Array<{
      integrationId: string;
      response: ConnectorResponse<unknown>;
    }>,
    sources: AggregationResult['sources'],
    strategy: AggregationConfig['mergeStrategy']
  ): T {
    if (responses.length === 0) {
      return {} as T;
    }

    let result: Record<string, unknown> = {};

    for (const { integrationId, response } of responses) {
      const data = response.data as Record<string, unknown>;

      if (data && typeof data === 'object') {
        const contributedFields: string[] = [];

        switch (strategy) {
          case 'shallow':
            for (const key of Object.keys(data)) {
              if (result[key] === undefined) {
                result[key] = data[key];
                contributedFields.push(key);
              }
            }
            break;

          case 'deep':
            result = this.deepMerge(result, data, contributedFields);
            break;

          case 'array':
            for (const key of Object.keys(data)) {
              if (result[key] === undefined) {
                result[key] = [data[key]];
                contributedFields.push(key);
              } else if (Array.isArray(result[key])) {
                (result[key] as unknown[]).push(data[key]);
                contributedFields.push(key);
              }
            }
            break;
        }

        sources.push({
          integrationId,
          success: true,
          contributedFields,
        });
      }
    }

    return result as unknown as T;
  }

  /**
   * Aggregate using custom strategy
   */
  private aggregateCustom<T>(
    responses: Array<{
      integrationId: string;
      response: ConnectorResponse<unknown>;
    }>,
    sources: AggregationResult['sources'],
    aggregatorId?: string
  ): T {
    // Custom aggregators would be registered and looked up here
    // For now, fall back to merge
    console.warn(
      `[ResponseAggregator] Custom aggregator '${aggregatorId}' not found, using merge`
    );
    return this.aggregateMerge<T>(responses, sources, 'shallow');
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
    contributedFields: string[]
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (source[key] === undefined) {
        continue;
      }

      if (result[key] === undefined) {
        result[key] = source[key];
        contributedFields.push(key);
      } else if (
        typeof result[key] === 'object' &&
        typeof source[key] === 'object' &&
        !Array.isArray(result[key]) &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(
          result[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>,
          contributedFields
        );
      }
    }

    return result;
  }

  /**
   * Deduplicate an array based on a field
   */
  private deduplicate<T>(items: T[], field: string): T[] {
    const seen = new Set<unknown>();
    return items.filter((item) => {
      const value = this.getFieldValue(item, field);
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  /**
   * Get field value from an object
   */
  private getFieldValue(obj: unknown, field: string): unknown {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }

    const parts = field.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}

// Singleton instance
let aggregatorInstance: ResponseAggregator | null = null;

export function getResponseAggregator(): ResponseAggregator {
  if (!aggregatorInstance) {
    aggregatorInstance = new ResponseAggregator();
  }
  return aggregatorInstance;
}
