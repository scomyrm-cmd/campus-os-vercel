# Campus OS — verification report

This file keeps the original delivery results below. **The Vercel migration was verified separately and with narrower tooling: see `docs/VERCEL_MIGRATION.md` (section "What was and was not verified").**

## Baseline results (original delivery, 31 October 2026, before the Vercel migration)

| Check | Result |
|---|---|
| Strict TypeScript check | Passed |
| Production Vite build (`dist/`) | Passed |
| Unit/repository/analytics/privacy/API tests | **25 passed** |
| Chromium end-to-end scenarios | **11 passed** |
| Translation coverage | **559 keys × EN/FR/AR**, parity audit passed |
| Dependency audit (`npm audit --audit-level=high`) | **0 vulnerabilities** at delivery |
| Netlify handler esbuild bundle | Passed; safe unconfigured response |
| Production-build browser/deep-link/lazy AI check | Passed; no runtime errors |
| Provider-key scan of deliverable source | No exposed provider key found |

The production build emits non-failing upstream Zod comment-annotation warnings; the build completes successfully.

## Browser scenarios covered

1. Protected URL redirect, incorrect credentials, empty dashboard, refresh persistence and logout.
2. Student required-field validation, profile, editing, duplicate ID prevention, persistence and confirmed deletion.
3. Attendance reason validation, absent-to-present upsert without duplicates, history, reports, PDF export and live dashboard totals.
4. Lost/found creation, claim collection details, status filtering, archive and confirmed deletion.
5. Administrator image upload/preview, display name/role persistence across sidebar/header/settings, refresh and unchanged demo credentials.
6. French and Arabic page navigation, actual RTL sidebar geometry, dark theme, mobile menu and horizontal-overflow check.
7. Local global search opening a student, activity type filtering, CSV export and notification read state.
8. Honest AI setup state, no fabricated assistant reply, empty measured report state and disabled empty PDF export.
9. School information, notification preferences, regional formats and private backup persistence/download.
10. AI identifier redaction, new conversation and confirmed history clearing.
11. Arabic PDF download with bundled Arabic font and valid PDF output.

Each browser test also checks for uncaught page runtime errors. Test records exist only inside isolated test browser contexts and are never seeded into the delivered application.

## Not claimed / not yet connected

- **Live Gemini responses were not tested:** no replacement secret key or verified administrator session was configured. Tests explicitly mock the provider protocol, authentication responses, tool loop and errors; the running app never uses those mocks.
- Netlify hosting was not deployed from this workspace. The function was bundled and exercised locally.
- Supabase was not connected and the optional SQL migration was not applied to a live project.
- Mobile checks use Chromium viewport emulation, not physical iOS/Android devices.
- The temporary login is not production security. See `SECURITY.md`.

## Reproduce

```bash
npm ci
npm run check:i18n
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
npm audit --audit-level=high
```
