# Indigenous Language UI Translation Implementation

## Overview

This document describes the implementation of UI translations for priority Indigenous languages in the Locate-Connect platform. The implementation provides a foundation for professional translators to add culturally appropriate translations while maintaining full functionality through English fallback.

## Implemented Languages

The following four priority Indigenous languages have been configured with translation infrastructure:

| Language | Code | Speakers | Writing System | Status |
|----------|------|----------|----------------|--------|
| Cree | `cr` | 96,000+ | Syllabics & Latin | Ready for translation |
| Inuktitut | `iu` | 39,000+ | Syllabics & Latin | Ready for translation |
| Ojibwe | `oj` | 28,000+ | Latin | Ready for translation |
| Mi'kmaq | `mic` | 8,000+ | Latin | Ready for translation |

## File Structure

Each language has two translation files in `src/locales/{language}/`:
- `common.json` - Navigation, headers, general UI elements
- `intake.json` - Missing person intake form

## Translation System Features

### 1. Automatic Fallback Chain
All Indigenous languages are configured with English fallback. When a translation is missing or empty, English text is automatically shown.

### 2. Font Support
- **Syllabics** (Cree, Inuktitut): Noto Sans Canadian Aboriginal
- **Latin Script** (Ojibwe, Mi'kmaq): Standard system fonts

### 3. Language Switcher
Indigenous languages appear in a dedicated group with an asterisk (*) indicating translations are in progress.

### 4. Locale Persistence
User language preferences are stored in browser localStorage and restored on page reload.

## Current Status

### ✅ Completed
- Translation file structure created for all 4 languages
- English placeholder content with translator instructions
- JSON structure validated
- Integration with next-intl framework
- Fallback chain configured
- Font support for syllabics
- Translation guide for professional translators

### 📋 Awaiting Professional Translation
All translation files currently contain English placeholder text with clear instructions for professional translators.

## Translation Coverage

**common.json**: ~70 translation keys covering navigation, headers, and UI elements
**intake.json**: ~200 translation keys covering the entire missing person intake form

Total: ~270 translation keys per language

## Next Steps for Translation

1. Partner with Indigenous language organizations
2. Engage certified translators or native speakers
3. Determine preferred writing system (for Cree/Inuktitut)
4. Translate all strings
5. Community review and feedback
6. Quality assurance testing
7. Deploy translations

## Technical Details

### Configuration Files
- Language metadata: `src/lib/i18n/index.ts`
- Language definitions: `src/config/languages.ts`
- Locale provider: `src/components/i18n/LocaleProvider.tsx`
- Switcher component: `src/components/i18n/LocaleSwitcher.tsx`

### How Fallback Works
When a user selects an Indigenous language:
1. System looks for translation in the language file
2. If key is missing/empty, checks English file
3. Returns English translation as fallback
4. UI shows asterisk (*) indicating incomplete translation

## Community Sensitivity

The translation guide emphasizes:
- Cultural appropriateness for MMIWG context
- Consultation with community elders
- Respect for regional variations
- Professional translator requirement
- Community review process

---

**Note**: This is infrastructure work. Actual translations require professional Indigenous language translators and community partnership. Do not use machine translation.
