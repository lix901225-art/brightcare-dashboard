# Release MVP Checklist

## MVP Scope — Locked

The MVP ships exactly 4 modules. Nothing else gets priority.

1. **Children** — roster, child profiles, enrollment status
2. **Guardians** — child-guardian links, relation, contact, pickup auth, emergency contact
3. **Sign in / Sign out** — daily attendance check-in and check-out
4. **Messaging** — threaded conversations between staff and parents

## What is NOT in MVP

Do NOT prioritise any of these before the 4 modules are production-ready:

- Billing / invoices / payments
- Analytics / dashboards / charts
- Daily reports (nice-to-have, not MVP)
- Incidents (nice-to-have, not MVP)
- Fancy marketing pages or demo pages
- Room management
- Staff scheduling
- Audit logs UI
- Settings beyond basic profile

## Pre-Release Checklist

### Authentication
- [ ] Login with phone + password works for OWNER, STAFF, PARENT
- [ ] Session persists across page refreshes
- [ ] Logout clears session and redirects to login
- [ ] Invalid credentials show clear error message
- [ ] Registration creates real user + tenant in database

### Children Module
- [ ] List all children in tenant (staff/owner view)
- [ ] Parent sees only linked children
- [ ] Child detail page loads with profile data
- [ ] Edit child profile saves to backend
- [ ] Enrollment status displays correctly

### Guardians Module
- [ ] List guardians for a child
- [ ] Parent can only see guardians for their own children
- [ ] Add guardian link (OWNER/STAFF only)
- [ ] Edit guardian link (OWNER/STAFF only)
- [ ] Delete guardian link (OWNER only)
- [ ] Relation, contact info, pickup auth fields all work

### Sign in / Sign out (Attendance)
- [ ] Daily roster shows all children with attendance status
- [ ] Check-in records timestamp
- [ ] Check-out records timestamp
- [ ] Parent sees only their children's attendance
- [ ] Batch attendance works for staff

### Messaging
- [ ] Thread list loads for user
- [ ] Parent sees only threads for their children
- [ ] Create new thread (with child selector)
- [ ] Send message in thread
- [ ] Messages display in correct order
- [ ] Unread indicators work

### Cross-Cutting
- [ ] Mobile responsive on all 4 modules
- [ ] Error messages in English (no Chinese leak)
- [ ] Role-based navigation (parent vs staff vs owner)
- [ ] API returns proper HTTP status codes
- [ ] No console errors on core flows

### Security (Track B, but required for production)
- [ ] JWT_SECRET set to a strong random value (not default)
- [ ] PASSWORD_SALT set to a strong random value (not default)
- [ ] CORS_ORIGINS set to production domain (not localhost)
- [ ] Rate limiting active on /auth/* endpoints (verify 429 after rapid requests)
- [ ] CSP header present in responses (check with `curl -I`)
- [ ] No stack traces in error responses
- [ ] Passwords hashed with bcrypt (not SHA256)
- [ ] Auth0 callback/logout URLs configured if Auth0 is enabled
- [ ] `npm run typecheck` passes on both dashboard and API

## Release Rules

- Do NOT ship with mock/fake auth
- Do NOT ship demo pages as substitutes for real features
- Do NOT expand scope beyond 4 modules
- Fix real bugs before adding cosmetic polish
- Every module must work end-to-end: frontend → proxy → API → database → response
