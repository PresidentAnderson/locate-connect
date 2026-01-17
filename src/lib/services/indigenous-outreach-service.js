/**
 * Indigenous Community Outreach Notification Service
 * LC-FEAT-130: Multilingual notification system for Indigenous communities
 * 
 * This service provides:
 * - Template rendering with variable substitution
 * - Multi-language notification dispatch
 * - Regional targeting by language
 * - Community organization lookup and routing
 */

// =============================================================================
// TEMPLATE RENDERING
// =============================================================================

/**
 * Renders a notification template by substituting variables
 * @param {Object} template The notification template
 * @param {Object} variables The variables to substitute
 * @returns {Object} Rendered notification with substituted values
 */
export function renderTemplate(template, variables) {
  const substitute = (text) => {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      if (value !== undefined && value !== null) {
        const placeholder = `{{${key}}}`;
        result = result.replaceAll(placeholder, String(value));
      }
    }
    return result;
  };

  return {
    languageCode: template.languageCode,
    subject: substitute(template.subject),
    body: substitute(template.body),
    shortBody: substitute(template.shortBody),
  };
}

/**
 * Validates that all required variables are present in the template
 * @param {Object} template The notification template
 * @param {Object} variables The variables provided
 * @returns {string[]} Array of missing variable names
 */
export function validateTemplateVariables(template, variables) {
  const missing = [];
  
  for (const varName of template.variables) {
    if (!(varName in variables) || variables[varName] === undefined || variables[varName] === null) {
      missing.push(varName);
    }
  }
  
  return missing;
}

// =============================================================================
// REGIONAL TARGETING
// =============================================================================

/**
 * Gets communities in a specific region that serve a given language
 * @param {Array} languageMappings Language region mappings
 * @param {Array} organizations Community organizations
 * @param {string} languageCode Language code to filter by
 * @param {string[]} targetProvinces Optional province filter
 * @returns {string[]} Array of organization IDs
 */
export function getCommunitiesByLanguageAndRegion(
  languageMappings,
  organizations,
  languageCode,
  targetProvinces
) {
  // Find the language mapping
  const langMapping = languageMappings.find(lm => lm.languageCode === languageCode);
  if (!langMapping) {
    return [];
  }

  // Determine relevant provinces
  const relevantProvinces = targetProvinces && targetProvinces.length > 0
    ? targetProvinces.filter(p => langMapping.provinces.includes(p))
    : langMapping.provinces;

  // Filter organizations by language and province
  const matchingOrgs = organizations.filter(org => {
    // Check if organization serves the language
    const servesLanguage = org.languagesServed.includes(languageCode) ||
                          org.primaryLanguage === languageCode;
    
    // Check if organization is in relevant province
    const inRelevantProvince = org.province && relevantProvinces.includes(org.province);
    
    // Must be active and match both criteria
    return org.isActive && servesLanguage && inRelevantProvince;
  });

  return matchingOrgs.map(org => org.id);
}

/**
 * Determines which languages to use based on regional targeting
 * @param {Object} targeting Regional targeting configuration
 * @param {Array} languageMappings Available language mappings
 * @returns {string[]} Array of language codes that should be used
 */
export function selectLanguagesForRegion(targeting, languageMappings) {
  const selectedLanguages = new Set();

  // If specific languages are requested, use those
  if (targeting.languages && targeting.languages.length > 0) {
    targeting.languages.forEach(lang => selectedLanguages.add(lang));
  }

  // Add languages common to the target provinces
  if (targeting.provinces && targeting.provinces.length > 0) {
    languageMappings.forEach(mapping => {
      if (mapping.isActive) {
        // Check if this language is used in any of the target provinces
        const usedInTargetProvinces = targeting.provinces.some(province =>
          mapping.provinces.includes(province)
        );
        
        if (usedInTargetProvinces) {
          selectedLanguages.add(mapping.languageCode);
        }
      }
    });
  }

  // Always include English and French as official languages
  selectedLanguages.add('en');
  selectedLanguages.add('fr');

  return Array.from(selectedLanguages);
}

// =============================================================================
// NOTIFICATION DISPATCH
// =============================================================================

/**
 * Creates notification queue items for multi-language dispatch
 * This function prepares notifications but doesn't send them.
 * Actual sending is handled by a background worker or API endpoint.
 * 
 * @param {Object} dispatch Multi-language dispatch configuration
 * @param {Array} templates Available notification templates
 * @param {Array} organizations Community organizations to notify
 * @returns {Object} Notification queue inputs and errors
 */
export function prepareMultiLanguageNotifications(dispatch, templates, organizations) {
  const queueItems = [];
  const errors = [];

  // Process each target language
  for (const languageCode of dispatch.targetLanguages) {
    // Find the template for this language and type
    const template = templates.find(
      t => t.templateType === dispatch.templateType &&
           t.languageCode === languageCode &&
           t.isApproved
    );

    if (!template) {
      errors.push({
        languageCode,
        channel: 'email', // Default channel for error reporting
        error: `No approved template found for ${dispatch.templateType} in ${languageCode}`,
      });
      continue;
    }

    // Validate variables
    const missingVars = validateTemplateVariables(template, dispatch.variables);
    if (missingVars.length > 0) {
      errors.push({
        languageCode,
        channel: 'email',
        error: `Missing required variables: ${missingVars.join(', ')}`,
      });
      continue;
    }

    // Render the template
    const rendered = renderTemplate(template, dispatch.variables);

    // Create queue items for each channel
    for (const channel of dispatch.channels) {
      // Determine recipients for this language/channel combination
      const recipients = getRecipientsForLanguageAndChannel(
        organizations,
        languageCode,
        channel,
        dispatch.targetCommunities,
        dispatch.targetOrganizations
      );

      // Create a queue item for each recipient
      for (const recipient of recipients) {
        const queueItem = {
          caseId: dispatch.caseId,
          organizationId: recipient.organizationId,
          communityId: recipient.communityId,
          notificationType: dispatch.templateType,
          channel,
          priority: dispatch.priority,
          languageCode,
          subject: rendered.subject,
          body: channel === 'sms' ? rendered.shortBody : rendered.body,
          shortBody: rendered.shortBody,
          metadata: {
            templateId: template.id,
            variables: dispatch.variables,
            recipientType: recipient.type,
          },
          scheduledFor: dispatch.scheduledFor || new Date().toISOString(),
        };

        queueItems.push(queueItem);
      }

      // If no specific recipients, create a broadcast item
      if (recipients.length === 0) {
        const queueItem = {
          caseId: dispatch.caseId,
          notificationType: dispatch.templateType,
          channel,
          priority: dispatch.priority,
          languageCode,
          subject: rendered.subject,
          body: channel === 'sms' ? rendered.shortBody : rendered.body,
          shortBody: rendered.shortBody,
          metadata: {
            templateId: template.id,
            variables: dispatch.variables,
            broadcast: true,
          },
          scheduledFor: dispatch.scheduledFor || new Date().toISOString(),
        };

        queueItems.push(queueItem);
      }
    }
  }

  return { queueItems, errors };
}

/**
 * Gets recipients for a specific language and channel combination
 * @private
 */
function getRecipientsForLanguageAndChannel(
  organizations,
  languageCode,
  channel,
  targetCommunities,
  targetOrganizations
) {
  const recipients = [];

  // Filter organizations by language support and channel preferences
  const relevantOrgs = organizations.filter(org => {
    // Must be active
    if (!org.isActive) return false;

    // Check language support
    const servesLanguage = org.languagesServed.includes(languageCode) ||
                          org.primaryLanguage === languageCode;
    if (!servesLanguage) return false;

    // Check if organization accepts notifications via this channel
    const prefs = org.notificationPreferences;
    if (channel === 'email' && !prefs.emailEnabled) return false;
    if (channel === 'sms' && !prefs.smsEnabled) return false;

    // Check if targeting specific organizations or communities
    if (targetOrganizations && targetOrganizations.length > 0) {
      return targetOrganizations.includes(org.id);
    }

    return true;
  });

  // Add organizations as recipients
  for (const org of relevantOrgs) {
    recipients.push({
      organizationId: org.id,
      type: 'organization',
    });
  }

  return recipients;
}

// =============================================================================
// TEMPLATE HELPERS
// =============================================================================

/**
 * Gets all available templates for a specific template type
 * @param {Array} templates All templates
 * @param {string} templateType The type of template to filter
 * @returns {Object} Templates grouped by language code
 */
export function getTemplatesByType(templates, templateType) {
  const result = {};

  templates
    .filter(t => t.templateType === templateType && t.isApproved)
    .forEach(template => {
      result[template.languageCode] = template;
    });

  return result;
}

/**
 * Gets supported languages for a template type
 * @param {Array} templates All templates
 * @param {string} templateType The type of template
 * @returns {string[]} Array of language codes that have approved templates
 */
export function getSupportedLanguages(templates, templateType) {
  return templates
    .filter(t => t.templateType === templateType && t.isApproved)
    .map(t => t.languageCode);
}

// =============================================================================
// STATISTICS AND METRICS
// =============================================================================

/**
 * Calculates coverage statistics for language support
 * @param {Array} languageMappings Language mappings
 * @param {Array} templates Available templates
 * @returns {Object} Coverage statistics
 */
export function calculateLanguageCoverage(languageMappings, templates) {
  const activeLanguages = languageMappings.filter(lm => lm.isActive);
  const totalLanguages = activeLanguages.length;

  // Get unique language codes from templates
  const languagesWithTemplates = new Set(
    templates.filter(t => t.isApproved).map(t => t.languageCode)
  );

  const coveredLanguages = activeLanguages.filter(lang =>
    languagesWithTemplates.has(lang.languageCode)
  ).length;

  const uncoveredLanguages = activeLanguages
    .filter(lang => !languagesWithTemplates.has(lang.languageCode))
    .map(lang => lang.languageName);

  // Calculate coverage by template type
  const templateTypes = [
    'missing_alert',
    'amber_alert',
    'found_safe',
    'wellness_check',
    'community_assistance',
    'case_update',
  ];

  const coverageByTemplateType = {};

  for (const templateType of templateTypes) {
    const languagesForType = new Set(
      templates
        .filter(t => t.templateType === templateType && t.isApproved)
        .map(t => t.languageCode)
    );

    const covered = activeLanguages.filter(lang =>
      languagesForType.has(lang.languageCode)
    ).length;

    coverageByTemplateType[templateType] = totalLanguages > 0
      ? Math.round((covered / totalLanguages) * 100)
      : 0;
  }

  return {
    totalLanguages,
    coveredLanguages,
    coverageByTemplateType,
    uncoveredLanguages,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const IndigenousOutreachService = {
  renderTemplate,
  validateTemplateVariables,
  getCommunitiesByLanguageAndRegion,
  selectLanguagesForRegion,
  prepareMultiLanguageNotifications,
  getTemplatesByType,
  getSupportedLanguages,
  calculateLanguageCoverage,
};
