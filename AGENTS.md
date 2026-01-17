# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the Next.js App Router code. Key areas: `src/app/` (routes and API), `src/components/` (UI and forms), `src/lib/` (services, Supabase clients, utilities), and `src/types/` (TypeScript types and barrel exports).
- `public/` stores static assets.
- `supabase/migrations/` holds database migrations. **Never modify existing migrations; add new ones only.**
- Tests live alongside code as `*.test.ts` files or under `__tests__/`. E2E tests use Playwright when present.

## Build, Test, and Development Commands
- `npm run dev`: Start the local dev server (default `http://localhost:3000`).
- `npm run build`: Create a production build.
- `npm run lint`: Run ESLint checks.
- `npm test`: Run unit tests.

## Coding Style & Naming Conventions
- TypeScript strict mode is on; avoid `any` and prefer explicit types.
- Use path aliases like `@/lib/utils` and `@/types`.
- Client components must include `"use client"`; prefer server components for data fetching.
- Naming patterns: branches `feature/LC-FEAT-###-desc`, `fix/LC-BUG-###-desc`; issues `LC-FEAT-*`, `LC-BUG-*`, etc.
- Use the `cn()` helper for conditional Tailwind classes.

## Testing Guidelines
- Unit tests are standard Jest/Vitest-style `*.test.ts` files (see `src/lib/services/__tests__/`).
- Run all tests with `npm test`, or scope with `npm test -- priority-engine`.
- Add tests for business logic changes and critical flows; include Playwright E2E tests where user journeys are affected.

## Commit & Pull Request Guidelines
- Commit messages follow a conventional format, e.g.:
  `feat(scope): short description`.
- PRs should include a summary, detailed change list, and a test plan. Add screenshots for UI changes.
- Link the relevant issue and use the provided PR template in `AGENT_INSTRUCTIONS.md`.

## Security & Configuration Tips
- Local config is in `.env.local` (copy from `.env.local.example`). Do not commit secrets.
- Supabase keys and database URLs are required for authenticated features; request from the project lead.

## Agent-Specific Instructions
- Coordinate edits to shared files (`src/types/`, `src/lib/supabase/`).
- Before starting, verify issue status and claim files to reduce merge conflicts.
