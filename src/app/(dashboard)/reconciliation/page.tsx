import { CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { DriftRow } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
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
import { formatCoin } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ReconciliationPage() {
  const rows = await api<DriftRow[]>('/v1/admin/reconciliation').catch((e: ApiError) => e);

  if (rows instanceof ApiError) {
    return (
      <>
        <PageHeader title="Reconciliation" />
        <ErrorState title="Could not run reconciliation" detail={rows.message} />
      </>
    );
  }

  const broken = rows.filter((r) => !r.withinTolerance);
  const partial = rows.some((r) => r.partial);

  return (
    <>
      <PageHeader
        title="Reconciliation"
        description="What users are owed, against what Quidax actually holds in their sub-accounts."
      />

      {broken.length === 0 ? (
        <div className="border-success/25 bg-success/5 mb-6 flex items-center gap-3 rounded-lg border p-4">
          <CheckCircle2 className="text-success size-4 shrink-0" />
          <p className="text-sm">
            <span className="text-success font-medium">Every asset reconciles.</span>{' '}
            <span className="text-muted-foreground">
              The ledger and the sub-account balances agree.
            </span>
          </p>
        </div>
      ) : (
        <div className="mb-6">
          <ErrorState
            title={`Drift on ${broken.map((b) => b.asset.toUpperCase()).join(', ')}`}
            detail="Either an unswept fee, an in-flight settlement, or a bug. Check the transactions for stuck legs first."
          />
        </div>
      )}

      {partial ? (
        <p className="text-muted-foreground mb-4 text-sm">
          Some sub-accounts could not be read this run, so drift is reported as inconclusive rather
          than as missing funds.
        </p>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Coin</TableHead>
                <TableHead className="text-right">Ledger</TableHead>
                <TableHead className="text-right">Locked</TableHead>
                <TableHead className="text-right">Unswept fees</TableHead>
                <TableHead className="text-right">Held in sub-accounts</TableHead>
                <TableHead className="text-right">Drift</TableHead>
                <TableHead className="pr-5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={7}>
                  Nothing held anywhere yet — no positions to reconcile.
                </TableEmpty>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.asset}>
                    <TableCell className="pl-5 font-medium">{row.asset.toUpperCase()}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatCoin(row.ledgerTotal)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right font-mono text-xs">
                      {formatCoin(row.lockedTotal)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right font-mono text-xs">
                      {formatCoin(row.receivableTotal)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatCoin(row.heldInSubAccounts)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-xs ${
                        row.withinTolerance ? 'text-muted-foreground' : 'text-destructive font-medium'
                      }`}
                    >
                      {formatCoin(row.drift)}
                    </TableCell>
                    <TableCell className="pr-5">
                      {row.partial ? (
                        <Badge variant="outline">inconclusive</Badge>
                      ) : row.withinTolerance ? (
                        <Badge variant="success">balanced</Badge>
                      ) : (
                        <Badge variant="destructive">drift</Badge>
                      )}
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
