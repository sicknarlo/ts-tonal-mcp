import assert from 'node:assert/strict';
import test from 'node:test';
import type TonalClient from '@dlwiest/ts-tonal-client';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../src/build-server.js';
import { allTools } from '../src/tools/registry.js';

async function connect(getClient: () => Promise<TonalClient>): Promise<Client> {
  const server = buildServer(getClient, '0.0.0-test');
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientTransport);
  return client;
}

const unusedClient = async (): Promise<TonalClient> => {
  throw new Error('listing tools must not touch Tonal');
};

test('lists every registered tool with its annotations', async () => {
  const client = await connect(unusedClient);
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map((tool) => tool.name).sort(),
    allTools.map((tool) => tool.name).sort(),
  );
  const deleteTool = tools.find((tool) => tool.name === 'delete_custom_workout');
  assert.equal(deleteTool?.annotations?.destructiveHint, true);
});

test('reports the version it was built with', async () => {
  const client = await connect(unusedClient);
  assert.equal(client.getServerVersion()?.version, '0.0.0-test');
});

test('a Tonal login failure comes back as a tool error, not a protocol error', async () => {
  const client = await connect(async () => {
    throw new Error('TONAL_USERNAME and TONAL_PASSWORD environment variables are required');
  });
  const result = await client.callTool({ name: 'get_muscle_readiness', arguments: {} });
  assert.equal(result.isError, true);
  const [content] = result.content as Array<{ type: string; text: string }>;
  assert.match(content.text, /AUTHENTICATION_ERROR/);
});

test('an unknown tool comes back as a tool error', async () => {
  const client = await connect(unusedClient);
  const result = await client.callTool({ name: 'no_such_tool', arguments: {} });
  assert.equal(result.isError, true);
});
