import OAuthProvider from '@cloudflare/workers-oauth-provider';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker';
import packageJson from '../package.json' with { type: 'json' };
import type { Env } from './env.js';
import { githubHandler } from './github-handler.js';
import { handleMcp } from './mcp.js';
import { tonalClientFor } from './tonal.js';

const mcpHandler = {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleMcp(request, tonalClientFor(env), packageJson.version, {
      jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
    });
  },
} satisfies ExportedHandler<Env>;

// resourceMetadata must name the public /mcp URL, which differs between `wrangler dev`
// and production, so the provider is built from env on first request.
function createProvider(env: Env): OAuthProvider {
  const publicUrl = new URL(env.PUBLIC_URL);
  return new OAuthProvider({
    apiRoute: '/mcp',
    apiHandler: mcpHandler,
    defaultHandler: githubHandler,
    authorizeEndpoint: '/authorize',
    tokenEndpoint: '/token',
    clientRegistrationEndpoint: '/register',
    resourceMetadata: {
      resource: new URL('/mcp', publicUrl).href,
      authorization_servers: [publicUrl.origin],
      resource_name: 'Tonal',
    },
  });
}

let provider: OAuthProvider | undefined;

export default {
  fetch(request, env, ctx) {
    provider ??= createProvider(env);
    return provider.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
