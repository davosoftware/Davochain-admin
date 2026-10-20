import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIPS } from './tips.ts';

const all = Object.entries(TIPS).flatMap(([page, tips]) =>
  Object.entries(tips).map(([key, text]) => ({ where: `${page}.${key}`, text: text as string })),
);

test('there is a tip for every page with figure boxes', () => {
  assert.deepEqual(Object.keys(TIPS).sort(), [
    'fees',
    'giftCards',
    'inventory',
    'overview',
    'referrals',
    'treasury',
    'users',
  ]);
});

test('every tip is a short, whole sentence', () => {
  for (const { where, text } of all) {
    assert.match(text, /^[A-Z₦$]/, `${where} should start with a capital`);
    assert.match(text, /[.!?]$/, `${where} should end like a sentence`);
    assert.ok(text.length >= 25, `${where} is too short to explain anything`);
    assert.ok(text.length <= 260, `${where} is too long for a hover tip (${text.length})`);
  }
});

test('tips use everyday words, not system terms', () => {
  // The dashboard is read by operations staff, not engineers.
  const jargon = /\b(ledger|webhook|upstream|accrued|idempot\w*|api|endpoint|cron|redis|postgres|enum)\b/i;
  for (const { where, text } of all) {
    assert.doesNotMatch(text, jargon, `${where} uses a system term`);
  }
});
