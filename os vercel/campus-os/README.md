# Campus OS

A responsive school administration workspace built with React 19, TypeScript, Vite, Tailwind CSS, Lucide, Recharts, i18next and a localStorage repository. The application starts completely empty.

## Run

Requires Node.js 22 (see `engines` in `package.json`; the same version is used on Vercel).

```bash
npm ci
npm run dev
```

Demo credentials: `admin` / `admin`. They are not shown on the login page. This is explicitly a client-side demo login, not secure authentication.

```bash
npm run build       # Strict TypeScript check + production HTML/CSS/JS in dist/
npm run preview     # Serve the production UI only; /api/ai needs `npm run dev` (or `vercel dev`, or a Vercel deployment)
npm test            # Repository, analytics, privacy and server/API tests
npm run check:i18n  # EN/FR/AR key parity and static translation usage audit
npm run test:e2e    # Chromium browser workflows (install browser first)
```

For a new test environment: `npx playwright install --with-deps chromium`.

## Included functionality

- Protected demo routes, show/hide password, remember-me session duration, loading/error states and logout.
- Dynamic dashboard totals, attendance donut, seven-day chart, setup checklist, recent activity and working quick actions.
- Student registration/editing/profiles/deletion confirmation, unique student IDs, class/enrollment/attendance filters, search, pagination and CSV export.
- Daily attendance, present/absent/late/excused statuses, required absence reasons, absence types, notes, times, bulk present marking and transactional per-student/date upserts.
- Attendance history, date ranges, student/class filters, absence frequency, class comparisons, trends, CSV and PDF reports.
- Lost/found reporting, optional local image uploads, categories, date/status filters, sorting, details, editing, claiming with collection information, archiving/restoring and confirmed deletion.
- Append-only local activity history, filters and CSV; notification preferences, unread counts and mark-as-read actions.
- Categorized local global search (Ctrl/Cmd+K), opening the corresponding student, item or attendance record.
- Eight settings categories; school details/logo; administrator name/role/avatar; regional date/time formats; notification toggles; private JSON backup.
- English, French and Arabic translation files; immediate switching; full RTL layout; persistent light/dark/system themes.
- Campus AI chat UI, multiple local conversations, deletion/clear controls, copy/retry, suggested prompts, privacy redaction and a measured report generator.
- A real Vercel Function (`api/ai.ts`, served at `/api/ai`) using Gemini `generateContent` and allowlisted function calling. No canned assistant responses or simulated successful API calls.

## Empty data and persistence

There is no seeding function. `emptyData()` returns empty arrays. Records only appear after administrator actions. Browser tests create temporary records in isolated browser contexts; they are not included in application data.

localStorage keys:

| Key | Contents |
|---|---|
| `campus-os:v1:data` | Students, attendance, items, activities, notifications |
| `campus-os:v1:settings` | School, administrator, appearance, language, region, notification and AI preferences |
| `campus-os:v1:session` | Temporary demo session and expiry |
| `campus-os:v1:conversations` | Redacted Campus AI conversation history, when enabled |

Uploads are decoded and resized in the browser before storage. Avatars/logos are limited to 256 px; item photos to 800 px. Storage quota errors are surfaced without publishing a false successful save. Settings → Security exports a private JSON backup. Clearing browser storage removes local records; export first.

Profile customization is independent of school records and survives logout. Changing the display name does not change the username or demo credentials.

## Language and region

English is the default interface language. Morocco (`Africa/Casablanca`) is the initial country/time-zone default, with `DD/MM/YYYY` and 24-hour time. Language and regional formatting are separate preferences: for Arabic-language dates and numerals, choose `ar-MA` under Regional formatting. French uses `fr-MA`; English uses `en-MA`.

Translation resources live in `src/locales/{en,fr,ar}.json`. `scripts/translations.tsv` is the editable master translation table. After editing it, regenerate the JSON resources using the script described in `docs/ARCHITECTURE.md`. User-entered names, notes and school information are data, not machine-translated interface strings.

## Reports

Campus AI → Report generator and Digital Absence → Reports calculate statistics from stored records. PDFs distinguish measured statistics from AI commentary; the built-in generator exports measured statistics only. Arabic PDFs embed the bundled Noto Sans Arabic font. CSV exports neutralize spreadsheet formula prefixes.

Attendance rate = `(present + late) / recorded attendance`. Unrecorded students are not counted as absent. Excused absences are reported separately. AI snapshot coverage is the latest 365 days; oversized snapshots are marked partial.

## Vercel deployment

`vercel.json` sets the Vite build, the `dist` output directory, the SPA fallback (every path except `/api/*` serves `index.html`), security headers and a 60-second cap for the function. `api/ai.ts` is the Vercel Function. Import the repository into Vercel from Git (Framework Preset: Vite, root directory: the folder that contains `package.json`) so both `dist/` and the function are deployed. Uploading only the static `dist` folder does not deploy the backend.

Environment variables (Project Settings > Environment Variables, all server-side): `GEMINI_API_KEY`, `GEMINI_MODEL`, and one access method: `CAMPUS_AI_DEMO_CODE` (private demo) or `SUPABASE_URL` + `SUPABASE_ANON_KEY`. Redeploy after changing them.

See `docs/AI_SETUP.md` for Gemini and verified-auth configuration, `docs/VERCEL_MIGRATION.md` for what changed and what was verified, and `SECURITY.md` before handling real school data.

## Optional Supabase migration

`supabase/001_school_schema.sql` creates empty tables, a unique attendance constraint, indexes and deny-by-default administrator RLS policy templates. It does not migrate localStorage records automatically. The main application still uses the local repository. `server/supabaseProvider.ts` is a separate authorized read provider for AI when `SCHOOL_DATA_SOURCE=supabase`; a full production write repository/auth migration remains an integration step.

## Verification

See `docs/TEST_REPORT.md` for the actual test results and limitations. Live Gemini responses cannot be verified without a replacement server-side key and verified administrator authentication. Provider protocol/error/tool behavior is tested with explicit mocks; those mocks are never used by the running application.
