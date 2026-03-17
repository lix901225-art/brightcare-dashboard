# Dashboard — Deploy & Release Checklist

> For the BrightCare OS Next.js frontend.
> Last updated: 2026-03-17

## Prerequisites

| Requirement | Detail |
|-------------|--------|
| Node.js | 20+ |
| API backend | Running and reachable (NestJS on port 4000) |
| Environment | `.env.local` or platform env vars configured |

## Environment Variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `API_BASE_URL` | Yes | `http://127.0.0.1:4000` | Backend URL (server-side only, not exposed to browser) |
| `NEXT_PUBLIC_APP_URL` | Yes (prod) | `http://localhost:3000` | Used for Auth0 redirects, CSP, OG metadata |
| `NEXT_PUBLIC_AUTH0_DOMAIN` | No | _(empty = Auth0 disabled)_ | Set to enable Auth0 login (Track B) |
| `NEXT_PUBLIC_AUTH0_CLIENT_ID` | No | _(empty = Auth0 disabled)_ | Required when Auth0 domain is set |
| `NEXT_PUBLIC_AUTH0_AUDIENCE` | No | _(empty)_ | Optional Auth0 API audience for access tokens |

**Auth0 is optional.** When both `NEXT_PUBLIC_AUTH0_DOMAIN` and `NEXT_PUBLIC_AUTH0_CLIENT_ID` are empty, the app uses phone+password login only (Track A). Auth0 can be enabled at any time by setting these variables — no code change required.

## Local Verification

```bash
# Full verification (install + typecheck + lint + build)
bash scripts/verify.sh

# Quick check (typecheck only)
npm run typecheck
```

## Deploy Steps

### 1. Set environment variables

Copy `.env.example` to `.env.local` and fill in values, or set them in your deployment platform.

### 2. Install and build

```bash
npm ci
npm run build
```

### 3. Start

```bash
# Production (standalone)
npm start

# Docker (via docker-compose from parent directory)
cd ~/apps && docker compose up -d web
```

### 4. Post-deploy checks

```bash
DOMAIN=https://app.brightcareos.com  # or http://localhost:3000 for local

# 1. App loads
curl -s -o /dev/null -w "%{http_code}" "$DOMAIN"
# → 200

# 2. CSP header present
curl -sI "$DOMAIN" | grep -i content-security-policy

# 3. Security headers present
curl -sI "$DOMAIN" | grep -iE "x-frame|x-content-type|referrer-policy|permissions-policy"

# 4. API proxy works (should return JSON, not 502)
curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/api/proxy/health"
# → 200

# 5. Login page renders
curl -s "$DOMAIN/login" | grep -q "BrightCare OS" && echo "OK" || echo "FAIL"
```

## Rollback

```bash
# Option A: redeploy previous commit
git checkout <previous-stable-sha>
npm ci && npm run build && npm start

# Option B: Docker rollback
cd ~/apps && docker compose build web && docker compose up -d web
```

## What Can Break

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Blank page | Build error, missing env vars | Check `npm run build` output, verify `.env.local` |
| 502 on API calls | Backend unreachable | Check `API_BASE_URL`, verify backend is running |
| Auth0 login loop | Wrong callback/logout URLs in Auth0 dashboard | Match URLs in Auth0 dashboard to `NEXT_PUBLIC_APP_URL` |
| "Session expired" on every load | JWT_SECRET changed on backend | Users must re-login after secret rotation |
| CSP violations in console | Missing Auth0 domain in CSP | Verify `NEXT_PUBLIC_AUTH0_DOMAIN` is set (auto-added to CSP) |

## CI

GitHub Actions CI runs on push to `main` and `track-b/*` branches:
- `npm ci` → `npm run typecheck` → `npm run lint` → `npm run build`
- Concurrency groups cancel stale runs on the same branch.

See `.github/workflows/ci.yml`.
