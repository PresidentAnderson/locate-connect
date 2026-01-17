# Translation Guide for Indigenous Languages

## Overview

This guide is for professional translators working on Indigenous language translations for the Locate-Connect platform. The platform currently supports translations for:

- **Cree (cr)** - ᓀᐦᐃᔭᐍᐏᐣ - 96,000+ speakers
- **Inuktitut (iu)** - ᐃᓄᒃᑎᑐᑦ - 39,000+ speakers  
- **Ojibwe (oj)** - 28,000+ speakers
- **Mi'kmaq (mic)** - 8,000+ speakers

## Translation Files Structure

Each language has its own directory under `src/locales/` with the following files:

```
src/locales/
  ├── cr/           # Cree
  │   ├── common.json
  │   └── intake.json
  ├── iu/           # Inuktitut
  │   ├── common.json
  │   └── intake.json
  ├── oj/           # Ojibwe
  │   ├── common.json
  │   └── intake.json
  └── mic/          # Mi'kmaq
      ├── common.json
      └── intake.json
```

### File Purposes

- **common.json** - Contains UI strings for navigation, headers, and general interface elements
- **intake.json** - Contains all text for the missing person report intake form

## Translation Guidelines

### Important Rules

1. **Preserve JSON Structure**: Do NOT modify the keys (left side of the colon), only translate the values (right side)
   ```json
   "firstName": "First Name"  // ✓ Translate "First Name"
   ```

2. **Preserve Special Characters**: Keep placeholders, HTML entities, and special formatting:
   - `{{variable}}` - Variable placeholders (keep as-is)
   - `←` and `→` - Arrow characters
   - `\n` - Line breaks

3. **Translation Comments**: Files contain metadata fields starting with underscore (e.g., `_comment`, `_instructions`). These are for documentation and do NOT need translation.

4. **Cultural Sensitivity**: 
   - This platform supports MMIWG (Missing and Murdered Indigenous Women and Girls) cases
   - Translations should be culturally appropriate and sensitive
   - Consult with community elders when appropriate

5. **Writing Systems**:
   - **Cree & Inuktitut**: Can be written in both Syllabics and Latin script. Please consult with the community to determine the preferred writing system for your region.
   - **Ojibwe & Mi'kmaq**: Use Latin script

### Regional Dialects

Many Indigenous languages have regional variations. If your translation applies to a specific dialect or region, please:

1. Document which dialect you're using in the `_instructions` field
2. Consider creating dialect-specific files if needed (consult with project team)
3. Note any terms where dialect variations are significant

## Translation Process

### Step 1: Review English Source

Review the English files to understand:
- Context of each string
- How it will be used in the UI
- Any technical or legal terminology

### Step 2: Translate Values

For each JSON entry:
1. Read the English value
2. Provide an accurate, culturally appropriate translation
3. Maintain the same level of formality/informality
4. Keep translations concise where the English is concise

### Step 3: Quality Assurance

- Have a second translator review your work
- Test translations in context if possible
- Ensure consistency across common terms

## Example Translation

**Before (English placeholder):**
```json
{
  "nav": {
    "dashboard": "Dashboard",
    "activeCases": "Active Cases",
    "newReport": "New Report"
  }
}
```

**After (hypothetical Cree translation):**
```json
{
  "nav": {
    "dashboard": "[Cree translation for Dashboard]",
    "activeCases": "[Cree translation for Active Cases]",
    "newReport": "[Cree translation for New Report]"
  }
}
```

## Key Terms Glossary

| English | Context | Notes |
|---------|---------|-------|
| Missing Person | Someone who has disappeared | Core concept - requires careful cultural consideration |
| Case | A missing person report | Legal/administrative term |
| Dashboard | Main control panel/overview | Technical UI term - may need descriptive translation |
| Submit | Send/file a report | Action term |
| MMIWG | Missing and Murdered Indigenous Women and Girls | May use acronym or full translation based on community preference |

## Community Partnership

These translations are being done in partnership with Indigenous communities and language organizations:

- First Nations University of Canada
- Inuit Tapiriit Kanatami
- Assembly of First Nations language programs
- Regional Indigenous language centers

## Technical Support

If you have questions about:
- **Translation context**: Contact the project coordinator
- **Technical JSON issues**: Contact the development team
- **Cultural appropriateness**: Consult with community liaisons

## Font Support

The platform includes font support for:
- **Unified Canadian Aboriginal Syllabics** (for Cree and Inuktitut syllabics)
- **Standard Latin characters** (for all languages using Latin script)

If you notice any rendering issues with specific characters, please report them.

## Submission

When your translations are complete:

1. Validate JSON syntax (use a JSON validator tool)
2. Submit translations through the designated review process
3. Be available for follow-up questions during community review

## Recognition

All translators will be acknowledged in the project credits. Your work helps make this critical platform accessible to Indigenous communities across Canada.

---

**Thank you for your important work in preserving and promoting Indigenous languages while supporting families and communities.**
