# Campus OS — start here

## Open the application

The live preview is already running in this workspace. For a downloaded copy:

```bash
cd campus-os
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

**Temporary demo login:** username `admin`, password `admin`.
These credentials are intentionally not displayed on the login screen.

This is a fresh implementation, created after you selected “Build it from the specifications” because no existing project was present. It starts with **zero school records**. No student, attendance, item, activity, or notification data is seeded.

## What is in this ZIP?

- `src/` — complete React + TypeScript source, components, pages, translations and CSS.
- `dist/` — built `index.html`, compiled CSS/JavaScript and local fonts, ready for static hosting.
- `api/ai.ts` — Vercel Function (`/api/ai`), the real server-side Gemini endpoint; `vercel.json` — Vercel build, routing and header configuration.
- `server/`, `shared/` — request handler, authentication checks, Gemini client, controlled AI queries and analytics.
- `supabase/001_school_schema.sql` — optional future database schema and administrator RLS policies.
- `tests/`, `e2e/` — automated unit/API and browser workflow tests.
- `docs/` — setup, security, architecture, test report and file manifest.
- `.env.example` — environment variable names only; **no API key is included**.

The built `dist/index.html` must be served over HTTP; do not double-click it as a `file://` page. `npm run preview` serves the built UI. The AI endpoint requires `npm run dev` locally or a Vercel deployment.

## Campus AI: important

The chat never fabricates answers. Real replies require:
1. A replacement Gemini API key configured **on the server**.
2. `GEMINI_MODEL` configured on the server.
3. A real, server-verified administrator authentication session.

The temporary `admin/admin` login cannot authorize the AI backend. Until verified authentication is integrated, AI displays an honest setup message. Local record search and measured PDF/CSV reports still work.

The key pasted into chat was not used or embedded. Revoke it in Google AI Studio and create a replacement. Follow `docs/AI_SETUP.md` before enabling live AI.

## Security boundary

This is a local demonstration, not production-grade authentication or encrypted storage. Do not publicly deploy the demo login as protection for real student records. Read `SECURITY.md` first.

All normal management features work locally: students, attendance/history/reports, lost and found/claims, activity, notifications, global search, profile/avatar customization, school settings, English/French/Arabic, RTL, and light/dark/system themes.
