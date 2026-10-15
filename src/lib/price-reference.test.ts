import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referenceRow, type PriceReference } from './price-reference.ts';

// M11: the margin pages show Quidax's buy and sell prices beside the margins in
// force, where each margin comes from, and what a customer gets.
const ref: PriceReference = {
  asset: 'btc',
  usdValue: '100.00',
  quidaxBuyNgnPerUsd: '1600.00',
  quidaxSellNgnPerUsd: '1568.00',
  quidaxSpreadNgnPerUsd: '32.00',
  buyMargin: { ngnPerUsd: '20.00', source: 'buy ladder' },
  sellMargin: { ngnPerUsd: '20.00', source: 'buy ladder (no sell ladder set)' },
  customerBuyNgnPerUsd: '1620.00',
  customerSellNgnPerUsd: '1548.00',
};

test('a row reads in naira per dollar, with the margin sources in words', () => {
  assert.deepEqual(referenceRow(ref), {
    coin: 'BTC',
    quidaxBuy: '₦1,600.00',
    quidaxSell: '₦1,568.00',
    spread: '₦32.00',
    buyMargin: '₦20.00',
    buyMarginSource: 'buy ladder',
    sellMargin: '₦20.00',
    sellMarginSource: 'buy ladder (no sell ladder set)',
    customerBuy: '₦1,620.00',
    customerSell: '₦1,548.00',
    sellMarginBorrowed: true,
  });
});

test('a coin with its own sell ladder is not marked as borrowed', () => {
  const own = { ...ref, sellMargin: { ngnPerUsd: '30.00', source: 'sell ladder' as const } };
  assert.equal(referenceRow(own).sellMarginBorrowed, false);
});
