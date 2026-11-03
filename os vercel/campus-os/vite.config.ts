import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Server-side variables the API reads. They are copied from .env into process.env for the dev server only and are never
// exposed to the browser (nothing here is prefixed with VITE_).
const SERVER_ENV_KEYS = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'CAMPUS_AI_DEMO_CODE', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SCHOOL_DATA_SOURCE'];
const MAX_BODY_BYTES = 2 * 1024 * 1024;

/** Serves the same api/ai.ts function that Vercel runs in production, so `npm run dev` behaves like the deployment. */
function localApi(): Plugin {
  return {
    name: 'campus-local-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const key of SERVER_ENV_KEYS) if (env[key]) process.env[key] = env[key];

      server.middlewares.use('/api/ai', async (req: IncomingMessage, res: ServerResponse) => {
        const sendJson = (status: number, body: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
        try {
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) return sendJson(413, { error: { code: 'request_too_large' } });
            chunks.push(chunk);
          }
          const method = req.method || 'GET';
          const request = new Request('http://localhost/api/ai', {
            method,
            headers: Object.entries(req.headers).filter(([, v]) => typeof v === 'string') as [string, string][],
            body: ['GET', 'HEAD'].includes(method) ? undefined : Buffer.concat(chunks).toString(),
          });
          const mod = await server.ssrLoadModule('/api/ai.ts');
          const response: Response = await mod.default.fetch(request);
          res.writeHead(response.status, Object.fromEntries(response.headers));
          res.end(await response.text());
        } catch {
          sendJson(500, { error: { code: 'server_error' } });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
  build: { sourcemap: false, chunkSizeWarningLimit: 1100 }, // no source maps: nothing to leak in production
});
