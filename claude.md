# Locate Connect - Sovereign Canon Configuration

## Project Identity

- **Name**: Locate Connect
- **Organization**: Jonathan Anderson Investigational
- **Type**: Next.js Application with Supabase Backend

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Docker-ready
- **Package Manager**: npm
- **PDF Generation**: @react-pdf/renderer, react-pdf
- **Image Processing**: sharp, react-image

## Directory Structure

```
locate-connect/
├── src/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # Base UI components (buttons, inputs, etc.)
│   │   ├── layout/             # Layout components (header, footer, etc.)
│   │   └── index.ts            # Barrel export
│   ├── config/                 # App configuration
│   │   ├── site.ts             # Site metadata and config
│   │   └── index.ts            # Barrel export
│   ├── hooks/                  # Custom React hooks
│   │   └── index.ts            # Barrel export
│   ├── lib/                    # Utilities and services
│   │   ├── supabase/           # Supabase client configuration
│   │   │   ├── client.ts       # Browser client
│   │   │   ├── server.ts       # Server client
│   │   │   ├── middleware.ts   # Session middleware
│   │   │   └── index.ts        # Barrel export
│   │   ├── utils/              # Helper functions
│   │   │   ├── cn.ts           # Tailwind class merger
│   │   │   └── index.ts        # Barrel export
│   │   └── index.ts            # Main barrel export
│   ├── types/                  # TypeScript type definitions
│   │   ├── database.types.ts   # Supabase generated types
│   │   └── index.ts            # Barrel export
│   └── middleware.ts           # Next.js middleware
├── public/                     # Static assets
│   ├── logo.svg                # Main logo
│   ├── logo-text.svg           # Logo with text
│   └── favicon.svg             # Browser favicon
├── Dockerfile                  # Docker production build
├── docker-compose.yml          # Docker orchestration
└── claude.md                   # Project conventions (this file)
```

## Code Conventions

### TypeScript

- Use strict TypeScript configuration
- Prefer `interface` over `type` for object shapes
- Export types from dedicated `types/` directory
- Use explicit return types for functions

### Components

- Use functional components with TypeScript
- Place component-specific types in the same file
- Use named exports for components
- Follow atomic design principles (atoms, molecules, organisms)

### Styling

- Use Tailwind CSS utility classes
- Create component variants using `cn()` utility with `clsx` and `tailwind-merge`
- Define custom design tokens in `tailwind.config.ts`
- Mobile-first responsive design

### File Naming

- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Types: `camelCase.types.ts`
- Hooks: `useCamelCase.ts`
- Pages: `page.tsx` (Next.js convention)

### Import Conventions

Use barrel exports for clean imports:

```typescript
// Utilities and Supabase
import { cn, createServerClient } from "@/lib";

// Components
import { Button, Header } from "@/components";

// Hooks
import { useAuth } from "@/hooks";

// Types
import type { Database } from "@/types";

// Config
import { siteConfig } from "@/config";
```

## Supabase Integration

### Client Setup

- Server components: Use `createServerClient` from `@supabase/ssr`
- Client components: Use `createBrowserClient` from `@supabase/ssr`
- Middleware: Handle auth session refresh

### Database

- Use Row Level Security (RLS) policies
- Define database types in `src/types/database.types.ts`
- Use migrations in `supabase/migrations/`

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx supabase start   # Start local Supabase
npx supabase db push # Push migrations
```

## Git Workflow

- Branch naming: `feature/`, `fix/`, `chore/`
- Commit messages: Conventional Commits format
- PR required for main branch

## Testing Strategy

- Unit tests: Vitest
- Component tests: React Testing Library
- E2E tests: Playwright

## Security Guidelines

- Never expose service role keys client-side
- Use RLS policies for data access control
- Validate and sanitize all user inputs
- Use HTTPS in production

## Performance Guidelines

- Use Next.js Image component for images
- Implement proper loading states
- Use React Suspense boundaries
- Optimize database queries with proper indexes

## Accessibility

- Follow WCAG 2.1 AA standards
- Use semantic HTML elements
- Provide proper ARIA labels
- Ensure keyboard navigation support
