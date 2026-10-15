import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REASON_TEXT, coinSummary, suggestCorrection } from './reconciliation.ts';

const row = (drift: string, partial = false) => ({
  asset: 'btc', ledgerTotal: '1', receivableTotal: '0', lockedTotal: '0', heldInSubAccounts: '1', drift, withinTolerance: drift === '0', partial,
});

test('each coin is summed up in plain words', () => {
  assert.equal(coinSummary(row('0')), 'BTC matches: our records and Quidax agree.');
  assert.equal(coinSummary(row('0.002')), 'BTC: our records say customers own 0.002 more than Quidax holds for them.');
  assert.equal(coinSummary(row('-0.5')), 'BTC: Quidax holds 0.5 more than our records say customers own.');
  assert.equal(coinSummary(row('0.002', true)), "BTC: some accounts couldn't be read this time, so this can't say money is missing. Check again.");
});

test('the suggested correction makes our record match what Quidax holds', () => {
  assert.deepEqual(suggestCorrection({ difference: '0.002', unreadable: false }), { direction: 'DEBIT', amount: '0.002' });
  assert.deepEqual(suggestCorrection({ difference: '-0.0005', unreadable: false }), { direction: 'CREDIT', amount: '0.0005' });
  assert.equal(suggestCorrection({ difference: '0', unreadable: false }), null);
  assert.equal(suggestCorrection({ difference: null, unreadable: true }), null);
});

test('every reason has words for people', () => {
  for (const r of ['BEING_CHECKED', 'IN_PROGRESS', 'UNEXPLAINED', 'UNREADABLE']) assert.ok(REASON_TEXT[r as keyof typeof REASON_TEXT].length > 10);
});
