import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startsNavigation } from './route-progress.ts';

const here = 'http://localhost:3100/users?page=2';
const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
const link = (href: string, extra: Partial<{ target: string; download: boolean }> = {}) => ({ href, target: '', download: false, ...extra });

test('a plain click on another dashboard page starts the bar', () => {
  assert.equal(startsNavigation(click, link('http://localhost:3100/transactions'), here), true);
  assert.equal(startsNavigation(click, link('http://localhost:3100/users?page=3'), here), true);
});

test('clicks that do not change the page in this tab do not', () => {
  assert.equal(startsNavigation(click, link('http://localhost:3100/users?page=2'), here), false, 'same page');
  assert.equal(startsNavigation(click, link('http://localhost:3100/users?page=2#top'), here), false, 'same page, anchor');
  assert.equal(startsNavigation(click, link('http://localhost:3000/docs'), here), false, 'another site');
  assert.equal(startsNavigation(click, link('http://localhost:3100/x', { target: '_blank' }), here), false, 'new tab');
  assert.equal(startsNavigation(click, link('http://localhost:3100/x', { download: true }), here), false, 'download');
  assert.equal(startsNavigation({ ...click, ctrlKey: true }, link('http://localhost:3100/x'), here), false, 'ctrl-click');
  assert.equal(startsNavigation({ ...click, metaKey: true }, link('http://localhost:3100/x'), here), false, 'cmd-click');
  assert.equal(startsNavigation({ ...click, button: 1 }, link('http://localhost:3100/x'), here), false, 'middle click');
  assert.equal(startsNavigation(click, link('mailto:a@b.c'), here), false, 'mail link');
});
