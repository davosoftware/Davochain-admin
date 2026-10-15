import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelLabel, LEVEL_OPTIONS } from './levels.ts';

test('every tier reads as a level name', () => {
  assert.equal(levelLabel('TIER_0'), 'None');
  assert.equal(levelLabel('TIER_1'), 'Basic');
  assert.equal(levelLabel('TIER_2'), 'Advanced (in progress)');
  assert.equal(levelLabel('TIER_3'), 'Advanced');
  assert.equal(levelLabel(undefined), 'None');
});

test('the referral unlock choices use level names', () => {
  assert.deepEqual(LEVEL_OPTIONS.map((o) => o.label), ['Basic', 'Advanced (in progress)', 'Advanced']);
});
