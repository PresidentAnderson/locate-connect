# Language Preferences Implementation

## Overview
This feature allows users to set their preferred Indigenous language for the LocateConnect platform, supporting over 60 Indigenous languages across Canada including Algonquian, Inuit, Athabaskan, Iroquoian, Siouan, Salish, and other language families.

## Components

### Database Schema
Language preferences are stored in the `profiles` table (via migration `002_language_support.sql`):
- `preferred_language` (VARCHAR(10), default: 'en') - Primary UI language
- `additional_languages` (TEXT[], default: '{}') - Up to 5 additional languages user speaks
- `communication_language` (VARCHAR(10), default: 'en') - Language for notifications/emails
- `needs_interpreter` (BOOLEAN, default: FALSE) - Whether user needs interpreter assistance

### API Endpoints

#### GET `/api/profile/language`
Retrieves the current user's language preferences.

**Authentication:** Required (Supabase session)

**Response:**
```json
{
  "preferred_language": "cr",
  "additional_languages": ["oj", "en"],
  "communication_language": "en",
  "needs_interpreter": false
}
```

#### PATCH `/api/profile/language`
Updates the user's language preferences.

**Authentication:** Required (Supabase session)

**Request Body:**
```json
{
  "preferred_language": "cr",
  "additional_languages": ["oj", "en"],
  "communication_language": "en",
  "needs_interpreter": false
}
```

**Validation:**
- Language codes must be valid (from `ALL_LANGUAGES` config)
- `additional_languages` must be an array with max 5 items
- `needs_interpreter` must be boolean
- Returns 400 for invalid inputs

**Response:**
```json
{
  "preferred_language": "cr",
  "additional_languages": ["oj", "en"],
  "communication_language": "en",
  "needs_interpreter": false
}
```

### UI Pages

#### `/settings`
Main settings page with navigation cards to:
- Language Preferences
- Notifications
- Privacy

#### `/settings/language`
Language preferences configuration page featuring:
- Primary language selection with native names and syllabics
- Languages grouped by family (Algonquian, Inuit, etc.)
- Multi-select for up to 5 additional languages
- Communication language preference
- Interpreter assistance checkbox
- Real-time validation and error handling

### UI Components

#### `LanguagePreferences`
Main component located at `src/components/settings/LanguagePreferences.tsx`
- Manages state for all language preferences
- Handles save with error handling
- Shows success/error messages
- Displays language profile summary with badges

#### `LanguageSelect`
Dropdown for single language selection
- Groups languages by family using `<optgroup>`
- Shows native names with syllabics
- Used for primary and communication language selection

#### `LanguageMultiSelect`
Multi-select component with search
- Expandable/collapsible language families
- Search functionality
- Visual badges for selected languages
- Max selection enforcement (5 languages)

#### `LanguageBadge`
Visual badge showing language with native name or syllabics
- Different styling for Indigenous vs Official languages
- Remove button for multi-select items

### Language Configuration

All supported languages are defined in `src/config/languages.ts`:

**Language Families:**
- Official Languages (English, French)
- Community Languages (Mandarin, Cantonese, Punjabi, Tagalog, Arabic, Spanish)
- Algonquian (Cree, Ojibwe, Mi'kmaq, Blackfoot, etc.)
- Inuit (Inuktitut, Inuinnaqtun, Inuvialuktun)
- Athabaskan/Dene (Chipewyan, Tłı̨chǫ, Gwich'in, etc.)
- Iroquoian (Mohawk, Cayuga, Oneida, Onondaga, Seneca)
- Siouan (Stoney Nakoda, Dakota)
- Salish, Wakashan, and other families

**Language Object Structure:**
```typescript
{
  code: "cr",
  name: "Cree",
  nativeName: "ᓀᐦᐃᔭᐍᐏᐣ (Nēhiyawēwin)",
  family: "Algonquian",
  region: "Alberta, Saskatchewan, Manitoba, Ontario, Quebec",
  isIndigenous: true,
  isOfficial: false,
  direction: "ltr"
}
```

## Usage Flow

1. User navigates to `/settings` from header user menu
2. Clicks "Language Preferences" card
3. Loads current preferences from API
4. Selects preferred language from grouped dropdown
5. Optionally adds up to 5 additional languages
6. Sets communication language preference
7. Optionally enables interpreter assistance
8. Clicks "Save Preferences"
9. API validates and stores preferences
10. Success message displayed

## Validation Rules

### Language Codes
- Must exist in `ALL_LANGUAGES` configuration
- Covers 60+ official, community, and Indigenous languages

### Additional Languages
- Must be an array
- Maximum 5 languages allowed
- Each code must be valid
- Can be empty array

### Needs Interpreter
- Must be boolean value
- Defaults to false

### Response Codes
- 200: Success
- 400: Invalid input (bad language code, too many languages, wrong type)
- 401: Unauthorized (not logged in)
- 500: Server error

## Error Handling

### API Level
- Validates all inputs before database update
- Returns descriptive error messages
- Uses proper HTTP status codes

### UI Level
- Shows loading spinner during fetch
- Displays error messages in red box
- Shows success message after save
- Handles network failures gracefully

## Future Enhancements

### UI Localization
- Apply `preferred_language` to UI strings
- Use existing i18n infrastructure (`next-intl`)
- Load user preference on login

### Communication Templates
- Use `communication_language` for emails/SMS
- Leverage `notification_templates` table
- Fall back to English if translation unavailable

### Session Integration
- Load language preference into user session
- Apply to all pages automatically
- Persist across browser sessions

## Testing

### Manual Testing
1. Navigate to `/settings/language`
2. Select different language combinations
3. Verify native names display correctly (especially syllabics)
4. Try saving with valid and invalid data
5. Verify error messages for invalid inputs
6. Check that preferences persist after page reload

### API Testing
```bash
# Get current preferences
curl -X GET http://localhost:3000/api/profile/language \
  -H "Cookie: your-session-cookie"

# Update preferences
curl -X PATCH http://localhost:3000/api/profile/language \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "preferred_language": "cr",
    "additional_languages": ["oj", "en"],
    "communication_language": "en",
    "needs_interpreter": false
  }'

# Test validation - invalid language code
curl -X PATCH http://localhost:3000/api/profile/language \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "preferred_language": "invalid"
  }'
```

## Security Considerations

✅ **Authentication Required**: All endpoints check for valid Supabase session
✅ **User Isolation**: Users can only access/modify their own preferences
✅ **Input Validation**: All inputs validated against allowed values
✅ **Type Safety**: TypeScript ensures type correctness
✅ **SQL Injection**: Protected by Supabase parameterized queries
✅ **XSS Protection**: React escapes all user input
✅ **CodeQL Analysis**: Passed with 0 security alerts

## Related Documentation

- [Indigenous Languages Configuration](src/config/languages.ts)
- [Database Migration](supabase/migrations/002_language_support.sql)
- [Multi-Language Expansion](supabase/migrations/004_multi_language_expansion.sql)
- [Language Components](src/components/ui/LanguageSelect.tsx)
- [Syllabics Support](src/components/ui/SyllabicsText.tsx)

## Support

For issues or questions:
- Check language codes in `src/config/languages.ts`
- Review validation rules in API endpoint
- Verify database schema in migrations
- Test with browser dev tools for network/console errors
