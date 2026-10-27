import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limitsHref, usageLine, type LimitsState } from './daily-limits.ts';

const base: LimitsState = { date: '', action: '', near: '', search: '', page: 1 };

test('the plain page is /limits (today)', () => {
  assert.equal(limitsHref(base, {}), '/limits');
});

test('filters stay, and the page goes back to 1', () => {
  assert.equal(limitsHref({ ...base, page: 3, date: '2026-10-27' }, { near: '80' }), '/limits?date=2026-10-27&near=80');
  assert.equal(limitsHref({ ...base, action: 'BUY' }, { page: 2 }), '/limits?action=BUY&page=2');
});

test('a limit reads in plain words, in its own currency', () => {
  assert.equal(usageLine({ currency: 'USD', used: '800.00', maxPerDay: '1000.00', allowed: true }), '$800.00 of $1,000.00');
  assert.equal(usageLine({ currency: 'NGN', used: '150000.00', maxPerDay: '200000.00', allowed: true }), '₦150,000.00 of ₦200,000.00');
  assert.equal(usageLine({ currency: 'NGN', used: '5000.00', maxPerDay: null, allowed: true }), '₦5,000.00 (no daily limit)');
  assert.equal(usageLine({ currency: 'USD', used: '0.00', maxPerDay: null, allowed: false }), 'Not allowed at this level');
});
