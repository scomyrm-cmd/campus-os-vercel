// Vercel Function (Node.js runtime) served at /api/ai. All logic lives in server/ so it can also run in the Vite dev server and in tests.
// Relative imports use the .js extension: Vercel runs this file as native ESM ("type": "module"), which requires explicit extensions.
import { createCampusAIHandler } from '../server/aiHandler.js';

const handler = createCampusAIHandler();

export default {
  fetch(request: Request): Promise<Response> {
    return handler(request);
  },
};
