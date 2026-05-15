# Vercel Production Starter Deployment

Use this path when deploying the runnable booking/admin Node.js app instead of the static preview.

## Required Vercel Settings

```txt
Framework Preset: Other
Root Directory: production-starter
Install Command: npm install
Build Command: npm run build
Output Directory: leave empty
Node.js Version: 20.x or newer
```

The deployable Vercel configuration lives at:

```txt
production-starter/vercel.json
```

That config routes all requests through the Node adapter so the existing app keeps:

- `/`
- `/index.html`
- `/thank-you.html`
- `/admin.html`
- `/assets/...`
- `/api/health`
- `/api/bookings`
- `/api/admin/...`

## Environment Variables

Set these before production traffic:

```txt
PUBLIC_ORIGIN=https://your-domain.example
ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD_HASH=pbkdf2_sha256$...
ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
BUSINESS_NAME=TISATO Transportation Services INC
DISPATCH_EMAIL=info@tisatotransportationservices.com
DISPATCH_PHONE=+18448847286
```

Generate the admin password hash locally from `production-starter/`:

```bash
npm run hash-password -- "replace-with-real-admin-password"
```

## Storage Warning

The starter's JSON file storage works for a deployable demo and defaults to `/tmp/tisato-data` on Vercel so function writes do not fail.

Vercel function disk storage is ephemeral. For real production booking history, replace the JSON storage layer with a managed database such as Postgres, Neon, Supabase, or Vercel storage before relying on it operationally.
