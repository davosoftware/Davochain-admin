import { test } from 'node:test';
import assert from 'node:assert/strict';
import { providerCards, type CredentialItem } from './credentials.ts';

const key = (group: string, name: string, source: CredentialItem['source']): CredentialItem => ({
  name, group, label: name, hint: '', envVar: name.toUpperCase(), source, last4: null, updatedAt: null, updatedBy: null,
});

test('one card per provider, in a fixed order, unknown groups last', () => {
  const cards = providerCards([
    key('Push', 'fcm', 'unset'),
    key('Mystery', 'x', 'unset'),
    key('Quidax', 'q1', 'database'),
    key('Payrep', 'p1', 'environment'),
  ]);
  assert.deepEqual(cards.map((c) => c.group), ['Quidax', 'Payrep', 'Push', 'Mystery']);
});

test('the badge: all set, or how many keys are missing', () => {
  const [quidax, payrep] = providerCards([
    key('Quidax', 'q1', 'database'),
    key('Quidax', 'q2', 'environment'),
    key('Payrep', 'p1', 'unset'),
    key('Payrep', 'p2', 'unset'),
    key('Payrep', 'p3', 'database'),
  ]);
  assert.deepEqual([quidax.status, quidax.missing], ['ready', 0]);
  assert.deepEqual([payrep.status, payrep.missing], ['missing', 2]);
});

test('each provider has a plain description of what it does', () => {
  const [dojah] = providerCards([key('Dojah', 'd1', 'unset')]);
  assert.match(dojah.description, /identity/i);
});
