import assert from 'node:assert/strict';
import test from 'node:test';
import type TonalClient from '@dlwiest/ts-tonal-client';
import { handleMcp } from '../worker/mcp.js';
import { allTools } from '../src/tools/registry.js';

const unusedClient = async (): Promise<TonalClient> => {
  throw new Error('must not touch Tonal');
};

function post(body: string): Request {
  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body,
  });
}

function rpc(method: string, params: Record<string, unknown> = {}): Request {
  return post(JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }));
}

test('initialize answers with the server name and version', async () => {
  const response = await handleMcp(
    rpc('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test', version: '0.0.0' },
    }),
    unusedClient,
    '0.0.0-test',
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as { result: { serverInfo: { name: string; version: string } } };
  assert.deepEqual(body.result.serverInfo, { name: 'tonal-mcp', version: '0.0.0-test' });
});

test('tools/list works on a fresh server with no prior initialize', async () => {
  const response = await handleMcp(rpc('tools/list'), unusedClient, '0.0.0-test');
  assert.equal(response.status, 200);
  const body = (await response.json()) as { result: { tools: unknown[] } };
  assert.equal(body.result.tools.length, allTools.length);
});

test('a Tonal failure during tools/call is a 200 with isError, not a 500', async () => {
  const response = await handleMcp(
    rpc('tools/call', { name: 'get_muscle_readiness', arguments: {} }),
    async () => {
      throw new Error('Wrong email or password.');
    },
    '0.0.0-test',
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as { result: { isError: boolean } };
  assert.equal(body.result.isError, true);
});

test('malformed JSON gets a 400 parse error', async () => {
  const response = await handleMcp(post('{not json'), unusedClient, '0.0.0-test');
  assert.equal(response.status, 400);
});

for (const method of ['GET', 'DELETE']) {
  test(`${method} is refused with 405 instead of opening a stream`, async () => {
    const response = await handleMcp(
      new Request('http://localhost/mcp', { method, headers: { accept: 'text/event-stream' } }),
      unusedClient,
      '0.0.0-test',
    );
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'POST');
  });
}
