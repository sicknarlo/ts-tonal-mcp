import { createRequire } from 'node:module';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './build-server.js';
import { TonalService } from './services/tonal-service.js';

const packageMetadata: unknown = createRequire(import.meta.url)('../package.json');
if (
  !packageMetadata ||
  typeof packageMetadata !== 'object' ||
  !('version' in packageMetadata) ||
  typeof packageMetadata.version !== 'string'
) {
  throw new Error('package.json must contain a string version');
}
const packageVersion = packageMetadata.version;

export class TonalMCPServer {
  private server: Server;

  constructor() {
    const tonalService = new TonalService();
    this.server = buildServer(() => tonalService.getClient(), packageVersion);
    console.error('TonalMCPServer created');
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Tonal MCP server running on stdio');
  }
}
