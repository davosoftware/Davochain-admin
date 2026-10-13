import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forwardedFor } from './forwarding.ts';

test('forwards only the right-most entry: the one Nginx appended, the only one the API uses', () => {
  assert.deepEqual(forwardedFor('6.6.6.6, 203.0.113.5'), { 'x-forwarded-for': '203.0.113.5' });
  assert.deepEqual(forwardedFor('203.0.113.5'), { 'x-forwarded-for': '203.0.113.5' });
  assert.deepEqual(forwardedFor('2001:db8::1'), { 'x-forwarded-for': '2001:db8::1' });
  assert.deepEqual(forwardedFor('::ffff:127.0.0.1'), { 'x-forwarded-for': '::ffff:127.0.0.1' });
});

test('junk to the left cannot knock out the real client (no shared fallback bucket for an attacker)', () => {
  assert.deepEqual(forwardedFor('evil.example.com, 203.0.113.5'), { 'x-forwarded-for': '203.0.113.5' });
  assert.deepEqual(forwardedFor('<script>, ...., 198.51.100.7'), { 'x-forwarded-for': '198.51.100.7' });
});

test('forwards nothing when the right-most entry is not a real IP', () => {
  for (const junk of [null, undefined, '', '   ', 'evil.example.com', '1.2.3.4, unknown', '....', 'ff', '999.1.1.1', '1.2.3.4,']) {
    assert.deepEqual(forwardedFor(junk), {}, String(junk));
  }
  assert.deepEqual(forwardedFor('1.1.1.1, '.repeat(60) + '2.2.2.2'), {});
});
