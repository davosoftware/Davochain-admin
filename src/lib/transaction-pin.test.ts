import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pinLabel, canUnlockPin } from './transaction-pin.ts';

const now = new Date('2026-10-29T10:00:00Z');

test('no PIN, or no answer from an older server', () => {
  assert.equal(pinLabel(undefined, now), '—');
  assert.equal(pinLabel({ isSet: false, setAt: null, lockedUntil: null, failedTries: 0 }, now), 'Not set');
});

test('set, with wrong tries counted', () => {
  assert.equal(pinLabel({ isSet: true, setAt: '2026-10-28T09:00:00Z', lockedUntil: null, failedTries: 0 }, now), 'Set');
  assert.equal(pinLabel({ isSet: true, setAt: '2026-10-28T09:00:00Z', lockedUntil: null, failedTries: 2 }, now), 'Set · 2 wrong tries');
  assert.equal(pinLabel({ isSet: true, setAt: '2026-10-28T09:00:00Z', lockedUntil: null, failedTries: 1 }, now), 'Set · 1 wrong try');
});

test('locked shows until when (Lagos time), and only then can be unlocked', () => {
  const locked = { isSet: true, setAt: '2026-10-28T09:00:00Z', lockedUntil: '2026-10-29T10:30:00Z', failedTries: 0 };
  assert.equal(pinLabel(locked, now), 'Locked until 11:30');
  assert.equal(canUnlockPin(locked, now), true);
  assert.equal(canUnlockPin({ ...locked, lockedUntil: '2026-10-29T09:30:00Z' }, now), false);
  assert.equal(canUnlockPin(undefined, now), false);
});
