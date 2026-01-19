/**
 * Priority Escalation Agent
 * Automatically escalates case priority based on rules and conditions
 */

import { BaseAgent } from "./base-agent";
import { createClient } from "@/lib/supabase/server";
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
  assignedTo?: string;
}

export class PriorityEscalationAgent extends BaseAgent {
  private settings: PriorityEscalationAgentSettings;

  constructor(config: AgentConfig) {
    super(config);
    this.settings = (config.settings as unknown) as PriorityEscalationAgentSettings;
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

        // Evaluate rules (sorted by priority)
        const sortedRules = [...enabledRules].sort((a, b) => a.priority - b.priority);

        for (const rule of sortedRules) {
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
    const supabase = await createClient();

    // Query cases that are open and not at max priority (0 is highest)
    const { data: cases, error } = await supabase
      .from("case_reports")
      .select(`
        id,
        case_number,
        priority,
        status,
        created_at,
        assigned_to,
        tags,
        missing_person:missing_persons(
          date_of_birth,
          last_seen_date,
          medical_conditions,
          medications,
          mental_health_history,
          risk_factors
        ),
        case_activity(
          created_at
        )
      `)
      .in("status", ["open", "active", "in_progress"])
      .gt("priority", 0) // Not already at highest priority
      .order("priority", { ascending: false }) // Process lower priority cases first
      .order("created_at", { ascending: true }) // Then by oldest
      .limit(100);

    if (error) {
      console.error("[PriorityEscalationAgent] Error fetching cases:", error);
      return [];
    }

    if (!cases) return [];

    // Get last escalation for each case
    const caseIds = cases.map((c) => c.id);
    const { data: escalations } = await supabase
      .from("escalation_events")
      .select("case_id, triggered_at")
      .in("case_id", caseIds)
      .order("triggered_at", { ascending: false });

    // Build map of last escalation by case
    const lastEscalationMap = new Map<string, string>();
    if (escalations) {
      for (const e of escalations) {
        if (!lastEscalationMap.has(e.case_id)) {
          lastEscalationMap.set(e.case_id, e.triggered_at);
        }
      }
    }

    return cases.map((c) => {
      const missingPerson = c.missing_person as {
        date_of_birth?: string;
        last_seen_date?: string;
        medical_conditions?: string;
        medications?: string[];
        mental_health_history?: string;
        risk_factors?: string[];
      } | null;

      // Calculate if minor
      let isMinor = false;
      if (missingPerson?.date_of_birth) {
        const dob = new Date(missingPerson.date_of_birth);
        const age = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        isMinor = age < 18;
      }

      // Check for medical conditions
      const hasMedicalCondition = !!(
        missingPerson?.medical_conditions ||
        (missingPerson?.medications && missingPerson.medications.length > 0)
      );

      // Check for suicidal risk (check risk_factors and mental_health_history)
      const riskFactors = missingPerson?.risk_factors || [];
      const mentalHealthHistory = (missingPerson?.mental_health_history || "").toLowerCase();
      const isSuicidalRisk =
        riskFactors.some((r) =>
          r.toLowerCase().includes("suicid") ||
          r.toLowerCase().includes("self-harm") ||
          r.toLowerCase().includes("depression")
        ) ||
        mentalHealthHistory.includes("suicid") ||
        mentalHealthHistory.includes("self-harm");

      // Check for threats
      const hasThreats = riskFactors.some((r) =>
        r.toLowerCase().includes("threat") ||
        r.toLowerCase().includes("danger") ||
        r.toLowerCase().includes("abduct")
      );

      // Get most recent activity
      const activities = c.case_activity as Array<{ created_at: string }> | null;
      const lastActivityAt = activities && activities.length > 0
        ? activities[0].created_at
        : undefined;

      return {
        id: c.id,
        caseNumber: c.case_number,
        priority: c.priority || 3,
        status: c.status,
        createdAt: c.created_at,
        lastSeenDate: missingPerson?.last_seen_date || c.created_at,
        isMinor,
        hasMedicalCondition,
        isSuicidalRisk,
        hasThreats,
        lastActivityAt,
        lastEscalationAt: lastEscalationMap.get(c.id),
        tags: (c.tags as string[]) || [],
        assignedTo: c.assigned_to,
      };
    });
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
      case "daysMissing":
        return Math.floor(this.calculateHoursMissing(caseData.lastSeenDate) / 24);
      case "hoursInactive":
        return caseData.lastActivityAt
          ? this.calculateHoursSince(caseData.lastActivityAt)
          : null;
      case "daysInactive":
        return caseData.lastActivityAt
          ? Math.floor(this.calculateHoursSince(caseData.lastActivityAt) / 24)
          : null;
      case "hoursSinceCreated":
        return this.calculateHoursSince(caseData.createdAt);
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
        // Escalate to specific level (but don't de-escalate)
        return Math.min(caseData.priority, escalateTo);
      }
      if (escalateBy !== undefined) {
        // Escalate by N levels (lower number = higher priority)
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
    const supabase = await createClient();

    console.log(
      `[PriorityEscalationAgent] Escalating case ${caseData.caseNumber} from P${caseData.priority} to P${newPriority} (rule: ${rule.name})`
    );

    // Update case priority in database
    const { error: updateError } = await supabase
      .from("case_reports")
      .update({
        priority: newPriority,
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseData.id);

    if (updateError) {
      console.error("[PriorityEscalationAgent] Error updating priority:", updateError);
      throw updateError;
    }

    // Create notification for assigned investigator
    if (caseData.assignedTo) {
      const priorityLabels: Record<number, string> = {
        0: "Critical",
        1: "High",
        2: "Medium",
        3: "Low",
      };

      await supabase.from("notifications").insert({
        user_id: caseData.assignedTo,
        type: "priority_escalation",
        title: `Case Priority Escalated: ${caseData.caseNumber}`,
        message: `Case priority has been automatically escalated from ${priorityLabels[caseData.priority] || `P${caseData.priority}`} to ${priorityLabels[newPriority] || `P${newPriority}`}. Reason: ${rule.name}`,
        data: {
          case_id: caseData.id,
          case_number: caseData.caseNumber,
          previous_priority: caseData.priority,
          new_priority: newPriority,
          rule_id: rule.id,
          rule_name: rule.name,
        },
        priority: newPriority <= 1 ? "high" : "medium",
      });
    }

    // Log to case activity
    await supabase.from("case_activity").insert({
      case_id: caseData.id,
      activity_type: "priority_escalated",
      description: `Priority automatically escalated from P${caseData.priority} to P${newPriority} due to: ${rule.name}`,
      metadata: {
        rule_id: rule.id,
        previous_priority: caseData.priority,
        new_priority: newPriority,
      },
    });

    // For critical escalations (P0), notify all supervisors
    if (newPriority === 0) {
      const { data: supervisors } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["supervisor", "admin"]);

      if (supervisors?.length) {
        const supervisorNotifications = supervisors
          .filter((s) => s.user_id !== caseData.assignedTo)
          .map((s) => ({
            user_id: s.user_id,
            type: "critical_escalation",
            title: `CRITICAL: Case ${caseData.caseNumber} Escalated to P0`,
            message: `Case has been escalated to Critical priority. Reason: ${rule.name}. Immediate attention required.`,
            data: {
              case_id: caseData.id,
              case_number: caseData.caseNumber,
              rule_name: rule.name,
            },
            priority: "urgent",
          }));

        if (supervisorNotifications.length > 0) {
          await supabase.from("notifications").insert(supervisorNotifications);
        }
      }
    }
  }

  private async logEscalationEvent(
    caseData: CaseForEscalation,
    rule: EscalationRule,
    newPriority: number
  ): Promise<void> {
    const supabase = await createClient();

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

    // Store in database
    const { error } = await supabase.from("escalation_events").insert({
      id: event.id,
      case_id: event.caseId,
      rule_id: event.ruleId,
      previous_priority: event.previousPriority,
      new_priority: event.newPriority,
      reason: event.reason,
      triggered_at: event.triggeredAt,
      triggered_by: event.triggeredBy,
      metadata: {
        rule_conditions: rule.conditions,
        case_data: {
          isMinor: caseData.isMinor,
          hasMedicalCondition: caseData.hasMedicalCondition,
          isSuicidalRisk: caseData.isSuicidalRisk,
          hasThreats: caseData.hasThreats,
          hoursMissing: this.calculateHoursMissing(caseData.lastSeenDate),
        },
      },
    });

    if (error) {
      console.error("[PriorityEscalationAgent] Error logging event:", error);
    } else {
      console.log(`[PriorityEscalationAgent] Logged escalation event: ${event.id}`);
    }
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
      id: "threats_any",
      name: "Case with active threats",
      enabled: true,
      priority: 4,
      conditions: [
        { field: "hasThreats", operator: "eq", value: true },
        { field: "priority", operator: "gt", value: 1 },
      ],
      action: { type: "escalate_priority", params: { level: 1 } },
    },
    {
      id: "72h_any",
      name: "Any case missing 72+ hours",
      enabled: true,
      priority: 5,
      conditions: [
        { field: "hoursMissing", operator: "gte", value: 72 },
        { field: "priority", operator: "gt", value: 2 },
      ],
      action: { type: "escalate_priority", params: { by: 1 } },
    },
    {
      id: "inactive_48h",
      name: "No activity in 48+ hours",
      enabled: true,
      priority: 6,
      conditions: [
        { field: "hoursInactive", operator: "gte", value: 48 },
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
