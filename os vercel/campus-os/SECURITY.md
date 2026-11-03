# Security and production readiness

## This is a local demo, not a secure production login

The requested `admin` / `admin` credentials and route guard run in the browser. Anyone with the source can discover them. localStorage is not encrypted by this application and can be read or modified by someone with access to the browser profile. A client-side route guard is not an authorization boundary.

Do not expose real student information through a publicly deployed demo login. Before production:

- Replace demo authentication with server-verified authentication and protected routes.
- Enforce administrator roles server-side and with database row-level security.
- Move school records from localStorage to an access-controlled database.
- Use TLS, appropriate backups, retention rules and access reviews.
- Review applicable student privacy obligations; this project is not a legal compliance certification.
- Keep activity history append-only at the database permission level, not just in the UI.
- Replace the per-instance AI rate limiter with a shared production limiter.
- Review dependencies and monitor security advisories.

## Secrets

No Gemini key is included. The key supplied in chat was not used. Revoke it and configure a replacement only in server environment settings. Never use a `VITE_` prefix for secrets. Never expose a Supabase service-role key. The optional Supabase AI provider uses the authenticated user's token and RLS.

## AI boundary

The public AI backend is restricted until verified administrator authentication is configured. There are no canned assistant replies or simulated provider successes. AI has read-only, allowlisted queries only. It cannot change records. Personal student fields are excluded from snapshots; individual lookup stays local. Optional data categories are controlled in settings.

The local-sanitized source relies on an authenticated administrator's local snapshot and is not authoritative against a malicious client. Use the Supabase server-read source for production statistics. Free-text redaction cannot guarantee removal of every possible sensitive detail.

## Destructive actions and storage

Student/item deletion and conversation/history clearing require confirmation. Student deletion removes that student's attendance and unlinks their item reports. Archiving preserves item and claim information. CSV exports escape spreadsheet formula prefixes. JSON backups contain private local information and must be stored securely.

Uploaded images are resized locally. This reduces storage use but is not malware scanning. Only PNG/JPEG inputs are accepted. Use server-side validation and protected object storage for production uploads.

## Dependency audit

The delivered lockfile was checked with `npm audit --audit-level=high`; see `docs/TEST_REPORT.md` for the result at delivery. Re-run after installation and before deployment.

## Vercel deployment notes

- A Vercel production URL is public by default. The `admin` / `admin` login is only a client-side demo gate (see the first section), so do not enter real student data into a publicly reachable deployment. Use Vercel Deployment Protection (password or Vercel Authentication, availability depends on your plan) or real server-verified authentication first.
- `/api/ai` refuses every request unless `CAMPUS_AI_DEMO_CODE` or Supabase Auth is configured, so the Gemini key cannot be used anonymously. Anyone who learns the demo code can spend your Gemini quota: use a long random code and set a Google Cloud / AI Studio spend cap.
- The in-memory rate limiter is per function instance. Add a Vercel Firewall rate-limit rule on `/api/ai` for a durable limit.
- Callers are identified by `x-real-ip` / `x-vercel-forwarded-for`, which Vercel sets itself. Do not reintroduce platform headers that a client could forge.
- `vercel.json` sends `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` and a minimal `Content-Security-Policy` (`frame-ancestors`, `base-uri`, `object-src`, `form-action`). A full `script-src` policy was deliberately not added because it needs browser testing against the production build first.
- The API sends no CORS headers: it is same-origin only. Source maps are disabled in production builds.
