import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authFailureMessage, SAFE_503_MESSAGES } from './auth-errors.ts';

const LOGIN = 'Incorrect email or password';

test('429 says how long to wait, from Retry-After', () => {
  assert.equal(authFailureMessage(429, { message: 'whatever' }, '900', LOGIN), 'Too many attempts. Try again in 900 seconds.');
});

test("429 without a usable Retry-After falls back to the API's fixed message, then to 'a moment'", () => {
  const api = { message: 'Too many attempts. Try again in 42 seconds.' };
  assert.equal(authFailureMessage(429, api, null, LOGIN), 'Too many attempts. Try again in 42 seconds.');
  assert.equal(authFailureMessage(429, api, 'soon', LOGIN), 'Too many attempts. Try again in 42 seconds.');
  assert.equal(authFailureMessage(429, { message: 'internal: redis key rl:x' }, 'NaN', LOGIN), 'Too many attempts. Try again in a moment.');
  assert.equal(authFailureMessage(429, null, '-5', LOGIN), 'Too many attempts. Try again in a moment.');
});

test('503 shows only the known safe messages', () => {
  for (const safe of SAFE_503_MESSAGES) assert.equal(authFailureMessage(503, { message: safe }, null, LOGIN), safe);
  assert.equal(authFailureMessage(503, { message: 'ECONNREFUSED 10.0.0.5:6379' }, null, LOGIN), 'Temporarily unavailable. Try again shortly.');
  assert.equal(authFailureMessage(503, null, null, LOGIN), 'Temporarily unavailable. Try again shortly.');
});

test('every other failure keeps the caller fallback, so login never says more than it did', () => {
  for (const status of [400, 401, 403, 404, 409, 500]) {
    assert.equal(authFailureMessage(status, { message: 'Too many failed attempts. Try again after X' }, '60', LOGIN), LOGIN);
  }
});

test('an invite check that was throttled or hit an outage says so, instead of "invalid link"', async () => {
  const { inviteCheckFailure } = await import('./auth-errors.ts');
  assert.deepEqual(inviteCheckFailure(429, null, '120'), { valid: false, error: 'Too many attempts. Try again in 120 seconds.' });
  assert.deepEqual(inviteCheckFailure(503, null, null), { valid: false, error: 'Temporarily unavailable. Try again shortly.' });
  assert.deepEqual(inviteCheckFailure(404, { message: 'x' }, null), { valid: false });
  assert.deepEqual(inviteCheckFailure(400, null, null), { valid: false });
});
