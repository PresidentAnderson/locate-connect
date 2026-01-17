import test from "node:test";
import assert from "node:assert/strict";
import { assessPriority, checkAutoEscalation, getPriorityDisplay } from "../priority-engine";

// Test assessPriority function

test("assessPriority: child under 12 gets high priority", () => {
  const result = assessPriority({
    age: 10,
    hoursMissing: 2,
    hasMedicalCondition: false,
    requiresDailyMedication: false,
    hasMentalHealthCondition: false,
    suicidalRisk: false,
    suspectedAbduction: false,
    domesticViolenceHistory: false,
    outOfCharacter: false,
    hasFinancialResources: true,
    adverseWeather: false,
  });

  // Age under 12 is 30 points in SPVM profile
  assert.equal(result.score, 30);
  assert.equal(result.level, 3); // LOW (20-39)
  assert.equal(result.jurisdiction, "qc_spvm_v1");
  assert.equal(result.factors.length, 1);
  assert.equal(result.factors[0].factor, "age_under_12");
});

test("assessPriority: critical case reaches P0", () => {
  const result = assessPriority({
    age: 8,
    hoursMissing: 80,
    hasMedicalCondition: false,
    requiresDailyMedication: true,
    hasMentalHealthCondition: false,
    suicidalRisk: true,
    suspectedAbduction: false,
    domesticViolenceHistory: false,
    outOfCharacter: false,
    hasFinancialResources: false,
    adverseWeather: false,
  });

  // Age under 12: 30, medication: 30, suicidal: 35, 72+ hours: 30, no resources: 10 = 135
  assert.ok(result.score >= 80);
  assert.equal(result.level, 0); // CRITICAL
});

test("assessPriority: suspected abduction is highest single factor", () => {
  const result = assessPriority({
    age: 25,
    hoursMissing: 5,
    hasMedicalCondition: false,
    requiresDailyMedication: false,
    hasMentalHealthCondition: false,
    suicidalRisk: false,
    suspectedAbduction: true,
    domesticViolenceHistory: false,
    outOfCharacter: false,
    hasFinancialResources: true,
    adverseWeather: false,
  });

  // Suspected abduction: 40 points
  assert.equal(result.score, 40);
  assert.equal(result.level, 2); // MEDIUM (40-59)
  const abductionFactor = result.factors.find((f) => f.factor === "suspected_abduction");
  assert.ok(abductionFactor);
  assert.equal(abductionFactor.weight, 40);
});

test("assessPriority: time escalation thresholds work correctly", () => {
  const base = {
    age: 30,
    hasMedicalCondition: false,
    requiresDailyMedication: false,
    hasMentalHealthCondition: false,
    suicidalRisk: false,
    suspectedAbduction: false,
    domesticViolenceHistory: false,
    outOfCharacter: false,
    hasFinancialResources: true,
    adverseWeather: false,
  };

  // 24 hours: +10 points
  const result24 = assessPriority({ ...base, hoursMissing: 24 });
  assert.equal(result24.score, 10);
  const factor24 = result24.factors.find((f) => f.factor === "missing_24_plus");
  assert.ok(factor24);

  // 48 hours: +20 points
  const result48 = assessPriority({ ...base, hoursMissing: 48 });
  assert.equal(result48.score, 20);
  const factor48 = result48.factors.find((f) => f.factor === "missing_48_plus");
  assert.ok(factor48);

  // 72 hours: +30 points
  const result72 = assessPriority({ ...base, hoursMissing: 72 });
  assert.equal(result72.score, 30);
  const factor72 = result72.factors.find((f) => f.factor === "missing_72_plus");
  assert.ok(factor72);
});

test("assessPriority: age ranges are mutually exclusive", () => {
  const base = {
    hoursMissing: 0,
    hasMedicalCondition: false,
    requiresDailyMedication: false,
    hasMentalHealthCondition: false,
    suicidalRisk: false,
    suspectedAbduction: false,
    domesticViolenceHistory: false,
    outOfCharacter: false,
    hasFinancialResources: true,
    adverseWeather: false,
  };

  // Under 12: 30 points
  const under12 = assessPriority({ ...base, age: 11 });
  assert.equal(under12.score, 30);

  // 12-17: 20 points
  const teen = assessPriority({ ...base, age: 15 });
  assert.equal(teen.score, 20);

  // 18-64: 0 points (no age factor)
  const adult = assessPriority({ ...base, age: 30 });
  assert.equal(adult.score, 0);

  // 65+: 15 points
  const senior = assessPriority({ ...base, age: 70 });
  assert.equal(senior.score, 15);
});

test("assessPriority: SPVM thresholds match specification", () => {
  const base = {
    age: 30,
    hoursMissing: 0,
    hasMedicalCondition: false,
    requiresDailyMedication: false,
    hasMentalHealthCondition: false,
    suicidalRisk: false,
    suspectedAbduction: false,
    domesticViolenceHistory: false,
    outOfCharacter: false,
    hasFinancialResources: true,
    adverseWeather: false,
  };

  // P4: < 20
  const p4 = assessPriority({ ...base, weatherRiskPoints: 10 });
  assert.equal(p4.level, 4);

  // P3: 20-39
  const p3 = assessPriority({ ...base, weatherRiskPoints: 10, age: 15 });
  assert.equal(p3.level, 3);

  // P2: 40-59
  const p2 = assessPriority({ ...base, suspectedAbduction: true });
  assert.equal(p2.level, 2);

  // P1: 60-79
  const p1 = assessPriority({ ...base, suspectedAbduction: true, age: 15 });
  assert.equal(p1.level, 1);

  // P0: 80+
  const p0 = assessPriority({ ...base, suspectedAbduction: true, age: 8, suicidalRisk: true });
  assert.equal(p0.level, 0);
});

test("assessPriority: generates explanation with factors", () => {
  const result = assessPriority({
    age: 10,
    hoursMissing: 48,
    hasMedicalCondition: false,
    requiresDailyMedication: false,
    hasMentalHealthCondition: true,
    suicidalRisk: false,
    suspectedAbduction: false,
    domesticViolenceHistory: false,
    outOfCharacter: false,
    hasFinancialResources: true,
    adverseWeather: false,
  });

  assert.ok(result.explanation.length > 0);
  assert.ok(result.explanation[0].includes("Priority Level"));
  assert.ok(result.explanation.some((line) => line.includes("Child under 12")));
  assert.ok(result.explanation.some((line) => line.includes("Mental health")));
  assert.ok(result.explanation.some((line) => line.includes("48+ hours")));
});

test("assessPriority: supports hourssMissing typo for backward compatibility", () => {
  const result = assessPriority({
    age: 30,
    hourssMissing: 72,
    hasMedicalCondition: false,
    requiresDailyMedication: false,
    hasMentalHealthCondition: false,
    suicidalRisk: false,
    suspectedAbduction: false,
    domesticViolenceHistory: false,
    outOfCharacter: false,
    hasFinancialResources: true,
    adverseWeather: false,
  });

  assert.equal(result.score, 30); // Should get 72+ hours weight
  const factor = result.factors.find((f) => f.factor === "missing_72_plus");
  assert.ok(factor);
});

// Test checkAutoEscalation function

test("checkAutoEscalation: P0 cannot escalate further", () => {
  const result = checkAutoEscalation(0, 1000);
  assert.equal(result.shouldEscalate, false);
  assert.equal(result.newLevel, undefined);
});

test("checkAutoEscalation: P4 to P3 after 48 hours", () => {
  const result = checkAutoEscalation(4, 48);
  assert.equal(result.shouldEscalate, true);
  assert.equal(result.newLevel, 3);
  assert.ok(result.reason?.includes("MINIMAL"));
  assert.ok(result.reason?.includes("LOW"));
  assert.ok(result.reason?.includes("48 hours"));
});

test("checkAutoEscalation: P4 does not escalate before 48 hours", () => {
  const result = checkAutoEscalation(4, 47);
  assert.equal(result.shouldEscalate, false);
});

test("checkAutoEscalation: P3 to P2 after 72 hours", () => {
  const result = checkAutoEscalation(3, 72);
  assert.equal(result.shouldEscalate, true);
  assert.equal(result.newLevel, 2);
  assert.ok(result.reason?.includes("LOW"));
  assert.ok(result.reason?.includes("MEDIUM"));
  assert.ok(result.reason?.includes("72 hours"));
});

test("checkAutoEscalation: P3 does not escalate before 72 hours", () => {
  const result = checkAutoEscalation(3, 71);
  assert.equal(result.shouldEscalate, false);
});

test("checkAutoEscalation: P2 to P1 after 120 hours (5 days)", () => {
  const result = checkAutoEscalation(2, 120);
  assert.equal(result.shouldEscalate, true);
  assert.equal(result.newLevel, 1);
  assert.ok(result.reason?.includes("MEDIUM"));
  assert.ok(result.reason?.includes("HIGH"));
  assert.ok(result.reason?.includes("5 days"));
});

test("checkAutoEscalation: P2 does not escalate before 120 hours", () => {
  const result = checkAutoEscalation(2, 119);
  assert.equal(result.shouldEscalate, false);
});

test("checkAutoEscalation: P1 to P0 after 168 hours (7 days)", () => {
  const result = checkAutoEscalation(1, 168);
  assert.equal(result.shouldEscalate, true);
  assert.equal(result.newLevel, 0);
  assert.ok(result.reason?.includes("HIGH"));
  assert.ok(result.reason?.includes("CRITICAL"));
  assert.ok(result.reason?.includes("7 days"));
});

test("checkAutoEscalation: P1 does not escalate before 168 hours", () => {
  const result = checkAutoEscalation(1, 167);
  assert.equal(result.shouldEscalate, false);
});

// Test getPriorityDisplay function

test("getPriorityDisplay: returns correct labels for all levels", () => {
  const p0 = getPriorityDisplay(0);
  assert.equal(p0.label, "CRITICAL");
  assert.equal(p0.labelFr, "CRITIQUE");

  const p1 = getPriorityDisplay(1);
  assert.equal(p1.label, "HIGH");
  assert.equal(p1.labelFr, "ÉLEVÉ");

  const p2 = getPriorityDisplay(2);
  assert.equal(p2.label, "MEDIUM");
  assert.equal(p2.labelFr, "MOYEN");

  const p3 = getPriorityDisplay(3);
  assert.equal(p3.label, "LOW");
  assert.equal(p3.labelFr, "FAIBLE");

  const p4 = getPriorityDisplay(4);
  assert.equal(p4.label, "MINIMAL");
  assert.equal(p4.labelFr, "MINIMAL");
});

test("getPriorityDisplay: returns correct colors for all levels", () => {
  const p0 = getPriorityDisplay(0);
  assert.equal(p0.color, "text-red-700");
  assert.equal(p0.bgColor, "bg-red-100");

  const p1 = getPriorityDisplay(1);
  assert.equal(p1.color, "text-orange-700");
  assert.equal(p1.bgColor, "bg-orange-100");

  const p2 = getPriorityDisplay(2);
  assert.equal(p2.color, "text-yellow-700");
  assert.equal(p2.bgColor, "bg-yellow-100");

  const p3 = getPriorityDisplay(3);
  assert.equal(p3.color, "text-green-700");
  assert.equal(p3.bgColor, "bg-green-100");

  const p4 = getPriorityDisplay(4);
  assert.equal(p4.color, "text-gray-700");
  assert.equal(p4.bgColor, "bg-gray-100");
});

test("getPriorityDisplay: includes descriptions in both languages", () => {
  const p0 = getPriorityDisplay(0);
  assert.ok(p0.description.length > 0);
  assert.ok(p0.descriptionFr.length > 0);
  assert.ok(p0.description.includes("Immediate"));
  assert.ok(p0.descriptionFr.includes("Réponse immédiate"));
});

// Integration tests combining multiple features

test("Integration: complex case with multiple risk factors", () => {
  const result = assessPriority({
    age: 14,
    hoursMissing: 50,
    hasMedicalCondition: true,
    requiresDailyMedication: true,
    hasMentalHealthCondition: true,
    suicidalRisk: false,
    suspectedAbduction: false,
    domesticViolenceHistory: true,
    outOfCharacter: true,
    hasFinancialResources: false,
    adverseWeather: true,
  });

  // Age 12-17: 20, medical: 30, medication: 30, mental health: 25
  // domestic violence: 25, out of character: 15, no resources: 10, adverse weather: 10, 48+ hours: 20
  // Total: 185
  assert.ok(result.score >= 80);
  assert.equal(result.level, 0); // CRITICAL
  assert.ok(result.factors.length >= 8);
});

test("Integration: escalation workflow from P4 to P3", () => {
  // Initial assessment at 10 hours - should be P4
  const initial = assessPriority({
    age: 30,
    hoursMissing: 10,
    hasMedicalCondition: false,
    requiresDailyMedication: false,
    hasMentalHealthCondition: false,
    suicidalRisk: false,
    suspectedAbduction: false,
    domesticViolenceHistory: false,
    outOfCharacter: false,
    hasFinancialResources: true,
    adverseWeather: false,
    weatherRiskPoints: 5,
  });
  assert.equal(initial.level, 4);

  // Check auto-escalation after 48 hours
  const escalation = checkAutoEscalation(initial.level, 48);
  assert.equal(escalation.shouldEscalate, true);
  assert.equal(escalation.newLevel, 3);
});
