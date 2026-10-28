import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDateOfBirth, formatDay } from './date-of-birth.ts';

test('a date of birth reads as a date and an age', () => {
  assert.equal(formatDateOfBirth('2000-05-01', new Date('2026-10-28T10:00:00Z')), '1 May 2000 · age 26');
});

test('the age only goes up on the birthday', () => {
  assert.equal(formatDateOfBirth('2000-10-29', new Date('2026-10-28T10:00:00Z')), '29 Oct 2000 · age 25');
  assert.equal(formatDateOfBirth('2000-10-28', new Date('2026-10-28T10:00:00Z')), '28 Oct 2000 · age 26');
});

test('nothing verified yet, or a bad value, says so', () => {
  assert.equal(formatDateOfBirth(null), 'Not verified yet');
  assert.equal(formatDateOfBirth(undefined), 'Not verified yet');
  assert.equal(formatDateOfBirth('not-a-date'), 'Not verified yet');
});

test('a plain day, for comparing two dates side by side', () => {
  assert.equal(formatDay('1995-03-03'), '3 Mar 1995');
  assert.equal(formatDay(null), 'unknown');
});
