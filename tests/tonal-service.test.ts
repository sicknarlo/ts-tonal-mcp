import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import TonalClient, { TonalClientError } from '@dlwiest/ts-tonal-client';
import { TonalService } from '../src/services/tonal-service.js';

const credentials = { username: 'user@example.com', password: 'secret' };

function stubLogin(impl: () => Promise<TonalClient>): { calls: () => number; restore: () => void } {
  const original = TonalClient.create;
  let calls = 0;
  TonalClient.create = async () => {
    calls += 1;
    return impl();
  };
  return { calls: () => calls, restore: () => { TonalClient.create = original; } };
}

test('a rejected password is not retried against Tonal for five minutes', async (t) => {
  mock.timers.enable({ apis: ['Date'], now: 0 });
  const login = stubLogin(async () => {
    throw new TonalClientError('Wrong email or password.', 403);
  });
  t.after(() => {
    login.restore();
    mock.timers.reset();
  });

  const service = new TonalService(credentials);
  await assert.rejects(service.getClient(), /Wrong email or password/);
  await assert.rejects(service.getClient(), /Wrong email or password/);
  assert.equal(login.calls(), 1);

  mock.timers.tick(5 * 60 * 1000);
  await assert.rejects(service.getClient(), /Wrong email or password/);
  assert.equal(login.calls(), 2);
});

test('a network failure is retried on the next call', async (t) => {
  const login = stubLogin(async () => {
    throw new TypeError('fetch failed');
  });
  t.after(() => login.restore());

  const service = new TonalService(credentials);
  await assert.rejects(service.getClient(), /fetch failed/);
  await assert.rejects(service.getClient(), /fetch failed/);
  assert.equal(login.calls(), 2);
});

test('concurrent first calls share one login', async (t) => {
  const client = {} as TonalClient;
  const login = stubLogin(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return client;
  });
  t.after(() => login.restore());

  const service = new TonalService(credentials);
  const [first, second] = await Promise.all([service.getClient(), service.getClient()]);
  assert.equal(first, client);
  assert.equal(second, client);
  assert.equal(login.calls(), 1);
});

test('explicit empty credentials are rejected without falling back to env', async () => {
  process.env.TONAL_USERNAME = 'env-user@example.com';
  process.env.TONAL_PASSWORD = 'env-password';
  try {
    await assert.rejects(
      new TonalService({}).getClient(),
      /TONAL_USERNAME and TONAL_PASSWORD/,
    );
  } finally {
    delete process.env.TONAL_USERNAME;
    delete process.env.TONAL_PASSWORD;
  }
});

test('the default constructor still reads credentials from env', async () => {
  delete process.env.TONAL_USERNAME;
  delete process.env.TONAL_PASSWORD;
  await assert.rejects(new TonalService().getClient(), /TONAL_USERNAME and TONAL_PASSWORD/);
});
