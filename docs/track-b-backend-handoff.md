# Track B — Auth0 JWT Activation Plan

> Updated to reflect current state. One dormant backend prep step completed.
> Frontend bearer-token pipeline is fully prepared and dormant.

## Current State

### Frontend (dashboard) — READY, dormant

| Component | File | Status |
|-----------|------|--------|
| Auth0Provider + error boundary | `src/lib/auth0-provider.tsx` | No-op when `AUTH0_ENABLED=false` |
| Feature flag | `src/lib/auth0-provider.tsx:6-10` | Checks `NEXT_PUBLIC_AUTH0_DOMAIN` + `NEXT_PUBLIC_AUTH0_CLIENT_ID` |
| Auth0 login button | `src/app/login/page.tsx:15-38` | Rendered only when `AUTH0_ENABLED` |
| Callback route | `src/app/auth/callback/page.tsx` | Gated, hardened, typed, 15s timeout |
| Auth0-aware logout | `src/components/app/app-shell.tsx` → `src/lib/auth0-logout.ts` | Handles both modes |
| Bearer in apiFetch | `src/lib/api-client.ts:27-29` | Auto-reads from token store |
| Proxy forwards auth | `src/app/api/proxy/[...path]/route.ts:18-19` | Forwards `Authorization` header |
| Token store | `src/lib/token-store.ts` | `readToken()` / `writeToken()` / `clearToken()` |
| Token context | `src/lib/auth-token-context.tsx` | `useAuthToken()` — no-op when Auth0 off |
| Bootstrap with token | `src/lib/auth-bootstrap.ts:39` | Accepts optional `bearerToken` param |
| AuthGate token pass | `src/components/auth/app-auth-gate.tsx:32-33` | Gets token, passes to bootstrap |
| Login stores token | `src/app/login/page.tsx:113` | `if (data.token) writeToken(data.token)` |
| Callback stores token | `src/app/auth/callback/page.tsx:83` | `if (data.token) writeToken(data.token)` |
| Sync contract types | `src/lib/auth0-types.ts` | `Auth0SyncRequest`, `Auth0SyncResponse` (with optional `token`) |

### Backend (api) — ONE dormant prep file

| Component | File | Status |
|-----------|------|--------|
| JWT helpers (dormant) | `src/auth/jwt.utils.ts` | `signSessionToken()`, `verifySessionToken()` — not imported anywhere |
| /auth/sync endpoint | `src/auth/auth.controller.ts` (removed in revert — was lines 101-221) | **EXISTS but reverted** |
| User.auth0Id | `prisma/schema.prisma` | Field exists (unique, nullable) |
| JWT_SECRET | `.env.example` | Already declared |
| jsonwebtoken | `package.json` | v9.0.3 installed |

**Note:** The `/auth/sync` endpoint was present before but was lost in the revert of `035e01a`. It must be re-added.

### What is NOT done

| Item | Why blocked |
|------|-------------|
| Auth responses don't include `token` | Requires wiring `signSessionToken` into live controller |
| AuthMiddleware has no Bearer path | Requires modifying live auth validation |
| Auth0 not enabled | No domain/clientId env vars set |
| /auth/sync reverted | Was reverted along with other controller changes |

---

## Activation Steps (Exact, In Order)

### Step 1: Restore /auth/sync + wire signSessionToken into all responses

**File:** `~/apps/api/src/auth/auth.controller.ts`

**What to do:**
1. Add `import { signSessionToken } from './jwt.utils';` (line 1 area)
2. Add `import type { RoleKey } from '@prisma/client';` if not present
3. Add `getPrimaryRole()` helper to deduplicate role logic
4. Restore the `@Post('sync')` method (3 cases: by auth0Id, by email, new user)
5. Add `token` field to all return objects in `login()`, `register()`, `sync()`

**Exact token signing pattern (same for all 5 return sites):**
```typescript
const token = signSessionToken({
  sub: user.id,
  tenantId: user.tenantId,
  roles,
  displayName: user.displayName || 'User',
});
return { ...existingFields, token };
```

**Track A impact:** Additive — existing response fields unchanged, `token` is a new extra field. Old frontends ignore it. The already-prepared frontend `writeToken()` call handles it automatically.

**Verify:** `npx tsc --noEmit` in api dir. Test `POST /auth/login` returns `token` field.

### Step 2: Add dual-mode Bearer path to AuthMiddleware

**File:** `~/apps/api/src/auth/auth.middleware.ts`

**What to do:**
1. Add `import { verifySessionToken } from './jwt.utils';` (line 1 area)
2. At the top of `use()` (before line 25), add Bearer token check:

```typescript
// Try Bearer token first
const authHeader = req.header('authorization') || '';
if (authHeader.startsWith('Bearer ')) {
  const token = authHeader.slice(7).trim();
  if (token) {
    const payload = verifySessionToken(token);
    if (payload) {
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, tenantId: payload.tenantId },
        select: { id: true, tenantId: true },
      });
      if (user) {
        const userRoles = await this.prisma.userRole.findMany({
          where: { userId: user.id },
          select: { role: { select: { key: true } } },
        });
        req.auth = {
          tenantId: payload.tenantId,
          userId: payload.sub,
          roles: userRoles.map((ur) => ur.role.key),
        };
        return next();
      }
    }
  }
}
// Fall through to legacy header auth (unchanged)
```

3. Existing header-based auth code (lines 25-49) stays EXACTLY as-is

**Track A impact:** None — if no Bearer token present, identical code path runs. Roles always fetched from DB (JWT roles are not trusted).

**Verify:** `npx tsc --noEmit`. Test login → store token → subsequent request uses Bearer → works. Test without token → legacy headers → still works.

### Step 3: Set Auth0 environment variables

**Owner:** Operator (human)

**What to do:**
1. Create Auth0 application at https://manage.auth0.com
2. Get: domain, client ID, audience (optional)
3. Set in `~/apps/dashboard/.env.local`:
```env
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=abc123...
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.brightcare.app  # optional
```
4. Set in `~/apps/api/.env`:
```env
JWT_SECRET=<generate-a-real-secret>
```

**This enables `AUTH0_ENABLED=true`** — the Auth0 login button appears, callback route activates.

### Step 4: End-to-end test

1. Start backend: `cd ~/apps/api && npm run start:dev`
2. Start frontend: `cd ~/apps/dashboard && npm run dev`
3. Test phone login still works (Track A)
4. Test Auth0 login: click "Continue with Auth0" → Auth0 hosted page → callback → sync → app
5. Test subsequent API calls use Bearer token
6. Test logout clears both Auth0 and local session

### Step 5: Final cleanup (after validation)

- Remove `me.controller.ts` (duplicate of AccountController `/me`)
- Add `AUTH0_DOMAIN` / `AUTH0_AUDIENCE` to `~/apps/api/.env.example`

---

## Files Changed in Each Step

| Step | File | Change |
|------|------|--------|
| 1 | `api/src/auth/auth.controller.ts` | Add signSessionToken + restore sync + getPrimaryRole |
| 2 | `api/src/auth/auth.middleware.ts` | Add Bearer check before legacy headers |
| 3 | `dashboard/.env.local` | Add Auth0 env vars (operator) |
| 3 | `api/.env` | Set JWT_SECRET (operator) |
| 5 | `api/src/me.controller.ts` | Remove (cleanup) |

## Files That Do NOT Change

- `prisma/schema.prisma` — auth0Id already exists
- `src/auth/roles.guard.ts` — works with req.auth regardless of source
- `src/auth/roles.decorator.ts` — metadata only
- `src/app.module.ts` — /auth/sync already excluded from middleware
- All other controllers — they read req.auth, source doesn't matter
- All frontend files — fully prepared, no changes needed
