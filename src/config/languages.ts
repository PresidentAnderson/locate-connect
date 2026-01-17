/**
 * LocateConnect Language Configuration
 * Includes official languages and Canadian Indigenous languages
 */

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  family?: string;
  region?: string;
  isIndigenous: boolean;
  isOfficial: boolean;
  direction: "ltr" | "rtl";
}

// Official Languages
export const OFFICIAL_LANGUAGES: Language[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    isIndigenous: false,
    isOfficial: true,
    direction: "ltr",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    isIndigenous: false,
    isOfficial: true,
    direction: "ltr",
  },
];

// Canadian Indigenous Languages
export const INDIGENOUS_LANGUAGES: Language[] = [
  // Algonquian Languages
  {
    code: "cr",
    name: "Cree",
    nativeName: "ᓀᐦᐃᔭᐍᐏᐣ (Nēhiyawēwin)",
    family: "Algonquian",
    region: "Alberta, Saskatchewan, Manitoba, Ontario, Quebec",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "cr-syl",
    name: "Cree (Syllabics)",
    nativeName: "ᓀᐦᐃᔭᐍᐏᐣ",
    family: "Algonquian",
    region: "Alberta, Saskatchewan, Manitoba, Ontario, Quebec",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "oj",
    name: "Ojibwe",
    nativeName: "Anishinaabemowin",
    family: "Algonquian",
    region: "Ontario, Manitoba, Saskatchewan",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "oj-cr",
    name: "Oji-Cree",
    nativeName: "Anihshininiimowin",
    family: "Algonquian",
    region: "Northern Ontario, Manitoba",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "alq",
    name: "Algonquin",
    nativeName: "Anicinàbemowin",
    family: "Algonquian",
    region: "Quebec, Ontario",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "mic",
    name: "Mi'kmaq",
    nativeName: "Míkmawísimk",
    family: "Algonquian",
    region: "Nova Scotia, New Brunswick, PEI, Newfoundland, Quebec",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "moe",
    name: "Innu-aimun",
    nativeName: "Innu-aimun",
    family: "Algonquian",
    region: "Quebec, Labrador",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "atj",
    name: "Atikamekw",
    nativeName: "Atikamekw Nehiromowin",
    family: "Algonquian",
    region: "Quebec",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "nsk",
    name: "Naskapi",
    nativeName: "ᓇᔅᑲᐱ (Naskapi)",
    family: "Algonquian",
    region: "Quebec",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "bla",
    name: "Blackfoot",
    nativeName: "Siksiká",
    family: "Algonquian",
    region: "Alberta",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },

  // Inuit Languages
  {
    code: "iu",
    name: "Inuktitut",
    nativeName: "ᐃᓄᒃᑎᑐᑦ (Inuktitut)",
    family: "Inuit",
    region: "Nunavut, Nunavik (Quebec), Nunatsiavut (Labrador)",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "iu-syl",
    name: "Inuktitut (Syllabics)",
    nativeName: "ᐃᓄᒃᑎᑐᑦ",
    family: "Inuit",
    region: "Nunavut, Nunavik (Quebec)",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "ikt",
    name: "Inuinnaqtun",
    nativeName: "Inuinnaqtun",
    family: "Inuit",
    region: "Western Nunavut, Northwest Territories",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "kal",
    name: "Inuvialuktun",
    nativeName: "Inuvialuktun",
    family: "Inuit",
    region: "Northwest Territories (Inuvik region)",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },

  // Athabaskan/Dene Languages
  {
    code: "chp",
    name: "Dene (Chipewyan)",
    nativeName: "Dëne Sųłiné",
    family: "Athabaskan",
    region: "Northwest Territories, Alberta, Saskatchewan, Manitoba",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "dgr",
    name: "Tłı̨chǫ (Dogrib)",
    nativeName: "Tłı̨chǫ Yatıì",
    family: "Athabaskan",
    region: "Northwest Territories",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "gwi",
    name: "Gwich'in",
    nativeName: "Gwich'in",
    family: "Athabaskan",
    region: "Northwest Territories, Yukon",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "scs",
    name: "North Slavey",
    nativeName: "Sahtúot'ı̨nę Yatı̨́",
    family: "Athabaskan",
    region: "Northwest Territories",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "xsl",
    name: "South Slavey",
    nativeName: "Dene Zhatıé",
    family: "Athabaskan",
    region: "Northwest Territories",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "den",
    name: "Dane-zaa (Beaver)",
    nativeName: "Dane-Zaa Záágéʔ",
    family: "Athabaskan",
    region: "Alberta, British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "tce",
    name: "Southern Tutchone",
    nativeName: "Southern Tutchone",
    family: "Athabaskan",
    region: "Yukon",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "ttm",
    name: "Northern Tutchone",
    nativeName: "Northern Tutchone",
    family: "Athabaskan",
    region: "Yukon",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "tgx",
    name: "Tagish",
    nativeName: "Tagish",
    family: "Athabaskan",
    region: "Yukon",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "ksk",
    name: "Kaska",
    nativeName: "Kaska Dena",
    family: "Athabaskan",
    region: "Yukon, British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "sek",
    name: "Sekani",
    nativeName: "Tse'khene",
    family: "Athabaskan",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "bcr",
    name: "Dakelh (Carrier)",
    nativeName: "Dakelh",
    family: "Athabaskan",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "clc",
    name: "Chilcotin (Tsilhqot'in)",
    nativeName: "Tsilhqot'in",
    family: "Athabaskan",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "taa",
    name: "Tahltan",
    nativeName: "Tāłtān",
    family: "Athabaskan",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },

  // Iroquoian Languages
  {
    code: "moh",
    name: "Mohawk",
    nativeName: "Kanien'kéha",
    family: "Iroquoian",
    region: "Quebec, Ontario",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "cay",
    name: "Cayuga",
    nativeName: "Gayogo̱hó꞉nǫ'",
    family: "Iroquoian",
    region: "Ontario",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "one",
    name: "Oneida",
    nativeName: "Onʌyotaʔa:ka",
    family: "Iroquoian",
    region: "Ontario",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "ono",
    name: "Onondaga",
    nativeName: "Onödowá'ga:'",
    family: "Iroquoian",
    region: "Ontario",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "see",
    name: "Seneca",
    nativeName: "Onödowá'ga:'",
    family: "Iroquoian",
    region: "Ontario",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "tus",
    name: "Tuscarora",
    nativeName: "Skarù:ręʔ",
    family: "Iroquoian",
    region: "Ontario",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },

  // Siouan Languages
  {
    code: "sto",
    name: "Stoney Nakoda",
    nativeName: "Nakoda",
    family: "Siouan",
    region: "Alberta",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "dak",
    name: "Dakota",
    nativeName: "Dakȟótiyapi",
    family: "Siouan",
    region: "Manitoba, Saskatchewan",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },

  // Salish Languages
  {
    code: "shs",
    name: "Secwepemctsín (Shuswap)",
    nativeName: "Secwepemctsín",
    family: "Salish",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "lil",
    name: "Lillooet (St'át'imcets)",
    nativeName: "St'át'imcets",
    family: "Salish",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "ncg",
    name: "Nisga'a",
    nativeName: "Nisga'a",
    family: "Tsimshianic",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "git",
    name: "Gitxsan",
    nativeName: "Gitsenimx̱",
    family: "Tsimshianic",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },

  // Wakashan Languages
  {
    code: "kwk",
    name: "Kwak'wala",
    nativeName: "Kwak̓wala",
    family: "Wakashan",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "nuk",
    name: "Nuu-chah-nulth",
    nativeName: "Nuučaan̓uł",
    family: "Wakashan",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },

  // Haida
  {
    code: "hai",
    name: "Haida",
    nativeName: "X̱aad Kíl",
    family: "Haida",
    region: "British Columbia (Haida Gwaii)",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },

  // Tlingit
  {
    code: "tli",
    name: "Tlingit",
    nativeName: "Lingít",
    family: "Na-Dene",
    region: "British Columbia, Yukon",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },

  // Michif (Métis)
  {
    code: "crg",
    name: "Michif",
    nativeName: "Michif",
    family: "Mixed (Cree-French)",
    region: "Manitoba, Saskatchewan, Alberta, North Dakota, Montana",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
  },
];

// Common immigrant languages in Canada (for future expansion)
export const IMMIGRANT_LANGUAGES: Language[] = [
  {
    code: "zh",
    name: "Mandarin Chinese",
    nativeName: "普通话",
    isIndigenous: false,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "yue",
    name: "Cantonese",
    nativeName: "廣東話",
    isIndigenous: false,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "pa",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    isIndigenous: false,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "tl",
    name: "Tagalog",
    nativeName: "Tagalog",
    isIndigenous: false,
    isOfficial: false,
    direction: "ltr",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    isIndigenous: false,
    isOfficial: false,
    direction: "rtl",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    isIndigenous: false,
    isOfficial: false,
    direction: "ltr",
  },
];

// All supported languages (including immigrant languages for multi-language support)
export const ALL_LANGUAGES: Language[] = [
  ...OFFICIAL_LANGUAGES,
  ...IMMIGRANT_LANGUAGES,
  ...INDIGENOUS_LANGUAGES,
];

// Language families for grouping in UI
export const LANGUAGE_FAMILIES = [
  { id: "official", name: "Official Languages", nameEn: "Official Languages", nameFr: "Langues officielles" },
  { id: "community", name: "Community Languages", nameEn: "Community Languages", nameFr: "Langues communautaires" },
  { id: "algonquian", name: "Algonquian", nameEn: "Algonquian Languages", nameFr: "Langues algonquiennes" },
  { id: "inuit", name: "Inuit", nameEn: "Inuit Languages", nameFr: "Langues inuites" },
  { id: "athabaskan", name: "Athabaskan", nameEn: "Athabaskan/Dene Languages", nameFr: "Langues athapascanes/dénées" },
  { id: "iroquoian", name: "Iroquoian", nameEn: "Iroquoian Languages", nameFr: "Langues iroquoiennes" },
  { id: "siouan", name: "Siouan", nameEn: "Siouan Languages", nameFr: "Langues siouanes" },
  { id: "salish", name: "Salish", nameEn: "Salish Languages", nameFr: "Langues salish" },
  { id: "wakashan", name: "Wakashan", nameEn: "Wakashan Languages", nameFr: "Langues wakashanes" },
  { id: "other-indigenous", name: "Other Indigenous", nameEn: "Other Indigenous Languages", nameFr: "Autres langues autochtones" },
];

// Helper functions
export function getLanguageByCode(code: string): Language | undefined {
  // Search in all language lists
  return ALL_LANGUAGES.find((lang) => lang.code === code) ||
         IMMIGRANT_LANGUAGES.find((lang) => lang.code === code);
}

// Get immigrant/community languages
export function getImmigrantLanguages(): Language[] {
  return IMMIGRANT_LANGUAGES;
}

// Check if a language is RTL
export function isRTLLanguage(code: string): boolean {
  const language = getLanguageByCode(code);
  return language?.direction === "rtl";
}

export function getIndigenousLanguages(): Language[] {
  return INDIGENOUS_LANGUAGES;
}

export function getLanguagesByFamily(family: string): Language[] {
  return INDIGENOUS_LANGUAGES.filter((lang) => lang.family === family);
}

export function getLanguagesByRegion(region: string): Language[] {
  return INDIGENOUS_LANGUAGES.filter((lang) =>
    lang.region?.toLowerCase().includes(region.toLowerCase())
  );
}

// Primary languages for intake forms (most commonly spoken)
export const PRIMARY_INDIGENOUS_LANGUAGES = [
  "cr",      // Cree
  "oj",      // Ojibwe
  "iu",      // Inuktitut
  "chp",     // Dene
  "mic",     // Mi'kmaq
  "moh",     // Mohawk
  "moe",     // Innu-aimun
  "atj",     // Atikamekw
  "bla",     // Blackfoot
  "sto",     // Stoney Nakoda
  "crg",     // Michif
];

// Get primary Indigenous languages for forms
export function getPrimaryIndigenousLanguages(): Language[] {
  return PRIMARY_INDIGENOUS_LANGUAGES
    .map((code) => INDIGENOUS_LANGUAGES.find((lang) => lang.code === code))
    .filter((lang): lang is Language => lang !== undefined);
}

// Languages that use Canadian Aboriginal Syllabics
export const SYLLABICS_LANGUAGES = [
  "cr",      // Cree
  "cr-syl",  // Cree (Syllabics only)
  "iu",      // Inuktitut
  "iu-syl",  // Inuktitut (Syllabics only)
  "oj-cr",   // Oji-Cree
  "nsk",     // Naskapi
];

// Check if a language uses syllabics
export function usesSyllabics(code: string): boolean {
  return SYLLABICS_LANGUAGES.includes(code);
}

// Check if text contains Canadian Aboriginal Syllabics (U+1400-167F, U+18B0-18FF)
export function containsSyllabics(text: string): boolean {
  return /[\u1400-\u167F\u18B0-\u18FF]/.test(text);
}

// Get language display name with proper formatting
export function getLanguageDisplayName(
  code: string,
  options: { showNativeName?: boolean; nativeNameOnly?: boolean } = {}
): string {
  const { showNativeName = true, nativeNameOnly = false } = options;
  const language = getLanguageByCode(code);
  if (!language) return code;

  if (nativeNameOnly) return language.nativeName;
  if (!showNativeName || language.nativeName === language.name) {
    return language.name;
  }
  return `${language.name} (${language.nativeName})`;
}

// Get languages grouped by family for UI display
export function getLanguagesGroupedByFamily(): Record<string, Language[]> {
  const groups: Record<string, Language[]> = {
    "Official Languages": OFFICIAL_LANGUAGES,
    "Community Languages": IMMIGRANT_LANGUAGES,
  };

  LANGUAGE_FAMILIES.forEach((family) => {
    if (family.id === "official" || family.id === "community") return;
    const familyLangs = getLanguagesByFamily(family.name);
    if (familyLangs.length > 0) {
      groups[family.nameEn] = familyLangs;
    }
  });

  return groups;
}

// Get all languages grouped by category (official, immigrant, indigenous)
export function getLanguagesGroupedByCategory(): {
  official: Language[];
  immigrant: Language[];
  indigenous: Language[];
} {
  return {
    official: OFFICIAL_LANGUAGES,
    immigrant: IMMIGRANT_LANGUAGES,
    indigenous: INDIGENOUS_LANGUAGES,
  };
}

// Default export for convenience
export default {
  OFFICIAL_LANGUAGES,
  INDIGENOUS_LANGUAGES,
  ALL_LANGUAGES,
  IMMIGRANT_LANGUAGES,
  LANGUAGE_FAMILIES,
  SYLLABICS_LANGUAGES,
  getLanguageByCode,
  getIndigenousLanguages,
  getImmigrantLanguages,
  getLanguagesByFamily,
  getLanguagesByRegion,
  getPrimaryIndigenousLanguages,
  usesSyllabics,
  containsSyllabics,
  isRTLLanguage,
  getLanguageDisplayName,
  getLanguagesGroupedByFamily,
  getLanguagesGroupedByCategory,
};
