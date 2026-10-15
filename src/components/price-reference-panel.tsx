import { api, ApiError } from '@/lib/api';
import type { FeeLadderView } from '@/lib/types-admin';
import { referenceRow, type PriceReference } from '@/lib/price-reference';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Quidax's buy and sell prices for every coin, beside the margins in force and
 * what a customer gets (M11). Read-only. Priced for a $100 trade, since the
 * margins are banded by size.
 */
export async function PriceReferencePanel() {
  const ladder = await api<FeeLadderView>('/v1/admin/fee-ladders/sell_rate').catch((e: ApiError) => e);
  if (ladder instanceof ApiError) return null;

  const rows = await Promise.all(
    ladder.assets.map((a) =>
      api<PriceReference>(`/v1/admin/price-reference?asset=${encodeURIComponent(a.asset)}&usd=100`)
        .then(referenceRow)
        .catch(() => ({ coin: a.asset.toUpperCase(), unavailable: true as const })),
    ),
  );

  return (
    <Card className="mt-6">
      <CardContent className="p-4">
        <h2 className="text-sm font-semibold">Quidax prices and your margins (for a $100 trade)</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          A sale starts from what Quidax would pay for the coin, minus your sell margin. A coin marked
          &ldquo;borrowed&rdquo; has no sell margin of its own yet and uses its buy margin.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">Coin</th>
                <th className="py-1 pr-3">Quidax buy</th>
                <th className="py-1 pr-3">Quidax sell</th>
                <th className="py-1 pr-3">Spread</th>
                <th className="py-1 pr-3">Buy margin</th>
                <th className="py-1 pr-3">Sell margin</th>
                <th className="py-1 pr-3">Customer buys at</th>
                <th className="py-1 pr-3">Customer sells at</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) =>
                'unavailable' in r ? (
                  <tr key={r.coin} className="border-t">
                    <td className="py-1 pr-3 font-medium">{r.coin}</td>
                    <td className="py-1 pr-3 text-muted-foreground" colSpan={7}>
                      Price unavailable right now
                    </td>
                  </tr>
                ) : (
                  <tr key={r.coin} className="border-t">
                    <td className="py-1 pr-3 font-medium">{r.coin}</td>
                    <td className="py-1 pr-3">{r.quidaxBuy}</td>
                    <td className="py-1 pr-3">{r.quidaxSell}</td>
                    <td className="py-1 pr-3">{r.spread}</td>
                    <td className="py-1 pr-3" title={r.buyMarginSource}>{r.buyMargin}</td>
                    <td className="py-1 pr-3" title={r.sellMarginSource}>
                      {r.sellMargin}
                      {r.sellMarginBorrowed ? <span className="ml-1 text-amber-600">(borrowed)</span> : null}
                    </td>
                    <td className="py-1 pr-3">{r.customerBuy}</td>
                    <td className="py-1 pr-3">{r.customerSell}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
