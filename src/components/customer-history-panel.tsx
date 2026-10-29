import Link from 'next/link';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { differenceLabel, historyHref, problemCount, verdictInfo, type CustomerCheck } from '@/lib/customer-history';

const QUIDAX_LINE: Record<CustomerCheck['quidax'], string> = {
  READ: 'Read from Quidax just now.',
  UNREADABLE: 'Quidax could not be read just now, so its column is empty. Refresh to try again.',
  NO_ACCOUNT: 'This customer has no Quidax account yet, so there is nothing there to compare.',
};

/**
 * Above one customer's history (29 Oct 2026): who it is, a coin filter, and
 * every coin compared three ways, so a discrepancy can be traced to the side
 * that is wrong before anyone corrects a balance.
 */
export function CustomerHistoryPanel({
  userId,
  asset,
  who,
  check,
  checkError,
}: {
  userId: string;
  asset: string | null;
  who: { name: string; email: string } | null;
  /** Null without the "reconciliation" permission, or when it could not load. */
  check: CustomerCheck | null;
  checkError: string | null;
}) {
  const coins = check?.rows.map((r) => r.asset) ?? [];
  if (asset && !coins.includes(asset)) coins.push(asset);
  const problems = check ? problemCount(check) : 0;

  return (
    <div className="mb-6 space-y-4">
      <div className="bg-primary/5 border-primary/20 flex flex-wrap items-center gap-3 rounded-lg border p-4">
        <div className="min-w-0 flex-1">
          <p className="t-small font-medium">
            History for {who?.name || 'this customer'}
            {who?.email ? <span className="text-muted-foreground font-normal"> · {who.email}</span> : null}
          </p>
          <p className="text-muted-foreground t-caption mt-0.5">
            Every trade, send, receive, deposit and withdrawal of theirs. Open a row to see each step at
            Quidax, its reference and any error. Export CSV downloads just this customer.
          </p>
        </div>
        <Link href="/transactions" className="text-muted-foreground hover:text-foreground t-small flex items-center gap-1">
          <X className="size-3.5" />
          Show all customers
        </Link>
      </div>

      {coins.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground t-caption mr-1">Coin:</span>
          {[null, ...coins].map((code) => {
            const on = (code ?? null) === (asset ?? null);
            return (
              <Link
                key={code ?? 'all'}
                href={historyHref(userId, code ?? undefined)}
                className={cn(
                  't-small rounded-md border px-2.5 py-1 transition-colors',
                  on ? 'bg-card border-primary/40 text-foreground font-medium' : 'text-muted-foreground hover:bg-card/60',
                )}
              >
                {code ? code.toUpperCase() : 'All'}
              </Link>
            );
          })}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {check && problems === 0 ? <CheckCircle2 className="text-success size-4" /> : null}
            {problems > 0 ? <AlertTriangle className="text-destructive size-4" /> : null}
            Balance check
          </CardTitle>
          <CardDescription>
            For each coin: their balance, the same balance added up again from every entry in our records,
            and what Quidax really holds for them. If the first two differ, our records disagree with each
            other. If ours differ from Quidax with nothing still going, the money and our records disagree.
            {check ? ` ${QUIDAX_LINE[check.quidax]}` : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!check ? (
            <p className="text-muted-foreground t-small px-5 pb-5">
              {checkError ?? 'Your account does not have the "Reconciliation" permission, so the balance check is hidden.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Coin</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Locked</TableHead>
                  <TableHead className="text-right">Added up from records</TableHead>
                  <TableHead className="text-right">Fees not yet collected</TableHead>
                  <TableHead className="text-right">Quidax holds</TableHead>
                  <TableHead>Difference</TableHead>
                  <TableHead className="pr-5">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {check.rows.length === 0 ? (
                  <TableEmpty colSpan={8}>Nothing held, recorded or in progress for this customer.</TableEmpty>
                ) : (
                  check.rows.map((r) => {
                    const v = verdictInfo(r.verdict);
                    return (
                      <TableRow key={r.asset}>
                        <TableCell className="pl-5 font-medium">
                          <Link href={historyHref(userId, r.asset)} className="hover:underline">
                            {r.asset.toUpperCase()}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.available}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.locked}</TableCell>
                        <TableCell className={cn('text-right tabular-nums', !r.entriesMatch && 'text-destructive font-medium')}>
                          {r.fromEntries}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.uncollectedFees}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.held ?? (r.asset === 'ngn' ? 'Not at Quidax' : '—')}</TableCell>
                        <TableCell className="t-small">{differenceLabel(r.difference, r.asset)}</TableCell>
                        <TableCell className="pr-5">
                          <Badge variant={v.tone}>{v.label}</Badge>
                          {r.open.length ? (
                            <p className="text-muted-foreground t-caption mt-1">
                              {r.open.length} still going: {r.open.map((t) => `${t.type.toLowerCase()} (${t.status.toLowerCase()})`).join(', ')}
                            </p>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
