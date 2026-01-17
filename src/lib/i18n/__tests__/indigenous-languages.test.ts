/**
 * Tests for Indigenous language translations
 */

import { test } from "node:test";
import assert from "node:assert";
import {
  SUPPORTED_LOCALES,
  getMessages,
  translate,
  isLocaleComplete,
  getLocaleCategory,
  normalizeLocale,
} from "../index";

test("Indigenous languages are in supported locales", () => {
  const indigenousLanguages = ["cr", "iu", "oj", "mic"];
  
  indigenousLanguages.forEach((lang) => {
    assert.ok(
      SUPPORTED_LOCALES.includes(lang as any),
      `${lang} should be in SUPPORTED_LOCALES`
    );
  });
});

test("Indigenous languages are categorized correctly", () => {
  const indigenousLanguages = ["cr", "iu", "oj", "mic"];
  
  indigenousLanguages.forEach((lang) => {
    const category = getLocaleCategory(lang as any);
    assert.strictEqual(
      category,
      "indigenous",
      `${lang} should be categorized as indigenous`
    );
  });
});

test("Indigenous languages are marked as incomplete", () => {
  const indigenousLanguages = ["cr", "iu", "oj", "mic"];
  
  indigenousLanguages.forEach((lang) => {
    const complete = isLocaleComplete(lang as any);
    assert.strictEqual(
      complete,
      false,
      `${lang} should be marked as incomplete (requiring professional translation)`
    );
  });
});

test("Indigenous language messages can be loaded", () => {
  const indigenousLanguages = ["cr", "iu", "oj", "mic"];
  
  indigenousLanguages.forEach((lang) => {
    const messages = getMessages(lang as any);
    assert.ok(messages, `Messages should be loaded for ${lang}`);
    assert.ok(messages.common, `Common namespace should exist for ${lang}`);
    assert.ok(messages.intake, `Intake namespace should exist for ${lang}`);
  });
});

test("Indigenous languages fall back to English for navigation", () => {
  const indigenousLanguages = ["cr", "iu", "oj", "mic"];
  
  indigenousLanguages.forEach((lang) => {
    const dashboardText = translate(lang as any, "common", "nav.dashboard");
    assert.strictEqual(
      dashboardText,
      "Dashboard",
      `${lang} should fall back to English for nav.dashboard`
    );
  });
});

test("Indigenous languages have proper structure in common.json", () => {
  const indigenousLanguages = ["cr", "iu", "oj", "mic"];
  
  indigenousLanguages.forEach((lang) => {
    const messages = getMessages(lang as any);
    const common = messages.common as any;
    
    // Check that nav section exists
    assert.ok(common.nav, `${lang} common.json should have nav section`);
    assert.ok(common.nav.dashboard, `${lang} should have nav.dashboard`);
    assert.ok(common.nav.activeCases, `${lang} should have nav.activeCases`);
    
    // Check that sections exist
    assert.ok(common.sections, `${lang} common.json should have sections`);
    
    // Check that language section exists
    assert.ok(common.language, `${lang} common.json should have language section`);
  });
});

test("Indigenous languages have proper structure in intake.json", () => {
  const indigenousLanguages = ["cr", "iu", "oj", "mic"];
  
  indigenousLanguages.forEach((lang) => {
    const messages = getMessages(lang as any);
    const intake = messages.intake as any;
    
    // Check that key sections exist
    assert.ok(intake.header, `${lang} intake.json should have header`);
    assert.ok(intake.steps, `${lang} intake.json should have steps`);
    assert.ok(intake.navigation, `${lang} intake.json should have navigation`);
    assert.ok(intake.reporter, `${lang} intake.json should have reporter section`);
    assert.ok(intake.missingPerson, `${lang} intake.json should have missingPerson section`);
  });
});

test("Locale normalization works for Indigenous languages", () => {
  assert.strictEqual(normalizeLocale("cr"), "cr");
  assert.strictEqual(normalizeLocale("CR"), "cr");
  assert.strictEqual(normalizeLocale("iu"), "iu");
  assert.strictEqual(normalizeLocale("IU"), "iu");
  assert.strictEqual(normalizeLocale("oj"), "oj");
  assert.strictEqual(normalizeLocale("mic"), "mic");
  assert.strictEqual(normalizeLocale("MIC"), "mic");
});

test("Indigenous language files contain translation instructions", () => {
  const indigenousLanguages = ["cr", "iu", "oj", "mic"];
  
  indigenousLanguages.forEach((lang) => {
    const messages = getMessages(lang as any);
    const common = messages.common as any;
    
    // Check for instruction metadata
    assert.ok(
      common._comment || common._instructions,
      `${lang} should have translation instructions`
    );
  });
});
