import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedLogin } from '../worker/allowlist.js';

test('matches an exact login', () => {
  assert.equal(isAllowedLogin('sicknarlo', 'sicknarlo'), true);
});

test('GitHub logins are case-insensitive', () => {
  assert.equal(isAllowedLogin('SickNarlo', 'sicknarlo'), true);
});

test('tolerates spaces around comma-separated entries', () => {
  assert.equal(isAllowedLogin('octocat', ' sicknarlo , octocat '), true);
});

test('a prefix of an allowed login is not allowed', () => {
  assert.equal(isAllowedLogin('sick', 'sicknarlo'), false);
});

test('an empty allowlist denies everyone', () => {
  assert.equal(isAllowedLogin('sicknarlo', ''), false);
  assert.equal(isAllowedLogin('', ''), false);
});
