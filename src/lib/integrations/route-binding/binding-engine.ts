/**
 * Route Binding Engine
 * Orchestrates request-to-integration mapping and execution
 */

import type {
  RouteBinding,
  TriggerEvent,
  BindingResult,
  TransformationRule,
  AggregationConfig,
  ConnectorRequest,
  RouteCondition,
} from '@/types';
import { getConnectorFactory, type ConnectorFactory } from '../connector-framework';
import { DataTransformer, getDataTransformer } from './transformer';
import { ResponseAggregator, getResponseAggregator } from './aggregator';

export interface BindingExecutionOptions {
  timeout?: number;
  parallel?: boolean;
  failFast?: boolean;
}

export interface RegisteredBinding {
  binding: RouteBinding;
  transformations?: TransformationRule[];
  aggregation?: AggregationConfig;
}

/**
 * Route Binding Engine
 * Manages route bindings and executes integrations based on triggers
 */
export class RouteBindingEngine {
  private bindings: Map<string, RegisteredBinding> = new Map();
  private eventBindings: Map<string, string[]> = new Map();
  private connectorFactory: ConnectorFactory;
  private transformer: DataTransformer;
  private aggregator: ResponseAggregator;

  constructor() {
    this.connectorFactory = getConnectorFactory();
    this.transformer = getDataTransformer();
    this.aggregator = getResponseAggregator();
  }

  /**
   * Register a route binding
   */
  registerBinding(
    binding: RouteBinding,
    transformations?: TransformationRule[],
    aggregation?: AggregationConfig
  ): void {
    this.bindings.set(binding.id, {
      binding,
      transformations,
      aggregation,
    });

    // Index by event for quick lookup
    if (binding.trigger.type === 'event' && binding.trigger.event) {
      const events = this.eventBindings.get(binding.trigger.event) || [];
      if (!events.includes(binding.id)) {
        events.push(binding.id);
        this.eventBindings.set(binding.trigger.event, events);
      }
    }

    console.log(`[RouteBindingEngine] Registered binding: ${binding.name}`);
  }

  /**
   * Unregister a binding
   */
  unregisterBinding(bindingId: string): boolean {
    const registered = this.bindings.get(bindingId);
    if (!registered) {
      return false;
    }

    const binding = registered.binding;

    // Remove from event index
    if (binding.trigger.type === 'event' && binding.trigger.event) {
      const events = this.eventBindings.get(binding.trigger.event) || [];
      const index = events.indexOf(bindingId);
      if (index !== -1) {
        events.splice(index, 1);
        this.eventBindings.set(binding.trigger.event, events);
      }
    }

    this.bindings.delete(bindingId);
    console.log(`[RouteBindingEngine] Unregistered binding: ${binding.name}`);
    return true;
  }

  /**
   * Execute a trigger and run matching bindings
   */
  async execute(
    trigger: TriggerEvent,
    options: BindingExecutionOptions = {}
  ): Promise<BindingResult[]> {
    const matchingBindings = this.findMatchingBindings(trigger);

    if (matchingBindings.length === 0) {
      console.log(
        `[RouteBindingEngine] No bindings matched trigger: ${trigger.type}:${trigger.eventName}`
      );
      return [];
    }

    console.log(
      `[RouteBindingEngine] Executing ${matchingBindings.length} bindings for trigger: ${trigger.type}:${trigger.eventName}`
    );

    const executeBinding = async (
      registered: RegisteredBinding
    ): Promise<BindingResult> => {
      return this.executeBinding(registered, trigger, options);
    };

    if (options.parallel !== false) {
      // Execute in parallel
      return Promise.all(matchingBindings.map(executeBinding));
    } else {
      // Execute sequentially
      const results: BindingResult[] = [];
      for (const registered of matchingBindings) {
        const result = await executeBinding(registered);
        results.push(result);

        if (options.failFast && !result.success) {
          break;
        }
      }
      return results;
    }
  }

  /**
   * Execute a single binding by ID
   */
  async executeById(
    bindingId: string,
    payload: Record<string, unknown>,
    options: BindingExecutionOptions = {}
  ): Promise<BindingResult> {
    const registered = this.bindings.get(bindingId);
    if (!registered) {
      throw new Error(`Binding not found: ${bindingId}`);
    }

    const trigger: TriggerEvent = {
      type: 'manual',
      source: 'api',
      payload,
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId: crypto.randomUUID(),
      },
    };

    return this.executeBinding(registered, trigger, options);
  }

  /**
   * Execute a binding
   */
  private async executeBinding(
    registered: RegisteredBinding,
    trigger: TriggerEvent,
    options: BindingExecutionOptions
  ): Promise<BindingResult> {
    const { binding, transformations, aggregation } = registered;
    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    console.log(`[RouteBindingEngine] Executing binding: ${binding.name}`);

    try {
      // Check conditions
      if (binding.conditions && !this.checkConditions(binding.conditions, trigger.payload)) {
        return {
          success: true,
          bindingId: binding.id,
          executionId,
          responses: [],
          totalTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }

      // Transform request data
      let requestData = trigger.payload;
      if (transformations && transformations.length > 0) {
        requestData = this.transformer.transform(trigger.payload, transformations);
      }

      // Get connector
      const connector = this.connectorFactory.get(binding.integrationId);
      if (!connector) {
        throw new Error(`Connector not found: ${binding.integrationId}`);
      }

      // Build request
      const request: ConnectorRequest = {
        id: executionId,
        method: this.getActionMethod(binding.action),
        path: binding.action.endpointId || '/',
        body: requestData,
        timeout: options.timeout,
      };

      // Execute request
      const response = await connector.execute(request);

      // Handle response transformation
      let responseData = response.data;
      if (binding.action.transformations && binding.action.transformations.length > 0) {
        const responseRules: TransformationRule[] = binding.action.transformations.map(
          (m, i) => ({
            id: `response_${i}`,
            name: `${m.sourceField} -> ${m.targetField}`,
            sourceField: m.sourceField,
            targetField: m.targetField,
            transformType: 'direct',
          })
        );
        responseData = this.transformer.transform(
          responseData as Record<string, unknown>,
          responseRules
        );
      }

      const totalTimeMs = Date.now() - startTime;

      return {
        success: response.success,
        bindingId: binding.id,
        executionId,
        responses: [
          {
            integrationId: binding.integrationId,
            success: response.success,
            data: responseData,
            error: response.error?.message,
            responseTimeMs: response.metadata.responseTimeMs,
          },
        ],
        aggregatedData: responseData,
        totalTimeMs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const totalTimeMs = Date.now() - startTime;

      return {
        success: false,
        bindingId: binding.id,
        executionId,
        responses: [
          {
            integrationId: binding.integrationId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            responseTimeMs: totalTimeMs,
          },
        ],
        totalTimeMs,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Find bindings that match a trigger
   */
  private findMatchingBindings(trigger: TriggerEvent): RegisteredBinding[] {
    const matches: RegisteredBinding[] = [];

    // Check event-based bindings
    if (trigger.type === 'event' && trigger.eventName) {
      const bindingIds = this.eventBindings.get(trigger.eventName) || [];
      for (const id of bindingIds) {
        const registered = this.bindings.get(id);
        if (registered && registered.binding.enabled) {
          matches.push(registered);
        }
      }
    }

    // Check other trigger types
    for (const registered of this.bindings.values()) {
      if (!registered.binding.enabled) {
        continue;
      }

      const bindingTrigger = registered.binding.trigger;

      if (
        bindingTrigger.type === trigger.type &&
        bindingTrigger.type !== 'event'
      ) {
        // Webhook matching
        if (
          bindingTrigger.type === 'webhook' &&
          bindingTrigger.webhookPath === trigger.source
        ) {
          matches.push(registered);
        }

        // Manual trigger always matches
        if (bindingTrigger.type === 'manual') {
          matches.push(registered);
        }
      }
    }

    return matches;
  }

  /**
   * Check if conditions are met
   */
  private checkConditions(
    conditions: RouteCondition[],
    payload: Record<string, unknown>
  ): boolean {
    for (const condition of conditions) {
      const value = this.transformer.getNestedValue(payload, condition.field);
      const met = this.transformer.evaluateCondition(
        value,
        condition.operator,
        condition.value
      );

      if (!met) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get HTTP method from action type
   */
  private getActionMethod(
    action: RouteBinding['action']
  ): ConnectorRequest['method'] {
    switch (action.type) {
      case 'api_call':
        return 'POST';
      case 'data_sync':
        return 'PUT';
      case 'notification':
        return 'POST';
      case 'workflow':
        return 'POST';
      default:
        return 'POST';
    }
  }

  /**
   * Get all registered bindings
   */
  getBindings(): RouteBinding[] {
    return Array.from(this.bindings.values()).map((r) => r.binding);
  }

  /**
   * Get binding by ID
   */
  getBinding(id: string): RouteBinding | undefined {
    return this.bindings.get(id)?.binding;
  }

  /**
   * Get bindings for an integration
   */
  getBindingsForIntegration(integrationId: string): RouteBinding[] {
    return this.getBindings().filter((b) => b.integrationId === integrationId);
  }

  /**
   * Enable/disable a binding
   */
  setBindingEnabled(bindingId: string, enabled: boolean): boolean {
    const registered = this.bindings.get(bindingId);
    if (!registered) {
      return false;
    }
    registered.binding.enabled = enabled;
    return true;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalBindings: number;
    enabledBindings: number;
    byTriggerType: Record<string, number>;
    byIntegration: Record<string, number>;
  } {
    const bindings = this.getBindings();
    const byTriggerType: Record<string, number> = {};
    const byIntegration: Record<string, number> = {};

    for (const binding of bindings) {
      byTriggerType[binding.trigger.type] =
        (byTriggerType[binding.trigger.type] || 0) + 1;
      byIntegration[binding.integrationId] =
        (byIntegration[binding.integrationId] || 0) + 1;
    }

    return {
      totalBindings: bindings.length,
      enabledBindings: bindings.filter((b) => b.enabled).length,
      byTriggerType,
      byIntegration,
    };
  }
}

// Singleton instance
let engineInstance: RouteBindingEngine | null = null;

export function getRouteBindingEngine(): RouteBindingEngine {
  if (!engineInstance) {
    engineInstance = new RouteBindingEngine();
  }
  return engineInstance;
}
