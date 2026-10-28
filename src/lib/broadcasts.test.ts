import { test } from 'node:test';
import assert from 'node:assert/strict';
import { broadcastActions, isRunning, progressLine, statusLabel } from './broadcasts.ts';

const row = { status: 'SENDING', recipientCount: 10000, processedCount: 3400, percent: 34, pushFailedCount: 12, withEmail: false, emailQueuedCount: 0 };

test('status in plain words', () => {
  assert.equal(statusLabel('QUEUED'), 'Waiting to start');
  assert.equal(statusLabel('SENDING'), 'Sending');
  assert.equal(statusLabel('PAUSED'), 'Paused');
  assert.equal(statusLabel('CANCELLED'), 'Cancelled');
  assert.equal(statusLabel('DONE'), 'Sent');
});

test('the progress line says how far, and what failed', () => {
  assert.equal(progressLine(row), '3,400 of 10,000 (34%) · 12 phones failed');
  assert.equal(progressLine({ ...row, pushFailedCount: 0, withEmail: true, emailQueuedCount: 2900 }), '3,400 of 10,000 (34%) · 2,900 emails');
  assert.equal(progressLine({ ...row, status: 'DONE', processedCount: 10000, percent: 100, pushFailedCount: 1 }), '10,000 of 10,000 (100%) · 1 phone failed');
});

test('which buttons show', () => {
  assert.deepEqual(broadcastActions('QUEUED'), ['pause', 'cancel']);
  assert.deepEqual(broadcastActions('SENDING'), ['pause', 'cancel']);
  assert.deepEqual(broadcastActions('PAUSED'), ['resume', 'cancel']);
  assert.deepEqual(broadcastActions('DONE'), []);
  assert.deepEqual(broadcastActions('CANCELLED'), []);
});

test('the page refreshes itself only while something is being sent', () => {
  assert.equal(isRunning([{ status: 'DONE' }, { status: 'SENDING' }]), true);
  assert.equal(isRunning([{ status: 'QUEUED' }]), true);
  assert.equal(isRunning([{ status: 'DONE' }, { status: 'PAUSED' }]), false);
});
