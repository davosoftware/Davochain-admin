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
  // A2: a run that read only some customers still reports what it found for them.
  const part = (drift: string) => ({ ...row(drift, true), customersChecked: 200, customersHolding: 250 });
  assert.equal(coinSummary(part('0')), 'BTC matches for the 200 of 250 customers checked this run (the rest are checked in turn).');
  assert.equal(coinSummary(part('0.002')), 'BTC: our records say customers own 0.002 more than Quidax holds for them (among the 200 of 250 customers checked this run).');
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
