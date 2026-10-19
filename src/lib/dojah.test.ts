import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECK_TEXT, settingsChanges, type DojahSettings } from './dojah.ts';

const s = (over: Partial<DojahSettings> = {}): DojahSettings => ({
  minBalance: 8000, lowBalanceWarn: 20000, dailyAttempts: 3, totalAttempts: 10, basicEnabled: false,
  source: { minBalance: 'server', lowBalanceWarn: 'server', dailyAttempts: 'server', totalAttempts: 'server', basicEnabled: 'server' } as DojahSettings['source'],
  ...over,
});

test('the review lists each change in words, and says when a value goes back to the server default', () => {
  assert.deepEqual(settingsChanges(s(), { minBalance: 10000 }), ['Hard stop: ₦8,000 → ₦10,000']);
  assert.deepEqual(settingsChanges(s(), { dailyAttempts: 5, totalAttempts: 10 }), ['Tries per day: 3 → 5']);
  assert.deepEqual(settingsChanges(s({ lowBalanceWarn: 25000, source: { ...s().source, lowBalanceWarn: 'screen' } }), { lowBalanceWarn: null }), ['Warning level: ₦25,000 → server default']);
  assert.deepEqual(settingsChanges(s(), {}), []);
});

test('every check has a meaning in plain words', () => {
  for (const key of ['mode', 'credentials', 'keysAndIp', 'wallet', 'recipients']) {
    assert.ok(CHECK_TEXT[key].title.length > 3);
    assert.ok(CHECK_TEXT[key].meaning.length > 10);
  }
});
