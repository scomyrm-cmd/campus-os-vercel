# Netlify to Vercel migration

## Starting point

The project was already a Vite + React 19 + TypeScript + Tailwind single-page app (not vanilla HTML/JS) with a Netlify Function at `/api/campus-ai`. It was kept as is; no framework change was needed. The existing design, pages, settings, EN/FR/AR translations, RTL layout and light/dark/system themes were preserved.

## Removed

| Item | Replacement |
|---|---|
| `netlify.toml` (build, redirects, headers, function bundler) | `vercel.json` |
| `netlify/functions/campus-ai.mts` | `api/ai.ts` + `server/aiHandler.ts` |
| `@netlify/functions` and `@netlify/types` (devDependency and lockfile entries) | none needed |
| `x-nf-client-connection-ip` (Netlify-only header used for rate limiting) | `x-real-ip` / `x-vercel-forwarded-for` |
| `.netlify/` in `.gitignore` and the release script | `.vercel/` |
| Netlify wording and doc link in the UI (EN/FR/AR) and in every doc | Vercel wording and link |

Not present in this project, so nothing to remove: Netlify Identity, Netlify AI Gateway, `/.netlify` folders, Netlify deploy scripts.

## Added

`vercel.json`, `api/ai.ts`, `server/aiHandler.ts`, `docs/VERCEL_MIGRATION.md`, an `engines` field in `package.json` (Node 22).

## Changed

`server/gemini.ts` (rewritten readably, Gemini API fixes below), `server/security.ts` (client IP), `server/supabaseProvider.ts` (import specifiers), `vite.config.ts` (dev middleware now loads `api/ai.ts`; also loads `CAMPUS_AI_DEMO_CODE`, which the old config forgot), `tsconfig.json`, `package.json`, `package-lock.json`, `.env.example`, `.gitignore`, `src/lib/aiClient.ts` (endpoint `/api/ai`), `src/pages/CampusAI.tsx` (synchronous in-flight lock against duplicate sends), `src/pages/Settings.tsx`, `scripts/translations.tsv` and the regenerated `src/locales/*.json`, `scripts/package-release.py`, `tests/server.test.ts`, README, START_HERE, SECURITY and the docs.

One unrelated pre-existing bug was fixed because it blocked regenerating the translations: the key `settings.systemHint` was defined twice (theme picker and notification toggle), so the theme picker's "System Default" showed the notification help text. The notification one is now `settings.systemNotificationsHint`.

## Gemini architecture

```
Browser (Campus AI page)
  POST /api/ai  { messages (<=24), language en|fr|ar, snapshot (aggregates only), preferences }
  headers: X-Campus-Demo-Code  or  Authorization: Bearer <Supabase token>
        |
api/ai.ts  ->  server/aiHandler.ts   validate (zod, strict, size caps) -> authenticate -> rate limit
        |
server/gemini.ts   POST https://generativelanguage.googleapis.com/v1beta/models/$GEMINI_MODEL:generateContent
                   header x-goog-api-key: $GEMINI_API_KEY   (server only)
                   Gemini may call one of 7 read-only functions; the server validates and runs them on the snapshot,
                   returns results (same function-call id, thought signatures preserved), up to 4 rounds / 45 s.
        |
{ reply, tools, model }   or   { error: { code } } with an HTTP status
```

- Model and key come only from `GEMINI_MODEL` / `GEMINI_API_KEY`. Nothing is hard-coded in code.
- The official Gemini REST endpoint is called directly with `fetch` rather than through the `@google/genai` SDK. Reason: the SDK could not be installed or tested in the migration environment, and the existing hand-written loop is small, fully unit-tested and exposes an injectable `fetch` for tests. Switching to the SDK is a contained change in `server/gemini.ts` if you prefer it.
- Fixes made for current Gemini models (per Google's Gemini 3.6 / 4 migration notes): `temperature` removed (deprecated; rejected by future generations); explicit `toolConfig` removed (AUTO is the default and the declarations are the allowlist); `maxOutputTokens` raised from 2400 to 8192 because thinking tokens count toward it; truncated and blocked generations and a retired model id (HTTP 404) now return specific, translated errors instead of a generic one.
- Scope: Campus AI now answers general school-subject, study-planning and Campus OS-usage questions in addition to statistics, labels general knowledge versus Campus OS data, and states that timetables, announcements and grades are not connected. School data enters only through the tool functions; to add a data source, add a snapshot field + a declaration + an `executeQuery` branch (`shared/analytics.ts`).

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | yes | Server only. Mark Sensitive in Vercel |
| `GEMINI_MODEL` | yes | e.g. `gemini-3.6-flash` |
| `CAMPUS_AI_DEMO_CODE` | yes, unless Supabase Auth is configured | Without it (or Supabase) `/api/ai` rejects every request on purpose, so the key cannot be used anonymously |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | optional | Verified administrator login for the AI |
| `SCHOOL_DATA_SOURCE` | optional | `local-sanitized` (default) or `supabase` |

## Deploy

1. Push to GitHub. In Vercel: Add New > Project > import the repository. Framework Preset Vite, root directory = the folder containing `package.json`. Build command and output directory come from `vercel.json`.
2. Add the environment variables above for Production (and Preview if wanted), then Deploy. Redeploy after any variable change.
3. Open `https://<your-project>.vercel.app/api/ai`. Expect JSON like `{"providerConfigured":true,"modelConfigured":true,...,"ready":false}`.
4. Open the site, log in, Campus AI, enter the demo code, ask "How many students are registered?".

Local: `cp .env.example .env`, fill it, `npm ci`, `npm run dev` (serves `/api/ai` from the same `api/ai.ts`).

## What was and was not verified

Verified in the migration sandbox (no internet, so `npm install` was impossible; tools found locally were used instead):

- Server unit tests: the original 13 server tests (baseline run against the unmodified Netlify handler first) plus 10 new ones, 23/23 passing. Run through a small stand-in for vitest, with zod 3.23 instead of the project's zod 4 and stubbed `@supabase/supabase-js`, `clsx`, `tailwind-merge`.
- HTTP-level integration test: a real HTTP server driving `api/ai.ts`'s default export, with only the outbound Google call intercepted. 17/17 checks: status endpoint, auth failures, validation errors, 405, general and tool-calling replies, thought-signature/id echo, 429 and 404 mapping, rate limiting, no secrets in responses.
- Strict TypeScript check of `api/`, `server/`, `shared/` (TypeScript 6.0.3, shimmed Node types): passes, as did the original code.
- Syntax check of the edited React/Vite files; translation audit (`check-i18n`): 570 keys x EN/FR/AR, passing; `vercel.json` parses.

NOT verified (say so before relying on it):

- No real Gemini call: no API key or network. Request shape was checked against Google's current documentation only.
- No Vercel deployment: function packaging and ESM module resolution on Vercel are unproven. Relative imports in `api/` and `server/` use `.js` specifiers, the convention that Vercel community reports say avoids `ERR_MODULE_NOT_FOUND`. If the first deploy's function log shows that error, tell me and the fallback is to bundle the function with esbuild at build time.
- `npm run build`, `npm test` (vitest), `core.test.ts`, Playwright end-to-end tests, the frontend type check, dark/light, EN/FR/AR and RTL rendering, and mobile layouts were not run: Vite, React and Playwright browsers are not installed here. Run `npm ci && npm run check:i18n && npm test && npm run build && npm run test:e2e` once locally.
- `package-lock.json` was edited by script (only the two `@netlify` entries removed). Run `npm install` once and commit if it changes anything.
- The dev middleware in `vite.config.ts` was syntax-checked only.
- `vercel.json` rewrite/header behavior was taken from Vercel's documentation, not exercised.

## Known remaining issues

- Login is still the client-side demo (`admin`/`admin`) and school data lives in each browser's localStorage. A public Vercel URL is reachable by anyone; see `SECURITY.md` before using real student data.
- The rate limiter is per instance; add a Vercel Firewall rule for a durable limit.
