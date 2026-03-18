# Changelog — BrightCare OS Dashboard

## [1.0.0] — 2026-03-18 — Production Pilot Ready

### Core Modules (Track A — Locked)
- Children roster with profiles, medical info, enrollment readiness
- Guardians with child-guardian links, pickup authorisation, portal access
- Sign in / sign out: daily attendance with checkin/checkout
- Messaging: threaded staff-parent conversations with real-time delivery

### Track B Features
- **Auth0 Integration**: OAuth login, JWT Bearer auth, auto-provision
- **Navigation**: 3-tier sidebar (Daily Ops / Records / Management collapsible)
- **Records Module**: Daily Log (Section 56f), Incidents (VCH PDF export), Medical (care plans, medication)
- **Learning Stories**: Observation-based documentation (Lillio/HiMama parity)
- **Developmental Milestones**: BC Early Learning Framework (42 presets across 4 age groups)
- **Photo Gallery**: Per-child photo upload and grid display
- **Staff Scheduling**: Weekly grid view with shift management
- **Digital Pickup Signature**: Confirm + timestamp + IP recording
- **Immunization Tracking**: BC vaccine schedule with compliance checking
- **First Aid Certification**: Tracking with expiry alerts (BC 2-year renewal)

### BC Compliance
- ECE certification tracking with 30-day expiry banners
- Child-to-staff ratio dashboard (BC licensing standards)
- Vancouver Coastal Health incident PDF export (20 categories)
- Incident follow-up tracking with completion status
- Section 56(f) daily log with CSV export
- CCFRI / ACCB subsidy tracking (separated on invoices)
- Health authority selection (5 BC regional authorities)
- BC statutory holidays pre-seeded in calendar

### Financial
- Billing with CCFRI / ACCB split, parent fee waterfall
- Automated monthly invoice generation (cron + manual trigger)
- Tax receipt section with CRA Line 21400 reference
- GST-exempt badges (BC licensed childcare)
- Billing defaults in settings (monthly fee, CCFRI, ACCB)

### Parent Portal
- Activity timeline (Brightwheel-style)
- Monthly attendance rate card
- Fee waterfall breakdown
- Daily report detail with photos, bathroom, notes
- Incident review with timestamp
- Learning stories (read-only)
- Milestones progress view

### Communication
- WebSocket real-time messaging (socket.io)
- Announcements with priority (URGENT), audience targeting, expiry
- Notification triggers: attendance, messages, reports, incidents, billing
- Invite token system for self-service parent registration
- Resend email service for invitations

### Operations
- Analytics with CSV export
- Calendar CRUD with BC holiday seeding
- Public enrollment form (/enroll, no auth required)
- Enrollment waitlist with CSV export
- Documents with upload, expiry tracking
- BC funding report PDF export
- Staff Guide, Parent Guide, BC Compliance Guide

### Infrastructure
- PM2 process management with auto-restart
- Cloudflare Tunnel for public access
- Local file upload (multer → ~/apps/uploads/)
- Database backup script (daily pg_dump, 30-day retention)
- Network status indicator (offline detection)
- Global error boundary + friendly error messages

### Multilingual
- English, 简体中文, 繁體中文, ਪੰਜਾਬੀ, Tagalog
- All navigation keys translated
