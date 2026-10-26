import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addressAction, addressesHref, statusLabel, type AddressListState } from './crypto-addresses.ts';

const base: AddressListState = { page: 1, status: '', asset: '', search: '', stuck: false };

test('the plain list is just /crypto-addresses', () => {
  assert.equal(addressesHref(base, {}), '/crypto-addresses');
});

test('a filter keeps the others and goes back to page 1', () => {
  assert.equal(
    addressesHref({ ...base, page: 4, asset: 'usdt', search: 'ada' }, { stuck: true }),
    '/crypto-addresses?asset=usdt&search=ada&stuck=true',
  );
  assert.equal(addressesHref({ ...base, status: 'FAILED' }, { page: 2 }), '/crypto-addresses?page=2&status=FAILED');
});

test('statuses read in plain words', () => {
  assert.equal(statusLabel({ status: 'ACTIVE', stuck: false }), 'Ready');
  assert.equal(statusLabel({ status: 'PENDING', stuck: false }), 'Being created');
  assert.equal(statusLabel({ status: 'PENDING', stuck: true }), 'Stuck: still waiting');
  assert.equal(statusLabel({ status: 'FAILED', stuck: true }), 'Failed');
  assert.equal(statusLabel({ status: 'DISABLED', stuck: false }), 'Network switched off');
});

test('the button matches the state: Check again while waiting, Try again after failing, none when ready', () => {
  assert.equal(addressAction('PENDING'), 'Check again');
  assert.equal(addressAction('FAILED'), 'Try again');
  assert.equal(addressAction('ACTIVE'), null);
  assert.equal(addressAction('DISABLED'), null);
});
