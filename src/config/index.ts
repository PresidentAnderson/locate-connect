export { siteConfig } from "./site";

// Language configuration
export {
  ALL_LANGUAGES,
  OFFICIAL_LANGUAGES,
  INDIGENOUS_LANGUAGES,
  IMMIGRANT_LANGUAGES,
  LANGUAGE_FAMILIES,
  SYLLABICS_LANGUAGES,
  PRIMARY_INDIGENOUS_LANGUAGES,
  getLanguageByCode,
  getIndigenousLanguages,
  getLanguagesByFamily,
  getLanguagesByRegion,
  getPrimaryIndigenousLanguages,
  usesSyllabics,
  containsSyllabics,
  getLanguageDisplayName,
  getLanguagesGroupedByFamily,
} from "./languages";

export type { Language } from "./languages";
