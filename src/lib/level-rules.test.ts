import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capError, changeSummary, fieldError } from './level-rules.ts';

const view = (maxPerDay: string | null, allowed = true) => ({
  actions: [{ action: 'GIFTCARD_SELL', label: 'sell gift cards', unit: 'NGN' }],
  rules: [{ level: 'BASIC', action: 'GIFTCARD_SELL', allowed, currency: 'NGN', minPerTx: null, maxPerTx: null, maxPerDay }],
  cooloffs: [{ level: 'BASIC', afterSignupHours: 0, afterCredentialChangeHours: 0, afterNewPayeeHours: 0 }],
  platform: { tradingMaxPerDay: '50000', currency: 'USD' },
});

test('the review lists exactly what changes, in words', () => {
  assert.deepEqual(changeSummary(view('1000000'), view('2000000')), ['Basic · Sell gift cards · Max per day: ₦1,000,000 → ₦2,000,000']);
  assert.deepEqual(changeSummary(view('1000000'), view(null)), ['Basic · Sell gift cards · Max per day: ₦1,000,000 → No limit']);
  assert.deepEqual(changeSummary(view(null, true), view(null, false)), ['Basic · Sell gift cards · Allowed: Yes → No']);
  assert.deepEqual(changeSummary(view(null), view(null)), []);
});

test('a field error is shown next to the field', () => {
  assert.equal(fieldError({ minPerTx: '10', maxPerTx: '5', maxPerDay: null }), 'The minimum is above the maximum per transaction.');
  assert.equal(fieldError({ minPerTx: null, maxPerTx: '50', maxPerDay: '10' }), 'The maximum per transaction is above the daily maximum.');
  assert.equal(fieldError({ minPerTx: '-1', maxPerTx: null, maxPerDay: null }), 'Amounts cannot be negative.');
  assert.equal(fieldError({ minPerTx: '1', maxPerTx: '5', maxPerDay: '10' }), null);
});

test('the saved-destination caps are listed in the review', () => {
  const base = view(null);
  const before = { ...base, platform: { ...base.platform, maxSavedBankAccounts: 5, maxSavedCryptoAddresses: 10 } };
  const after = { ...base, platform: { ...base.platform, maxSavedBankAccounts: 3, maxSavedCryptoAddresses: 10 } };
  assert.deepEqual(changeSummary(before, after), ['Platform · Max saved bank accounts: 5 → 3']);
});

test('a cap must be a whole number from 1 to 50', () => {
  assert.equal(capError(0), 'Enter a whole number from 1 to 50.');
  assert.equal(capError(51), 'Enter a whole number from 1 to 50.');
  assert.equal(capError(2.5), 'Enter a whole number from 1 to 50.');
  assert.equal(capError(5), null);
});
