import test from "node:test";
import assert from "node:assert/strict";
import {
  renderTemplate,
  validateTemplateVariables,
  getCommunitiesByLanguageAndRegion,
  selectLanguagesForRegion,
  prepareMultiLanguageNotifications,
  getSupportedLanguages,
  calculateLanguageCoverage,
} from "../indigenous-outreach-service.js";

// Test Data
const sampleTemplate = {
  id: "template-1",
  templateType: "missing_alert",
  languageCode: "en",
  subject: "Missing Person: {{name}}",
  body: "{{name}}, age {{age}}, was last seen at {{last_seen_location}} on {{last_seen_date}}. Contact: {{contact}}",
  shortBody: "Missing: {{name}}, {{age}}. {{last_seen_location}}. Call {{contact}}",
  variables: ["name", "age", "last_seen_location", "last_seen_date", "contact"],
  isApproved: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const sampleVariables = {
  name: "John Doe",
  age: "45",
  last_seen_location: "Thunder Bay, ON",
  last_seen_date: "2024-01-15",
  contact: "1-800-555-0123",
};

const sampleLanguageMapping = {
  id: "lang-1",
  languageCode: "cr",
  languageName: "Cree",
  iso6393: "cre",
  provinces: ["MB", "SK", "AB", "ON", "QC"],
  regions: ["Northern Ontario", "Northern Manitoba"],
  primaryRegions: ["Northern Ontario"],
  speakerPopulationEstimate: 96000,
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const sampleOrganization = {
  id: "org-1",
  name: "Test Indigenous Organization",
  type: "band_council",
  languagesServed: ["cr", "en"],
  primaryLanguage: "cr",
  province: "ON",
  notificationPreferences: {
    emailEnabled: true,
    smsEnabled: true,
    acceptsAlerts: true,
  },
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

// =============================================================================
// TEMPLATE RENDERING TESTS
// =============================================================================

test("renderTemplate substitutes all variables correctly", () => {
  const rendered = renderTemplate(sampleTemplate, sampleVariables);
  
  assert.equal(rendered.languageCode, "en");
  assert.equal(rendered.subject, "Missing Person: John Doe");
  assert(rendered.body.includes("John Doe"));
  assert(rendered.body.includes("45"));
  assert(rendered.body.includes("Thunder Bay, ON"));
  assert(rendered.shortBody.includes("John Doe"));
});

test("renderTemplate handles missing variables gracefully", () => {
  const partialVariables = {
    name: "John Doe",
    age: "45",
  };
  
  const rendered = renderTemplate(sampleTemplate, partialVariables);
  
  // Should still have placeholders for missing variables
  assert(rendered.body.includes("{{last_seen_location}}"));
  assert(rendered.body.includes("{{contact}}"));
});

test("renderTemplate handles numeric values", () => {
  const numericVariables = {
    ...sampleVariables,
    age: 45, // Numeric instead of string
  };
  
  const rendered = renderTemplate(sampleTemplate, numericVariables);
  
  assert(rendered.body.includes("45"));
});

// =============================================================================
// VARIABLE VALIDATION TESTS
// =============================================================================

test("validateTemplateVariables returns empty array when all variables present", () => {
  const missing = validateTemplateVariables(sampleTemplate, sampleVariables);
  assert.equal(missing.length, 0);
});

test("validateTemplateVariables identifies missing variables", () => {
  const partialVariables = {
    name: "John Doe",
    age: "45",
  };
  
  const missing = validateTemplateVariables(sampleTemplate, partialVariables);
  
  assert.equal(missing.length, 3);
  assert(missing.includes("last_seen_location"));
  assert(missing.includes("last_seen_date"));
  assert(missing.includes("contact"));
});

test("validateTemplateVariables treats null and undefined as missing", () => {
  const variablesWithNulls = {
    name: "John Doe",
    age: null,
    last_seen_location: undefined,
    last_seen_date: "2024-01-15",
    contact: "1-800-555-0123",
  };
  
  const missing = validateTemplateVariables(sampleTemplate, variablesWithNulls);
  
  assert(missing.includes("age"));
  assert(missing.includes("last_seen_location"));
});

// =============================================================================
// REGIONAL TARGETING TESTS
// =============================================================================

test("getCommunitiesByLanguageAndRegion filters by language and province", () => {
  const languageMappings = [sampleLanguageMapping];
  const organizations = [
    sampleOrganization,
    {
      ...sampleOrganization,
      id: "org-2",
      province: "BC",
      languagesServed: ["en"],
    },
  ];
  
  const results = getCommunitiesByLanguageAndRegion(
    languageMappings,
    organizations,
    "cr",
    ["ON"]
  );
  
  assert.equal(results.length, 1);
  assert.equal(results[0], "org-1");
});

test("getCommunitiesByLanguageAndRegion returns empty for unsupported language", () => {
  const results = getCommunitiesByLanguageAndRegion(
    [sampleLanguageMapping],
    [sampleOrganization],
    "unsupported-lang"
  );
  
  assert.equal(results.length, 0);
});

test("selectLanguagesForRegion includes specified languages", () => {
  const targeting = {
    languages: ["cr", "oj"],
    provinces: ["ON"],
    regions: [],
    communities: [],
  };
  
  const languages = selectLanguagesForRegion(targeting, [sampleLanguageMapping]);
  
  assert(languages.includes("cr"));
  assert(languages.includes("oj"));
  assert(languages.includes("en")); // Always included
  assert(languages.includes("fr")); // Always included
});

test("selectLanguagesForRegion adds languages for target provinces", () => {
  const targeting = {
    languages: [],
    provinces: ["ON", "MB"],
    regions: [],
    communities: [],
  };
  
  const languages = selectLanguagesForRegion(targeting, [sampleLanguageMapping]);
  
  assert(languages.includes("cr")); // Cree is used in ON and MB
  assert(languages.includes("en"));
  assert(languages.includes("fr"));
});

// =============================================================================
// MULTI-LANGUAGE DISPATCH TESTS
// =============================================================================

test("prepareMultiLanguageNotifications creates queue items for each language", () => {
  const dispatch = {
    caseId: "case-123",
    templateType: "missing_alert",
    variables: sampleVariables,
    targetLanguages: ["en"],
    channels: ["email"],
    priority: "high",
  };
  
  const templates = [sampleTemplate];
  const organizations = [sampleOrganization];
  
  const result = prepareMultiLanguageNotifications(dispatch, templates, organizations);
  
  assert(result.queueItems.length > 0);
  assert.equal(result.errors.length, 0);
  assert.equal(result.queueItems[0].languageCode, "en");
  assert.equal(result.queueItems[0].channel, "email");
});

test("prepareMultiLanguageNotifications reports errors for missing templates", () => {
  const dispatch = {
    caseId: "case-123",
    templateType: "missing_alert",
    variables: sampleVariables,
    targetLanguages: ["unsupported-lang"],
    channels: ["email"],
    priority: "high",
  };
  
  const result = prepareMultiLanguageNotifications(dispatch, [sampleTemplate], []);
  
  assert.equal(result.queueItems.length, 0);
  assert(result.errors.length > 0);
  assert(result.errors[0].languageCode === "unsupported-lang");
});

test("prepareMultiLanguageNotifications validates required variables", () => {
  const dispatch = {
    caseId: "case-123",
    templateType: "missing_alert",
    variables: { name: "John Doe" }, // Missing required variables
    targetLanguages: ["en"],
    channels: ["email"],
    priority: "high",
  };
  
  const result = prepareMultiLanguageNotifications(dispatch, [sampleTemplate], []);
  
  assert(result.errors.length > 0);
  assert(result.errors[0].error.includes("Missing required variables"));
});

// =============================================================================
// TEMPLATE HELPER TESTS
// =============================================================================

test("getSupportedLanguages returns languages with approved templates", () => {
  const templates = [
    sampleTemplate,
    {
      ...sampleTemplate,
      id: "template-2",
      languageCode: "fr",
    },
    {
      ...sampleTemplate,
      id: "template-3",
      languageCode: "cr",
      isApproved: false, // Not approved
    },
  ];
  
  const languages = getSupportedLanguages(templates, "missing_alert");
  
  assert.equal(languages.length, 2);
  assert(languages.includes("en"));
  assert(languages.includes("fr"));
  assert(!languages.includes("cr")); // Not approved
});

// =============================================================================
// COVERAGE STATISTICS TESTS
// =============================================================================

test("calculateLanguageCoverage reports coverage statistics", () => {
  const languageMappings = [
    sampleLanguageMapping,
    {
      ...sampleLanguageMapping,
      id: "lang-2",
      languageCode: "oj",
      languageName: "Ojibwe",
    },
    {
      ...sampleLanguageMapping,
      id: "lang-3",
      languageCode: "en",
      languageName: "English",
    },
  ];
  
  const templates = [
    sampleTemplate, // English only
  ];
  
  const coverage = calculateLanguageCoverage(languageMappings, templates);
  
  assert.equal(coverage.totalLanguages, 3);
  assert.equal(coverage.coveredLanguages, 1); // Only English has template
  assert.equal(coverage.uncoveredLanguages.length, 2);
  assert(coverage.uncoveredLanguages.includes("Cree"));
  assert(coverage.uncoveredLanguages.includes("Ojibwe"));
});

test("calculateLanguageCoverage calculates coverage by template type", () => {
  const languageMappings = [sampleLanguageMapping];
  
  const templates = [
    sampleTemplate,
    {
      ...sampleTemplate,
      id: "template-2",
      templateType: "found_safe",
    },
  ];
  
  const coverage = calculateLanguageCoverage(languageMappings, templates);
  
  assert(coverage.coverageByTemplateType.missing_alert >= 0);
  assert(coverage.coverageByTemplateType.found_safe >= 0);
});
