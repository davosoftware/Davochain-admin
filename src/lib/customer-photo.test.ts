import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customerPhotoSrc } from './customer-photo.ts';

test('the API link becomes the dashboard picture route', () => {
  const id = 'ab'.repeat(16);
  assert.equal(customerPhotoSrc(`/v1/admin/avatars/${id}`), `/customer-photo/${id}`);
});

test('no photo, or anything that is not a photo link, gives nothing', () => {
  assert.equal(customerPhotoSrc(null), null);
  assert.equal(customerPhotoSrc(undefined), null);
  assert.equal(customerPhotoSrc('/v1/admin/avatars/../../users'), null);
  assert.equal(customerPhotoSrc('https://evil.example/x.png'), null);
});
