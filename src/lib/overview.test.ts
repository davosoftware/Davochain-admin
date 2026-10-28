import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATUS_HELP, activityLine, isInFlight, assetPath, attentionItems, greeting, humanType } from './overview.ts';

test('the greeting follows the time of day in Lagos and uses the first name', () => {
  // 07:00 UTC is 08:00 in Lagos.
  assert.equal(greeting('Ada Obi', new Date('2026-10-27T07:00:00Z')), 'Good morning, Ada');
  assert.equal(greeting('Ada Obi', new Date('2026-10-27T13:00:00Z')), 'Good afternoon, Ada');
  assert.equal(greeting('Ada Obi', new Date('2026-10-27T18:00:00Z')), 'Good evening, Ada');
  // 23:30 UTC is 00:30 in Lagos: still evening, not morning.
  assert.equal(greeting('Ada', new Date('2026-10-27T23:30:00Z')), 'Good evening, Ada');
  assert.equal(greeting('', new Date('2026-10-27T07:00:00Z')), 'Good morning');
  assert.equal(greeting(undefined, new Date('2026-10-27T07:00:00Z')), 'Good morning');
});

const all = [
  'inventory.view',
  'reconciliation.view',
  'transactions.view',
];

test('nothing wrong means nothing to attend to', () => {
  assert.deepEqual(
    attentionItems({ permissions: all, daysOfCover: 30, lowCoins: [], driftCoins: [], pending: 0, reconciling: 0 }),
    [],
  );
});

test('each problem links to the page that fixes it, worst first', () => {
  const items = attentionItems({
    permissions: all,
    daysOfCover: 0.5,
    lowCoins: ['btc'],
    driftCoins: ['btc', 'usdt'],
    pending: 3,
    reconciling: 2,
  });
  assert.deepEqual(
    items.map((i) => [i.tone, i.href]),
    [
      ['danger', '/inventory'],
      ['danger', '/reconciliation'],
      ['warning', '/transactions?status=RECONCILING'],
      ['warning', '/inventory'],
      ['info', '/transactions?status=PENDING'],
    ],
  );
  assert.match(items[0].title, /naira for buys/i);
  assert.match(items[1].title, /BTC, USDT/);
  assert.match(items[3].title, /BTC/);
  assert.match(items[4].title, /^3 transactions/);
});

test('naira for buys only warns under 3 days, and is urgent under 1', () => {
  const at = (d: number | null) =>
    attentionItems({ permissions: all, daysOfCover: d, lowCoins: [], driftCoins: [], pending: 0, reconciling: 0 });
  assert.equal(at(3).length, 0);
  assert.equal(at(null).length, 0);
  assert.equal(at(2)[0].tone, 'warning');
  assert.equal(at(0.2)[0].tone, 'danger');
});

test('items for pages the admin cannot open are left out', () => {
  const items = attentionItems({
    permissions: ['transactions.view'],
    daysOfCover: 0.5,
    lowCoins: ['btc'],
    driftCoins: ['btc'],
    pending: 1,
    reconciling: 0,
  });
  assert.deepEqual(items.map((i) => i.href), ['/transactions?status=PENDING']);
  assert.match(items[0].title, /^1 transaction /);
});

test('activity lines read as words, not codes', () => {
  assert.equal(activityLine({ type: 'BUY', fromAsset: 'ngn', toAsset: 'btc' }), 'Buy · NGN → BTC');
  assert.equal(activityLine({ type: 'ADJUSTMENT', fromAsset: 'btc', toAsset: null }), 'Balance adjustment · BTC');
  assert.equal(activityLine({ type: 'WITHDRAWAL', fromAsset: 'ngn', toAsset: 'ngn' }), 'Withdrawal · NGN');
  assert.equal(activityLine({ type: 'GIFT_CARD', fromAsset: null, toAsset: null }), 'Gift card');
});

test('transaction codes become words', () => {
  assert.equal(humanType('ADJUSTMENT'), 'Balance adjustment');
  assert.equal(humanType('GIFT_CARD'), 'Gift card');
  assert.equal(humanType('FEE_CLAIM'), 'Fee claim');
  assert.equal(assetPath('ngn', 'ngn'), 'NGN');
  assert.equal(assetPath('usdt', 'btc'), 'USDT → BTC');
  assert.equal(assetPath(null, 'btc'), 'BTC');
  assert.equal(assetPath(null, null), '');
});

test('every status explains itself on hover', () => {
  for (const s of ['COMPLETED', 'PENDING', 'PROCESSING', 'ON_HOLD', 'RECONCILING', 'FAILED']) {
    assert.ok(STATUS_HELP[s], `no help for ${s}`);
  }
  assert.match(STATUS_HELP.RECONCILING, /held/);
});

test('only statuses still moving pulse', () => {
  for (const s of ['PENDING', 'PROCESSING', 'RECONCILING']) assert.equal(isInFlight(s), true, s);
  for (const s of ['COMPLETED', 'FAILED', 'ON_HOLD', 'REJECTED', 'APPROVED', 'weird']) assert.equal(isInFlight(s), false, s);
});
