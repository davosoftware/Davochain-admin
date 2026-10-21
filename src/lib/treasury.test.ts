import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coverLine, moveStatusText, naira } from './treasury.ts';

const s = (over: Record<string, unknown>) => ({
  covered: 'YES', owed: '1000000', spare: '500000', shortBy: null, rail: { name: 'Payrep', available: '1000000', error: null }, quidaxNgn: '500000',
  ...over,
}) as Parameters<typeof coverLine>[0];

test('naira reads like money', () => {
  assert.equal(naira('1500000.5'), '₦1,500,000.5');
  assert.equal(naira('0'), '₦0');
});

test('the check in plain words', () => {
  assert.equal(coverLine(s({})), '✓ Covered: we hold ₦1,500,000; customers are owed ₦1,000,000 (₦500,000 spare).');
  assert.equal(
    coverLine(s({ covered: 'SHORT', spare: null, shortBy: '200000', rail: { name: 'Payrep', available: '300000', error: null }, quidaxNgn: '500000' })),
    '⚠ Short by ₦200,000: customers are owed ₦1,000,000; we hold ₦800,000.',
  );
  assert.equal(
    coverLine(s({ covered: 'UNKNOWN', spare: null, rail: { name: 'Payrep', available: null, error: "We couldn't read the Payrep balance." } })),
    "Can't tell right now: We couldn't read the Payrep balance. Try Check again.",
  );
});

test('every move status has words', () => {
  assert.equal(moveStatusText('SENDING'), 'Sending');
  assert.equal(moveStatusText('CHECKING'), 'Checking with the bank');
  assert.equal(moveStatusText('ARRIVED'), 'Arrived');
  assert.equal(moveStatusText('FAILED'), 'Failed (nothing left)');
});

test('"Check with the bank now" says plainly when the bank has no record', async () => {
  const { checkResultText } = await import('./treasury.ts');
  assert.equal(checkResultText({ status: 'ARRIVED', noRecord: false }), 'Arrived');
  assert.equal(checkResultText({ status: 'FAILED', noRecord: false }), 'Failed: nothing left');
  assert.equal(checkResultText({ status: 'SENDING', noRecord: false }), 'Still on its way');
  assert.equal(
    checkResultText({ status: 'SENDING', noRecord: true }, 'Payrep'),
    'Payrep has no record of this move. If it is still missing 30 minutes after it was sent, an owner can mark it as failed.',
  );
});
