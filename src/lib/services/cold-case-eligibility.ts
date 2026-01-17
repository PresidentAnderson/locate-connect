export type ColdCaseEligibilitySignal = {
  key: string;
  label: string;
  weight: number;
  matched: boolean;
  value?: number | string | null;
};

export type ColdCaseEligibilityInput = {
  lastSeenAt?: string | null;
  lastActivityAt?: string | null;
  tipsLast60Days?: number | null;
  leadsLast90Days?: number | null;
};

export type ColdCaseEligibilityResult = {
  eligible: boolean;
  score: number;
  threshold: number;
  signals: ColdCaseEligibilitySignal[];
  evaluatedAt: string;
};

const DEFAULT_THRESHOLD = 50;

function daysBetween(target: Date, source: Date) {
  const ms = target.getTime() - source.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function evaluateColdCaseEligibility(
  input: ColdCaseEligibilityInput
): ColdCaseEligibilityResult {
  const now = new Date();
  const lastSeenAt = input.lastSeenAt ? new Date(input.lastSeenAt) : null;
  const lastActivityAt = input.lastActivityAt ? new Date(input.lastActivityAt) : null;

  const daysSinceLastSeen = lastSeenAt ? daysBetween(now, lastSeenAt) : null;
  const daysSinceLastActivity = lastActivityAt ? daysBetween(now, lastActivityAt) : null;

  const signals: ColdCaseEligibilitySignal[] = [
    {
      key: "no_activity_180_days",
      label: "No recorded case activity in 180+ days",
      weight: 35,
      matched: daysSinceLastActivity !== null && daysSinceLastActivity >= 180,
      value: daysSinceLastActivity,
    },
    {
      key: "missing_over_year",
      label: "Last seen 365+ days ago",
      weight: 30,
      matched: daysSinceLastSeen !== null && daysSinceLastSeen >= 365,
      value: daysSinceLastSeen,
    },
    {
      key: "no_tips_60_days",
      label: "No tips in the last 60 days",
      weight: 20,
      matched: input.tipsLast60Days !== null && input.tipsLast60Days === 0,
      value: input.tipsLast60Days ?? null,
    },
    {
      key: "no_leads_90_days",
      label: "No leads created in the last 90 days",
      weight: 15,
      matched: input.leadsLast90Days !== null && input.leadsLast90Days === 0,
      value: input.leadsLast90Days ?? null,
    },
  ];

  const score = signals.reduce(
    (total, signal) => total + (signal.matched ? signal.weight : 0),
    0
  );

  return {
    eligible: score >= DEFAULT_THRESHOLD,
    score,
    threshold: DEFAULT_THRESHOLD,
    signals,
    evaluatedAt: now.toISOString(),
  };
}
