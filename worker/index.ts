import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker';
import packageJson from '../package.json' with { type: 'json' };
import type { TonalEnv } from './env.js';
import { handleMcp } from './mcp.js';
import { tonalClientFor } from './tonal.js';

export default {
  fetch(request, env) {
    if (new URL(request.url).pathname !== '/mcp') {
      return new Response('Not found', { status: 404 });
    }
    return handleMcp(request, tonalClientFor(env), packageJson.version, {
      jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
    });
  },
} satisfies ExportedHandler<TonalEnv>;
