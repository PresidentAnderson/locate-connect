# Developer Guide

This guide provides detailed instructions for setting up and contributing to LocateConnect.

## Prerequisites

- **Node.js**: v20.0.0 or higher
- **npm**: v10.0.0 or higher
- **Git**: Latest version
- **Supabase CLI**: For local database development
- **VS Code**: Recommended editor

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/PresidentAnderson/locate-connect.git
cd locate-connect
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

#### Option A: Supabase Cloud (Recommended)

1. Create a project at [supabase.com](https://supabase.com)
2. Get your project URL and keys from Settings > API
3. Create `.env.local` with your credentials

#### Option B: Local Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# This will output local URLs and keys
```

### 4. Configure Environment

Create `.env.local` in the project root:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Cron Secret (Required for background jobs)
CRON_SECRET=your-secure-random-string

# Push Notifications (Optional)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# External Services (Optional)
GOOGLE_MAPS_API_KEY=your-google-maps-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
```

### 5. Run Database Migrations

```bash
# Push migrations to Supabase
npx supabase db push

# Or run migrations manually
npx supabase migration up
```

### 6. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Architecture

### Directory Structure

```
locate-connect/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/          # Auth routes (login, signup)
│   │   ├── (dashboard)/     # Protected dashboard routes
│   │   ├── api/             # API route handlers
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Landing page
│   │
│   ├── components/          # React components
│   │   ├── forms/           # Form components
│   │   ├── geofencing/      # Map components
│   │   ├── notifications/   # Notification UI
│   │   └── ui/              # Shared UI components
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── index.ts         # Hook exports
│   │   ├── useRealtime.ts   # Supabase real-time
│   │   ├── useNotifications.ts
│   │   └── useFormPersistence.ts
│   │
│   ├── lib/                 # Utilities and services
│   │   ├── integrations/    # External API connectors
│   │   ├── services/        # Business logic
│   │   ├── supabase/        # Supabase clients
│   │   ├── utils.ts         # Helper functions
│   │   └── validations/     # Zod schemas
│   │
│   ├── types/               # TypeScript definitions
│   │   ├── index.ts         # Type exports
│   │   ├── case.types.ts
│   │   ├── geofence.types.ts
│   │   └── ...
│   │
│   └── messages/            # i18n translations
│       ├── en.json
│       └── fr.json
│
├── supabase/
│   ├── migrations/          # Database migrations
│   └── seed.sql             # Seed data
│
├── tests/
│   ├── unit/                # Unit tests
│   └── e2e/                 # Playwright E2E tests
│
├── public/                  # Static assets
├── docs/                    # Documentation
└── .github/                 # GitHub workflows
```

### Key Patterns

#### Server Components (Default)

```tsx
// src/app/(dashboard)/cases/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function CasesPage() {
  const supabase = await createClient();
  const { data: cases } = await supabase.from('cases').select('*');

  return <CaseList cases={cases} />;
}
```

#### Client Components

```tsx
// src/components/forms/CaseForm.tsx
'use client';

import { useState } from 'react';

export function CaseForm() {
  const [data, setData] = useState({});
  // Client-side interactivity
}
```

#### API Routes

```typescript
// src/app/api/cases/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('cases').select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cases: data });
}
```

#### Custom Hooks

```typescript
// src/hooks/useRealtime.ts
export function useRealtime<T>({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeOptions<T>) {
  // Supabase real-time subscription
}
```

## Database

### Schema Overview

Key tables:
- `cases` - Missing person cases
- `profiles` - User profiles
- `notifications` - User notifications
- `geofences` - Location monitoring zones
- `geofence_alerts` - Triggered alerts
- `case_timeline` - Case activity log
- `sightings` - Reported sightings
- `leads` - Investigation leads

### Creating Migrations

```bash
# Create a new migration
npx supabase migration new migration_name

# Edit the migration in supabase/migrations/
# Then apply it
npx supabase db push
```

### Row Level Security (RLS)

All tables have RLS policies. Example:

```sql
-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);
```

## Testing

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

Example test:

```typescript
// tests/unit/services/priority-engine.test.ts
import { describe, it, expect } from 'vitest';
import { assessPriority } from '@/lib/services/priority-engine';

describe('Priority Engine', () => {
  it('should return critical for children under 12', () => {
    const result = assessPriority({
      age: 8,
      circumstances: 'unknown',
    });
    expect(result.priority).toBe('critical');
  });
});
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
npm run test:e2e

# With UI
npm run test:e2e:ui
```

Example test:

```typescript
// tests/e2e/cases.spec.ts
import { test, expect } from '@playwright/test';

test('can create a new case', async ({ page }) => {
  await page.goto('/cases/new');
  await page.fill('[name="missingPersonName"]', 'Test Person');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/cases\//);
});
```

## Common Tasks

### Adding a New API Endpoint

1. Create route file in `src/app/api/`
2. Add TypeScript types in `src/types/`
3. Write unit tests
4. Document in `docs/API.md`

### Adding a New Component

1. Create component in `src/components/`
2. Add to appropriate index.ts export
3. Use existing UI primitives from `src/components/ui/`

### Adding a New Hook

1. Create hook in `src/hooks/`
2. Export from `src/hooks/index.ts`
3. Document usage with JSDoc

### Adding Translations

1. Add keys to `src/messages/en.json`
2. Add translations to other language files
3. Use with `useTranslations` hook

```tsx
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('Cases');
  return <h1>{t('title')}</h1>;
}
```

## Code Style

### TypeScript

- Use strict mode
- Define interfaces for all props
- Use type inference where obvious
- Export types from dedicated files

### React

- Prefer function components
- Use Server Components by default
- Add 'use client' only when needed
- Keep components focused and small

### Tailwind CSS

- Use utility classes directly
- Extract common patterns to components
- Use `cn()` helper for conditional classes

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  'px-4 py-2 rounded',
  isActive && 'bg-blue-500 text-white',
  isDisabled && 'opacity-50 cursor-not-allowed'
)} />
```

## Debugging

### Server Components

```typescript
console.log('Server:', data); // Logs to terminal
```

### Client Components

```typescript
console.log('Client:', data); // Logs to browser
```

### API Routes

```typescript
console.error('[API/cases]', error);
// Use structured logging in production
```

### Supabase Queries

```typescript
const { data, error } = await supabase.from('cases').select('*');
if (error) {
  console.error('Supabase error:', error);
}
```

## Deployment

### Vercel (Production)

1. Push to `main` branch
2. Vercel auto-deploys
3. Environment variables set in Vercel dashboard

### Preview Deployments

- Each PR gets a preview URL
- Test changes before merging

### Environment Branches

- `main` - Production
- `staging` - Staging environment
- Feature branches - Preview deployments

## Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

**Type Errors**
```bash
# Regenerate types
npm run build
```

**Supabase Connection Issues**
- Check `.env.local` credentials
- Verify Supabase project is running
- Check RLS policies

**Leaflet SSR Errors**
- Ensure map components use dynamic import
- Check for 'use client' directive

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Leaflet](https://react-leaflet.js.org/)

## Getting Help

- Check existing issues on GitHub
- Ask in team Slack channel
- Email: dev@locateconnect.ca
