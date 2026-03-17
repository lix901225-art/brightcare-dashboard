# Track B — Auth0 Integration Status

> All code work is complete. The system is ready for end-to-end testing.

## Current State: FULLY WIRED

### Frontend (dashboard)

| Component | File | Status |
|-----------|------|--------|
| Auth0Provider + error boundary | `src/lib/auth0-provider.tsx` | Active when env vars set |
| Feature flag | `AUTH0_ENABLED` | True when domain + clientId set |
| Auth0 login button | `src/app/login/page.tsx` | Shown when Auth0 enabled |
| Callback route | `src/app/auth/callback/page.tsx` | Gated, hardened, typed, 15s timeout |
| Logout (SDK-based) | `src/lib/use-logout.ts` | Uses Auth0 SDK logout; Track A fallback |
| Bearer in apiFetch | `src/lib/api-client.ts` | Auto-reads from token store |
| Proxy forwards auth | `src/app/api/proxy/[...path]/route.ts` | Forwards Authorization header |
| Token store | `src/lib/token-store.ts` | Stores JWT from login/sync responses |
| Token context | `src/lib/auth-token-context.tsx` | Provides Auth0 token to components |
| Bootstrap with token | `src/lib/auth-bootstrap.ts` | Sends Bearer to /me |
| AuthGate with token | `src/components/auth/app-auth-gate.tsx` | Passes token to bootstrap |
| Sync contract types | `src/lib/auth0-types.ts` | Auth0SyncRequest/Response |

### Backend (api)

| Component | File | Status |
|-----------|------|--------|
| JWT sign/verify | `src/auth/jwt.utils.ts` | signSessionToken, verifySessionToken |
| Dual-mode middleware | `src/auth/auth.middleware.ts` | Bearer first, header fallback |
| Login returns token | `src/auth/auth.controller.ts` | Additive token field |
| Register returns token | `src/auth/auth.controller.ts` | Additive token field |
| /auth/sync | `src/auth/auth.controller.ts` | 3 cases + token field |
| User.auth0Id | `prisma/schema.prisma` | Unique, nullable |
| Middleware exclusion | `src/app.module.ts` | /auth/sync excluded |

## Operator Checklist

### Auth0 Dashboard (https://manage.auth0.com)

1. Applications → your app → Settings
2. Verify **Client ID** matches `NEXT_PUBLIC_AUTH0_CLIENT_ID` in `.env.local`
3. Set **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
4. Set **Allowed Logout URLs**: `http://localhost:3000`
5. Set **Allowed Web Origins**: `http://localhost:3000`
6. Save

### Environment Files

`~/apps/dashboard/.env.local`:
```
NEXT_PUBLIC_AUTH0_DOMAIN=<your-tenant>.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=<client-id>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`~/apps/api/.env`:
```
JWT_SECRET=<strong-random-secret>
```

### Test Sequence

1. Start backend: `cd ~/apps/api && npm run start:dev`
2. Start frontend: `cd ~/apps/dashboard && npm run dev`
3. Phone login: works as before, now also stores JWT
4. Auth0 login: "Continue with Auth0" → Auth0 page → callback → sync → app
5. Logout: clears session + Auth0 SDK cache → redirects
6. Verify: DevTools → Network → Authorization: Bearer header on API calls
