import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cryptoBars, timeOfDay, transactionMix } from './overview-charts.ts';

test('the transaction mix keeps the kinds that happened, biggest first', () => {
  const mix = transactionMix({ total: 40, buys: 25, sells: 3, swaps: 10, deposits: 2, withdrawals: 0, pending: 5, failed: 1 });
  assert.deepEqual(
    mix.map((m) => [m.label, m.value]),
    [
      ['Buys', 25],
      ['Swaps', 10],
      ['Sells', 3],
      ['Deposits', 2],
    ],
  );
  // Each kind keeps its own colour whatever the order.
  assert.equal(mix[0].color, 'var(--chart-1)');
  assert.equal(mix[1].color, 'var(--chart-3)');
});

test('no transactions means an empty mix', () => {
  assert.deepEqual(transactionMix({ total: 0, buys: 0, sells: 0, swaps: 0, deposits: 0, withdrawals: 0, pending: 0, failed: 0 }), []);
});

test('crypto bars are dollars as numbers, in a fixed order', () => {
  const bars = cryptoBars({ boughtUsd: '9487.30', soldUsd: '15.00', swappedUsd: '716.34', depositedUsd: '12.00', withdrawnUsd: '0.00' });
  assert.deepEqual(
    bars.map((b) => [b.label, b.value]),
    [
      ['Bought', 9487.3],
      ['Sold', 15],
      ['Swapped', 716.34],
      ['Deposited', 12],
      ['Withdrawn', 0],
    ],
  );
  assert.equal(cryptoBars({ boughtUsd: 'x', soldUsd: '', swappedUsd: '1', depositedUsd: '1', withdrawnUsd: '1' })[0].value, 0);
});

test('timeline times are Lagos clock times', () => {
  // 07:05 UTC is 08:05 in Lagos.
  assert.equal(timeOfDay('2026-10-28T07:05:00Z'), '08:05');
  assert.equal(timeOfDay('2026-10-28T23:30:00Z'), '00:30');
});
