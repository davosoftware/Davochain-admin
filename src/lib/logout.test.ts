import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endServerSession } from './logout.ts';

// M7 (PROJECT_REVIEW): "Sign out" only deleted the cookie; the session stayed
// valid on the API. It now ends the session there first.
test('sign-out asks the API to end this session, with the session token', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  await endServerSession('tok-123', 'http://api.test', async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(null, { status: 204 });
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://api.test/v1/admin/me/logout');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal((calls[0].init.headers as Record<string, string>).authorization, 'Bearer tok-123');
});

test('a failure never stops the person signing out', async () => {
  await endServerSession('tok', 'http://api.test', async () => {
    throw new Error('API down');
  });
});

test('no session token: nothing to end', async () => {
  let called = false;
  await endServerSession(null, 'http://api.test', async () => ((called = true), new Response()));
  assert.equal(called, false);
});
