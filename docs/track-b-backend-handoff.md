# Track B — Backend Auth0 JWT Handoff Plan

> Generated from code inspection. No backend changes have been made yet.
> This document captures the exact backend state and what needs to change.

## Current Backend State (Track A — Working)

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /auth/login` | None (excluded) | Phone+password login |
| `POST /auth/register` | None (excluded) | Create tenant + owner |
| `POST /auth/sync` | None (excluded) | Auth0 user sync (scaffolded) |
| `GET /me` | `x-user-id` + `x-tenant-id` headers | Basic profile |
| `GET /account/me` | `x-user-id` + `x-tenant-id` + RolesGuard | Full profile |

**AuthMiddleware** (`src/auth/auth.middleware.ts`):
- Reads `x-tenant-id` and `x-user-id` from request headers
- Validates user exists in tenant via DB lookup
- Fetches roles from `userRole` table
- Sets `req.auth = { tenantId, userId, roles }`
- Excluded from: `/auth/login`, `/auth/register`, `/auth/sync`

## What Already Exists (No Changes Needed)

- `User.auth0Id` field in Prisma schema (unique, nullable)
- `User.email` and `User.picture` fields
- `/auth/sync` endpoint scaffolding in `auth.controller.ts` (lines 101-221)
- `jsonwebtoken` v9.0.3 in package.json
- `JWT_SECRET` in `.env.example`
- Bearer auth declared in Swagger docs
- `@ApiBearerAuth()` decorator on AccountController
- RolesGuard + @Roles() decorator pattern

## Backend Changes Required (In Order)

### Step 1: Dual-mode AuthMiddleware (Smallest, Safest)

**File:** `src/auth/auth.middleware.ts`

Add Bearer token support **alongside** existing header-based auth:

```
1. Check for Authorization: Bearer <token> header
2. If present:
   a. Verify JWT (using JWT_SECRET for self-signed, or Auth0 JWKS for Auth0 tokens)
   b. Extract tenantId, userId from claims
   c. Fetch roles from DB (same as current)
   d. Set req.auth
3. If not present:
   a. Fall back to existing x-user-id / x-tenant-id header validation (current behavior)
```

This is the **critical dual-mode step** — it lets both Track A (headers) and Track B (JWT) coexist.

### Step 2: Sign JWT in Login/Register/Sync Responses

**File:** `src/auth/auth.controller.ts`

After successful login/register/sync, sign a JWT containing:

```json
{
  "sub": "<userId>",
  "tenantId": "<tenantId>",
  "roles": ["OWNER"],
  "displayName": "Sarah Chen",
  "iat": 1234567890,
  "exp": 1234654290
}
```

Return it alongside existing response fields:

```json
{
  "userId": "...",
  "tenantId": "...",
  "role": "OWNER",
  "displayName": "Sarah Chen",
  "tenantName": "Sunshine Childcare",
  "token": "<JWT>"
}
```

Frontend can then store and send the token.

### Step 3: Complete /auth/sync Endpoint

**File:** `src/auth/auth.controller.ts` (lines 101-221)

The sync endpoint already has scaffolding. It needs to:

1. Receive `{ auth0Id, email, displayName, picture }` from frontend
2. Look up user by `auth0Id`
3. If found: update email/displayName/picture, return session data + JWT
4. If not found:
   - Option A: create new tenant + user (self-service onboarding)
   - Option B: reject (admin must pre-provision users)
5. Return `{ userId, tenantId, role, displayName, tenantName, token }`

### Step 4: Auth0 JWKS Validation (Optional, for Auth0-issued tokens)

If using Auth0-issued access tokens (with `audience` configured):

- Install: `jwks-rsa` package
- Validate token signature against Auth0's `https://<domain>/.well-known/jwks.json`
- Verify `iss`, `aud`, `exp` claims

If using self-signed JWTs only (from /auth/login and /auth/sync):

- Validate with `JWT_SECRET` (already available)

### Step 5: Cleanup

- Remove duplicate `me.controller.ts` (AccountController has the same endpoint)
- Extract `getPrimaryRole()` utility (duplicated 3 times in auth.controller.ts)
- Fix `auth.role` vs `auth.roles[]` inconsistency in ChildrenController

## Files to Change

| File | Change Type |
|------|-------------|
| `src/auth/auth.middleware.ts` | Extend (dual-mode: Bearer + headers) |
| `src/auth/auth.controller.ts` | Extend (sign JWT in responses, complete /auth/sync) |
| `src/auth/auth.types.ts` | Minor (add displayName consistently) |
| `.env.example` | Add Auth0 vars |
| `package.json` | Add `@nestjs/jwt` (optional — can use raw `jsonwebtoken`) |
| `src/me.controller.ts` | Remove (duplicate of AccountController) |

## Files That Do NOT Change

| File | Why |
|------|-----|
| `prisma/schema.prisma` | auth0Id, email, picture fields already exist |
| `src/auth/roles.guard.ts` | Works with req.auth.roles regardless of source |
| `src/auth/roles.decorator.ts` | Metadata-only, no auth logic |
| All other controllers | They read req.auth — source doesn't matter |
| `src/app.module.ts` | Middleware exclusions stay the same |

## Environment Variables Needed

```env
# Already exist:
JWT_SECRET=<secret-for-self-signed-tokens>
PASSWORD_SALT=<for-phone-password-auth>

# New (only needed for Auth0 JWKS validation):
AUTH0_DOMAIN=<your-auth0-domain>
AUTH0_AUDIENCE=<your-api-identifier>
```

## Frontend ↔ Backend Token Flow (After Backend Changes)

```
Phone Login:
  Frontend → POST /auth/login { phone, password }
  Backend  → { userId, tenantId, role, displayName, tenantName, token }
  Frontend → stores token, sends as Authorization: Bearer <token>

Auth0 Login:
  Frontend → Auth0 SDK → redirects to Auth0 → callback
  Callback → POST /auth/sync { auth0Id, email, displayName, picture }
  Backend  → { userId, tenantId, role, displayName, tenantName, token }
  Frontend → stores token, sends as Authorization: Bearer <token>

All subsequent API calls:
  Frontend → Authorization: Bearer <token> (via apiFetch bearerToken param)
  Proxy    → forwards Authorization header
  Backend  → AuthMiddleware validates JWT → sets req.auth → controller
```

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Dual-mode middleware | Low | Falls back to existing header auth if no Bearer token |
| JWT in login response | Low | Additive field — frontend can ignore it initially |
| Complete /auth/sync | Medium | New endpoint behavior — needs testing |
| Remove me.controller.ts | Low | AccountController has identical endpoint |
| JWKS validation | Medium | Network dependency on Auth0 — needs caching/fallback |
