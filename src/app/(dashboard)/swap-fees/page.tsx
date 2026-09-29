import { LadderScreen } from '@/components/ladder-screen';

export const dynamic = 'force-dynamic';

/**
 * The swap fee: a flat dollar amount on a coin-to-coin trade.
 *
 * Separate from the rate fee in every way — different trades, different unit,
 * its own bands. A coin can charge a tight rate and a generous swap, and the
 * two ladders need not break at the same amounts.
 */
export default function SwapFeesPage() {
  return (
    <LadderScreen
      kind="SWAP"
      title="Swap fee"
      description="A flat dollar amount taken from a coin-to-coin swap, priced on the coin being sold. Banded by size, because a flat $2 is 10% of a $20 swap and 0.04% of a $5,000 one."
      globalSubtitle="Every coin without its own swap ladder falls back to this."
    />
  );
}
