/**
 * Priority Escalation Agent
 * Automatically escalates case priority based on rules and conditions
 */

import { BaseAgent } from "./base-agent";
import type {
  AgentConfig,
  EscalationRule,
  EscalationEvent,
  EscalationCondition,
} from "@/types/agent.types";

interface PriorityEscalationAgentSettings {
  rules: EscalationRule[];
  maxEscalationsPerRun: number;
  cooldownMinutes: number;
}

interface CaseForEscalation {
  id: string;
  caseNumber: string;
  priority: number;
  status: string;
  createdAt: string;
  lastSeenDate: string;
  isMinor: boolean;
  hasMedicalCondition: boolean;
  isSuicidalRisk: boolean;
  hasThreats: boolean;
  lastActivityAt?: string;
  lastEscalationAt?: string;
  weatherRisk?: number;
  tags: string[];
}

export class PriorityEscalationAgent extends BaseAgent {
  private settings: PriorityEscalationAgentSettings;

  constructor(config: AgentConfig) {
    super(config);
    this.settings = config.settings as PriorityEscalationAgentSettings;
  }

  protected async execute(): Promise<{
    itemsProcessed: number;
    leadsGenerated: number;
    alertsTriggered: number;
  }> {
    let itemsProcessed = 0;
    let alertsTriggered = 0;

    // Get cases eligible for escalation
    const cases = await this.getEligibleCases();
    this.addMetric("cases_evaluated", cases.length);

    const enabledRules = this.settings.rules.filter((r) => r.enabled);
    this.addMetric("rules_active", enabledRules.length);

    let escalationsThisRun = 0;

    for (const caseData of cases) {
      if (escalationsThisRun >= this.settings.maxEscalationsPerRun) break;

      try {
        itemsProcessed++;

        // Check cooldown
        if (this.isInCooldown(caseData)) {
          this.addMetric("cooldown_skipped", 1);
          continue;
        }

        // Evaluate rules
        for (const rule of enabledRules) {
          if (this.evaluateRule(rule, caseData)) {
            const newPriority = this.calculateNewPriority(caseData, rule);

            if (newPriority !== caseData.priority) {
              // Apply escalation
              await this.applyEscalation(caseData, rule, newPriority);
              escalationsThisRun++;
              alertsTriggered++;

              // Log event
              await this.logEscalationEvent(caseData, rule, newPriority);

              this.addMetric(`rule_${rule.id}_triggered`, 1);
              break; // Only apply first matching rule
            }
          }
        }
      } catch (error) {
        console.error(
          `[PriorityEscalationAgent] Error evaluating case ${caseData.id}:`,
          error
        );
        this.errors.push(this.createError(error));
      }
    }

    this.addMetric("total_escalations", escalationsThisRun);

    return {
      itemsProcessed,
      leadsGenerated: 0,
      alertsTriggered,
    };
  }

  private async getEligibleCases(): Promise<CaseForEscalation[]> {
    // Query cases that are open and not at max priority
    return [];
  }

  private isInCooldown(caseData: CaseForEscalation): boolean {
    if (!caseData.lastEscalationAt) return false;

    const lastEscalation = new Date(caseData.lastEscalationAt);
    const cooldownMs = this.settings.cooldownMinutes * 60 * 1000;
    const now = new Date();

    return now.getTime() - lastEscalation.getTime() < cooldownMs;
  }

  private evaluateRule(rule: EscalationRule, caseData: CaseForEscalation): boolean {
    // All conditions must match
    return rule.conditions.every((condition) =>
      this.evaluateCondition(condition, caseData)
    );
  }

  private evaluateCondition(
    condition: EscalationCondition,
    caseData: CaseForEscalation
  ): boolean {
    const value = this.getFieldValue(condition.field, caseData);

    switch (condition.operator) {
      case "eq":
        return value === condition.value;
      case "gt":
        return typeof value === "number" && value > (condition.value as number);
      case "lt":
        return typeof value === "number" && value < (condition.value as number);
      case "gte":
        return typeof value === "number" && value >= (condition.value as number);
      case "lte":
        return typeof value === "number" && value <= (condition.value as number);
      case "contains":
        return (
          Array.isArray(value) && value.includes(condition.value as string)
        );
      case "in":
        return (
          Array.isArray(condition.value) &&
          (condition.value as unknown[]).includes(value)
        );
      default:
        return false;
    }
  }

  private getFieldValue(
    field: string,
    caseData: CaseForEscalation
  ): unknown {
    // Special computed fields
    switch (field) {
      case "hoursMissing":
        return this.calculateHoursMissing(caseData.lastSeenDate);
      case "hoursInactive":
        return caseData.lastActivityAt
          ? this.calculateHoursSince(caseData.lastActivityAt)
          : null;
      default:
        return (caseData as unknown as Record<string, unknown>)[field];
    }
  }

  private calculateHoursMissing(lastSeenDate: string): number {
    const lastSeen = new Date(lastSeenDate);
    const now = new Date();
    return Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60));
  }

  private calculateHoursSince(date: string): number {
    const then = new Date(date);
    const now = new Date();
    return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60));
  }

  private calculateNewPriority(
    caseData: CaseForEscalation,
    rule: EscalationRule
  ): number {
    const action = rule.action;

    if (action.type === "escalate_priority") {
      const escalateTo = action.params.level as number | undefined;
      const escalateBy = action.params.by as number | undefined;

      if (escalateTo !== undefined) {
        return escalateTo;
      }
      if (escalateBy !== undefined) {
        return Math.max(0, caseData.priority - escalateBy);
      }
    }

    return caseData.priority;
  }

  private async applyEscalation(
    caseData: CaseForEscalation,
    rule: EscalationRule,
    newPriority: number
  ): Promise<void> {
    console.log(
      `[PriorityEscalationAgent] Escalating case ${caseData.caseNumber} from P${caseData.priority} to P${newPriority} (rule: ${rule.name})`
    );

    // Update case priority in database
    // Send notification
  }

  private async logEscalationEvent(
    caseData: CaseForEscalation,
    rule: EscalationRule,
    newPriority: number
  ): Promise<void> {
    const event: EscalationEvent = {
      id: crypto.randomUUID(),
      caseId: caseData.id,
      ruleId: rule.id,
      previousPriority: caseData.priority,
      newPriority,
      reason: rule.name,
      triggeredAt: new Date().toISOString(),
      triggeredBy: "agent",
    };

    console.log(`[PriorityEscalationAgent] Logged escalation event:`, event);
  }

  protected clone(config: AgentConfig): BaseAgent {
    return new PriorityEscalationAgent(config);
  }
}

export function createPriorityEscalationAgent(
  id: string,
  settings?: Partial<PriorityEscalationAgentSettings>
): PriorityEscalationAgent {
  const defaultRules: EscalationRule[] = [
    {
      id: "minor_24h",
      name: "Minor missing 24+ hours",
      enabled: true,
      priority: 1,
      conditions: [
        { field: "isMinor", operator: "eq", value: true },
        { field: "hoursMissing", operator: "gte", value: 24 },
        { field: "priority", operator: "gt", value: 1 },
      ],
      action: { type: "escalate_priority", params: { level: 1 } },
    },
    {
      id: "medical_48h",
      name: "Medical condition missing 48+ hours",
      enabled: true,
      priority: 2,
      conditions: [
        { field: "hasMedicalCondition", operator: "eq", value: true },
        { field: "hoursMissing", operator: "gte", value: 48 },
        { field: "priority", operator: "gt", value: 0 },
      ],
      action: { type: "escalate_priority", params: { level: 0 } },
    },
    {
      id: "suicidal_12h",
      name: "Suicidal risk missing 12+ hours",
      enabled: true,
      priority: 3,
      conditions: [
        { field: "isSuicidalRisk", operator: "eq", value: true },
        { field: "hoursMissing", operator: "gte", value: 12 },
        { field: "priority", operator: "gt", value: 0 },
      ],
      action: { type: "escalate_priority", params: { level: 0 } },
    },
    {
      id: "72h_any",
      name: "Any case missing 72+ hours",
      enabled: true,
      priority: 4,
      conditions: [
        { field: "hoursMissing", operator: "gte", value: 72 },
        { field: "priority", operator: "gt", value: 2 },
      ],
      action: { type: "escalate_priority", params: { by: 1 } },
    },
  ];

  const config: AgentConfig = {
    id,
    type: "priority_escalation",
    name: "Priority Escalation Agent",
    enabled: true,
    schedule: "*/30 * * * *", // Every 30 minutes
    timeout: 120000, // 2 minutes
    retryAttempts: 1,
    retryDelay: 10000,
    settings: {
      rules: defaultRules,
      maxEscalationsPerRun: 20,
      cooldownMinutes: 60,
      ...settings,
    },
  };

  return new PriorityEscalationAgent(config);
}
