/**
 * Connector Factory
 * Factory for creating and managing external API connectors
 */

import type {
  ConnectorConfig,
  IntegrationCategory,
  DecryptedCredential,
  ConnectorMetrics,
  HealthCheckResult,
} from '@/types';
import { BaseConnector, type BaseConnectorOptions } from './base-connector';

/**
 * Connector Registry Entry
 */
interface ConnectorEntry {
  connector: BaseConnector;
  createdAt: Date;
  lastUsed?: Date;
}

/**
 * Generic Connector Implementation
 * Used when no specific connector type is available
 */
class GenericConnector extends BaseConnector {
  constructor(options: BaseConnectorOptions) {
    super(options);
  }
}

/**
 * Connector Factory
 * Creates and manages connector instances
 */
export class ConnectorFactory {
  private connectors: Map<string, ConnectorEntry> = new Map();
  private connectorTypes: Map<
    string,
    new (options: BaseConnectorOptions) => BaseConnector
  > = new Map();

  /**
   * Register a custom connector type
   */
  registerConnectorType(
    type: string,
    connectorClass: new (options: BaseConnectorOptions) => BaseConnector
  ): void {
    this.connectorTypes.set(type, connectorClass);
    console.log(`[ConnectorFactory] Registered connector type: ${type}`);
  }

  /**
   * Create a new connector
   */
  create(
    config: ConnectorConfig,
    category: IntegrationCategory
  ): BaseConnector {
    // Check if already exists
    if (this.connectors.has(config.id)) {
      const entry = this.connectors.get(config.id)!;
      entry.lastUsed = new Date();
      return entry.connector;
    }

    const options: BaseConnectorOptions = { config, category };

    // Look for registered custom type
    const typeKey = `${category}:${config.name}`;
    const ConnectorClass = this.connectorTypes.get(typeKey) || GenericConnector;

    const connector = new ConnectorClass(options);

    this.connectors.set(config.id, {
      connector,
      createdAt: new Date(),
    });

    console.log(`[ConnectorFactory] Created connector: ${config.name} (${config.id})`);

    return connector;
  }

  /**
   * Get an existing connector
   */
  get(id: string): BaseConnector | undefined {
    const entry = this.connectors.get(id);
    if (entry) {
      entry.lastUsed = new Date();
      return entry.connector;
    }
    return undefined;
  }

  /**
   * Get or create a connector
   */
  getOrCreate(
    config: ConnectorConfig,
    category: IntegrationCategory
  ): BaseConnector {
    return this.get(config.id) || this.create(config, category);
  }

  /**
   * Initialize a connector with credentials
   */
  async initialize(
    id: string,
    credential: DecryptedCredential
  ): Promise<BaseConnector> {
    const connector = this.get(id);
    if (!connector) {
      throw new Error(`Connector not found: ${id}`);
    }

    connector.setCredentials(credential);
    await connector.connect();

    return connector;
  }

  /**
   * Remove a connector
   */
  async remove(id: string): Promise<boolean> {
    const entry = this.connectors.get(id);
    if (!entry) {
      return false;
    }

    await entry.connector.disconnect();
    this.connectors.delete(id);

    console.log(`[ConnectorFactory] Removed connector: ${id}`);
    return true;
  }

  /**
   * Get all connectors
   */
  getAll(): BaseConnector[] {
    return Array.from(this.connectors.values()).map((e) => e.connector);
  }

  /**
   * Get connectors by category
   */
  getByCategory(category: IntegrationCategory): BaseConnector[] {
    return this.getAll().filter((c) => c.type === category);
  }

  /**
   * Get all connector IDs
   */
  getIds(): string[] {
    return Array.from(this.connectors.keys());
  }

  /**
   * Check health of all connectors
   */
  async checkAllHealth(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();

    await Promise.all(
      Array.from(this.connectors.entries()).map(async ([id, entry]) => {
        const result = await entry.connector.healthCheck();
        results.set(id, result);
      })
    );

    return results;
  }

  /**
   * Get all connector metrics
   */
  getAllMetrics(): Map<string, ConnectorMetrics> {
    const metrics = new Map<string, ConnectorMetrics>();

    for (const [id, entry] of this.connectors) {
      metrics.set(id, entry.connector.getMetrics());
    }

    return metrics;
  }

  /**
   * Disconnect all connectors
   */
  async disconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.connectors.values()).map((entry) =>
        entry.connector.disconnect()
      )
    );

    console.log('[ConnectorFactory] Disconnected all connectors');
  }

  /**
   * Clean up idle connectors
   */
  cleanupIdle(idleThresholdMs: number = 30 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, entry] of this.connectors) {
      const lastUsed = entry.lastUsed || entry.createdAt;
      if (now - lastUsed.getTime() > idleThresholdMs) {
        entry.connector.disconnect();
        this.connectors.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[ConnectorFactory] Cleaned up ${cleaned} idle connectors`);
    }

    return cleaned;
  }

  /**
   * Get factory statistics
   */
  getStats(): {
    totalConnectors: number;
    byCategory: Record<string, number>;
    byState: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    const byState: Record<string, number> = {};

    for (const entry of this.connectors.values()) {
      const connector = entry.connector;

      byCategory[connector.type] = (byCategory[connector.type] || 0) + 1;
      byState[connector.getState()] = (byState[connector.getState()] || 0) + 1;
    }

    return {
      totalConnectors: this.connectors.size,
      byCategory,
      byState,
    };
  }
}

// Singleton instance
let factoryInstance: ConnectorFactory | null = null;

export function getConnectorFactory(): ConnectorFactory {
  if (!factoryInstance) {
    factoryInstance = new ConnectorFactory();
  }
  return factoryInstance;
}
