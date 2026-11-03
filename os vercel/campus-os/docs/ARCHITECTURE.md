# Architecture

## Frontend

- `src/App.tsx`: providers, error boundary and protected route tree.
- `src/context/`: isolated demo auth adapter, settings/theme/language, repository subscription and toast state.
- `src/components/`: reusable accessible controls, modal/focus stack, portal dropdowns, confirmations, image uploads, forms, charts, global search and report generator.
- `src/pages/`: dashboard, students, attendance, lost and found, activity, settings and Campus AI.
- `src/styles/index.css`: Tailwind layers and semantic light/dark design tokens. Logical start/end utilities and document direction drive RTL.
- `src/i18n.ts`, `src/locales/`: i18next resources for EN/FR/AR.

## Data boundary

`SchoolRepository` defines the record operations. `LocalSchoolRepository` is the current implementation. It validates persisted structure, writes before publishing state, emits subscriptions, handles cross-tab storage events, enforces unique student IDs and attendance upserts, and appends activity/notification records transactionally with each action.

There is no seed path. `emptyData()` contains only empty arrays. Profile/settings are stored separately so school-data cleanup would not need to touch customization.

To integrate Supabase writes, implement the same repository boundary with authenticated async operations and adapt the UI's loading/error handling. Keep authorization in the database/API, not only in React. The supplied SQL is an optional empty schema, not an automatic migration of existing local records.

## Analytics and reports

`shared/analytics.ts` contains pure count/rate/date-range/query functions used by both the local adapter and backend. Attendance rates use recorded entries, with late counted as present. Reports are calculated from actual local records. PDF generation is lazy-loaded and embeds a local Arabic font when needed.

## AI adapter and backend

`LocalAIContextAdapter` projects local records into a strict, minimized `SchoolSnapshot`. `redactPersonal` sanitizes chat text before persistence/transmission. `requestAI` sends only a real Supabase access token, never the demo session.

`api/ai.ts` is the Vercel deployment entry point (a thin `fetch` export); `server/aiHandler.ts` holds the platform-neutral request handler (validation, authentication, rate limits, error mapping). `server/security.ts` verifies the token with Supabase and enforces request/rate limits. `server/gemini.ts` calls the official REST `generateContent` endpoint and handles allowlisted function calls. `server/supabaseProvider.ts` is the optional authoritative server-read source.

The same `api/ai.ts` is loaded by the Vite development middleware, so `npm run dev` and production run identical code. No provider key reaches frontend code. The running application has no mock AI fallback. Mock fetch implementations exist only in tests.

## Translation maintenance

Edit `scripts/translations.tsv`, then run:

```bash
node scripts/regenerate-i18n.mjs
npm run check:i18n
```

Keep all three resource files at identical key coverage. Use translation keys for interface text; do not machine-translate user-entered school records. Date/number language is controlled by the separate regional-format preference.

## Storage and deployment limits

The demo is intended for a single trusted browser/device, not concurrent multi-administrator production use. localStorage has a small quota and no encryption or conflict resolution. Uploaded images are resized; large datasets should move to Supabase. AI snapshots cover the latest 365 days and explicitly mark truncation. The serverless rate limiter is per-instance.

`dist/` is compiled HTML/CSS/JS, not a separate hand-written static imitation. Serve it over HTTP with SPA fallback. Vercel deploys both the static build (`dist/`) and the function (`api/ai.ts`) from this project; `vercel.json` rewrites every non-`/api` path to `index.html` for client-side routing.
