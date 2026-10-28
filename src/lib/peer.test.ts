import { test } from 'node:test';
import assert from 'node:assert/strict';
import { peerLine, payUsernameLabel } from './peer.ts';

test('a send between two customers says who was on the other side', () => {
  const peer = { userId: 'b', name: 'Bob Eze', username: 'bob_eze_1' };
  assert.equal(peerLine({ type: 'WITHDRAWAL', peer }), 'Sent to Bob Eze (@bob_eze_1)');
  assert.equal(peerLine({ type: 'DEPOSIT', peer }), 'Received from Bob Eze (@bob_eze_1)');
  assert.equal(peerLine({ type: 'DEPOSIT', peer: { ...peer, username: null } }), 'Received from Bob Eze');
});

test('anything else has no line', () => {
  assert.equal(peerLine({ type: 'WITHDRAWAL', peer: null }), null);
  assert.equal(peerLine({ type: 'BUY' }), null);
});

test('the payment username as shown on the profile', () => {
  assert.equal(payUsernameLabel('ada_okafor'), '@ada_okafor');
  assert.equal(payUsernameLabel(null), 'Not chosen');
  assert.equal(payUsernameLabel(undefined), 'Not chosen');
});
