import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closeFormProblem, shownEmail } from './account-closure.ts';

test('the close form needs a 10-character reason, the password and the tick', () => {
  assert.match(closeFormProblem({ reason: 'short', password: 'x', confirmed: true }) ?? '', /10 characters/);
  assert.match(closeFormProblem({ reason: 'Customer asked by email', password: '', confirmed: true }) ?? '', /password/);
  assert.match(closeFormProblem({ reason: 'Customer asked by email', password: 'x', confirmed: false }) ?? '', /Tick/);
  assert.equal(closeFormProblem({ reason: '  Customer asked by email  ', password: 'x', confirmed: true }), null);
});

test('a closed account shows its original email, not the placeholder', () => {
  assert.equal(shownEmail({ email: 'closed-u1@closed.davochain', closedEmail: 'ada@example.com' }), 'ada@example.com');
  assert.equal(shownEmail({ email: 'ada@example.com', closedEmail: null }), 'ada@example.com');
  assert.equal(shownEmail({ email: 'ada@example.com' }), 'ada@example.com');
});
