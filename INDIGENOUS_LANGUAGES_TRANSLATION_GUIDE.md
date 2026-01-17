# Indigenous Languages & Accessibility - Translation Guide

## Overview

This document provides guidance for Indigenous communities, language centers, and translators contributing to LocateConnect's multilingual support.

## Current Status

### Completed Infrastructure (Phase 2.1)
- ✅ **50+ Indigenous Languages Configured** (`src/config/languages.ts`)
  - Algonquian family: Cree, Ojibwe, Mi'kmaq, Innu-aimun, Atikamekw, etc.
  - Inuit family: Inuktitut, Inuinnaqtun, Inuvialuktun
  - Athabaskan/Dene family: Chipewyan, Tłįchǫ, Gwich'in, etc.
  - Iroquoian, Siouan, Salish, and other families

- ✅ **Syllabics Font Support** (Canadian Aboriginal Syllabics: U+1400-167F, U+18B0-18FF)
  - System fonts configured with fallbacks
  - Auto-detection of syllabics characters
  - Proper rendering for Cree, Inuktitut, Oji-Cree, Naskapi

- ✅ **Translation Fallback System**
  - English fallback for missing translations
  - Translation notices shown to users
  - Graceful handling of incomplete translations

### Priority Languages for Translation (Phase 2.2)

Based on speaker populations and community needs:

1. **Cree (ᓀᐦᐃᔭᐍᐏᐣ)** - 96,000+ speakers
   - Regions: MB, SK, AB, ON, QC
   - Both Latin and Syllabics support
   
2. **Inuktitut (ᐃᓄᒃᑎᑐᑦ)** - 39,000+ speakers
   - Regions: NU, NT, QC (Nunavik)
   - Syllabics preferred
   
3. **Ojibwe (Anishinaabemowin)** - 28,000+ speakers
   - Regions: MB, ON, QC
   - Latin script
   
4. **Dene (Dëne Sųłiné)** - 12,000+ speakers
   - Regions: NT, SK, AB, BC
   - Latin script with diacritics
   
5. **Innu-aimun** - 11,000+ speakers
   - Regions: QC, NL
   - Latin script
   
6. **Mi'kmaq (Míkmawísimk)** - 8,000+ speakers
   - Regions: NS, NB, PE, NL, QC
   - Latin script

## Translation File Structure

Translation files are located in `src/locales/[language-code]/`

Each language has two files:

### 1. `common.json` - UI Navigation & General Terms

Example structure:
```json
{
  "nav": {
    "dashboard": "Translation here",
    "activeCases": "Translation here",
    "newReport": "Translation here"
  },
  "sections": {
    "cases": "Translation here",
    "lawEnforcement": "Translation here"
  },
  "header": {
    "searchLabel": "Translation here",
    "searchPlaceholder": "Translation here"
  },
  "language": {
    "label": "Translation here",
    "translationNotice": "Translation here"
  }
}
```

**See:** `src/locales/en/common.json` for complete structure (79 lines)

### 2. `intake.json` - Missing Person Report Forms

Example structure:
```json
{
  "header": {
    "title": "Translation here",
    "subtitle": "Translation here"
  },
  "reporter": {
    "title": "Translation here",
    "firstName": "Translation here",
    "relationships": {
      "parent": "Translation here",
      "spouse": "Translation here"
    }
  },
  "languageSection": {
    "reporterTitle": "Translation here",
    "interpreterNeeded": "Translation here"
  }
}
```

**See:** `src/locales/en/intake.json` for complete structure (181 lines)

## Translation Guidelines

### Critical Requirements

1. **Native Speakers Only**
   - All translations MUST be done by native speakers or certified translators
   - Machine translation (Google Translate, etc.) is NOT acceptable
   - Community elders should review culturally sensitive terms

2. **Cultural Sensitivity**
   - Terms related to missing persons, family, and grief require special care
   - Some concepts may not have direct translations
   - Consult with community members for appropriate terminology

3. **Regional Variations**
   - Document which dialect/region your translation represents
   - Note alternative terms if multiple dialects exist
   - Example: Cree has Plains Cree, Swampy Cree, Woods Cree variants

4. **Syllabics vs. Latin**
   - Some languages support both scripts
   - Indicate preferred script for your community
   - We support: `cr` (Cree Latin), `cr-syl` (Cree Syllabics)

### Translation Best Practices

1. **Maintain Consistency**
   - Use the same term for the same concept throughout
   - Create a glossary of key terms for your language

2. **Context Matters**
   - Read the English version in the actual application if possible
   - Some terms may need different translations based on usage

3. **Formatting**
   - Preserve placeholders: `{{name}}`, `{{age}}`, etc.
   - Keep JSON structure intact (commas, brackets, quotes)

4. **Cultural Adaptation**
   - It's okay to adapt rather than translate literally
   - The goal is clear communication for your community

## How to Contribute Translations

### Option 1: Direct File Contribution

1. Copy the English template: `src/locales/en/common.json`
2. Translate each string carefully
3. Save as: `src/locales/[language-code]/common.json`
4. Submit via GitHub pull request or email

### Option 2: Spreadsheet Submission

For communities without technical expertise:

1. Download the translation spreadsheet template (contact project team)
2. Fill in translations in your language column
3. Email completed spreadsheet to translation coordinator
4. Technical team will convert to JSON format

### Option 3: Collaborative Translation Workshop

Partner organizations can arrange:
- Translation workshops with language keepers
- Review sessions with community elders
- Technical support from LocateConnect team

## Quality Assurance

All translations go through:

1. **Technical Review** - Verify JSON syntax and completeness
2. **Community Review** - Native speaker verification
3. **Cultural Review** - Sensitivity check for terminology
4. **User Testing** - Test with actual community members

## Contact & Support

For translation coordination:
- Translation Coordinator: [Contact information to be added]
- Technical Support: [Contact information to be added]
- GitHub Repository: https://github.com/PresidentAnderson/locate-connect

## Community Partnerships

We are actively seeking partnerships with:
- First Nations University of Canada
- Inuit Tapiriit Kanatami
- Assembly of First Nations
- Regional Indigenous language centers
- Indigenous policing services
- Local language revitalization programs

## Sample Translation (Cree Example)

**English:**
```json
{
  "header": {
    "title": "Report a Missing Person",
    "subtitle": "Complete all sections to file a report"
  }
}
```

**Cree (Nēhiyawēwin) - Example Only (needs validation):**
```json
{
  "header": {
    "title": "Wanihikisow Nipakwēsimow",
    "subtitle": "Mōci Kakiyaw Tipiskākana Kihci-Otināhk"
  }
}
```

**Note:** The above is an illustrative example. Actual Cree translations must be provided by certified Cree language speakers.

## Technical Notes for Developers

### Adding a New Language

1. Add language configuration in `src/config/languages.ts`
2. Create locale files: `src/locales/[code]/common.json` and `intake.json`
3. Add to `SUPPORTED_LOCALES` in `src/lib/i18n/index.ts`
4. Import and add to `MESSAGES` object in `src/lib/i18n/index.ts`
5. Set `complete: false` in `LOCALE_METADATA` until fully translated

### Syllabics Detection

The system automatically detects Canadian Aboriginal Syllabics characters (U+1400-167F, U+18B0-18FF) and applies appropriate fonts.

### RTL Support

For right-to-left languages (not typical for Indigenous Canadian languages, but supported):
- Set `direction: "rtl"` in language config
- CSS automatically handles RTL layout

## Progress Tracking

### Phase 2.2 Goals (UI Translations)
- [ ] Core UI in Cree (0% complete)
- [ ] Core UI in Inuktitut (0% complete)
- [ ] Core UI in Ojibwe (0% complete)
- [ ] Core UI in Mi'kmaq (English placeholders only)
- [ ] Form translations (0% complete)
- [ ] Error messages (0% complete)

### Success Metrics (from Epic #127)
- [ ] 50+ Indigenous languages supported in forms ✅ (configured)
- [ ] Full UI translation in 2+ Indigenous languages ⏳ (0/2)
- [ ] Community organization partnerships established ⏳
- [ ] Positive feedback from Indigenous community testers ⏳

## Timeline

**Phase 2.1 (Foundation)** - COMPLETE ✅
- Language configuration system
- Font support for syllabics
- Translation infrastructure

**Phase 2.2 (Initial Translations)** - IN PROGRESS ⏳
- Target: Q1 2026
- Priority: Cree and Inuktitut
- Approach: Partner with language centers

**Phase 2.3 (Community Integration)** - PLANNED
- Multilingual notifications
- Regional targeting
- Community outreach features

## Acknowledgments

This project recognizes that Indigenous languages are living languages with complex cultural contexts. We are committed to:
- Respectful representation
- Community-driven translation
- Support for language revitalization efforts
- Honoring traditional knowledge keepers

---

*Last Updated: January 2026*
*For questions or to contribute, please contact the LocateConnect Indigenous Languages team.*
