import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closeFormProblem, dataStatusLine, shownEmail } from './account-closure.ts';

test('the close form needs a data choice, a 10-character reason, the password and the tick', () => {
  const ok = { dataChoice: 'KEEP' as const, reason: 'Customer asked by email', password: 'x', confirmed: true };
  assert.match(closeFormProblem({ ...ok, dataChoice: null }) ?? '', /what happens to their data/);
  assert.match(closeFormProblem({ ...ok, reason: 'short' }) ?? '', /10 characters/);
  assert.match(closeFormProblem({ ...ok, password: '' }) ?? '', /password/);
  assert.match(closeFormProblem({ ...ok, confirmed: false }) ?? '', /Tick/);
  assert.equal(closeFormProblem({ ...ok, reason: '  Customer asked by email  ' }), null);
});

test('a closed account says what happened to its data', () => {
  assert.equal(dataStatusLine({ dataDeletedAt: '2026-10-28T10:00:00Z', dataDeleteAt: null }), 'Personal data deleted on 28 Oct 2026.');
  assert.equal(dataStatusLine({ dataDeletedAt: null, dataDeleteAt: '2027-04-28T10:00:00Z' }), 'Personal data will be deleted on 28 Apr 2027.');
  assert.equal(dataStatusLine({ dataDeletedAt: null, dataDeleteAt: null }), 'Data kept on file.');
});

test('a closed account shows its original email, not the placeholder', () => {
  assert.equal(shownEmail({ email: 'closed-u1@closed.davochain', closedEmail: 'ada@example.com' }), 'ada@example.com');
  assert.equal(shownEmail({ email: 'ada@example.com', closedEmail: null }), 'ada@example.com');
  assert.equal(shownEmail({ email: 'ada@example.com' }), 'ada@example.com');
});
