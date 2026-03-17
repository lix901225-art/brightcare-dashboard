# BrightCare OS — Project Rules

## What This Is

A daycare / kindergarten SaaS product for licensed BC childcare centres.
Two codebases: `~/apps/dashboard` (Next.js frontend) and `~/apps/api` (NestJS backend).

This is a standalone project. Do NOT reference or mix with any other project on this machine.

---

## Current Stage

Track A MVP is nearly complete. Confirm all 4 modules are fully functional, then lock Track A and shift full development effort to Track B.

Track B goal: build a best-in-class childcare SaaS that matches or exceeds industry leaders (Brightwheel, Procare, Lillio/HiMama, Kindertales) while being deeply localized for BC, Canada.

---

## Dual-Track Development

### Track A — Production Stable (生产稳定轨)

**Status: Final confirmation only. Do not expand scope.**

MVP scope is locked to 4 modules:

1. **Children** — roster, profiles, enrollment
2. **Guardians** — child-guardian links, contact info, pickup auth
3. **Sign in / Sign out** — daily attendance check-in and check-out
4. **Messaging** — threaded conversations between staff and parents

Final confirmation checklist before locking Track A:
- [x] All 4 modules render correctly with real backend data
- [x] No broken API calls or 404s in any MVP module
- [x] Parent and staff roles see correct data isolation
- [x] Sign in/out works end-to-end with real child records
- [x] Messaging sends and receives between staff and parent accounts
- [x] No console errors on any MVP page in production build

✓ Track A is LOCKED as of 2026-03-17. Do not touch it again unless a critical bug appears.

### Track B — Continuous Development (持续开发轨)

**Status: Active. Full effort after Track A is locked.**

#### Core Architecture
- Auth0 full integration (login, logout, MFA, password reset, session)
- Multi-tenancy (each childcare centre is an isolated tenant)
- JWT Bearer tokens replace legacy header auth
- Role-based access control (Owner, Director, Staff, Parent)
- Audit logs on all sensitive actions
- Billing and subscription management

#### BC Local Compliance & Features (非常重要)

These are non-negotiable. BrightCare must handle BC-specific requirements that generic SaaS products do not:

**Licensing & Compliance**
- BC Community Care and Assisted Living Act compliance tracking
- Fraser Health / Vancouver Coastal Health / Interior Health inspection records
- ECE (Early Childhood Educator) staff certification tracking and expiry alerts
- Child-to-staff ratio monitoring per BC licensing requirements (infant, toddler, preschool, school-age)
- Incident report forms that match BC licensing office requirements
- Monthly licensing report generation

**Funding & Subsidies**
- ChildCareBC $10/Day program tracking and reporting
- CCFRI (Child Care Fee Reduction Initiative) fee management
- ACCB (Affordable Child Care Benefit) application support for parents
- CCS (Child Care Subsidy) integration and documentation
- StrongStart BC programme tracking
- Automated funding report generation for BC Ministry of Children and Family Development

**Enrollment & Waitlist**
- BC childcare waitlist management with priority rules
- Enrollment forms that meet BC licensing requirements
- Immunization record tracking per BC guidelines
- Medical/allergy forms compliant with BC health authorities
- Authorized pickup list with photo ID verification workflow

**Financial**
- GST-exempt childcare billing (most licensed BC childcare is GST-exempt)
- Receipt generation for parent tax purposes (Canada Child Benefit documentation)
- BC Employer Health Tax (EHT) tracking for payroll
- Integration with BC payroll requirements

**Language & Culture**
- Multilingual parent communication (English, Simplified Chinese, Traditional Chinese, Punjabi, Tagalog) — reflecting Greater Vancouver demographics
- Translation of daily reports and notifications
- Cultural calendar awareness (Lunar New Year, Diwali, etc.) for centre programming

#### Feature Roadmap (Priority Order)

**Phase 1 — Core Operations**
- Staff management (roles, schedules, certifications, deactivation) ← currently in progress
- Enhanced children profiles (medical, dietary, developmental notes)
- Document management (upload, store, expire alerts)
- Incident reporting (BC-compliant forms)

**Phase 2 — Compliance & Funding**
- ECE certification tracking
- Child-to-staff ratio dashboard
- BC funding report automation (CCFRI, ACCB, $10/Day)
- Health authority inspection log

**Phase 3 — Financial**
- Billing and invoicing
- Subsidy deduction automation
- Tax receipt generation
- Parent payment portal

**Phase 4 — Advanced**
- Analytics and occupancy forecasting
- Multi-location management
- API for third-party integrations
- Mobile app (React Native)

---

## Authentication & Authorization

### Hard Rules

- Parents and teachers each have their own real accounts. No shared logins.
- Mock login / fake session / localStorage-as-auth is NOT a production solution.
- Authentication (who you are) and authorization (what you can do) must be separate.
- Permission truth lives in the backend database: tenant → user → userRole → role.key
- Every API request is validated by AuthMiddleware against the database.

### Current State

- Backend: phone+password login with bcrypt + Auth0 sync flow
- AuthMiddleware: Bearer JWT only (legacy x-user-id/x-tenant-id headers removed)
- JWT signed with HS256, 24h expiry, refreshable within 7 days
- Rate limiting on auth endpoints
- Auth0 login flow works end-to-end
- Structured audit logging on all auth events
- CSP, Helmet, security headers all active
- All API requests require `Authorization: Bearer <token>` header

### Future State (Track B)

- Auth0 handles all auth: login, logout, session, token, password reset, MFA
- ~~JWT Bearer tokens fully replace legacy headers~~ ✓ Done
- ~~Legacy header auth path removed once all clients use JWT~~ ✓ Done

---

## Autonomous Execution Rules

### NEVER Stop Early

- Completing a block, writing a summary, or making a commit is NEVER a reason to stop.
- After each completed unit, immediately find the next highest-value in-scope task and continue.
- Do not ask the user for confirmation unless a true blocker exists (see below).
- Summaries are inline checkpoints — report progress, then keep working.
- Commits are save points — commit, then keep working.
- Prefer longer autonomous execution. Group related improvements into larger coherent units.

### Only Stop When

1. The next step requires an external human/operator action (Auth0 dashboard, DNS, hosting, network setup)
2. The next step requires secrets or credentials not available in the codebase
3. The next step is destructive or hard to reverse without confirmation
4. The next step would break Track A MVP functionality
5. There are truly no remaining tasks — and you have actively searched to confirm this

### Do Not Ask About

- Which file to edit (decide yourself based on context)
- Whether to commit (commit when a coherent unit is complete)
- Whether to continue after a summary (always continue)
- Minor implementation choices (pick the most idiomatic approach)
- Whether a feature fits Track B scope (if it's in the roadmap above, it fits)

### Default Behaviour

- Prefer dashboard (frontend) changes unless backend is explicitly required
- Do not restart the API unless a change requires it
- Do not auto-open pages in the browser
- Do not create demo pages as substitutes for real functionality
- Reuse existing real logic before building new
- Surgical edits only — do not broad-rewrite stable pages

---

## Code Conventions

- Cards: `rounded-2xl border-0 shadow-sm`
- Buttons primary: `rounded-xl bg-slate-900 text-white`
- Buttons secondary: `rounded-xl border border-slate-200 bg-white`
- Inputs: `h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none`
- Labels: `text-xs font-medium uppercase tracking-wide text-slate-500`
- BC English: "centre" not "center", "licence" not "license", "programme" not "program"

---

## API Patterns

- Guardian create: `POST /children/:childId/guardians` with `guardianUserId`
- Attendance batch: `POST /attendance/batch` expects `{ entries: [...] }`
- Checkin/checkout: `POST /attendance/checkin|checkout` expects `{ childId, date }`
- Incidents lock: `POST /incidents/:id/lock` (OWNER only, irreversible)
- Proxy: `/api/proxy/[...path]` forwards `Authorization` Bearer token to backend at port 4000

---

## File Structure

- App routes: `src/app/(app)/` — protected by AppAuthGate
- Marketing routes: `src/app/(marketing)/` — public, server components
- API client: `src/lib/api-client.ts`
- Session: `src/lib/session.ts`
- Token store: `src/lib/token-store.ts`
- Auth bootstrap: `src/lib/auth-bootstrap.ts`
- Auth0 provider: `src/lib/auth0-provider.tsx`
- Auth0 token context: `src/lib/auth-token-context.tsx`
- Auth0 types: `src/lib/auth0-types.ts`
- Logout: `src/lib/use-logout.ts`
- Navigation: `src/lib/workspace.ts`
- Error handling: `src/lib/error.ts`
- Env validation: `src/lib/env-check.ts`
- Proxy: `src/app/api/proxy/[...path]/route.ts`
- Docs: `docs/`
- Scripts: `scripts/verify.sh`

---

## Competitive Benchmark

BrightCare Track B must match or exceed these products in their respective strengths:

- **Brightwheel** — parent communication, billing automation, digital check-in
- **Procare** — multi-site management, compliance reporting, staff management
- **Lillio (HiMama)** — learning documentation, milestone tracking, parent engagement
- **Kindertales** — BC/Canada market, waitlist management, enrollment flow

Key differentiator: none of the above are deeply localized for BC's specific funding programs, health authority requirements, and multilingual Greater Vancouver demographics. BrightCare owns this gap.
