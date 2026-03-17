# Authentication & Session Architecture

> How login, session, tokens, and logout work in BrightCare OS.
> Last updated: 2026-03-17

## Two Login Paths

The system supports two authentication methods that coexist:

### Track A — Phone + Password (always available)

```
User → /login → enters phone + password
     → POST /auth/login { phone, password }
     → Backend: bcrypt verify (auto-migrates legacy SHA256)
     → Response: { userId, tenantId, role, displayName, token }
     → Frontend: writeToken(token) + writeSession({...}) → redirect to role home
```

### Track B — Auth0 (when configured)

```
User → /login → clicks "Continue with Auth0"
     → Auth0 SDK → Auth0 hosted login page
     → Auth0 redirects to /auth/callback
     → Callback: getAccessTokenSilently() → POST /auth/sync { auth0Id, email, displayName }
     → Backend: finds or creates user → { userId, tenantId, role, ..., token }
     → Frontend: writeToken(token) + writeSession({...}) → redirect to role home
```

Auth0 is enabled when both `NEXT_PUBLIC_AUTH0_DOMAIN` and `NEXT_PUBLIC_AUTH0_CLIENT_ID` are set to real values. The `AUTH0_ENABLED` flag in `auth0-provider.tsx` controls this at runtime.

## Storage

Two separate stores in localStorage:

| Store | Key | Purpose | Lifecycle |
|-------|-----|---------|-----------|
| Session | `brightcare.session` | UI display: userId, tenantId, role, displayName, tenantName | Written on login, cleared on logout or 401 |
| Token | `brightcare.token` | JWT for API authentication | Written on login, refreshed on 401, cleared on logout |

**Session is a UI convenience cache.** The backend is always the source of truth for identity and roles. The `AuthMiddleware` validates every request against the database.

**Legacy keys** (`userId`, `tenantId`, `role`, `displayName`, `tenantName`) are also written individually for backward compatibility. `readSession()` checks the unified key first, then falls back to individual keys.

## API Request Flow

```
apiFetch(path)
  → buildHeaders(): reads session (x-user-id, x-tenant-id) + reads JWT (Authorization: Bearer)
  → fetch(/api/proxy/{path})
  → Proxy route: forwards Authorization, x-user-id, x-tenant-id to backend
  → Backend AuthMiddleware: tries Bearer JWT first, falls back to x-user-id/x-tenant-id headers
  → Backend fetches roles from DB (never from JWT claims)
  → Response returned to frontend
```

## Token Refresh

```
apiFetch gets 401 response
  → tryRefreshToken(): POST /auth/refresh { token: currentToken }
  → Backend: validates token is within 7-day refresh window
     → Success: returns new token → writeToken() → retry original request
     → Failure: clearSession() → redirect to /login?expired=1
```

The `_skipRefresh` flag prevents infinite loops: a retried request that still gets 401 won't attempt another refresh.

## Session Bootstrap

On each protected page load, `AppAuthGate` runs:

```
1. getToken() — gets Auth0 access token if Auth0 is enabled (null otherwise)
2. bootstrapSessionFromBackend(token) — GET /me with session headers + Bearer token
3. Backend returns current user data → patchSession() updates local cache
4. If /me returns 401 → clearSession() → redirect to /login
5. If /me returns 403 → keep session (user exists but lacks permission for this endpoint)
```

## Logout

`useLogout()` hook handles both tracks:

**Track A (Auth0 disabled):**
```
clearSession() → window.location.replace("/login")
```

**Track B (Auth0 enabled):**
```
clearSession() → auth0SdkLogout({ returnTo: NEXT_PUBLIC_APP_URL })
```

`clearSession()` removes:
- `brightcare.session` and all individual legacy keys
- `brightcare.token` (JWT)
- All `@@auth0spajs@@*` keys (Auth0 SDK cache)

## Error Boundary

`Auth0ProviderClient` wraps children in an `Auth0ErrorBoundary`. If the Auth0 SDK crashes (bad config, network issue during init), the boundary catches the error and renders children without Auth0. This prevents misconfiguration from breaking the entire app.

## Key Files

| File | Responsibility |
|------|---------------|
| `src/lib/session.ts` | Read/write/clear session in localStorage |
| `src/lib/token-store.ts` | Read/write/clear JWT with format validation |
| `src/lib/api-client.ts` | `apiFetch` with auto-refresh on 401 |
| `src/lib/auth-bootstrap.ts` | Sync session with backend on page load |
| `src/lib/auth0-provider.tsx` | Conditional Auth0Provider + error boundary |
| `src/lib/auth-token-context.tsx` | React context for Auth0 access token |
| `src/lib/auth0-logout.ts` | Auth0 returnTo URL builder |
| `src/lib/use-logout.ts` | `useLogout()` hook (Track A + B) |
| `src/lib/auth0-types.ts` | TypeScript types for Auth0 sync contract |
| `src/lib/error.ts` | Error message extraction + CN→EN translation |
| `src/app/login/page.tsx` | Login page (phone + optional Auth0 button) |
| `src/app/auth/callback/page.tsx` | Auth0 callback handler |
| `src/components/auth/app-auth-gate.tsx` | Protected route gate |
| `src/app/api/proxy/[...path]/route.ts` | API proxy with path validation |

## Dual-Track Coexistence

The `Authorization: Bearer` header and `x-user-id`/`x-tenant-id` headers are sent together on every request. The backend's `AuthMiddleware` tries Bearer first; if the JWT is missing or invalid, it falls back to the legacy headers. This means:

- Track A (phone login with legacy headers) always works
- Track B (JWT from login/sync response) works alongside Track A
- The fallback path can be removed once all clients use JWT exclusively
