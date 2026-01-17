# Indigenous Languages Configuration System

## Overview

The LocateConnect Indigenous Languages Configuration System provides comprehensive support for 57 Canadian Indigenous languages across 12 language families. This configuration enables multilingual intake forms, case reporting, and user interfaces to better serve Indigenous communities affected by missing persons cases.

## Features

- **57 Indigenous Languages**: Complete coverage of major Canadian Indigenous languages
- **Language Families**: Algonquian, Inuit, Athabaskan, Iroquoian, Siouan, Salish, Wakashan, Tsimshianic, Haida, Na-Dene, Mixed, and Isolate
- **ISO 639-3 Codes**: Standardized language codes for international compatibility
- **Speaker Population Data**: Current estimates for all languages
- **Writing Systems**: Support for Latin, Canadian Aboriginal Syllabics, and both
- **Endangerment Status**: Tracking threatened and endangered languages

## Language Statistics

- **Total Indigenous Languages**: 57
- **Total Speakers**: ~382,000
- **Endangered Languages**: 45
- **Threatened Languages**: 12
- **Languages with Syllabics**: 7 (including both Latin and Syllabics variants)

### By Language Family

| Family | Languages | Total Speakers | Status |
|--------|-----------|----------------|--------|
| Algonquian | 13 | ~200,000+ | Largest family |
| Athabaskan | 16 | ~22,000 | Diverse |
| Salish | 8 | ~800 | Critically endangered |
| Iroquoian | 6 | ~4,000 | Endangered |
| Inuit | 4 | ~42,000 | Threatened |
| Siouan | 2 | ~5,000 | Endangered |
| Tsimshianic | 2 | ~1,700 | Endangered |
| Wakashan | 2 | ~550 | Endangered |
| Other | 4 | ~1,000 | Various |

## Data Structure

### Language Interface

```typescript
interface Language {
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

type WritingSystem = "latin" | "syllabics" | "both";
type EndangermentStatus = "endangered" | "threatened" | "stable";
```

## Major Languages

### Most Spoken Indigenous Languages in Canada

1. **Cree (ᓀᐦᐃᔭᐍᐏᐣ)** - 96,000 speakers
   - ISO Code: `cr`
   - Family: Algonquian
   - Writing: Both Latin and Syllabics
   - Regions: AB, SK, MB, ON, QC

2. **Inuktitut (ᐃᓄᒃᑎᑐᑦ)** - 39,000 speakers
   - ISO Code: `iu`
   - Family: Inuit
   - Writing: Both Latin and Syllabics
   - Regions: NU, QC, NL

3. **Ojibwe (Anishinaabemowin)** - 28,000 speakers
   - ISO Code: `oj`
   - Family: Algonquian
   - Writing: Both Latin and Syllabics
   - Regions: ON, MB, SK

4. **Oji-Cree (Anihshininiimowin)** - 13,000 speakers
   - ISO Code: `oj-cr`
   - Family: Algonquian
   - Writing: Both Latin and Syllabics
   - Regions: Northern ON, MB

5. **Dene/Chipewyan (Dëne Sųłiné)** - 12,000 speakers
   - ISO Code: `chp`
   - Family: Athabaskan
   - Writing: Latin
   - Regions: NT, AB, SK, MB

## Writing Systems

### Canadian Aboriginal Syllabics

The following languages support syllabic writing systems:

- **Cree** (`cr`, `cr-syl`) - ᓀᐦᐃᔭᐍᐏᐣ
- **Inuktitut** (`iu`, `iu-syl`) - ᐃᓄᒃᑎᑐᑦ
- **Oji-Cree** (`oj-cr`) - Uses syllabics
- **Naskapi** (`nsk`) - ᓇᔅᑲᐱ

Syllabics are primarily used in:
- Quebec (Eastern Cree, Naskapi, Inuktitut)
- Nunavut (Inuktitut)
- Northern Ontario and Manitoba (Oji-Cree)

## Usage Examples

### Import the Configuration

```typescript
import {
  INDIGENOUS_LANGUAGES,
  getLanguageByCode,
  getLanguagesByFamily,
  getLanguagesByRegion,
  getLanguagesByStatus,
  getLanguagesByWritingSystem,
  getTotalIndigenousSpeakers,
  getCriticallyEndangeredLanguages,
  getLanguageStatistics,
} from '@/config/languages';
```

### Get Language Information

```typescript
// Get a specific language
const cree = getLanguageByCode('cr');
console.log(cree.nativeName); // "ᓀᐦᐃᔭᐍᐏᐣ (Nēhiyawēwin)"
console.log(cree.speakerCount); // 96000

// Get all Algonquian languages
const algonquian = getLanguagesByFamily('Algonquian');

// Get languages by region
const bcLanguages = getLanguagesByRegion('British Columbia');

// Get endangered languages
const endangered = getLanguagesByStatus('endangered');

// Get languages that use syllabics
const syllabicsLangs = getLanguagesByWritingSystem('syllabics');
```

### Get Statistics

```typescript
const stats = getLanguageStatistics();
console.log(`Total Indigenous languages: ${stats.totalLanguages}`);
console.log(`Total speakers: ${stats.totalSpeakers}`);
console.log(`Endangered: ${stats.byStatus.endangered}`);
console.log(`Languages using syllabics: ${stats.byWritingSystem.syllabics}`);
```

### Check for Critically Endangered Languages

```typescript
const critical = getCriticallyEndangeredLanguages();
// Returns languages with fewer than 100 speakers
```

## Helper Functions

### Language Lookup

- `getLanguageByCode(code: string): Language | undefined` - Find language by ISO code
- `getIndigenousLanguages(): Language[]` - Get all Indigenous languages
- `getPrimaryIndigenousLanguages(): Language[]` - Get most commonly spoken languages for forms

### Filtering

- `getLanguagesByFamily(family: string): Language[]` - Filter by language family
- `getLanguagesByRegion(region: string): Language[]` - Filter by province/territory
- `getLanguagesByStatus(status: EndangermentStatus): Language[]` - Filter by endangerment status
- `getLanguagesByWritingSystem(system: WritingSystem): Language[]` - Filter by writing system
- `getLanguagesBySpeakerCount(minSpeakers: number): Language[]` - Filter by minimum speakers

### Statistics

- `getTotalIndigenousSpeakers(): number` - Calculate total speakers
- `getCriticallyEndangeredLanguages(): Language[]` - Languages with < 100 speakers
- `getLanguageStatistics()` - Get comprehensive statistics

### Syllabics Support

- `usesSyllabics(code: string): boolean` - Check if language uses syllabics
- `containsSyllabics(text: string): boolean` - Detect syllabics in text (Unicode range U+1400-167F, U+18B0-18FF)

### Display

- `getLanguageDisplayName(code, options)` - Format language name with native script
- `getLanguagesGroupedByFamily()` - Group languages for UI display
- `getLanguagesGroupedByCategory()` - Group by official/immigrant/Indigenous

## Font Requirements

For proper display of Canadian Aboriginal Syllabics, ensure the following Unicode ranges are supported:

- **Unified Canadian Aboriginal Syllabics**: U+1400 to U+167F
- **Unified Canadian Aboriginal Syllabics Extended**: U+18B0 to U+18FF

Recommended fonts:
- **Euphemia UCAS** (Windows, macOS)
- **Pigiarniq** (Nunavut government)
- **Noto Sans Canadian Aboriginal**
- **Aboriginal Sans**

## Language Families

### 1. Algonquian (13 languages)
The largest language family, including Cree, Ojibwe, Mi'kmaq, Blackfoot, and others.

### 2. Athabaskan/Dene (16 languages)
Widely distributed across Western and Northern Canada, including Chipewyan, Tłı̨chǫ, Gwich'in.

### 3. Inuit (4 languages)
Arctic languages including Inuktitut and its dialects: Inuinnaqtun, Inuvialuktun.

### 4. Iroquoian (6 languages)
Six Nations languages including Mohawk, Cayuga, Oneida, Onondaga, Seneca, Tuscarora.

### 5. Siouan (2 languages)
Dakota and Nakoda (Stoney).

### 6. Salish (8 languages)
Pacific Northwest languages including Secwepemctsín, Halq'eméylem, Squamish.

### 7. Wakashan (2 languages)
Kwak'wala and Nuu-chah-nulth from coastal BC.

### 8. Other Families
- **Tsimshianic**: Nisga'a, Gitxsan
- **Haida**: X̱aad Kíl
- **Na-Dene**: Tlingit
- **Mixed**: Michif (Cree-French)
- **Isolate**: Kutenai

## Endangerment Status

### Critically Endangered (< 100 speakers)
Languages at immediate risk of extinction, requiring urgent documentation and revitalization.

Examples: Tagish, Sekani, Southern Tutchone, Clallam, Cayuga, Onondaga, Seneca, Tuscarora, Haida

### Endangered (100-5,000 speakers)
Languages with few speakers and limited intergenerational transmission.

Examples: Gwich'in, North/South Slavey, Kaska, Mohawk, Blackfoot

### Threatened (5,000+ speakers)
Languages with significant speaker populations but declining usage among younger generations.

Examples: Cree, Inuktitut, Ojibwe, Mi'kmaq, Innu-aimun, Dene

## Data Sources

Language data compiled from:
- Statistics Canada 2021 Census
- UNESCO Atlas of the World's Languages in Danger
- First Peoples' Cultural Council (BC)
- Ethnologue (ISO 639-3 codes)
- Indigenous language authorities and communities

## Maintenance

The language configuration should be updated:
- After each Statistics Canada census (every 5 years)
- When new language variants are documented
- When speaker population data is updated
- When ISO 639-3 codes are revised

## Contributing

When adding or updating languages:
1. Verify ISO 639-3 code with Ethnologue
2. Confirm speaker counts from recent census or community sources
3. Validate native name with language speakers or authorities
4. Add tests for new languages
5. Update this documentation

## Related Files

- `src/config/languages.ts` - Main configuration file
- `src/config/__tests__/languages.test.js` - Test suite
- `src/lib/i18n/index.ts` - Internationalization system
- `src/components/i18n/LocaleSwitcher.tsx` - Language switcher component

## Support

For questions about specific languages or to report data issues, please:
1. Open an issue on GitHub
2. Tag with `i18n` and `indigenous-languages`
3. Include language code and specific concern
4. Provide credible sources for corrections

## Acknowledgments

This configuration system was developed to honor and support Indigenous languages and communities across Canada. We acknowledge the original speakers and knowledge keepers of these languages and their ongoing efforts to preserve and revitalize them.
