import assert from 'node:assert/strict';
import test from 'node:test';
import { TonalService } from '../src/services/tonal-service.js';

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
