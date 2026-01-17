# LocateConnect - 10 Parallel Agent Sessions

## Session Assignments

Each agent session should focus on their assigned domain. This prevents merge conflicts and allows parallel development.

---

## 🔴 SESSION 1: Authentication & User Management

**Focus**: User authentication, profile management, role-based access

### Assigned Issues
| # | Issue | Priority |
|---|-------|----------|
| **NEW** | LC-AUTH-001: Implement Supabase Auth flow | HIGH |
| **NEW** | LC-AUTH-002: Profile completion wizard | HIGH |
| **NEW** | LC-AUTH-003: LE verification workflow | HIGH |
| **NEW** | LC-AUTH-004: Password reset flow | MEDIUM |
| **NEW** | LC-AUTH-005: Session management | MEDIUM |

### Files to Modify
```
src/app/(auth)/login/page.tsx
src/app/(auth)/signup/page.tsx
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/verify/page.tsx
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/middleware.ts
```

### First Task
Implement functional login/signup with Supabase Auth, ensuring profile creation trigger works.

### Acceptance Criteria
- [ ] User can sign up with email/password
- [ ] Profile is auto-created on signup
- [ ] Role selection works (user, law_enforcement, journalist)
- [ ] LE users see verification pending message
- [ ] Login redirects to appropriate dashboard

---

## 🟠 SESSION 2: Case Management Core

**Focus**: CRUD operations for missing persons cases

### Assigned Issues
| # | Issue | Priority |
|---|-------|----------|
| #91 | LC-FEAT-008: Case resolution workflow | HIGH |
| #102 | LC-FEAT-019: Case disposition tracking | HIGH |
| #89 | LC-FEAT-006: Case timeline visualization | MEDIUM |
| #104 | LC-FEAT-021: Case outcome reports | MEDIUM |

### Files to Modify
```
src/app/(dashboard)/cases/page.tsx
src/app/(dashboard)/cases/[id]/page.tsx
src/app/(dashboard)/cases/new/page.tsx
src/types/case.types.ts
src/components/cases/
```

### First Task
Complete the case CRUD - list, view, create, update, close with disposition.

### Acceptance Criteria
- [ ] User can view list of their cases
- [ ] User can create new case via intake form
- [ ] User can view case details
- [ ] Case can be closed with disposition
- [ ] Resolution location is captured

---

## 🟡 SESSION 3: Law Enforcement Panel

**Focus**: LE-specific features and dashboard

### Assigned Issues
| # | Issue | Priority |
|---|-------|----------|
| #101 | LC-FEAT-018: LE shift handoff reports | HIGH |
| **NEW** | LC-LE-001: Real-time case feed | HIGH |
| **NEW** | LC-LE-002: Case assignment system | HIGH |
| **NEW** | LC-LE-003: Lead management interface | MEDIUM |

### Files to Modify
```
src/app/(dashboard)/law-enforcement/page.tsx
src/app/(dashboard)/law-enforcement/cases/[id]/page.tsx
src/app/(dashboard)/law-enforcement/leads/page.tsx
src/components/law-enforcement/
```

### First Task
Build the LE dashboard with real-time case feed using Supabase realtime.

### Acceptance Criteria
- [ ] LE sees all active cases (requires verified status)
- [ ] Real-time updates when new cases are filed
- [ ] Can filter by priority, status, jurisdiction
- [ ] Can assign cases to self or team

---

## 🟢 SESSION 4: Intake Forms & Validation

**Focus**: Multi-step intake form with validation

### Assigned Issues
| # | Issue | Priority |
|---|-------|----------|
| **NEW** | LC-INTAKE-001: Complete multi-step form | HIGH |
| **NEW** | LC-INTAKE-002: Photo upload system | HIGH |
| **NEW** | LC-INTAKE-003: Form validation (Zod) | HIGH |
| #116 | LC-FEAT-033: Multi-language support | MEDIUM |

### Files to Modify
```
src/app/(dashboard)/cases/new/page.tsx
src/components/forms/intake/
src/lib/validations/case.ts
src/lib/validations/
```

### First Task
Complete the multi-step intake form with Zod validation and file uploads.

### Acceptance Criteria
- [ ] 5-step form flow works
- [ ] Validation on each step
- [ ] Photo upload to Supabase Storage
- [ ] EN/FR language toggle
- [ ] Data persists between steps

---

## 🔵 SESSION 5: Real-time & Notifications

**Focus**: Real-time features and notification system

### Assigned Issues
| # | Issue | Priority |
|---|-------|----------|
| #84 | LC-FEAT-001: Real-time notification system | HIGH |
| #123 | LC-FEAT-040: Notification preference center | HIGH |
| #95 | LC-FEAT-012: Geofencing alerts | MEDIUM |

### Files to Modify
```
src/app/api/notifications/
src/components/notifications/
src/hooks/useNotifications.ts
src/hooks/useRealtime.ts
src/lib/services/notifications.ts
```

### First Task
Implement notification system with Supabase Realtime and in-app notifications.

### Acceptance Criteria
- [ ] In-app notification bell with unread count
- [ ] Real-time notification delivery
- [ ] Notification preference settings
- [ ] Email notification integration (optional)

---

## 🟣 SESSION 6: API & External Integrations

**Focus**: REST API and external service integrations

### Assigned Issues
| # | Issue | Priority |
|---|-------|----------|
| #119 | LC-FEAT-036: Public API & Developer Portal | HIGH |
| #109 | LC-FEAT-026: AMBER Alert Integration | HIGH |
| #107 | LC-FEAT-024: Partner Organization Portal | MEDIUM |
| #118 | LC-FEAT-035: Cross-Border Coordination Hub | LOW |

### Files to Modify
```
src/app/api/v1/
src/lib/integrations/
src/types/api.types.ts
```

### First Task
Build RESTful API endpoints for cases, leads, tips with proper auth.

### Acceptance Criteria
- [ ] GET /api/v1/cases - list cases
- [ ] GET /api/v1/cases/:id - get case
- [ ] POST /api/v1/tips - submit tip
- [ ] API key authentication
- [ ] Rate limiting

---

## ⚪ SESSION 7: Testing & Quality Assurance

**Focus**: Unit tests, integration tests, E2E tests

### Assigned Issues
| # | Issue | Priority |
|---|-------|----------|
| **NEW** | LC-TEST-001: Unit test setup (Vitest) | HIGH |
| **NEW** | LC-TEST-002: E2E test setup (Playwright) | HIGH |
| **NEW** | LC-TEST-003: Priority engine tests | HIGH |
| **NEW** | LC-TEST-004: Auth flow E2E tests | MEDIUM |

### Files to Create/Modify
```
__tests__/
e2e/
vitest.config.ts
playwright.config.ts
src/lib/services/__tests__/
```

### First Task
Set up Vitest and Playwright, write tests for priority engine.

### Acceptance Criteria
- [ ] Vitest configured and running
- [ ] Playwright configured
- [ ] Priority engine has 100% coverage
- [ ] Auth flow E2E test passes
- [ ] CI runs tests on PR

---

## ⚫ SESSION 8: CI/CD & Infrastructure

**Focus**: GitHub Actions, deployment, Docker

### Assigned Issues
| # | Issue | Priority |
|---|-------|----------|
| #82 | LC-DEPLOY-001: Agent runner infrastructure | HIGH |
| #83 | LC-DEPLOY-002: Worker queue infrastructure | HIGH |
| **NEW** | LC-INFRA-001: GitHub Actions CI pipeline | HIGH |
| **NEW** | LC-INFRA-002: Vercel deployment config | HIGH |

### Files to Create/Modify
```
.github/workflows/ci.yml
.github/workflows/deploy.yml
docker-compose.yml
Dockerfile
vercel.json
```

### First Task
Set up GitHub Actions CI with lint, test, build checks.

### Acceptance Criteria
- [ ] CI runs on every PR
- [ ] Lint check passes
- [ ] Build check passes
- [ ] Tests run in CI
- [ ] Preview deployments on PR

---

## 🟤 SESSION 9: Agents & Background Workers

**Focus**: AI agents, crawlers, data ingestion

### Assigned Issues
| # | Issue | Priority |
|---|-------|----------|
| #76 | LC-AGENT-004: Priority escalation agent | HIGH |
| #77 | LC-CRAWLER-001: News article crawler | HIGH |
| #79 | LC-INGEST-001: Data ingestion engine | HIGH |
| #117 | LC-FEAT-034: Automated tip verification | MEDIUM |

### Files to Create/Modify
```
src/agents/
src/workers/
src/lib/services/ingestion/
src/lib/services/crawlers/
```

### First Task
Build the priority escalation agent that monitors cases and auto-escalates.

### Acceptance Criteria
- [ ] Agent runs on schedule (cron)
- [ ] Checks all active cases
- [ ] Escalates based on time + factors
- [ ] Logs all escalations
- [ ] Notifies assigned LE

---

## 🔶 SESSION 10: Analytics & Reporting

**Focus**: Dashboards, reports, data visualization

### Assigned Issues
| # | Issue | Priority |
|---|-------|----------|
| #122 | LC-FEAT-039: Executive & Operational Dashboards | HIGH |
| #103 | LC-FEAT-020: Resolution location heat map | HIGH |
| #121 | LC-FEAT-038: System Health & Monitoring | MEDIUM |
| #85 | LC-FEAT-002: Interactive search map | MEDIUM |

### Files to Create/Modify
```
src/app/(dashboard)/analytics/
src/components/charts/
src/components/maps/
src/lib/services/analytics.ts
```

### First Task
Build executive dashboard with KPIs and case resolution metrics.

### Acceptance Criteria
- [ ] Dashboard shows total cases by status
- [ ] Average resolution time chart
- [ ] Cases by priority breakdown
- [ ] Geographic distribution (map)
- [ ] Exportable reports

---

## Coordination Rules

### 1. File Ownership

Each session "owns" specific directories. Do not modify files outside your domain without coordination.

### 2. Shared Files Protocol

These files are shared and require coordination:

| File | Coordination Method |
|------|---------------------|
| `src/types/*.ts` | Add types, don't modify existing |
| `package.json` | Announce new dependencies in PR |
| `supabase/migrations/*` | Never modify existing, only add new |
| `.env.local.example` | Announce new env vars |

### 3. Communication

- Comment on issue when starting work
- Create draft PR early
- Request review when ready
- Tag other sessions if touching shared code

### 4. Merge Order

Recommended merge order to minimize conflicts:

1. Session 8 (CI/CD) - foundation
2. Session 1 (Auth) - core functionality
3. Session 7 (Tests) - quality gates
4. Session 4 (Forms) - data entry
5. Session 2 (Cases) - core domain
6. Session 3 (LE Panel) - role features
7. Session 5 (Notifications) - real-time
8. Session 6 (API) - integrations
9. Session 9 (Agents) - automation
10. Session 10 (Analytics) - reporting

---

## Getting Started Checklist

Each session should:

- [ ] Clone repository
- [ ] Set up environment variables
- [ ] Run `npm install`
- [ ] Run `npm run dev` to verify setup
- [ ] Create feature branch
- [ ] Comment on assigned issue: "Starting work"
- [ ] Begin implementation
- [ ] Create draft PR early
- [ ] Request review when complete

---

## Quick Reference

```bash
# Start development
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Build for production
npm run build

# Push database migration
supabase db push

# Create PR
gh pr create --title "feat(scope): description" --body "Closes #XX"
```

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-17
**Total Issues**: 125+
**Parallel Sessions**: 10
