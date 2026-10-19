import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentApiPath, documentLabel, storageLine } from './kyc-documents.ts';

test('document types read as words', () => {
  assert.equal(documentLabel('PASSPORT'), 'Passport');
  assert.equal(documentLabel('DRIVERS_LICENSE'), "Driver's licence");
  assert.equal(documentLabel('PROOF_OF_ADDRESS'), 'Proof of address');
  assert.equal(documentLabel('SOMETHING_NEW'), 'SOMETHING_NEW');
});

test('only a real document id is ever forwarded to the API', () => {
  assert.equal(documentApiPath('3f1c2a1b-9e8d-4c6f-a1b2-c3d4e5f60718'), '/v1/admin/kyc/documents/3f1c2a1b-9e8d-4c6f-a1b2-c3d4e5f60718/file');
  assert.equal(documentApiPath('../users'), null);
  assert.equal(documentApiPath('3f1c2a1b-9e8d-4c6f-a1b2-c3d4e5f60718/../../x'), null);
  assert.equal(documentApiPath(''), null);
});

test('the storage line says plainly where files go and whether that works', () => {
  assert.deepEqual(storageLine({ driver: 'r2', reachable: true, bucket: 'davochain-files' }), {
    tone: 'ok',
    text: 'File storage: Cloudflare R2 (davochain-files) is working.',
  });
  assert.deepEqual(storageLine({ driver: 'r2', reachable: false, bucket: 'davochain-files' }), {
    tone: 'bad',
    text: 'File storage: Cloudflare R2 (davochain-files) is NOT reachable. Customers cannot upload documents and documents cannot be opened until it is.',
  });
  assert.equal(storageLine({ driver: 'memory', reachable: true, bucket: null }).tone, 'warn');
  assert.match(storageLine({ driver: 'memory', reachable: true, bucket: null }).text, /test mode/);
  assert.deepEqual(storageLine(null), { tone: 'bad', text: 'File storage: could not check right now.' });
});
