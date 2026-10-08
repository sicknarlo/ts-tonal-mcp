import assert from 'node:assert/strict';
import test from 'node:test';
import type { ConsentDescription } from '@cloudflare/workers-oauth-provider';
import { consentPage } from '../worker/consent-page.js';

const details = {
  clientName: '<script>alert(1)</script>',
  redirectHost: 'claude.ai',
  redirectIsLoopback: false,
  scope: [],
} as unknown as ConsentDescription;

test('client-controlled names are escaped', () => {
  const html = consentPage(details, 'handle-1');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&#60;script&#62;'));
});

test('shows where access is going and carries the handle', () => {
  const html = consentPage(details, 'handle-1');
  assert.ok(html.includes('claude.ai'));
  assert.ok(html.includes('name="handle" value="handle-1"'));
});

test('warns when access goes to a local app', () => {
  const html = consentPage({ ...details, redirectHost: 'localhost', redirectIsLoopback: true }, 'h');
  assert.ok(html.includes('an app on your computer'));
});
