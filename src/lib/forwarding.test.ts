import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forwardedFor } from './forwarding.ts';

test('passes a normal Nginx chain through unchanged', () => {
  assert.deepEqual(forwardedFor('6.6.6.6, 203.0.113.5'), { 'x-forwarded-for': '6.6.6.6, 203.0.113.5' });
  assert.deepEqual(forwardedFor('2001:db8::1'), { 'x-forwarded-for': '2001:db8::1' });
  assert.deepEqual(forwardedFor('::ffff:127.0.0.1'), { 'x-forwarded-for': '::ffff:127.0.0.1' });
});

test('drops anything that is not a short list of IP-like entries', () => {
  for (const junk of [null, undefined, '', '   ', 'evil.example.com', '1.2.3.4, <script>', 'unknown', '1.2.3.4,,5.6.7.8']) {
    assert.deepEqual(forwardedFor(junk), {}, String(junk));
  }
  assert.deepEqual(forwardedFor(Array.from({ length: 11 }, (_, i) => `10.0.0.${i}`).join(', ')), {});
  assert.deepEqual(forwardedFor('1.1.1.1, '.repeat(60) + '2.2.2.2'), {});
});
