---
name: daycare-saas-dual-track
description: Determines whether a task belongs to Track A (production stable) or Track B (continuous development), then enforces the correct constraints for that track.
---

# Daycare SaaS Dual-Track Execution Skill

## Track Classification

Before starting any task, classify it:

### Track A — Production Stable (生产稳定轨)

A task is Track A if it directly affects the ability to ship or use the MVP.

**MVP = exactly 4 modules:**
1. Children (roster, profiles, enrollment)
2. Guardians (child-guardian links, contacts, pickup auth)
3. Sign in / Sign out (daily attendance check-in/check-out)
4. Messaging (threaded staff-parent conversations)

**Track A includes:**
- Bugs in MVP modules
- Login / session / auth flow for real users
- Parent data isolation fixes
- UX hardening for the 4 modules
- Mobile responsiveness for the 4 modules
- Error handling in the 4 modules
- API fixes that block MVP functionality

**Track A constraints:**
- Do NOT expand demo pages
- Do NOT add fake auth or mock data as production solutions
- Do NOT prioritise non-MVP modules (billing, analytics, dashboards, reports)
- Fix real functionality first, cosmetics second
- Prefer dashboard-only changes; avoid API changes unless required
- Every change must leave the app in a shippable state
- Reuse existing backend logic before building new

### Track B — Continuous Development (持续开发轨)

A task is Track B if it improves long-term architecture without being required for MVP ship.

**Track B scope:**
- Auth0 integration (SDK installed, provider wrapping layout — needs login flow connection)
- JWT Bearer token auth (replace x-user-id/x-tenant-id headers)
- Multi-tenancy hardening
- RBAC refinement beyond basic OWNER/STAFF/PARENT
- Billing module
- Reports and analytics
- Audit log improvements
- Invite / onboarding flows
- Commercial SaaS infrastructure (pricing, plans, usage metering)
- Marketing site / SEO (already built, maintenance only)

**Track B constraints:**
- Must NEVER break MVP functionality
- Must NEVER block Track A from shipping
- Changes to MVP modules must be backward-compatible
- Can run in parallel with Track A but not at its expense
- Auth0 migration must be incremental — phone+password login stays working until Auth0 is fully validated

## Execution Rules

1. **Declare track** at the start of every task: `[Track A]` or `[Track B]`
2. **State impact**: "Affects shippable version: yes/no"
3. **Single command per step**: give one copy-pasteable command, not two
4. **No demo expansion**: do not create demo/placeholder pages for Track A work
5. **No mock auth**: localStorage session is a cache, not permission truth
6. **Permission truth = backend DB**: tenant → user → userRole → role.key + childGuardian links
7. **Web-first**: default to dashboard changes; API changes only when confirmed necessary
8. **Don't restart API** unless a confirmed change requires it

## Autonomous Continuation — NEVER stop early

- **Completing a block, writing a summary, or making a commit is NEVER a reason to stop.**
- After each unit, **immediately search for the next highest-value in-scope task** and continue. Do not wait for the user.
- **"No more tasks remain" must be interpreted strictly.** Actively search across: code, docs, scripts, checklists, rollout prep, type safety, dead code, config, error handling, UX — before concluding there is nothing left.
- **Only stop when one of these is true:**
  1. Next step requires external human/operator action
  2. Next step requires secrets/credentials not in code
  3. Next step is destructive or hard to reverse
  4. Next step would weaken Track A fallback
  5. Truly no remaining in-scope work exists (actively verified)

## Conflict Resolution

If a task spans both tracks:
- Split it into Track A (minimal, shippable) and Track B (full architecture) parts
- Ship Track A part first
- Track B part follows without reverting Track A work
- Example: "Add proper auth" → Track A: fix login bugs, harden session. Track B: Auth0 migration.
