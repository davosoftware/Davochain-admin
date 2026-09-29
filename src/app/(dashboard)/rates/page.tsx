import { LadderScreen } from '@/components/ladder-screen';

export const dynamic = 'force-dynamic';

/**
 * The rate fee: naira per dollar, folded into the buy and sell rate.
 *
 * The user never sees it as a fee — the rate on screen is the price they pay,
 * and this ladder is the whole margin inside it.
 */
export default function RatesPage() {
  return (
    <LadderScreen
      kind="RATE"
      title="Buy &amp; sell rate"
      description="Naira per dollar, added on a buy and taken off a sell. It is folded into the rate the user sees, so this ladder is the entire margin on naira trades."
      globalSubtitle="Every coin without its own rate ladder falls back to this."
    />
  );
}
