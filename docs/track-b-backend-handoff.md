# Track B — Production Security & Rollout Handoff

> Last updated: 2026-03-17
> All code work complete. System is production-ready pending operator actions below.
> See also: [Dashboard Deploy Checklist](./dashboard-deploy-checklist.md)

## Architecture

```
Phone Login (Track A):
  Frontend → POST /auth/login { phone, password }
  Backend  → verifies (bcrypt or legacy SHA256, auto-upgrades)
           → returns { userId, tenantId, role, displayName, token }
  Frontend → writeToken + writeSession → redirect to app

Auth0 Login (Track B):
  Frontend → Auth0 SDK → Auth0 hosted login → /auth/callback
  Callback → POST /auth/sync { auth0Id, email, displayName, picture }
  Backend  → finds/creates user → returns { ..., token }
  Frontend → writeToken + writeSession → redirect to app

All API calls:
  apiFetch → auto-reads stored JWT → Authorization: Bearer header
  Proxy    → forwards Authorization to backend
  Backend  → AuthMiddleware: Bearer first, header fallback
           → DB validates user + fetches roles → req.auth → controllers

Token lifecycle:
  JWT expires after 24h → apiFetch gets 401 → auto-refresh via POST /auth/refresh
  Refresh window: 7 days. After 7 days → clearSession → redirect /login?expired=1
  Frontend shows "Your session expired" banner on login page.

Logout:
  useLogout() → clearSession (clears session + JWT + Auth0 SDK cache)
             → Auth0 SDK logout (when Auth0 enabled) or redirect to /login
```

## Security Controls

| Layer | Control | Detail |
|-------|---------|--------|
| **Passwords** | bcrypt (12 rounds) | Auto-migrates legacy SHA256 on next login |
| **JWT** | HS256, algorithm-pinned | Prevents alg confusion attacks |
| **Rate limiting** | @nestjs/throttler | login 5/min, register 3/min, sync/refresh 10/min |
| **Input validation** | class-validator DTOs | MaxLength on all fields, prevents bcrypt DoS (128 char password cap) |
| **Auth middleware** | DB-validated on every request | Roles always from DB, never trusted from JWT |
| **Authorization** | @Roles decorator + RolesGuard | PATCH tenant/current requires OWNER |
| **HTTP headers** | Helmet (API) + Next.js config | X-Content-Type-Options, X-Frame-Options: DENY, Referrer-Policy, Permissions-Policy |
| **CSP** | Content-Security-Policy | default-src 'self', object-src 'none', frame-ancestors 'none' |
| **Proxy** | Path traversal rejection | Rejects `..` and `//` in proxy paths |
| **Error handling** | No stack traces to client | Proxy returns message only; API exception filter strips internals |
| **Token storage** | JWT format validation | Rejects malformed tokens before writing to localStorage |
| **Audit logging** | Structured logger | All login/register/sync events logged with userId, IP, timestamp |
| **Startup** | Fail-fast in production | Refuses to start without JWT_SECRET and PASSWORD_SALT |
| **Docker** | Healthcheck + required env vars | docker-compose fails if secrets not set |

## Operator Actions Required

### 1. Generate production secrets

```bash
# Generate strong secrets (run once, save securely)
export JWT_SECRET=$(openssl rand -base64 32)
export PASSWORD_SALT=$(openssl rand -base64 32)
```

### 2. Set environment variables

**API (.env or deployment platform):**

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://USER:PASS@HOST:5432/brightcare?schema=public
JWT_SECRET=<from step 1>
PASSWORD_SALT=<from step 1>
CORS_ORIGINS=https://app.brightcareos.com
```

**Dashboard (.env.local or deployment platform):**

```env
API_BASE_URL=http://api:4000           # internal URL if same network
NEXT_PUBLIC_APP_URL=https://app.brightcareos.com
NEXT_PUBLIC_AUTH0_DOMAIN=<your-tenant>.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=<your-client-id>
NEXT_PUBLIC_AUTH0_AUDIENCE=             # optional, for API access tokens
```

### 3. Auth0 dashboard configuration

In Auth0 Dashboard → Applications → Your App:

| Setting | Value |
|---------|-------|
| Allowed Callback URLs | `https://app.brightcareos.com/auth/callback` |
| Allowed Logout URLs | `https://app.brightcareos.com` |
| Allowed Web Origins | `https://app.brightcareos.com` |
| Token Endpoint Authentication | None (SPA) |
| Grant Types | Authorization Code (PKCE) |

### 4. Docker deployment

```bash
# Set secrets first (step 1), then:
docker compose up -d

# Verify health
curl http://localhost:4000/health
# → {"status":"ok","ts":"..."}
```

### 5. Database migration

```bash
# Run Prisma migrations against production DB
npx prisma migrate deploy --schema prisma/schema.prisma
```

### 6. Post-deployment verification

```bash
# 1. Health check
curl https://api.brightcareos.com/health

# 2. Rate limiting works (should get 429 after 5 rapid attempts)
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://api.brightcareos.com/auth/login \
    -H "Content-Type: application/json" \
    -d '{"phone":"test","password":"test12"}'
done

# 3. CSP header present
curl -I https://app.brightcareos.com | grep -i content-security-policy

# 4. Security headers present
curl -I https://app.brightcareos.com | grep -iE "x-frame|x-content-type|referrer-policy"

# 5. Expired session redirect works
# (Login, wait for token expiry or manually clear token, make API call → should redirect to /login?expired=1)
```

## File Reference

| Area | Files |
|------|-------|
| JWT signing/verification | `api/src/auth/jwt.utils.ts` |
| Auth middleware (Bearer + legacy) | `api/src/auth/auth.middleware.ts` |
| Login/register/sync/refresh | `api/src/auth/auth.controller.ts` |
| Rate limiting config | `api/src/app.module.ts` (ThrottlerModule) |
| DTOs with validation | `api/src/auth/dto/auth.dto.ts` |
| Structured logger | `api/src/common/logger.ts` |
| Error filter | `api/src/common/http-exception.filter.ts` |
| Security headers (API) | `api/src/main.ts` (Helmet) |
| Session store | `dashboard/src/lib/session.ts` |
| Token store | `dashboard/src/lib/token-store.ts` |
| API client (401 refresh) | `dashboard/src/lib/api-client.ts` |
| Proxy route | `dashboard/src/app/api/proxy/[...path]/route.ts` |
| Auth0 provider | `dashboard/src/lib/auth0-provider.tsx` |
| CSP + security headers | `dashboard/next.config.ts` |
| Login page (expired banner) | `dashboard/src/app/login/page.tsx` |
| Auth0 callback | `dashboard/src/app/auth/callback/page.tsx` |
| App auth gate | `dashboard/src/components/auth/app-auth-gate.tsx` |
| Docker deployment | `docker-compose.yml`, `api/Dockerfile` |
| CI workflows | `dashboard/.github/workflows/ci.yml`, `api/.github/workflows/ci.yml` |
| Database indexes | `api/prisma/schema.prisma` (@@index directives on 12 tables) |
| Env validation (dev) | `dashboard/src/lib/env-check.ts` + `dashboard/src/instrumentation.ts` |
| Local verification | `dashboard/scripts/verify.sh` |
| Dashboard deploy checklist | `dashboard/docs/dashboard-deploy-checklist.md` |

## Database indexes

22 performance indexes are defined in `@@index` directives across the schema. These have been applied to the local dev database (2026-03-17) and the schema-to-database diff is now empty.

**Local dev:** Indexes already applied via `prisma db execute`.

**Production deployment:** Use the saved SQL script:

```bash
cd ~/apps/api
npx prisma db execute --schema prisma/schema.prisma --stdin < scripts/add_performance_indexes.sql
```

**Migration status (2026-03-17):** Fully reconciled. 3 migrations applied, schema-to-database diff is empty. `prisma migrate dev` works cleanly for new migrations.

## What's NOT in scope for Track B code

These items are handled elsewhere or deferred:

- **HSTS** — set at reverse proxy / CDN level (Cloudflare, nginx)
- **CSP nonces** — requires Next.js middleware; `'unsafe-inline'` is the standard Next.js trade-off
- **Token rotation** — current refresh reissues; rotation adds complexity without matching threat model
- **MFA** — configured in Auth0 dashboard, not application code
- **Database encryption at rest** — handled by PostgreSQL / hosting provider
- **Log aggregation** — `createLogger()` outputs to console; pipe to CloudWatch / Datadog via container runtime
