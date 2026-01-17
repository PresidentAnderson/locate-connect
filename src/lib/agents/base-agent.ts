/**
 * Base Agent Framework
 * Abstract base class for all monitoring agents
 */

import type {
  AgentConfig,
  AgentResult,
  AgentError,
  AgentType,
} from "@/types/agent.types";

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected isRunning = false;
  protected runId: string | null = null;
  protected startTime: Date | null = null;
  protected errors: AgentError[] = [];
  protected metrics: Record<string, number> = {};

  constructor(config: AgentConfig) {
    this.config = config;
  }

  get id(): string {
    return this.config.id;
  }

  get type(): AgentType {
    return this.config.type;
  }

  get name(): string {
    return this.config.name;
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Execute the agent's main task
   */
  async run(): Promise<AgentResult> {
    if (this.isRunning) {
      throw new Error(`Agent ${this.id} is already running`);
    }

    this.isRunning = true;
    this.runId = crypto.randomUUID();
    this.startTime = new Date();
    this.errors = [];
    this.metrics = {};

    let itemsProcessed = 0;
    let leadsGenerated = 0;
    let alertsTriggered = 0;

    try {
      console.log(`[Agent:${this.name}] Starting run ${this.runId}`);

      // Pre-run hook
      await this.beforeRun();

      // Execute main logic with timeout
      const result = await this.withTimeout(
        this.execute(),
        this.config.timeout
      );

      itemsProcessed = result.itemsProcessed;
      leadsGenerated = result.leadsGenerated;
      alertsTriggered = result.alertsTriggered;

      // Post-run hook
      await this.afterRun(result);

      console.log(`[Agent:${this.name}] Completed run ${this.runId}`);

      return this.buildResult(true, itemsProcessed, leadsGenerated, alertsTriggered);
    } catch (error) {
      const agentError = this.createError(error);
      this.errors.push(agentError);

      console.error(`[Agent:${this.name}] Failed run ${this.runId}:`, error);

      // Retry logic
      if (this.config.retryAttempts > 0 && this.shouldRetry(error)) {
        return this.retryRun();
      }

      return this.buildResult(false, itemsProcessed, leadsGenerated, alertsTriggered);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Main execution logic - must be implemented by subclasses
   */
  protected abstract execute(): Promise<{
    itemsProcessed: number;
    leadsGenerated: number;
    alertsTriggered: number;
  }>;

  /**
   * Hook called before run starts
   */
  protected async beforeRun(): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Hook called after successful run
   */
  protected async afterRun(result: {
    itemsProcessed: number;
    leadsGenerated: number;
    alertsTriggered: number;
  }): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Determine if error should trigger retry
   */
  protected shouldRetry(error: unknown): boolean {
    // Retry on network/timeout errors, not on validation errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("timeout") ||
        message.includes("network") ||
        message.includes("connection")
      );
    }
    return false;
  }

  /**
   * Retry the run with delay
   */
  private async retryRun(): Promise<AgentResult> {
    console.log(`[Agent:${this.name}] Retrying in ${this.config.retryDelay}ms`);

    await this.sleep(this.config.retryDelay);

    // Reduce retry attempts for next call
    const newConfig = {
      ...this.config,
      retryAttempts: this.config.retryAttempts - 1,
    };

    const retryAgent = this.clone(newConfig);
    return retryAgent.run();
  }

  /**
   * Clone agent with new config - must be implemented by subclasses
   */
  protected abstract clone(config: AgentConfig): BaseAgent;

  /**
   * Execute with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Agent execution timeout")), ms);
    });

    return Promise.race([promise, timeout]);
  }

  /**
   * Build result object
   */
  private buildResult(
    success: boolean,
    itemsProcessed: number,
    leadsGenerated: number,
    alertsTriggered: number
  ): AgentResult {
    const completedAt = new Date();
    const duration = this.startTime
      ? completedAt.getTime() - this.startTime.getTime()
      : 0;

    return {
      success,
      agentId: this.id,
      runId: this.runId || crypto.randomUUID(),
      startedAt: this.startTime?.toISOString() || completedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      duration,
      itemsProcessed,
      leadsGenerated,
      alertsTriggered,
      errors: this.errors,
      metrics: this.metrics,
    };
  }

  /**
   * Create error object from unknown error
   */
  protected createError(error: unknown): AgentError {
    if (error instanceof Error) {
      return {
        code: "AGENT_ERROR",
        message: error.message,
        timestamp: new Date().toISOString(),
        stack: error.stack,
      };
    }

    return {
      code: "UNKNOWN_ERROR",
      message: String(error),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add metric
   */
  protected addMetric(key: string, value: number): void {
    this.metrics[key] = (this.metrics[key] || 0) + value;
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Agent Registry - manages all registered agents
 */
export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();

  register(agent: BaseAgent): void {
    this.agents.set(agent.id, agent);
    console.log(`[AgentRegistry] Registered agent: ${agent.name}`);
  }

  unregister(agentId: string): void {
    this.agents.delete(agentId);
  }

  get(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  getByType(type: AgentType): BaseAgent[] {
    return this.getAll().filter((agent) => agent.type === type);
  }

  getEnabled(): BaseAgent[] {
    return this.getAll().filter((agent) => agent.enabled);
  }
}

export const agentRegistry = new AgentRegistry();
