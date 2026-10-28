import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activityAmount, cryptoBars, lastSevenDays, stockLevel, timeOfDay, transactionMix } from './overview-charts.ts';

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

test('the last 7 days are whole Lagos days, oldest first, ending today', () => {
  // 08:30 Lagos on Wed 28 Oct 2026.
  const days = lastSevenDays(new Date('2026-10-28T07:30:00Z'));
  assert.equal(days.length, 7);
  assert.deepEqual(days[6], {
    label: 'Wed 28',
    from: '2026-10-27T23:00:00.000Z',
    to: '2026-10-28T22:59:59.999Z',
  });
  assert.equal(days[0].label, 'Thu 22');
  assert.equal(days[0].from, '2026-10-21T23:00:00.000Z');
});

test('just after midnight in Lagos already counts as the new day', () => {
  // 23:30 UTC on the 27th is 00:30 on the 28th in Lagos.
  assert.equal(lastSevenDays(new Date('2026-10-27T23:30:00Z'))[6].label, 'Wed 28');
});

test('activity amounts show what the customer got (+) or sent out (−)', () => {
  assert.deepEqual(activityAmount({ type: 'BUY', fromAsset: 'ngn', fromAmount: '50000', toAsset: 'btc', toAmount: '0.00045' }), { text: '+0.00045 BTC', sign: 'in' });
  assert.deepEqual(activityAmount({ type: 'SELL', fromAsset: 'usdt', fromAmount: '10', toAsset: 'ngn', toAmount: '14500.5' }), { text: '+₦14,500.50', sign: 'in' });
  assert.deepEqual(activityAmount({ type: 'WITHDRAWAL', fromAsset: 'ngn', fromAmount: '1000', toAsset: 'ngn', toAmount: '1000' }), { text: '−₦1,000.00', sign: 'out' });
  assert.deepEqual(activityAmount({ type: 'WITHDRAWAL', fromAsset: 'btc', fromAmount: '0.01', toAsset: null, toAmount: null }), { text: '−0.01 BTC', sign: 'out' });
  assert.deepEqual(activityAmount({ type: 'ADJUSTMENT', fromAsset: 'btc', fromAmount: null, toAsset: null, toAmount: null }), null);
});

test('stock level is held against target, capped at 100', () => {
  assert.equal(stockLevel({ held: '5', target: '10' }), 50);
  assert.equal(stockLevel({ held: '50000', target: '10000' }), 100);
  assert.equal(stockLevel({ held: '5', target: '0' }), null);
  assert.equal(stockLevel({ held: 'x', target: '10' }), null);
});

test('long coin amounts are cut to 8 decimals without trailing zeros', () => {
  assert.equal(activityAmount({ type: 'BUY', fromAsset: 'ngn', fromAmount: '1', toAsset: 'btc', toAmount: '0.000328930638567976' })?.text, '+0.00032893 BTC');
  assert.equal(activityAmount({ type: 'BUY', fromAsset: 'ngn', fromAmount: '1', toAsset: 'usdt', toAmount: '12.50000000' })?.text, '+12.5 USDT');
});
