export type CaseLifecycleStatus =
  | "open"
  | "inactive"
  | "cold"
  | "revived"
  | "closed";

export const CASE_LIFECYCLE_TRANSITIONS: Record<
  CaseLifecycleStatus,
  CaseLifecycleStatus[]
> = {
  open: ["inactive", "cold", "closed"],
  inactive: ["cold", "revived", "closed"],
  cold: ["revived", "closed"],
  revived: ["inactive", "closed"],
  closed: [],
};

export function canTransitionCaseLifecycle(
  from: CaseLifecycleStatus,
  to: CaseLifecycleStatus
) {
  if (from === to) return true;
  return CASE_LIFECYCLE_TRANSITIONS[from].includes(to);
}
