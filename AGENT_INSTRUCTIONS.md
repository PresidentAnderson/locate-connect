# LocateConnect - Agent Coding Instructions

## Quick Reference

| Item | Value |
|------|-------|
| **Repository** | `https://github.com/PresidentAnderson/locate-connect` |
| **Tech Stack** | Next.js 16, TypeScript, Tailwind CSS, Supabase |
| **Node Version** | 20+ |
| **Package Manager** | npm |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | Supabase Auth |

---

## 1. Project Overview

**LocateConnect** is a missing persons finder platform for Jonathan Anderson Investigational Corporation. The system allows:

- **Public Users**: Report missing persons, track their cases
- **Law Enforcement (LE)**: Real-time case management, lead tracking, inter-agency coordination
- **Journalists**: Limited access with credential verification
- **Admins/Developers**: System configuration, monitoring, user management

### Core Features
- Multi-step intake forms (EN/FR bilingual)
- SPVM-aligned priority scoring engine
- Real-time lead and tip management
- Email tracking with IP capture
- Social media monitoring agents
- External integrations (hospitals, border services)
- Case disposition tracking

---

## 2. Environment Setup

### 2.1 Clone and Install

```bash
git clone https://github.com/PresidentAnderson/locate-connect.git
cd locate-connect
npm install
```

### 2.2 Environment Variables

Create `.env.local` from the example:

```bash
cp .env.local.example .env.local
```

Required variables (request from project lead):
```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### 2.3 Run Development Server

```bash
npm run dev
```

App runs on `http://localhost:3000` (or 3001 if 3000 is occupied).

### 2.4 Supabase CLI (for database work)

```bash
# Link to project (one-time)
supabase link --project-ref [project-ref]

# Push migrations
supabase db push

# Pull remote schema
supabase db pull
```

---

## 3. Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── admin/         # Developer admin panel
│   │   ├── cases/         # User case management
│   │   └── law-enforcement/  # LE panel
│   └── api/               # API routes
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── dashboard/        # Dashboard-specific components
│   └── forms/            # Form components
├── config/               # App configuration
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and services
│   ├── supabase/        # Supabase clients
│   ├── services/        # Business logic (priority-engine, etc.)
│   └── utils/           # Helpers (cn, etc.)
├── types/               # TypeScript types
│   ├── case.types.ts    # Case-related types
│   ├── jurisdiction.types.ts  # Jurisdiction profiles
│   └── user.types.ts    # User and role types
└── middleware.ts        # Auth middleware

supabase/
└── migrations/          # Database migrations
```

---

## 4. Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends auth.users) |
| `cases` | Missing persons cases |
| `leads` | Investigation leads |
| `tips` | Anonymous/authenticated tips |
| `case_updates` | Case timeline/activity |
| `jurisdictions` | Police jurisdictions with priority weights |
| `organizations` | Partner organizations |
| `audit_logs` | Complete audit trail |

### Key Enums

```typescript
// User roles
type UserRole = 'user' | 'law_enforcement' | 'journalist' | 'admin' | 'developer';

// Case status
type CaseStatus = 'active' | 'resolved' | 'closed' | 'cold';

// Priority levels (SPVM-aligned)
type PriorityLevel = 'p0_critical' | 'p1_high' | 'p2_medium' | 'p3_low' | 'p4_routine';

// Case disposition (where person was found)
type CaseDisposition =
  | 'found_alive_safe'
  | 'found_alive_injured'
  | 'found_deceased'
  | 'returned_voluntarily'
  | 'located_runaway'
  | 'located_custody'
  | 'located_medical_facility'
  | 'located_shelter'
  | 'located_incarcerated'
  | 'false_report'
  | 'other';
```

### Row Level Security (RLS)

All tables have RLS enabled. Key policies:

- **Users**: Can only see/edit their own cases and profiles
- **Law Enforcement** (verified): Can see all cases, leads, tips
- **Public**: Can see public active cases only
- **Admins**: Full access to audit logs

---

## 5. Code Conventions

### 5.1 TypeScript

- **Strict mode** is enabled
- Use explicit types, avoid `any`
- Export types from `src/types/` barrel exports

```typescript
// Good
import type { MissingPerson, CaseStatus } from "@/types";

// Bad
import type { MissingPerson } from "@/types/case.types";
```

### 5.2 Imports

Use path aliases:

```typescript
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types";
```

### 5.3 Components

- Use `"use client"` directive only when needed (state, effects, browser APIs)
- Prefer Server Components for data fetching
- Use the `cn()` utility for conditional classes

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  variant === "primary" && "primary-classes"
)} />
```

### 5.4 Supabase Clients

```typescript
// Client-side (components with "use client")
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

// Server-side (Server Components, API routes)
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
```

### 5.5 Error Handling

```typescript
const { data, error } = await supabase.from("cases").select();

if (error) {
  console.error("Error fetching cases:", error);
  // Handle error appropriately
  return;
}
```

---

## 6. Working on Issues

### 6.1 Issue Naming Convention

Issues follow this pattern:
- `LC-FEAT-XXX`: New features
- `LC-BUG-XXX`: Bug fixes
- `LC-INFRA-XXX`: Infrastructure/DevOps
- `LC-TEST-XXX`: Testing
- `LC-DOCS-XXX`: Documentation

### 6.2 Branch Naming

```bash
# Feature
git checkout -b feature/LC-FEAT-001-real-time-notifications

# Bug fix
git checkout -b fix/LC-BUG-001-login-redirect

# Infrastructure
git checkout -b infra/LC-INFRA-001-ci-pipeline
```

### 6.3 Commit Messages

```bash
git commit -m "$(cat <<'EOF'
feat(notifications): add real-time push notification system

- Implement WebSocket connection for real-time updates
- Add notification preference center
- Create notification bell component

Closes #84

Co-Authored-By: [Your Name] <your@email.com>
EOF
)"
```

### 6.4 Pull Request Format

```markdown
## Summary
- Brief description of changes (2-3 bullet points)

## Changes
- Detailed list of what was added/modified

## Test Plan
- [ ] Manual testing steps
- [ ] Unit tests added/updated
- [ ] E2E tests if applicable

## Screenshots (if UI changes)

---
🤖 Generated with Claude Code / OpenAI Agent
```

---

## 7. Issue Assignment Matrix (10 Parallel Sessions)

### Session Allocation

| Session | Issue Category | Suggested Issues |
|---------|---------------|------------------|
| **Agent 1** | Authentication & Profiles | LC-AUTH-* issues |
| **Agent 2** | Case Management Core | LC-FEAT-001 to LC-FEAT-005 |
| **Agent 3** | Law Enforcement Panel | LC-LE-* issues |
| **Agent 4** | Intake Forms & Validation | LC-INTAKE-* issues |
| **Agent 5** | Real-time Features | Notifications, WebSocket |
| **Agent 6** | API & Integrations | LC-API-*, LC-INTEG-* |
| **Agent 7** | Testing & QA | LC-TEST-* issues |
| **Agent 8** | CI/CD & Infrastructure | LC-INFRA-*, LC-DEPLOY-* |
| **Agent 9** | Agents & Crawlers | LC-AGENT-*, LC-CRAWLER-* |
| **Agent 10** | Analytics & Reporting | LC-ANALYTICS-* |

### Before Starting Work

1. **Check issue status** - Ensure not already in progress
2. **Read related issues** - Check for dependencies
3. **Review existing code** - Understand current implementation
4. **Create branch** - Follow naming convention
5. **Update issue** - Mark as "in progress"

### Conflict Prevention

To avoid merge conflicts:

1. **Claim files explicitly** - Comment on issue which files you'll modify
2. **Small, focused PRs** - One feature per PR
3. **Sync frequently** - Pull from main before pushing
4. **Coordinate on shared files**:
   - `src/types/*.ts` - Coordinate type changes
   - `src/lib/supabase/*` - Coordinate client changes
   - `supabase/migrations/*` - Never modify existing migrations

---

## 8. API Patterns

### 8.1 API Route Structure

```typescript
// src/app/api/cases/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("reporter_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

### 8.2 Server Actions (Preferred for mutations)

```typescript
// src/app/cases/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createCase(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("cases").insert({
    reporter_id: user.id,
    first_name: formData.get("firstName"),
    last_name: formData.get("lastName"),
    // ... other fields
  });

  if (error) throw new Error(error.message);

  revalidatePath("/cases");
}
```

---

## 9. Testing Requirements

### 9.1 Unit Tests

Location: `__tests__/` or `*.test.ts` files

```typescript
// src/lib/services/__tests__/priority-engine.test.ts
import { assessPriority } from "../priority-engine";

describe("Priority Engine", () => {
  it("should assign P0 for child abduction", () => {
    const result = assessPriority({
      ageAtDisappearance: 8,
      suspectedAbduction: true,
    }, "SPVM");

    expect(result.level).toBe("p0_critical");
  });
});
```

### 9.2 Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- priority-engine

# Watch mode
npm test -- --watch
```

### 9.3 E2E Tests (Playwright)

```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test("user can sign up", async ({ page }) => {
  await page.goto("/signup");
  await page.fill('[name="email"]', "test@example.com");
  await page.fill('[name="password"]', "securepassword123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/login");
});
```

---

## 10. Database Migrations

### Creating a New Migration

```bash
# Create migration file
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_description.sql
```

### Migration Template

```sql
-- Migration: Add feature X
-- Author: Agent Y
-- Date: 2026-01-17

-- Add new column
ALTER TABLE cases ADD COLUMN new_field TEXT;

-- Add index if needed
CREATE INDEX idx_cases_new_field ON cases(new_field);

-- Update RLS policy if needed
CREATE POLICY "policy_name" ON table_name
  FOR SELECT USING (condition);
```

### Push Migration

```bash
supabase db push
```

**IMPORTANT**: Never modify existing migrations. Always create new ones.

---

## 11. Common Patterns

### 11.1 Protected Page

```typescript
// src/app/(dashboard)/cases/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CasesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: cases } = await supabase
    .from("cases")
    .select("*")
    .eq("reporter_id", user.id);

  return <CasesList cases={cases} />;
}
```

### 11.2 Client Component with Supabase

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Case } from "@/types";

export function RealtimeCases() {
  const [cases, setCases] = useState<Case[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    supabase.from("cases").select("*").then(({ data }) => {
      if (data) setCases(data);
    });

    // Real-time subscription
    const channel = supabase
      .channel("cases")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "cases" },
        (payload) => {
          // Handle real-time update
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return <div>{/* Render cases */}</div>;
}
```

### 11.3 Form with Validation

```typescript
"use client";

import { useState } from "react";
import { createCase } from "./actions";

export function CaseForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    try {
      await createCase(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit}>
      {error && <div className="text-red-500">{error}</div>}
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
```

---

## 12. Checklist Before Submitting PR

- [ ] Code compiles without errors (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Tests pass (`npm test`)
- [ ] No console.log statements left in code
- [ ] No hardcoded credentials or secrets
- [ ] TypeScript types are explicit (no `any`)
- [ ] RLS policies considered for new tables/columns
- [ ] Migrations are additive (no modifications to existing)
- [ ] PR description follows template
- [ ] Issue is linked in PR
- [ ] Screenshots attached for UI changes

---

## 13. Contact & Support

- **GitHub Issues**: https://github.com/PresidentAnderson/locate-connect/issues
- **Project Board**: Check GitHub Projects for sprint planning
- **Questions**: Comment on the issue or create a discussion

---

## 14. Quick Commands Reference

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm test             # Run tests

# Database
supabase db push     # Push migrations
supabase db pull     # Pull remote schema
supabase db diff     # Show schema diff

# Git
git fetch origin
git checkout -b feature/LC-FEAT-XXX-description
git add .
git commit -m "feat(scope): description"
git push -u origin feature/LC-FEAT-XXX-description

# Create PR
gh pr create --title "feat(scope): description" --body "..."
```

---

**Last Updated**: 2026-01-17
**Version**: 1.0.0
