# BrightCare OS — Pilot Hosting Guide (Mac mini)

## Architecture

```
Internet → Cloudflare Tunnel → Mac mini (localhost)
  ├── Dashboard (Next.js)  :3000
  ├── API (NestJS)         :4000
  └── PostgreSQL            :5433
```

## PM2 Process Management

All three services run under PM2 for auto-restart on crash:

```bash
# Start all services
pm2 start dist/src/main.js --name brightcare-api     # from ~/apps/api
pm2 start "npm start" --name brightcare-dashboard     # from ~/apps/dashboard
pm2 start "cloudflared tunnel run brightcare" --name brightcare-tunnel

# Save process list
pm2 save

# Enable auto-start on system reboot (run once)
sudo env PATH=$PATH:/opt/homebrew/Cellar/node/25.6.1_1/bin \
  /opt/homebrew/lib/node_modules/pm2/bin/pm2 startup launchd \
  -u topceiling --hp /Users/topceiling

# Useful commands
pm2 list              # Show all processes
pm2 logs              # Tail all logs
pm2 restart all       # Restart everything
pm2 monit             # Real-time monitoring
```

## Environment Variables

### API (`~/apps/api/.env`)

```env
DATABASE_URL=postgresql://user:pass@127.0.0.1:5433/kindergarten
JWT_SECRET=<random-64-char-string>
RESEND_API_KEY=re_xxxx           # Resend.com email delivery
RESEND_FROM="BrightCare OS <noreply@brightcareos.com>"
APP_URL=https://app.brightcareos.com
UPLOAD_DIR=/Users/topceiling/apps/uploads
```

### Dashboard (`~/apps/dashboard/.env.local`)

```env
NEXT_PUBLIC_APP_URL=https://app.brightcareos.com
NEXT_PUBLIC_AUTH0_DOMAIN=xxx.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=xxxx
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.brightcareos.com
API_BASE_URL=http://127.0.0.1:4000
```

## Resend Email Configuration

1. Create account at [resend.com](https://resend.com)
2. Add and verify domain `brightcareos.com`
3. Create API key → set as `RESEND_API_KEY` in API `.env`
4. Without the key, emails log to console but are not sent (dry-run mode)

## Photo Upload (Local Storage)

- Photos stored in `~/apps/uploads/` on the Mac mini
- Served via `GET /files/:filename` endpoint
- **Migration note**: When moving to cloud hosting, replace local `diskStorage` with S3/R2 in `src/uploads/file-upload.controller.ts`

## Known Limitations

| Feature | Limitation | Migration path |
|---------|-----------|----------------|
| Photo storage | Local filesystem | Move to Cloudflare R2 or AWS S3 |
| Real-time messaging | 5s polling | Add WebSocket gateway when needed |
| Email delivery | Requires Resend API key | Works in dry-run without key |
| PDF export | Server-side pdfkit | No changes needed |
| SSL/HTTPS | Via Cloudflare Tunnel | Native SSL if moving to VPS |

## Rebuilding After Code Changes

```bash
# Backend
cd ~/apps/api && npm run build && pm2 restart brightcare-api

# Frontend
cd ~/apps/dashboard && npm run build && pm2 restart brightcare-dashboard
```

## Database Backup

```bash
# Manual backup
pg_dump -h 127.0.0.1 -p 5433 -U postgres kindergarten > backup-$(date +%Y%m%d).sql

# Restore
psql -h 127.0.0.1 -p 5433 -U postgres kindergarten < backup-YYYYMMDD.sql
```
