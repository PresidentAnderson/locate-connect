/**
 * LocateConnect Language Configuration
 * Includes official languages and Canadian Indigenous languages
 * 
 * This configuration supports 50+ Indigenous languages across 7 language families,
 * including proper ISO 639-3 codes, speaker population data, and writing system information.
 */

export type LanguageFamily = 
  | "Algonquian"
  | "Inuit"
  | "Athabaskan"
  | "Iroquoian"
  | "Siouan"
  | "Salish"
  | "Wakashan"
  | "Tsimshianic"
  | "Haida"
  | "Na-Dene"
  | "Mixed (Cree-French)";

export type WritingSystem = "latin" | "syllabics" | "both";
export type EndangermentStatus = "endangered" | "threatened" | "stable";

export interface Language {
  code: string;              // ISO 639-3 code or variant
  name: string;              // English name
  nativeName: string;        // Native script/name
  family?: string;           // Language family
  region?: string;           // Provinces/territories
  isIndigenous: boolean;     // Whether it's an Indigenous language
  isOfficial: boolean;       // Whether it's an official language
  direction: "ltr" | "rtl";  // Text direction
  speakerCount?: number;     // Approximate number of speakers
  writingSystem?: WritingSystem;  // Writing system used
  status?: EndangermentStatus;    // Endangerment status
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
    speakerCount: 96000,
    writingSystem: "both",
    status: "threatened",
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
    speakerCount: 96000,
    writingSystem: "syllabics",
    status: "threatened",
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
    speakerCount: 28000,
    writingSystem: "both",
    status: "threatened",
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
    speakerCount: 13000,
    writingSystem: "both",
    status: "threatened",
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
    speakerCount: 2000,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 8000,
    writingSystem: "latin",
    status: "threatened",
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
    speakerCount: 11000,
    writingSystem: "latin",
    status: "threatened",
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
    speakerCount: 6000,
    writingSystem: "latin",
    status: "threatened",
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
    speakerCount: 1200,
    writingSystem: "syllabics",
    status: "threatened",
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
    speakerCount: 5000,
    writingSystem: "latin",
    status: "endangered",
  },
  {
    code: "abe",
    name: "Abenaki",
    nativeName: "Wôbanakiôdwawôgan",
    family: "Algonquian",
    region: "Quebec",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
    speakerCount: 100,
    writingSystem: "latin",
    status: "endangered",
  },
  {
    code: "mez",
    name: "Malecite-Passamaquoddy",
    nativeName: "Wolastoqey",
    family: "Algonquian",
    region: "New Brunswick, Quebec",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
    speakerCount: 800,
    writingSystem: "latin",
    status: "endangered",
  },
  {
    code: "pot",
    name: "Potawatomi",
    nativeName: "Bodéwadmimwen",
    family: "Algonquian",
    region: "Ontario",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
    speakerCount: 50,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 39000,
    writingSystem: "both",
    status: "threatened",
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
    speakerCount: 39000,
    writingSystem: "syllabics",
    status: "threatened",
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
    speakerCount: 1300,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 1600,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 12000,
    writingSystem: "latin",
    status: "threatened",
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
    speakerCount: 2400,
    writingSystem: "latin",
    status: "threatened",
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
    speakerCount: 400,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 800,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 1500,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 300,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 100,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 200,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 10,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 400,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 100,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 1600,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 800,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 100,
    writingSystem: "latin",
    status: "endangered",
  },
  {
    code: "haa",
    name: "Hän",
    nativeName: "Hän Hwëch'in",
    family: "Athabaskan",
    region: "Yukon",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
    speakerCount: 20,
    writingSystem: "latin",
    status: "endangered",
  },
  {
    code: "srs",
    name: "Sarsi (Tsuut'ina)",
    nativeName: "Tsuut'ina",
    family: "Athabaskan",
    region: "Alberta",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
    speakerCount: 100,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 3500,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 100,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 200,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 100,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 100,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 50,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 3000,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 2000,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 200,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 300,
    writingSystem: "latin",
    status: "endangered",
  },
  {
    code: "str",
    name: "Straits Salish",
    nativeName: "SENĆOŦEN",
    family: "Salish",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
    speakerCount: 50,
    writingSystem: "latin",
    status: "endangered",
  },
  {
    code: "squ",
    name: "Sḵwx̱wú7mesh (Squamish)",
    nativeName: "Sḵwx̱wú7mesh sníchim",
    family: "Salish",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
    speakerCount: 10,
    writingSystem: "latin",
    status: "endangered",
  },
  {
    code: "hur",
    name: "Halq'eméylem",
    nativeName: "Halq'eméylem",
    family: "Salish",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
    speakerCount: 100,
    writingSystem: "latin",
    status: "endangered",
  },
  {
    code: "oka",
    name: "Okanagan",
    nativeName: "Nsyilxcən",
    family: "Salish",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
    speakerCount: 150,
    writingSystem: "latin",
    status: "endangered",
  },
  {
    code: "coo",
    name: "Comox",
    nativeName: "ʔayʔaǰuθəm",
    family: "Salish",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
    speakerCount: 50,
    writingSystem: "latin",
    status: "endangered",
  },
  {
    code: "clm",
    name: "Clallam (Klallam)",
    nativeName: "Nəxʷsƛ̕áy̕əmúcən",
    family: "Salish",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
    speakerCount: 5,
    writingSystem: "latin",
    status: "endangered",
  },
  // Tsimshianic Languages
  {
    code: "ncg",
    name: "Nisga'a",
    nativeName: "Nisga'a",
    family: "Tsimshianic",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
    speakerCount: 700,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 1000,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 250,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 300,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 50,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 150,
    writingSystem: "latin",
    status: "endangered",
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
    speakerCount: 700,
    writingSystem: "latin",
    status: "endangered",
  },

  // Kutenai (Isolate)
  {
    code: "kut",
    name: "Kutenai",
    nativeName: "Ktunaxa",
    family: "Isolate",
    region: "British Columbia",
    isIndigenous: true,
    isOfficial: false,
    direction: "ltr",
    speakerCount: 100,
    writingSystem: "latin",
    status: "endangered",
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

// Get languages by endangerment status
export function getLanguagesByStatus(status: EndangermentStatus): Language[] {
  return INDIGENOUS_LANGUAGES.filter((lang) => lang.status === status);
}

// Get languages by writing system
export function getLanguagesByWritingSystem(writingSystem: WritingSystem): Language[] {
  return INDIGENOUS_LANGUAGES.filter((lang) => lang.writingSystem === writingSystem);
}

// Get languages with speaker count above threshold
export function getLanguagesBySpeakerCount(minSpeakers: number): Language[] {
  return INDIGENOUS_LANGUAGES.filter((lang) => 
    lang.speakerCount && lang.speakerCount >= minSpeakers
  );
}

// Get total speaker count for all Indigenous languages
export function getTotalIndigenousSpeakers(): number {
  return INDIGENOUS_LANGUAGES.reduce((total, lang) => 
    total + (lang.speakerCount || 0), 0
  );
}

// Get endangered languages (critically endangered = <100 speakers)
export function getCriticallyEndangeredLanguages(): Language[] {
  return INDIGENOUS_LANGUAGES.filter((lang) => 
    lang.speakerCount && lang.speakerCount < 100
  );
}

// Get language statistics
export function getLanguageStatistics(): {
  totalLanguages: number;
  totalSpeakers: number;
  byStatus: Record<EndangermentStatus, number>;
  byWritingSystem: Record<WritingSystem, number>;
  byFamily: Record<string, number>;
} {
  const stats = {
    totalLanguages: INDIGENOUS_LANGUAGES.length,
    totalSpeakers: getTotalIndigenousSpeakers(),
    byStatus: {
      endangered: 0,
      threatened: 0,
      stable: 0,
    } as Record<EndangermentStatus, number>,
    byWritingSystem: {
      latin: 0,
      syllabics: 0,
      both: 0,
    } as Record<WritingSystem, number>,
    byFamily: {} as Record<string, number>,
  };

  INDIGENOUS_LANGUAGES.forEach((lang) => {
    if (lang.status) {
      stats.byStatus[lang.status]++;
    }
    if (lang.writingSystem) {
      stats.byWritingSystem[lang.writingSystem]++;
    }
    if (lang.family) {
      stats.byFamily[lang.family] = (stats.byFamily[lang.family] || 0) + 1;
    }
  });

  return stats;
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
  getLanguagesByStatus,
  getLanguagesByWritingSystem,
  getLanguagesBySpeakerCount,
  getTotalIndigenousSpeakers,
  getCriticallyEndangeredLanguages,
  getLanguageStatistics,
};
