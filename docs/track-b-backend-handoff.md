# Track B — Auth0 + JWT Integration Status

> All code work complete. System is production-ready pending HTTPS and Auth0 URL config.

## Architecture

```
Phone Login:
  Frontend → POST /auth/login { phone, password }
  Backend  → verifies (bcrypt or legacy SHA256, auto-upgrades)
           → returns { userId, tenantId, role, displayName, token }
  Frontend → writeToken + writeSession → redirect to app

Auth0 Login:
  Frontend → Auth0 SDK → Auth0 hosted login → /auth/callback
  Callback → POST /auth/sync { auth0Id, email, displayName, picture }
  Backend  → finds/creates user → returns { ..., token }
  Frontend → writeToken + writeSession → redirect to app

All API calls:
  apiFetch → auto-reads stored JWT → Authorization: Bearer header
  Proxy    → forwards Authorization to backend
  Backend  → AuthMiddleware: Bearer first, header fallback
           → DB validates user + fetches roles → req.auth → controllers

Token expiry:
  JWT expires after 24h → apiFetch gets 401 → auto-refresh via POST /auth/refresh
  Refresh window: 7 days. After 7 days → re-login required.

Logout:
  useLogout() → clearSession (clears session + JWT + Auth0 SDK cache)
             → Auth0 SDK logout (when Auth0 enabled) or redirect to /login
```

## Security

| Feature | Status |
|---------|--------|
| Password hashing | bcrypt (12 rounds), auto-migrates from SHA256 |
| JWT signing | HS256 with JWT_SECRET env var |
| JWT expiry | 24h, refreshable within 7 days |
| Input validation | SyncDto with MaxLength, class-validator |
| Auth middleware | DB-validated user + roles on every request |
| Proxy errors | Server-side logging only, no stack traces to client |
| Startup warnings | JWT_SECRET and PASSWORD_SALT alert if using defaults |

## Production Checklist

| Item | Status |
|------|--------|
| Strong JWT_SECRET | Set in .env (not committed) |
| Strong PASSWORD_SALT | Set in .env (not committed) |
| HTTPS domain | Required for Auth0 production |
| Auth0 callback URL | Must match `{domain}/auth/callback` |
| Auth0 logout URL | Must match `{domain}` (bare origin) |
| Auth0 web origins | Must match `{domain}` |
