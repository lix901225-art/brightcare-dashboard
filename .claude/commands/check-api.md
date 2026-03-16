# API Troubleshooting Checklist

When the API is not responding or returning errors, follow this exact sequence. Do NOT change code or direction until the root cause is identified.

## Step 1: Is the API process running?

```bash
lsof -i :4000 | head -5
```

If no output → API is not running. Check step 2.
If output shows a process → API is running. Skip to step 4.

## Step 2: Check startup prerequisites

```bash
cd ~/apps/api && cat package.json | grep -A3 '"start'
```

Verify the start script exists and uses the correct command (typically `nest start --watch` or `node dist/main`).

## Step 3: Check for missing dependencies and Prisma

```bash
cd ~/apps/api && npx prisma generate 2>&1 | tail -5
```

If Prisma generate fails → schema or dependency issue. Check `prisma/schema.prisma`.

```bash
cd ~/apps/api && npx prisma migrate status 2>&1 | tail -10
```

If migrations are pending → run `npx prisma migrate deploy`.

## Step 4: Check environment config

```bash
cd ~/apps/api && cat .env | grep -E 'DATABASE_URL|PORT|JWT' | head -5
```

Verify:
- `DATABASE_URL` points to a running PostgreSQL instance
- `PORT` is 4000 (or matches proxy config)
- No missing required env vars

## Step 5: Test API directly (bypass proxy)

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api
```

- 200/404 → API is responding (404 is fine if no root route)
- Connection refused → API not actually listening
- 500 → Server error, check logs

## Step 6: Test with auth headers

```bash
curl -s http://localhost:4000/me -H "x-tenant-id: YOUR_TENANT_ID" -H "x-user-id: YOUR_USER_ID" | head -20
```

- 200 with data → API + auth working
- 401 → Auth middleware rejecting (user/tenant not in DB)
- 500 → Server error

## Step 7: Check dashboard proxy layer

```bash
cat ~/apps/dashboard/src/app/api/proxy/\[...path\]/route.ts | head -30
```

Verify:
- Proxy forwards to `http://localhost:4000`
- `x-user-id` and `x-tenant-id` headers are passed through
- No hardcoded wrong URLs

## Step 8: Check dashboard → API round trip

```bash
curl -s http://localhost:3000/api/proxy/me -H "x-user-id: YOUR_USER_ID" -H "x-tenant-id: YOUR_TENANT_ID" | head -20
```

If this fails but step 6 worked → proxy layer issue.
If both fail → API issue.

## Diagnosis Output

After completing the checklist, state one of:
1. **API not running** — needs `npm run start:dev` or dependency fix
2. **API running but misconfigured** — env vars, Prisma, or module issue
3. **Frontend proxy misconfigured** — wrong URL, missing header forwarding
4. **Auth header issue** — user/tenant not in database, or headers not sent
5. **Other** — describe the specific error

Do NOT guess. Do NOT change code direction before completing this checklist.
