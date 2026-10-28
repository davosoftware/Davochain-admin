import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchNav } from './nav-match.ts';

const groups = [
  { label: 'Watch', items: [{ href: '/', label: 'Overview' }, { href: '/treasury', label: 'Treasury' }] },
  {
    label: 'Gift cards',
    items: [
      { href: '/giftcards/brands', label: 'Brands' },
      { href: '/giftcards/trades', label: 'Card trades' },
    ],
  },
  { label: 'System', items: [{ href: '/system/server-settings', label: 'Server settings' }] },
];

test('the home page matches only itself', () => {
  assert.deepEqual(matchNav(groups, '/'), { group: 'Watch', label: 'Overview', href: '/' });
});

test('a page inside a section matches its sidebar item', () => {
  assert.deepEqual(matchNav(groups, '/giftcards/trades'), { group: 'Gift cards', label: 'Card trades', href: '/giftcards/trades' });
  assert.deepEqual(matchNav(groups, '/giftcards/trades/abc123'), { group: 'Gift cards', label: 'Card trades', href: '/giftcards/trades' });
  assert.deepEqual(matchNav(groups, '/system/server-settings'), { group: 'System', label: 'Server settings', href: '/system/server-settings' });
});

test('a lookalike path does not match', () => {
  assert.equal(matchNav(groups, '/treasury-old'), null);
  assert.equal(matchNav(groups, '/nowhere'), null);
});
