import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comparison, decisionsFor, formatNaira, reasonLabel } from './compliance.ts';

test('sanctions cases offer only the two sanctions decisions', () => {
  assert.deepEqual(decisionsFor('SANCTIONS', 'OPEN'), ['SANCTIONS_CONFIRMED', 'SANCTIONS_FALSE_POSITIVE']);
});

test('other open cases offer clear, EDD and restrict; a restricted case can only be lifted', () => {
  assert.deepEqual(decisionsFor('PEP', 'OPEN'), ['CLEARED', 'PEP_APPROVED_EDD', 'RESTRICTED']);
  assert.deepEqual(decisionsFor('PEP', 'RESTRICTED'), ['CLEARED']);
  assert.deepEqual(decisionsFor('PEP', 'CLEARED'), []);
  assert.deepEqual(decisionsFor('SANCTIONS', 'CLEARANCE_PROPOSED'), []);
});

test('review reasons read as plain English', () => {
  assert.equal(reasonLabel('NAME_MISMATCH'), 'Name does not match the record');
  assert.equal(reasonLabel('DOB_MISMATCH'), 'Date of birth does not match the record');
  assert.equal(reasonLabel('UNUSABLE_RECORD'), 'The record is incomplete');
  assert.equal(reasonLabel(null), 'Needs review');
});

test('the comparison table lines up typed vs record with the match result', () => {
  const rows = comparison({
    typedFirstName: 'Jon', typedMiddleName: null, typedLastName: 'Ajayi', typedDateOfBirth: '2000-05-01',
    recordFirstName: 'JOHN', recordMiddleName: 'DOE', recordLastName: 'AJAYI', recordDateOfBirth: '2000-05-01',
    match: { matched: false, swapped: false, fields: { firstName: 'MISMATCH', lastName: 'MATCH', middleName: 'SKIPPED', dateOfBirth: 'MATCH' } },
  } as never);
  assert.deepEqual(rows[0], { field: 'First name', typed: 'Jon', record: 'JOHN', result: 'MISMATCH' });
  assert.deepEqual(rows[2], { field: 'Middle name', typed: '—', record: 'DOE', result: 'SKIPPED' });
});

test('an unusable record with no match result shows every field as a mismatch, not a match', () => {
  const rows = comparison({
    typedFirstName: 'A', typedMiddleName: null, typedLastName: 'B', typedDateOfBirth: '2000-05-01',
    recordFirstName: null, recordMiddleName: null, recordLastName: null, recordDateOfBirth: null, match: null,
  } as never);
  assert.ok(rows.filter((r) => r.field !== 'Middle name').every((r) => r.result === 'MISMATCH'));
});

test('naira formats with the sign and separators, and unknown is a dash', () => {
  assert.equal(formatNaira(152000), '₦152,000.00');
  assert.equal(formatNaira(null), '—');
});
