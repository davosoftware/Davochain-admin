import { api, ApiError } from '@/lib/api';
import type { FuelLevel, InventoryRow } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { Stat } from '@/components/stat';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCoin, formatNaira, formatPercent, formatUsd } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const [rows, fuel] = await Promise.all([
    api<InventoryRow[]>('/v1/admin/inventory').catch((e: ApiError) => e),
    api<FuelLevel>('/v1/admin/inventory/fuel').catch(() => null),
  ]);

  if (rows instanceof ApiError) {
    return (
      <>
        <PageHeader title="Inventory desk" />
        <ErrorState title="Could not load inventory" detail={rows.message} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Inventory desk"
        description="The platform never trades its own book. Restock where the price is good, then record it here."
      />

      {fuel ? (
        <Card className="mb-6">
          <CardContent className="grid grid-cols-2 gap-6 p-5 lg:grid-cols-4">
            <Stat
              label="Naira fuel"
              value={formatNaira(fuel.balanceNgn, 0)}
              hint="funds the fallback swap"
              tone={Number(fuel.daysOfCover) < 3 ? 'warning' : 'success'}
            />
            <Stat label="Days of cover" value={fuel.daysOfCover} hint="at the current burn" />
            <Stat label="Coins tracked" value={rows.length} />
            <Stat
              label="Below floor"
              value={rows.filter((r) => r.belowFloor).length}
              tone={rows.some((r) => r.belowFloor) ? 'warning' : 'success'}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Coin</TableHead>
                <TableHead className="text-right">Held</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Sold since refill</TableHead>
                <TableHead className="text-right">Avg received</TableHead>
                <TableHead className="text-right">Price now</TableHead>
                <TableHead className="text-right">vs avg</TableHead>
                <TableHead className="text-right">Restock cost</TableHead>
                <TableHead className="pr-5 text-right">Lost / day</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={9}>
                  No inventory settings yet. Seed them, or set a target per coin.
                </TableEmpty>
              ) : (
                rows.map((row) => {
                  const cheaper = Number(row.vsAvgPct) < 0;
                  return (
                    <TableRow key={row.asset}>
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-2 font-medium">
                          {row.asset.toUpperCase()}
                          {row.belowFloor ? <Badge variant="warning">low</Badge> : null}
                          {!row.fallbackEnabled ? (
                            <Badge variant="destructive">no fallback</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatCoin(row.held)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right font-mono text-xs">
                        {formatCoin(row.target)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatCoin(row.soldSinceRefill)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right font-mono text-xs">
                        {formatUsd(row.avgReceivedUsd)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatUsd(row.priceNowUsd)}
                      </TableCell>
                      {/* Negative is GOOD here — cheaper to restock than you sold at. */}
                      <TableCell
                        className={`text-right font-mono text-xs ${
                          cheaper ? 'text-success font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {formatPercent(row.vsAvgPct)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {Number(row.restockCostUsd) > 0 ? formatUsd(row.restockCostUsd) : '—'}
                      </TableCell>
                      <TableCell className="pr-5 text-right font-mono text-xs">
                        {Number(row.marginLostPerDayNgn) > 0
                          ? formatNaira(row.marginLostPerDayNgn, 0)
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-muted-foreground mt-4 text-sm">
        Sort by <span className="text-foreground font-medium">lost per day</span>; buy the ones
        where <span className="text-success font-medium">vs avg</span> is negative.
      </p>
    </>
  );
}
