import type TonalClient from '@dlwiest/ts-tonal-client';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { buildServer, type BuildServerOptions } from '../src/build-server.js';

export async function handleMcp(
  request: Request,
  getClient: () => Promise<TonalClient>,
  version: string,
  options: BuildServerOptions = {},
): Promise<Response> {
  // Stateless mode has no session to stream into or delete, and a held-open GET would
  // pin the isolate until the client gives up.
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { allow: 'POST' } });
  }

  // A Server connects to exactly one transport, so stateless serving needs one per request.
  const server = buildServer(getClient, version, options);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}
