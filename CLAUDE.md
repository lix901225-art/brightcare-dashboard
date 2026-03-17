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

### Current State (Track A + B coexisting)

- Backend: phone+password login with bcrypt (auto-migrates legacy SHA256 on next login).
- AuthMiddleware: tries Bearer JWT first, falls back to `x-user-id` + `x-tenant-id` headers.
- JWT signed with HS256, 24h expiry, refreshable within 7 days.
- Rate limiting on auth endpoints (5-10 req/min via @nestjs/throttler).
- Roles come from `userRole` table, not from the frontend or JWT.
- Parent data isolation: `getAllowedChildIds()` pattern across all 6 modules.
- Auth0 login flow works end-to-end (sync endpoint creates/links users).
- Structured audit logging on all auth events.
- CSP, Helmet, security headers all active.
- Fail-fast in production if JWT_SECRET or PASSWORD_SALT not set.

### Future State (Track B complete)

- Auth0 handles: login, logout, session, token, password reset, MFA.
- JWT Bearer tokens fully replace `x-user-id` / `x-tenant-id` headers.
- Legacy header auth path removed once all clients use JWT.

---

## Autonomous Execution Rules

### Continuous Work — NEVER stop early

- **Completing a block, writing a summary, or making a commit is NEVER a reason to stop.**
- After each completed unit, **immediately search for the next highest-value in-scope task** and continue automatically. Do not wait for the user unless a true blocker exists.
- **"No more tasks remain" must be interpreted strictly.** Before concluding, actively search for remaining work across: code hardening, documentation, scripts, checklists, rollout prep, type safety, dead code, test coverage, config clarity, error handling, UX polish, and any other in-scope category.
- **Summaries are inline checkpoints** — report progress, then keep working.
- **Commits are save points** — commit completed work, then keep working.
- **Prefer longer autonomous execution.** Group related improvements into larger coherent units.
- **Only stop when one of these is true:**
  1. The next step requires an external human/operator action (Auth0 dashboard, DNS, hosting)
  2. The next step requires secrets or credentials not available in code
  3. The next step is destructive or hard to reverse
  4. The next step would weaken or remove Track A fallback
  5. There are truly no remaining code, docs, scripts, checklists, rollout-prep, or hardening tasks in scope — and you have actively searched to confirm this

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
- API client: `src/lib/api-client.ts` (apiFetch with auto-refresh on 401)
- Session: `src/lib/session.ts` (readSession/writeSession/patchSession/clearSession)
- Token store: `src/lib/token-store.ts` (JWT read/write/clear with format validation)
- Auth bootstrap: `src/lib/auth-bootstrap.ts` (syncs session with backend on app load)
- Auth0 provider: `src/lib/auth0-provider.tsx` (conditional Auth0 wrapper with error boundary)
- Navigation: `src/lib/workspace.ts` (NAV_BY_ROLE, role-based sidebar)
- Error handling: `src/lib/error.ts` (CN→EN translation + rate-limit message rewrite)
- Proxy: `src/app/api/proxy/[...path]/route.ts` (forwards to backend with path validation)
