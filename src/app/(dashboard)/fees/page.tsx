import { api, ApiError } from '@/lib/api';
import type { ClaimableRow } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { Stat } from '@/components/stat';
import { TIPS } from '@/lib/tips';
import { ClaimButton } from '@/components/claim-button';
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
import { formatCoin, formatPercent, formatUsd } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function FeesPage() {
  const rows = await api<ClaimableRow[]>('/v1/admin/fees/claimable').catch((e: ApiError) => e);

  if (rows instanceof ApiError) {
    return (
      <>
        <PageHeader title="Fee claims" />
        <ErrorState title="Could not load claimable fees" detail={rows.message} />
      </>
    );
  }

  const accrued = rows.reduce((s, r) => s + Number(r.accruedUsd), 0);
  const current = rows.reduce((s, r) => s + Number(r.currentUsd), 0);
  const calls = rows.reduce((s, r) => s + r.estimatedCalls, 0);
  const drift = accrued > 0 ? ((current - accrued) / accrued) * 100 : 0;

  return (
    <>
      <PageHeader
        title="Fee claims"
        description="Swap fees accrue in the coin they were charged in. Claiming converts them to USDT and moves them to the main wallet."
        action={rows.length > 0 ? <ClaimButton assets={rows.map((r) => r.asset)} /> : undefined}
      />

      <Card className="mb-6">
        <CardContent className="grid grid-cols-2 gap-6 p-5 lg:grid-cols-4">
          <Stat label="Accrued at charge" value={formatUsd(accrued)} hint="what the books expect" tip={TIPS.fees.accrued} />
          <Stat
            label="Worth now"
            value={formatUsd(current)}
            hint="what claiming today realises"
            tip={TIPS.fees.worthNow}
            tone={drift < -2 ? 'warning' : 'default'}
          />
          <Stat
            label="Drift"
            value={formatPercent(drift)}
            hint="held in coin until claimed"
            tip={TIPS.fees.drift}
            tone={drift < 0 ? 'warning' : 'success'}
          />
          <Stat label="Upstream calls" value={calls} hint="throttled, runs in the background" tip={TIPS.fees.calls} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Coin</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Held</TableHead>
                <TableHead className="text-right">Accrued</TableHead>
                <TableHead className="text-right">Worth now</TableHead>
                <TableHead className="text-right">Drift</TableHead>
                <TableHead className="text-right">Direct</TableHead>
                <TableHead className="text-right">Convert</TableHead>
                <TableHead className="pr-5 text-right">Calls</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={9}>
                  Nothing to claim. Swap fees appear here as users trade coin to coin.
                </TableEmpty>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.asset}>
                    <TableCell className="pl-5 font-medium">{row.asset.toUpperCase()}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{row.users}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatCoin(row.held)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right font-mono text-xs">
                      {formatUsd(row.accruedUsd)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatUsd(row.currentUsd)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-xs ${
                        Number(row.driftPct) < 0 ? 'text-warning' : 'text-muted-foreground'
                      }`}
                    >
                      {formatPercent(row.driftPct)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right font-mono text-xs">
                      {row.direct}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right font-mono text-xs">
                      {row.convert}
                    </TableCell>
                    <TableCell className="pr-5 text-right font-mono text-xs">
                      {row.estimatedCalls}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
