import { test } from 'node:test';
import assert from 'node:assert/strict';
import { historyHref, verdictInfo, differenceLabel, problemCount, type CustomerCheck } from './customer-history.ts';

test('the history link is the transactions manager narrowed to one customer (and a coin)', () => {
  assert.equal(historyHref('3f2c-ada'), '/transactions?userId=3f2c-ada');
  assert.equal(historyHref('3f2c-ada', 'usdt'), '/transactions?userId=3f2c-ada&asset=usdt');
});

test('every verdict has plain words and a tone; problems are red, waits are amber', () => {
  assert.deepEqual(verdictInfo('OK'), { label: 'Matches', tone: 'success' });
  assert.equal(verdictInfo('RECORDS_DISAGREE').tone, 'destructive');
  assert.equal(verdictInfo('UNEXPLAINED').tone, 'destructive');
  assert.equal(verdictInfo('IN_PROGRESS').tone, 'warning');
  assert.equal(verdictInfo('BEING_CHECKED').tone, 'warning');
  assert.equal(verdictInfo('NOT_CHECKED').tone, 'outline');
  // An answer from a newer server still renders.
  assert.equal(verdictInfo('SOMETHING_NEW' as never).label, 'SOMETHING_NEW');
});

test('a difference says which side has more, in the coin', () => {
  assert.equal(differenceLabel('30', 'usdt'), 'Quidax holds 30 USDT less than our records');
  assert.equal(differenceLabel('-0.01', 'btc'), 'Quidax holds 0.01 BTC more than our records');
  assert.equal(differenceLabel('0', 'usdt'), 'None');
  assert.equal(differenceLabel(null, 'ngn'), '—');
});

test('problems are the rows that are wrong now, not the ones still settling', () => {
  const row = (verdict: string) => ({ verdict }) as CustomerCheck['rows'][number];
  const check = { rows: [row('OK'), row('UNEXPLAINED'), row('RECORDS_DISAGREE'), row('IN_PROGRESS')] } as CustomerCheck;
  assert.equal(problemCount(check), 2);
});
