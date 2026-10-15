import { LadderScreen } from '@/components/ladder-screen';
import { PriceReferencePanel } from '@/components/price-reference-panel';

export const dynamic = 'force-dynamic';

/**
 * The buy margin: naira per dollar added to Quidax's buying price. Also the
 * sell margin for a coin with no sell ladder of its own (M11).
 *
 * The user never sees it as a fee — the rate on screen is the price they pay,
 * and this ladder is the whole margin inside it.
 */
export default function RatesPage() {
  return (
    <>
      <LadderScreen
        kind="RATE"
        title="Buy margin"
        description="Naira per dollar added to Quidax's buying price when a customer buys a coin. It is folded into the rate the customer sees. A coin with no sell margin of its own also uses this for sells."
        globalSubtitle="Every coin without its own buy ladder falls back to this."
      />
      <PriceReferencePanel />
    </>
  );
}
