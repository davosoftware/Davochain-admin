/**
 * Quidax's buy and sell prices beside our margins (M11).
 * Shape of GET /v1/admin/price-reference.
 */
export interface PriceReference {
  asset: string;
  usdValue: string;
  quidaxBuyNgnPerUsd: string;
  quidaxSellNgnPerUsd: string;
  quidaxSpreadNgnPerUsd: string;
  buyMargin: { ngnPerUsd: string; source: MarginSource };
  sellMargin: { ngnPerUsd: string; source: MarginSource };
  customerBuyNgnPerUsd: string;
  customerSellNgnPerUsd: string;
}

export type MarginSource = 'sell ladder' | 'buy ladder' | 'buy ladder (no sell ladder set)' | 'flat rate setting';

const naira = (v: string) =>
  '₦' + Number(v).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** One table row, in naira per dollar, with the margin sources in words. */
export function referenceRow(r: PriceReference) {
  return {
    coin: r.asset.toUpperCase(),
    quidaxBuy: naira(r.quidaxBuyNgnPerUsd),
    quidaxSell: naira(r.quidaxSellNgnPerUsd),
    spread: naira(r.quidaxSpreadNgnPerUsd),
    buyMargin: naira(r.buyMargin.ngnPerUsd),
    buyMarginSource: r.buyMargin.source,
    sellMargin: naira(r.sellMargin.ngnPerUsd),
    sellMarginSource: r.sellMargin.source,
    customerBuy: naira(r.customerBuyNgnPerUsd),
    customerSell: naira(r.customerSellNgnPerUsd),
    /** No sell margin of its own yet: it is using the buy margin. */
    sellMarginBorrowed: r.sellMargin.source !== 'sell ladder',
  };
}
