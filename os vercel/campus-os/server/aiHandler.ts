import { z } from 'zod';
import { snapshotSchema } from '../shared/analytics.js';
import { ApiError, verifyAdministrator, verifyAccess, demoCodeMatches, demoEnabled, clientIp, rateLimit, readLimitedBody, type ServerEnvironment } from './security.js';
import { askGemini } from './gemini.js';
import { supabaseSnapshot } from './supabaseProvider.js';

/** Request contract for POST /api/ai. Strict: unknown keys are rejected, sizes are capped. */
const requestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }).strict()).min(1).max(24),
  language: z.enum(['en', 'fr', 'ar']),
  snapshot: snapshotSchema.optional(),
  preferences: z.object({ demographics: z.boolean(), itemDescriptions: z.boolean(), activity: z.boolean() }).strict(),
}).strict()
  .refine(v => v.messages[v.messages.length - 1].role === 'user')
  .refine(v => v.messages.reduce((n, m) => n + m.content.length, 0) <= 24000);

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });

/**
 * Platform-neutral handler (Web Request -> Web Response). api/ai.ts wires it to Vercel; the Vite dev middleware and the tests
 * call it directly. No CORS headers are ever added: the API is same-origin only.
 *   GET  /api/ai  -> setup/authentication status (booleans only, never secrets)
 *   POST /api/ai  -> { messages, language, snapshot, preferences } -> { reply, tools, model }
 */
export function createCampusAIHandler(env: ServerEnvironment = process.env, fetcher: typeof fetch = fetch) {
  return async (request: Request): Promise<Response> => {
    try {
      const providerConfigured = !!env.GEMINI_API_KEY;
      const modelConfigured = !!env.GEMINI_MODEL;
      const authConfigured = !!env.SUPABASE_URL && !!env.SUPABASE_ANON_KEY;

      if (request.method === 'GET') {
        let authenticated = false;
        let mode: 'supabase' | 'demo' | null = null;
        if (request.headers.has('authorization') && authConfigured) {
          try { await verifyAdministrator(request, env, fetcher); authenticated = true; mode = 'supabase'; } catch { authenticated = false; }
        }
        if (!authenticated && request.headers.has('x-campus-demo-code')) {
          if (demoCodeMatches(request, env)) { authenticated = true; mode = 'demo'; }
          else rateLimit('demo-code:' + clientIp(request), 20); // throttle guessing of the demo code
        }
        return json({
          providerConfigured, modelConfigured, authConfigured, demoAvailable: demoEnabled(env), authenticated, mode,
          ready: providerConfigured && modelConfigured && authenticated,
          dataSource: env.SCHOOL_DATA_SOURCE === 'supabase' ? 'supabase' : 'local-sanitized',
        });
      }

      if (request.method !== 'POST') return json({ error: { code: 'invalid_request' } }, 405, { Allow: 'GET, POST' });
      if (!request.headers.get('content-type')?.includes('application/json')) throw new ApiError(400, 'invalid_request');

      let user: { id: string; demo: boolean };
      try { user = await verifyAccess(request, env, fetcher); }
      catch (e) { rateLimit('unverified:' + clientIp(request), 60); throw e; }
      rateLimit(user.id, 20);

      if (!providerConfigured || !modelConfigured) throw new ApiError(503, 'provider_not_configured');

      const raw = await readLimitedBody(request);
      let body: z.infer<typeof requestSchema>;
      try { body = requestSchema.parse(JSON.parse(raw)); } catch { throw new ApiError(400, 'invalid_request'); }

      let snapshot = body.snapshot;
      if (env.SCHOOL_DATA_SOURCE === 'supabase' && !user.demo) {
        snapshot = await supabaseSnapshot(request.headers.get('authorization')!.slice(7), env, snapshot?.timeZone || 'Africa/Casablanca', body.preferences);
      }
      if (!snapshot) throw new ApiError(400, 'invalid_request');

      const result = await askGemini(body.messages, body.language, snapshot, { GEMINI_API_KEY: env.GEMINI_API_KEY!, GEMINI_MODEL: env.GEMINI_MODEL! }, fetcher);
      return json(result);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status >= 500) console.error(`[campus-ai] ${error.status} ${error.code}`); // code only: never log payloads, keys or tokens
        return json({ error: { code: error.code } }, error.status);
      }
      console.error('[campus-ai] unexpected error:', error instanceof Error ? error.name : 'unknown');
      return json({ error: { code: 'server_error' } }, 500);
    }
  };
}
