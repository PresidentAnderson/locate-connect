import test from "node:test";
import assert from "node:assert/strict";
import { validateStatusTransition } from "../lead-service.js";

test("validateStatusTransition allows new -> investigating", () => {
  const result = validateStatusTransition("new", "investigating");
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test("validateStatusTransition allows new -> dismissed", () => {
  const result = validateStatusTransition("new", "dismissed");
  assert.equal(result.valid, true);
});

test("validateStatusTransition allows investigating -> verified", () => {
  const result = validateStatusTransition("investigating", "verified");
  assert.equal(result.valid, true);
});

test("validateStatusTransition allows investigating -> dismissed", () => {
  const result = validateStatusTransition("investigating", "dismissed");
  assert.equal(result.valid, true);
});

test("validateStatusTransition allows investigating -> new (revert)", () => {
  const result = validateStatusTransition("investigating", "new");
  assert.equal(result.valid, true);
});

test("validateStatusTransition allows verified -> acted_upon", () => {
  const result = validateStatusTransition("verified", "acted_upon");
  assert.equal(result.valid, true);
});

test("validateStatusTransition allows verified -> dismissed", () => {
  const result = validateStatusTransition("verified", "dismissed");
  assert.equal(result.valid, true);
});

test("validateStatusTransition allows dismissed -> new (reopen)", () => {
  const result = validateStatusTransition("dismissed", "new");
  assert.equal(result.valid, true);
});

test("validateStatusTransition allows dismissed -> investigating (reopen)", () => {
  const result = validateStatusTransition("dismissed", "investigating");
  assert.equal(result.valid, true);
});

test("validateStatusTransition allows acted_upon -> dismissed", () => {
  const result = validateStatusTransition("acted_upon", "dismissed");
  assert.equal(result.valid, true);
});

test("validateStatusTransition allows same status transition", () => {
  const result = validateStatusTransition("new", "new");
  assert.equal(result.valid, true);
});

test("validateStatusTransition rejects new -> verified (skip investigating)", () => {
  const result = validateStatusTransition("new", "verified");
  assert.equal(result.valid, false);
  assert.ok(result.error);
  assert.ok(result.error.includes("Invalid status transition"));
});

test("validateStatusTransition rejects new -> acted_upon", () => {
  const result = validateStatusTransition("new", "acted_upon");
  assert.equal(result.valid, false);
  assert.ok(result.error);
});

test("validateStatusTransition rejects investigating -> acted_upon (skip verified)", () => {
  const result = validateStatusTransition("investigating", "acted_upon");
  assert.equal(result.valid, false);
  assert.ok(result.error);
});

test("validateStatusTransition rejects verified -> new", () => {
  const result = validateStatusTransition("verified", "new");
  assert.equal(result.valid, false);
  assert.ok(result.error);
});

test("validateStatusTransition rejects verified -> investigating", () => {
  const result = validateStatusTransition("verified", "investigating");
  assert.equal(result.valid, false);
  assert.ok(result.error);
});

test("validateStatusTransition rejects acted_upon -> new", () => {
  const result = validateStatusTransition("acted_upon", "new");
  assert.equal(result.valid, false);
  assert.ok(result.error);
});

test("validateStatusTransition rejects acted_upon -> investigating", () => {
  const result = validateStatusTransition("acted_upon", "investigating");
  assert.equal(result.valid, false);
  assert.ok(result.error);
});

test("validateStatusTransition rejects acted_upon -> verified", () => {
  const result = validateStatusTransition("acted_upon", "verified");
  assert.equal(result.valid, false);
  assert.ok(result.error);
});
