import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupCodesText, codeStepText, isSixDigits, parseLoginAnswer } from './two-step.ts';

test('a sign-in answer is either a token or a second step', () => {
  assert.deepEqual(parseLoginAnswer({ accessToken: 'jwt' }), { kind: 'token', accessToken: 'jwt' });
  assert.deepEqual(parseLoginAnswer({ twoStep: 'CODE', ticket: 't', sentTo: 'a**@d.test', delivered: true }), {
    kind: 'CODE',
    ticket: 't',
    sentTo: 'a**@d.test',
    delivered: true,
  });
  assert.equal(parseLoginAnswer({ twoStep: 'SETUP', ticket: 't', sentTo: 'x', delivered: false }).kind, 'SETUP');
  assert.equal(parseLoginAnswer({}).kind, 'unknown');
  assert.equal(parseLoginAnswer(null).kind, 'unknown');
});

test('the code step says plainly where the code went, and what to do if it did not arrive', () => {
  assert.equal(codeStepText('CODE', 'a**@d.test', true), 'We sent a 6-digit code to a**@d.test. Enter it, or one of your backup codes.');
  assert.equal(codeStepText('CODE', 'a**@d.test', false), "We couldn't send your code. Enter one of your backup codes instead.");
  assert.equal(
    codeStepText('SETUP', 'a**@d.test', true),
    'An owner requires two-step sign-in for every admin. We sent a 6-digit code to a**@d.test to switch it on for you.',
  );
  assert.match(codeStepText('SETUP', 'a**@d.test', false), /couldn't send your code.*Send a new code/);
});

test('only six digits count as a code', () => {
  assert.equal(isSixDigits('123456'), true);
  assert.equal(isSixDigits(' 123456 '), true);
  assert.equal(isSixDigits('12345'), false);
  assert.equal(isSixDigits('12a456'), false);
});

test('the backup codes download says what they are and how to use them', () => {
  const text = backupCodesText(['111111', '222222'], 'ada@davochain.test', new Date('2026-10-20T10:00:00Z'));
  assert.match(text, /DavoChain admin backup codes for ada@davochain.test/);
  assert.match(text, /111111\n222222/);
  assert.match(text, /Each code works once/);
});
