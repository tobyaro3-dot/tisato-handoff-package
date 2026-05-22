# TISATO Production Starter

This folder is a runnable Node.js starter app for the booking system, admin portal, and email automation workflow.

It is intentionally dependency-light so the client can inspect the actual implementation without framework noise.

## Run It Locally

```bash
cd production-starter
npm install
ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD="<local-demo-password>" npm start
```

Open:

```txt
http://localhost:8080
http://localhost:8080/admin.html
```

## Deploy on Vercel

Use `production-starter/` as the Vercel Root Directory. The `vercel.json` in this folder adapts the existing Node server to one Vercel Node function and preserves the public website, admin portal, static assets, and `/api/...` routes.

Recommended project settings:

```txt
Framework Preset: Other
Root Directory: production-starter
Build Command: npm run build
Output Directory: leave empty
Install Command: npm install
Node.js Version: 20.x or newer
```

Set these environment variables before production traffic:

```txt
PUBLIC_ORIGIN=https://your-domain.example
DATABASE_URL=postgresql://...
ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD_HASH=pbkdf2_sha256$...
ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
BUSINESS_NAME=TISATO Transportation Services INC
DISPATCH_EMAIL=info@tisatotransportationservices.com
DISPATCH_PHONE=+18448847286
```

On Vercel, set `DATABASE_URL` to a Neon Postgres connection string before launch. The booking queue uses Neon when `DATABASE_URL` is present, so admin booking history persists across serverless function restarts. Without `DATABASE_URL`, the starter falls back to the local JSON files in `DATA_DIR`; that fallback is useful for local demos but is not reliable production storage on Vercel.

Initialize the Neon schema once after setting `DATABASE_URL`:

```bash
npm run db:init
```

For production, generate a password hash:

```bash
npm run hash-password -- "replace-with-real-admin-password"
```

Then set:

```bash
ADMIN_PASSWORD_HASH=pbkdf2_sha256$...
ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
```

## Included Code

- `server.js`
  Starts the HTTP server and wires API routes plus static files.

- `src/http/`
  Small routing, JSON parsing, cookie, response, and static-file helpers.

- `src/services/bookings.js`
  Creates booking records, validates passenger input, rate-limits submissions, writes audit events, and queues emails.

- `src/services/admin.js`
  Handles admin login, logout, cookie sessions, password verification, and protected route access.

- `src/services/email.js`
  Queues email messages to `data/outbox/` so a production email provider can replace the file-based transport later.

- `src/storage/`
  Booking persistence layer. Uses Neon Postgres when `DATABASE_URL` is configured, with JSON file fallback for local demos. Email logs and audit logs still use local JSON files.

- `src/security/`
  Password hashing, signed sessions, and in-memory rate limiting.

- `public/`
  Public booking UI, thank-you page, and admin dashboard UI.

## Data Files

Runtime data is stored in:

```txt
data/bookings.json
data/audit-log.json
data/email-log.json
data/outbox/
```

This keeps the starter self-contained for local demos. In production on Vercel, booking records should use Neon through `DATABASE_URL`; email and audit logs can be upgraded later if needed.

Set `DATA_DIR=/secure/server/path` if runtime data should live outside the application folder.

## Production Upgrade Path

1. Set `DATABASE_URL` and run `npm run db:init`.
2. Replace file outbox emails with Resend, SendGrid, Postmark, or another provider.
3. Set `ADMIN_PASSWORD_HASH` and remove local `ADMIN_PASSWORD`.
4. Set a long random `ADMIN_SESSION_SECRET`.
5. Deploy behind HTTPS.
6. Add backups, monitoring, and operational access controls.
