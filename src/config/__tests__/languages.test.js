/**
 * Tests for Indigenous Languages Configuration
 */

import { test } from "node:test";
import assert from "node:assert";
import {
  INDIGENOUS_LANGUAGES,
  OFFICIAL_LANGUAGES,
  ALL_LANGUAGES,
  getLanguageByCode,
  getLanguagesByFamily,
  getLanguagesByRegion,
  getLanguagesByStatus,
  getLanguagesByWritingSystem,
  getTotalIndigenousSpeakers,
  getCriticallyEndangeredLanguages,
  getLanguageStatistics,
  usesSyllabics,
  containsSyllabics,
} from "../languages.ts";

test("should have at least 50 Indigenous languages", () => {
  assert.ok(
    INDIGENOUS_LANGUAGES.length >= 50,
    `Expected at least 50 Indigenous languages, got ${INDIGENOUS_LANGUAGES.length}`
  );
});

test("all Indigenous languages should have required fields", () => {
  INDIGENOUS_LANGUAGES.forEach((lang) => {
    assert.ok(lang.code, `Language missing code: ${JSON.stringify(lang)}`);
    assert.ok(lang.name, `Language ${lang.code} missing name`);
    assert.ok(lang.nativeName, `Language ${lang.code} missing nativeName`);
    assert.ok(lang.family, `Language ${lang.code} missing family`);
    assert.ok(lang.region, `Language ${lang.code} missing region`);
    assert.strictEqual(lang.isIndigenous, true, `Language ${lang.code} should be Indigenous`);
    assert.ok(lang.speakerCount !== undefined, `Language ${lang.code} missing speakerCount`);
    assert.ok(lang.writingSystem, `Language ${lang.code} missing writingSystem`);
    assert.ok(lang.status, `Language ${lang.code} missing status`);
  });
});

test("all Indigenous languages should have valid ISO 639-3 codes", () => {
  INDIGENOUS_LANGUAGES.forEach((lang) => {
    // ISO 639-3 codes are 3 letters or variants like "cr-syl", "iu-syl"
    const validCodePattern = /^[a-z]{2,3}(-[a-z]+)?$/;
    assert.ok(
      validCodePattern.test(lang.code),
      `Language ${lang.name} has invalid code: ${lang.code}`
    );
  });
});

test("writing systems should be valid", () => {
  const validWritingSystems = ["latin", "syllabics", "both"];
  INDIGENOUS_LANGUAGES.forEach((lang) => {
    assert.ok(
      lang.writingSystem && validWritingSystems.includes(lang.writingSystem),
      `Language ${lang.name} has invalid writing system: ${lang.writingSystem}`
    );
  });
});

test("endangerment status should be valid", () => {
  const validStatuses = ["endangered", "threatened", "stable"];
  INDIGENOUS_LANGUAGES.forEach((lang) => {
    assert.ok(
      lang.status && validStatuses.includes(lang.status),
      `Language ${lang.name} has invalid status: ${lang.status}`
    );
  });
});

test("speaker counts should be positive numbers", () => {
  INDIGENOUS_LANGUAGES.forEach((lang) => {
    assert.ok(
      lang.speakerCount && lang.speakerCount > 0,
      `Language ${lang.name} has invalid speaker count: ${lang.speakerCount}`
    );
  });
});

test("getLanguageByCode should find languages", () => {
  const cree = getLanguageByCode("cr");
  assert.ok(cree);
  assert.strictEqual(cree.name, "Cree");

  const inuktitut = getLanguageByCode("iu");
  assert.ok(inuktitut);
  assert.strictEqual(inuktitut.name, "Inuktitut");
});

test("getLanguagesByFamily should group by family", () => {
  const algonquian = getLanguagesByFamily("Algonquian");
  assert.ok(algonquian.length > 0);
  algonquian.forEach((lang) => {
    assert.strictEqual(lang.family, "Algonquian");
  });

  const inuit = getLanguagesByFamily("Inuit");
  assert.ok(inuit.length > 0);
  inuit.forEach((lang) => {
    assert.strictEqual(lang.family, "Inuit");
  });
});

test("getLanguagesByRegion should filter by region", () => {
  const bcLanguages = getLanguagesByRegion("British Columbia");
  assert.ok(bcLanguages.length > 0);
  bcLanguages.forEach((lang) => {
    assert.ok(lang.region?.includes("British Columbia"));
  });

  const nunavutLanguages = getLanguagesByRegion("Nunavut");
  assert.ok(nunavutLanguages.length > 0);
  nunavutLanguages.forEach((lang) => {
    assert.ok(lang.region?.includes("Nunavut"));
  });
});

test("getLanguagesByStatus should filter by endangerment status", () => {
  const endangered = getLanguagesByStatus("endangered");
  assert.ok(endangered.length > 0);
  endangered.forEach((lang) => {
    assert.strictEqual(lang.status, "endangered");
  });

  const threatened = getLanguagesByStatus("threatened");
  assert.ok(threatened.length > 0);
  threatened.forEach((lang) => {
    assert.strictEqual(lang.status, "threatened");
  });
});

test("getLanguagesByWritingSystem should filter by writing system", () => {
  const latinOnly = getLanguagesByWritingSystem("latin");
  assert.ok(latinOnly.length > 0);
  latinOnly.forEach((lang) => {
    assert.strictEqual(lang.writingSystem, "latin");
  });

  const syllabicsOnly = getLanguagesByWritingSystem("syllabics");
  assert.ok(syllabicsOnly.length > 0);
  syllabicsOnly.forEach((lang) => {
    assert.strictEqual(lang.writingSystem, "syllabics");
  });

  const both = getLanguagesByWritingSystem("both");
  assert.ok(both.length > 0);
  both.forEach((lang) => {
    assert.strictEqual(lang.writingSystem, "both");
  });
});

test("getTotalIndigenousSpeakers should calculate total", () => {
  const total = getTotalIndigenousSpeakers();
  assert.ok(total > 0);
  // Should be at least 150,000 based on major languages
  assert.ok(total > 150000, `Total speakers (${total}) should be > 150,000`);
});

test("getCriticallyEndangeredLanguages should find languages with < 100 speakers", () => {
  const critical = getCriticallyEndangeredLanguages();
  assert.ok(critical.length > 0);
  critical.forEach((lang) => {
    assert.ok(lang.speakerCount && lang.speakerCount < 100);
  });
});

test("getLanguageStatistics should return valid statistics", () => {
  const stats = getLanguageStatistics();
  
  assert.ok(stats.totalLanguages >= 50);
  assert.ok(stats.totalSpeakers > 0);
  
  // Check status counts
  assert.ok(stats.byStatus.endangered > 0);
  assert.ok(stats.byStatus.threatened >= 0);
  
  // Check writing system counts
  assert.ok(stats.byWritingSystem.latin > 0);
  assert.ok(stats.byWritingSystem.syllabics > 0 || stats.byWritingSystem.both > 0);
  
  // Check family counts
  assert.ok(stats.byFamily["Algonquian"] > 0);
  assert.ok(stats.byFamily["Inuit"] > 0);
  assert.ok(stats.byFamily["Athabaskan"] > 0);
});

test("usesSyllabics should identify syllabics languages", () => {
  assert.strictEqual(usesSyllabics("cr-syl"), true);
  assert.strictEqual(usesSyllabics("iu-syl"), true);
  assert.strictEqual(usesSyllabics("nsk"), true);
  assert.strictEqual(usesSyllabics("mic"), false);
});

test("containsSyllabics should detect syllabics in text", () => {
  assert.strictEqual(containsSyllabics("ᓀᐦᐃᔭᐍᐏᐣ"), true);
  assert.strictEqual(containsSyllabics("ᐃᓄᒃᑎᑐᑦ"), true);
  assert.strictEqual(containsSyllabics("Hello"), false);
  assert.strictEqual(containsSyllabics("Nēhiyawēwin"), false);
});

test("should have languages from all 7 major families", () => {
  const families = new Set(INDIGENOUS_LANGUAGES.map((lang) => lang.family));
  
  assert.ok(families.has("Algonquian"), "Should have Algonquian languages");
  assert.ok(families.has("Inuit"), "Should have Inuit languages");
  assert.ok(families.has("Athabaskan"), "Should have Athabaskan languages");
  assert.ok(families.has("Iroquoian"), "Should have Iroquoian languages");
  assert.ok(families.has("Siouan"), "Should have Siouan languages");
  assert.ok(families.has("Salish"), "Should have Salish languages");
  assert.ok(families.has("Wakashan"), "Should have Wakashan languages");
});

test("Cree should have correct metadata", () => {
  const cree = getLanguageByCode("cr");
  assert.ok(cree);
  assert.strictEqual(cree.name, "Cree");
  assert.strictEqual(cree.family, "Algonquian");
  assert.strictEqual(cree.speakerCount, 96000);
  assert.strictEqual(cree.writingSystem, "both");
  assert.strictEqual(cree.status, "threatened");
});

test("Inuktitut should have correct metadata", () => {
  const inuktitut = getLanguageByCode("iu");
  assert.ok(inuktitut);
  assert.strictEqual(inuktitut.name, "Inuktitut");
  assert.strictEqual(inuktitut.family, "Inuit");
  assert.strictEqual(inuktitut.speakerCount, 39000);
  assert.strictEqual(inuktitut.writingSystem, "both");
  assert.strictEqual(inuktitut.status, "threatened");
});

test("should have both official languages", () => {
  assert.strictEqual(OFFICIAL_LANGUAGES.length, 2);
  const codes = OFFICIAL_LANGUAGES.map((lang) => lang.code);
  assert.ok(codes.includes("en"));
  assert.ok(codes.includes("fr"));
});

test("ALL_LANGUAGES should include official, immigrant, and Indigenous languages", () => {
  assert.ok(ALL_LANGUAGES.length > INDIGENOUS_LANGUAGES.length);
  
  // Should find both official and Indigenous languages
  const english = ALL_LANGUAGES.find((lang) => lang.code === "en");
  const cree = ALL_LANGUAGES.find((lang) => lang.code === "cr");
  
  assert.ok(english);
  assert.ok(cree);
});
