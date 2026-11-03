# Campus AI — real Gemini setup

## Quick start on Vercel (private demo)

1. Push this folder to GitHub and import the repository in Vercel (Add New > Project). Build settings come from `vercel.json`; the framework preset is Vite.
2. Vercel > Project > Settings > Environment Variables, add (Production, plus Preview if you use preview deployments): `GEMINI_API_KEY` (your key, mark it Sensitive), `GEMINI_MODEL` (`gemini-3.6-flash`, or any current model your key can use), and `CAMPUS_AI_DEMO_CODE` (a long random code you invent, 20+ characters).
3. Redeploy (environment variables only apply to new deployments), open the site, log in, open **Campus AI**, type the demo code once, and ask a question.

`CAMPUS_AI_DEMO_CODE` is an interim, server-checked shared password. Only aggregated, anonymized statistics are ever sent to Gemini, but anyone who learns the code can spend your Gemini quota. Use Supabase Auth (sections below) before sharing the site widely, then delete the variable.

## 1. Rotate the exposed key

The API key pasted into the conversation must be considered exposed. Revoke it in Google AI Studio and generate a replacement. No key was copied into this project, its ZIP, browser storage, or frontend environment variables.

## 2. Configure Vercel environment variables

In Vercel: **Project → Settings → Environment Variables**. Add these server-side variables for the environments you use:

| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | Your replacement secret key |
| `GEMINI_MODEL` | A model available to your Google AI project, for example `gemini-3.6-flash`. Models are retired over time; a retired or misspelled id makes Campus AI answer "model not found" |
| `CAMPUS_AI_DEMO_CODE` | Interim private-demo access code (see section 3). Leave unset once Supabase Auth is connected |
| `SUPABASE_URL` | Your Supabase project HTTPS URL |
| `SUPABASE_ANON_KEY` | The project's public anon key, used by the function to verify user tokens |
| `SCHOOL_DATA_SOURCE` | `local-sanitized` initially, or `supabase` for server-side authorized queries |

Do not prefix Gemini variables with `VITE_`. Do not put secrets in `vercel.json`, source code, HTML, localStorage, or `.env.example`. Redeploy after changing environment variables. Keep production secrets Sensitive and limit who can view them in the Vercel team settings.

For local backend development, copy `.env.example` to `.env`, fill server-only values, and run `npm run dev`. `.env` is gitignored and excluded from the deliverable ZIP. Vite's development middleware loads the same `api/ai.ts` function that Vercel runs; secrets are not injected into the client bundle.

`vercel.json` caps the function at 60 seconds (Vercel's default is 300). The handler enforces its own provider deadlines (45 seconds in total, 20 per Gemini call).

## 3. Connect real administrator authentication

**The temporary admin/admin login is deliberately insufficient for AI access.** It does not produce a verified bearer token. The public endpoint returns `auth_not_configured` or `unauthorized` rather than pretending the demo session is secure.

Before enabling live AI:

1. Create a Supabase Auth project and a real administrator account.
2. Set `app_metadata.role` to `administrator` (or `admin`) using a trusted server/admin process. Never accept a role from `user_metadata` or a frontend-supplied administrator name.
3. Replace the isolated demo `AuthProviderAdapter` with a real Supabase Auth flow for the protected application, or add a separately verified administrator sign-in before AI use. Use `supabase.auth.signInWithPassword` or your chosen secure provider flow on the client; retain the resulting real Supabase session.
4. Protect all internal routes with that verified session, not just the AI route.
5. The existing `getVerifiedAccessToken()` reads a standard `sb-*-auth-token` Supabase session. If you use cookie/chunk storage or another auth provider, adapt this function to obtain its access token.
6. The Vercel Function independently calls Supabase `/auth/v1/user` with the bearer token and checks the verified `app_metadata.role`. It never trusts a role claim supplied in the request body.

The app intentionally keeps the requested temporary credentials unchanged. Real auth is a deployment integration, not a hidden automatic upgrade.

## 4. Choose the data source

### `local-sanitized`

The browser adapter calculates a minimized snapshot from localStorage. The authenticated administrator's browser sends only enabled aggregate categories. The backend validates the schema, accepts only seven read-only query names, executes them against that snapshot, and returns the tool results to Gemini.

This supports a server-verified administrator still using local records. It is not a tamper-proof database: an authenticated administrator controls their local data. Use the Supabase source for authoritative production statistics.

### `supabase`

Apply `supabase/001_school_schema.sql`, migrate records through a trusted process, and keep RLS enabled. The function creates a Supabase client with the **user's bearer token**, never a service-role key. It reads only the minimum columns needed, calculates aggregates on the server, and ignores any client-supplied snapshot. The SQL policy templates require the verified administrator app-metadata role.

The provider caps queries and reports an error rather than silently truncating a large database. For larger deployments, replace paged reads with authorized aggregate database views/RPCs while preserving the same `SchoolSnapshot` boundary.

## 5. Privacy and allowed tools

Always available: aggregate enrollment/class counts and measured attendance/item statistics. Optional: aggregate gender counts, anonymized item descriptions, aggregate activity counts.

Never sent: student names, student IDs, guardian contacts, dates of birth, personal notes, reporter identities, collection identities, or administrator names. Chat prompts are redacted against known local names/IDs plus email, phone and date patterns before storage/transmission. Redaction is a safeguard, not a guarantee that arbitrary free-text sensitive information can be recognized; administrators should avoid entering it.

Allowed tools:

- `get_school_overview`
- `get_attendance_summary(date)`
- `get_attendance_by_class(date)`
- `get_attendance_trends(from,to)`
- `get_lost_found_summary`
- `get_unclaimed_items_summary`
- `get_activity_summary(from,to)`

There are no write tools, SQL execution, JavaScript evaluation, shell commands, or automatic record modifications. Gemini chooses a tool; the server validates and executes it. The model receives only the minimum query result. Individual student lookup stays in the app's authorized local search.

## 6. Limits, errors and history

- Request body limit: 2 MiB. Messages: at most 24, 4,000 characters each, 24,000 characters total.
- Rate limit: 20 requests/minute per verified administrator, plus an unverified-request bucket.
- The included rate limiter is per serverless instance and best-effort. For durable limits add a Vercel Firewall rate-limit rule on `/api/ai` (Project > Firewall) and/or a shared atomic store (for example Redis/Upstash). Callers are identified by Vercel's `x-real-ip` / `x-vercel-forwarded-for` headers.
- Provider timeout/network, missing key, invalid key, quota, invalid response and server errors return clean JSON codes and translated UI messages.
- No prompt, student data, or provider secret is logged by the handler.
- At most 30 conversations and 80 messages per conversation are retained locally when history saving is enabled. History can be deleted individually or cleared in settings.
- Reports generated by the built-in report generator contain measured statistics only. AI text is model-generated commentary and must be reviewed.

## 7. Verify after deployment

1. GET `/api/ai`: inspect configuration booleans; no secrets are returned. A JSON body (not an HTML page and not a 500) proves the function deployed. If Vercel's function log shows `ERR_MODULE_NOT_FOUND`, see `docs/VERCEL_MIGRATION.md` (module resolution).
2. Without a verified administrator token, POST must fail.
3. With a verified non-admin token, POST must fail.
4. With a verified administrator and configured model/key, ask “How many students are registered?” The response should use the actual provided count, including zero.
5. Test English, French and Arabic, a follow-up question, quota/error handling, and history clearing.
6. Confirm the browser network request goes to `/api/ai`, never directly to Google.

Official references:
- https://ai.google.dev/gemini-api/docs/generate-content/function-calling
- https://ai.google.dev/api/generate-content
- https://vercel.com/docs/functions/functions-api-reference
- https://vercel.com/docs/frameworks/frontend/vite
- https://ai.google.dev/gemini-api/docs/generate-content/latest-model
- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/database/postgres/row-level-security
