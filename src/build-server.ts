import type TonalClient from '@dlwiest/ts-tonal-client';
import { Server, type ServerOptions } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { allTools, toolsRegistry } from './tools/registry.js';
import { handleToolError } from './utils/error-handler.js';

export type BuildServerOptions = Pick<ServerOptions, 'jsonSchemaValidator'>;

export function buildServer(
  getClient: () => Promise<TonalClient>,
  version: string,
  options: BuildServerOptions = {},
): Server {
  const server = new Server(
    {
      name: 'tonal-mcp',
      version,
    },
    {
      capabilities: {
        tools: {},
      },
      ...options,
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const tool = toolsRegistry.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const client = await getClient();
      return await tool.handler(client, args);
    } catch (error) {
      return handleToolError(error, name);
    }
  });

  return server;
}
