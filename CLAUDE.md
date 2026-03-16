# BrightCare OS — Project Rules

## What This Is

A daycare / kindergarten SaaS product for licensed BC childcare centres.
Two codebases: `~/apps/dashboard` (Next.js frontend) and `~/apps/api` (NestJS backend).

---

## Dual-Track Development (双轨制)

Every task must declare which track it belongs to and whether it affects the shippable version.

### Track A — Production Stable (生产稳定轨)

Goal: ship a real, usable MVP as fast as possible.

MVP scope is locked to **4 modules only**:

1. **Children** — roster, profiles, enrollment
2. **Guardians** — child-guardian links, contact info, pickup auth
3. **Sign in / Sign out** — daily attendance check-in and check-out
4. **Messaging** — threaded conversations between staff and parents

Do NOT expand MVP scope. Do NOT prioritise billing, analytics, fancy dashboards, or extra demo pages over these 4 modules.

### Track B — Continuous Development (持续开发轨)

Long-term SaaS architecture continues in parallel:
Auth0, multi-tenancy, JWT/RBAC, billing, reports, analytics, audit logs, invite/onboarding, commercial infrastructure.

**Rules:**
- Track B must NEVER block Track A from shipping.
- Track A must NEVER abandon Track B's architectural direction.
- Track B work that touches MVP modules must not break them.

---

## Authentication & Authorization

### Hard Rules

- Parents and teachers each have their own real accounts. No shared logins.
- **Mock login / fake session / localStorage-as-auth is NOT a production solution.**
- Authentication (who you are) and authorization (what you can do) must be separate.
- The frontend localStorage session (`brightcare.session`) is a UI convenience cache, NOT the source of truth.
- **Permission truth lives in the backend database**: tenant → user → userRole → role.key, plus childGuardian links for parent data isolation.
- Every API request is validated by `AuthMiddleware` against the database.

### Current State (Track A)

- Backend: phone+password login with SHA256+salt, real DB validation.
- AuthMiddleware: validates `x-user-id` + `x-tenant-id` headers against DB on every request.
- Roles come from `userRole` table, not from the frontend.
- Parent data isolation: `getAllowedChildIds()` pattern across all 6 modules.

### Future State (Track B)

- Auth0 handles: login, logout, session, token, password reset, MFA.
- JWT Bearer tokens replace `x-user-id` / `x-tenant-id` headers.
- Backend validates JWT, extracts tenantId/userId from token claims.

---

## Development Rules

### Default Behaviour

- **Prefer web-only (dashboard) changes.** Do not touch the API unless explicitly required.
- **Do not restart the API** unless you have confirmed a change requires it.
- **Do not auto-open pages** in the browser.
- **Do not create demo pages** as substitutes for real functionality.
- **Reuse existing real logic** from the old system before building new.

### Output Rules

- Each step: give a single, copy-pasteable command. No second "snapshot" command.
- Each step: declare track (A or B) and whether it affects the shippable version.
- Do not broad-rewrite stable pages. Surgical edits only.
- Do not casually rewrite billing or other non-MVP modules.
- Keep all existing API-backed functionality working.

### Code Conventions

- Cards: `rounded-2xl border-0 shadow-sm`
- Buttons primary: `rounded-xl bg-slate-900 text-white`
- Buttons secondary: `rounded-xl border border-slate-200 bg-white`
- Inputs: `h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none`
- Labels: `text-xs font-medium uppercase tracking-wide text-slate-500`
- BC English: "centre" not "center", "licence" not "license", "programme" not "program"

### API Patterns

- Guardian create: `POST /children/:childId/guardians` with `guardianUserId`
- Attendance batch: `POST /attendance/batch` expects `{ entries: [...] }`
- Checkin/checkout: `POST /attendance/checkin|checkout` expects `{ childId, date }`
- Incidents lock: `POST /incidents/:id/lock` (OWNER only, irreversible)
- Proxy: `/api/proxy/[...path]` forwards `x-user-id`/`x-tenant-id` to backend at port 4000

---

## File Structure

- App routes: `src/app/(app)/` — protected by AppAuthGate
- Marketing routes: `src/app/(marketing)/` — public, server components
- API client: `src/lib/api-client.ts` (apiFetch), `src/lib/api.ts` (api.get/post/etc)
- Session: `src/lib/session.ts` (readSession/writeSession/patchSession/clearSession)
- Navigation: `src/lib/workspace.ts` (NAV_BY_ROLE, role-based sidebar)
- Error handling: `src/lib/error.ts` (CN→EN translation layer)
