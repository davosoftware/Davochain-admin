import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decisionFor, completeLabel } from './transaction-decision.ts';

const row = (o: Record<string, unknown>) =>
  ({ type: 'WITHDRAWAL', status: 'PROCESSING', needsApproval: false, peer: null, name: 'Ada Obi', ...o }) as never;
const owner = { canApprove: true, isOwner: true };
const subAdmin = { canApprove: true, isOwner: false };

test('a held naira deposit: credit now or reject, for anyone allowed to approve', () => {
  assert.equal(decisionFor(row({ type: 'DEPOSIT', status: 'ON_HOLD', needsApproval: true }), subAdmin), 'DEPOSIT');
  assert.equal(decisionFor(row({ type: 'DEPOSIT', status: 'ON_HOLD', needsApproval: true }), { canApprove: false, isOwner: false }), null);
});

test('a waiting send, withdrawal or trade: an owner completes or rejects it', () => {
  for (const status of ['PENDING', 'PROCESSING', 'RECONCILING']) {
    for (const type of ['BUY', 'SELL', 'SWAP', 'WITHDRAWAL']) {
      assert.equal(decisionFor(row({ type, status }), owner), 'WAITING', `${type} ${status}`);
    }
  }
  // Others with the approve permission are told only an owner can.
  assert.equal(decisionFor(row({ status: 'RECONCILING' }), subAdmin), 'OWNER_ONLY');
  assert.equal(decisionFor(row({ status: 'RECONCILING' }), { canApprove: false, isOwner: false }), null);
});

test('nothing to decide once finished, or on a deposit or gift card still arriving', () => {
  assert.equal(decisionFor(row({ status: 'COMPLETED' }), owner), null);
  assert.equal(decisionFor(row({ status: 'FAILED' }), owner), null);
  assert.equal(decisionFor(row({ type: 'DEPOSIT', status: 'PENDING' }), owner), null);
  assert.equal(decisionFor(row({ type: 'GIFT_CARD', status: 'PENDING' }), owner), null);
});

test('the complete button says who gets what', () => {
  assert.equal(completeLabel(row({ peer: { userId: 'b', name: 'Bob Eze', username: 'bob_1' } })), 'Credit Bob Eze now');
  assert.equal(completeLabel(row({ type: 'WITHDRAWAL' })), 'Mark as sent');
  assert.equal(completeLabel(row({ type: 'BUY' })), 'Credit Ada Obi now');
  assert.equal(completeLabel(row({ type: 'SWAP' })), 'Credit Ada Obi now');
});
