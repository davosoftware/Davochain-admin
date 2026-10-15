import { LadderScreen } from '@/components/ladder-screen';
import { PriceReferencePanel } from '@/components/price-reference-panel';

export const dynamic = 'force-dynamic';

/**
 * The sell margin (M11): naira per dollar taken off what Quidax would pay for
 * the coin. Its own ladder, set apart from the buy margin. A coin without one
 * (and no global one) uses its buy margin.
 */
export default function SellMarginPage() {
  return (
    <>
      <LadderScreen
        kind="SELL_RATE"
        title="Sell margin"
        description="Naira per dollar taken off Quidax's selling price when a customer sells a coin to us. Banded by trade size. Until you set one, a coin uses its buy margin."
        globalSubtitle="Every coin without its own sell ladder falls back to this, then to the buy margin."
      />
      <PriceReferencePanel />
    </>
  );
}
