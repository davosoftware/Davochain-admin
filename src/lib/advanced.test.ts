import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REJECT_OPTIONS, reasonText, scoreLine, stepLabel } from './advanced.ts';
import { documentLabel } from './kyc-documents.ts';

test('every review reason reads as plain words', () => {
  for (const code of [
    'ID_TYPE_DIFFERS', 'ID_FIELD_UNREADABLE', 'NAME_DIFFERS', 'DOB_UNREADABLE', 'NO_EXPIRY', 'LIVENESS_LOW', 'FACE_MATCH_BORDERLINE',
    'NO_ID_PHOTO', 'DUPLICATE_ID', 'TEXT_SPARSE', 'NAME_NOT_FOUND', 'NO_DATE', 'NO_END_DATE', 'ADDRESS_PARTIAL', 'ADDRESS_NOT_FOUND', 'PDF', 'SYSTEM',
  ]) {
    const t = reasonText(code);
    assert.notEqual(t, code, code);
    assert.match(t, /^[A-Z]/);
  }
  assert.equal(reasonText('SOMETHING_NEW'), 'SOMETHING_NEW');
});

test('a score line says the number and the mark it needed', () => {
  assert.equal(scoreLine('Face match', 68, 75, 60), 'Face match 68 — needs 75 to pass (60–74 goes to a person)');
  assert.equal(scoreLine('Liveness', 98, 90), 'Liveness 98 — passes (needs 90)');
  assert.equal(scoreLine('Liveness', 80.6, 90), 'Liveness 81 — needs 90 to pass');
  assert.equal(scoreLine('Face match', null, 75), 'Face match — not checked');
});

test('reject options are the API list, approval excluded', () => {
  assert.deepEqual(
    REJECT_OPTIONS.map((o) => o.value),
    ['DOC_UNCLEAR', 'DOC_ALTERED', 'NAME_MISMATCH', 'ADDRESS_NOT_SHOWN', 'NOT_ACCEPTED', 'OTHER'],
  );
});

test('step names', () => {
  assert.equal(stepLabel('IDENTITY'), 'ID and selfie');
  assert.equal(stepLabel('ADDRESS'), 'Proof of address');
});

test('the new document types have labels', () => {
  assert.equal(documentLabel('NATIONAL_ID'), 'National ID (front)');
  assert.equal(documentLabel('ID_BACK'), 'ID (back)');
});
