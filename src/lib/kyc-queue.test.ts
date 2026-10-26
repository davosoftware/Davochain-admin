import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kycQueueHref, type KycQueueState } from './kyc-queue.ts';

const base: KycQueueState = { order: 'oldest', page: 1, pageSize: 25, total: 104, search: '', includeAutomatedTests: false };

test('the plain list is just /kyc', () => {
  assert.equal(kycQueueHref(base, {}), '/kyc');
});

test('"Newest first" keeps the search and goes back to page 1', () => {
  assert.equal(kycQueueHref({ ...base, page: 3, search: 'ada' }, { order: 'newest' }), '/kyc?order=newest&search=ada');
});

test('Next keeps the order, the search and the test-account switch', () => {
  assert.equal(
    kycQueueHref({ ...base, order: 'newest', search: 'gmail', includeAutomatedTests: true }, { page: 2 }),
    '/kyc?order=newest&page=2&search=gmail&includeAutomatedTests=true',
  );
});

test('the search text is encoded safely', () => {
  assert.equal(kycQueueHref(base, { search: 'a&b c' }), '/kyc?search=a%26b+c');
});
