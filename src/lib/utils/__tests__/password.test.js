import test from "node:test";
import assert from "node:assert/strict";
import { validatePasswordReset } from "../password.js";

test("validatePasswordReset enforces length", () => {
  assert.equal(validatePasswordReset("", ""), "Password must be at least 8 characters");
  assert.equal(validatePasswordReset("short", "short"), "Password must be at least 8 characters");
});

test("validatePasswordReset enforces confirmation match", () => {
  assert.equal(validatePasswordReset("longenough", "different"), "Passwords do not match");
});

test("validatePasswordReset accepts valid input", () => {
  assert.equal(validatePasswordReset("longenough", "longenough"), null);
});
