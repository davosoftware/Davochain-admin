'use client';

import { Fragment, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { correctBalance, decideTransaction, loadCustomers } from '@/app/actions/reconciliation';
import {
  REASON_TEXT,
  coinSummary,
  suggestCorrection,
  type CorrectionRow,
  type CustomerMismatches,
  type DriftRowLike,
} from '@/lib/reconciliation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCoin, relativeTime } from '@/lib/utils';

type Row = DriftRowLike & { ledgerTotal: string; lockedTotal: string; receivableTotal: string; heldInSubAccounts: string };
type Customer = CustomerMismatches['rows'][number];

const REASON_BADGE: Record<Customer['reason'], { label: string; variant: 'warning' | 'outline' | 'destructive' }> = {
  BEING_CHECKED: { label: 'Send being checked', variant: 'warning' },
  IN_PROGRESS: { label: 'Still going through', variant: 'outline' },
  UNEXPLAINED: { label: 'Not explained', variant: 'destructive' },
  UNREADABLE: { label: "Couldn't read", variant: 'outline' },
};

/** Put one customer's record right (owners only). The amount starts at what makes it match Quidax. */
function CorrectDialog({ asset, customer, onDone }: { asset: string; customer: Customer; onDone: () => void }) {
  const suggestion = suggestCorrection(customer);
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>(suggestion?.direction ?? 'CREDIT');
  const [amount, setAmount] = useState(suggestion?.amount ?? '');
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();

  const recorded = Number(customer.recorded);
  const delta = Number(amount || 0) * (direction === 'CREDIT' ? 1 : -1);
  const tooShort = reason.trim().length < 10;
  const coin = asset.toUpperCase();

  const save = () =>
    start(async () => {
      const r = await correctBalance({ userId: customer.userId, asset, direction, amount, reason: reason.trim() });
      if (r.error) {
        toast.error('Not corrected', { description: r.error });
        return;
      }
      toast.success(`${customer.name || customer.email}: ${coin} corrected`, { description: `Available ${r.before} → ${r.after}` });
      onDone();
    });

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onDone()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Correct {customer.name || customer.email}&apos;s {coin}
          </DialogTitle>
          <DialogDescription>
            This changes our records only. No coins move on Quidax. The customer sees it as &quot;Balance correction&quot;; your reason is
            kept in the audit log, not shown to them.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <div className="flex gap-2">
            {(['CREDIT', 'DEBIT'] as const).map((d) => (
              <Button key={d} type="button" size="sm" variant={direction === d ? 'default' : 'outline'} onClick={() => setDirection(d)} disabled={pending}>
                {d === 'CREDIT' ? 'Add to their balance' : 'Take from their balance'}
              </Button>
            ))}
          </div>
          <div className="grid gap-1.5">
            <Label>Amount ({coin})</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className="font-mono" disabled={pending} />
            {suggestion ? (
              <p className="text-muted-foreground t-caption">
                Suggested: {suggestion.direction === 'CREDIT' ? 'add' : 'take'} {suggestion.amount} so our record matches Quidax.
              </p>
            ) : null}
          </div>
          <div className="grid gap-1.5">
            <Label>Why? (at least 10 characters)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="e.g. Quidax shows the deposit arrived; our webhook was lost"
              disabled={pending}
            />
          </div>
          <p className="t-small">
            Our record: <span className="font-mono">{formatCoin(customer.recorded)}</span> →{' '}
            <span className="font-mono font-medium">{formatCoin(String(recorded + delta))}</span> · Quidax holds{' '}
            <span className="font-mono">{customer.held === null ? '—' : formatCoin(customer.held)}</span>
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending || tooShort || !(Number(amount) > 0)}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Correct the balance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Reconciliation: what customers own in our records against what Quidax holds,
 * in plain words, leading to the customers who don't match and, for owners,
 * the buttons that put it right.
 */
export function ReconciliationBoard({
  rows,
  corrections,
  isOwner,
  checkedAt,
}: {
  rows: Row[];
  corrections: CorrectionRow[];
  isOwner: boolean;
  checkedAt: string;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Record<string, CustomerMismatches>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<{ asset: string; customer: Customer } | null>(null);
  const [deciding, startDecide] = useTransition();

  // A2: a run that read only some customers is normal at scale; only a real difference needs attention.
  const broken = rows.filter((r) => !r.withinTolerance);

  const showCustomers = async (asset: string, force = false) => {
    if (open === asset && !force) return setOpen(null);
    setOpen(asset);
    if (customers[asset] && !force) return;
    setLoading(asset);
    const r = await loadCustomers(asset);
    setLoading(null);
    if (r.error) return void toast.error('Could not load the customers', { description: r.error });
    setCustomers((c) => ({ ...c, [asset]: r.data! }));
  };

  const decide = (asset: string, id: string, outcome: 'COMPLETED' | 'FAILED') =>
    startDecide(async () => {
      const note = globalThis.prompt(
        outcome === 'COMPLETED'
          ? 'It went through. What did you check? (at least 10 characters)'
          : 'It failed: the money goes back to the customer. What did you check? (at least 10 characters)',
      );
      if (!note?.trim()) return;
      const r = await decideTransaction(id, outcome, note.trim());
      if (r.error) {
        toast.error('Not decided', { description: r.error });
        return;
      }
      toast.success(outcome === 'COMPLETED' ? 'Marked as gone through' : 'Marked as failed; money returned');
      await showCustomers(asset, true);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-5">
      <div
        className={`flex flex-wrap items-start gap-3 rounded-lg border p-4 ${broken.length ? 'border-destructive/25 bg-destructive/5' : 'border-success/25 bg-success/5'}`}
      >
        {broken.length ? <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="t-small font-medium">
            {broken.length
              ? `${broken.length} ${broken.length === 1 ? 'coin needs' : 'coins need'} a look`
              : 'Everything matches: what customers own in our records equals what Quidax holds for them.'}
          </p>
          <p className="text-muted-foreground t-caption mt-1">
            Checked {relativeTime(checkedAt)}. The system also checks every 30 minutes on its own. A difference usually means a send is still being
            checked, a fee hasn&apos;t been collected yet, or something went wrong. Open a coin to see which customers.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => startRefresh(() => router.refresh())} disabled={refreshing}>
          {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Check again now
        </Button>
      </div>

      <div className="bg-card border-border/60 overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Coin</TableHead>
              <TableHead>In plain words</TableHead>
              <TableHead className="text-right">Customers own (our records)</TableHead>
              <TableHead className="text-right">Quidax holds</TableHead>
              <TableHead className="pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={5}>Nobody holds any coins yet, so there is nothing to compare.</TableEmpty>
            ) : (
              rows.map((row) => {
                const data = customers[row.asset];
                return (
                  <Fragment key={row.asset}>
                    <TableRow>
                      <TableCell className="pl-5 font-medium">{row.asset.toUpperCase()}</TableCell>
                      <TableCell className="t-small max-w-md">{coinSummary(row)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatCoin(String(Number(row.ledgerTotal) + Number(row.receivableTotal)))}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCoin(row.heldInSubAccounts)}</TableCell>
                      <TableCell className="pr-5 text-right">
                        <Button size="sm" variant={!row.withinTolerance ? 'default' : 'ghost'} onClick={() => showCustomers(row.asset)}>
                          {loading === row.asset ? <Loader2 className="size-3.5 animate-spin" /> : null}
                          {open === row.asset ? 'Hide customers' : 'See customers'}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {open === row.asset && data ? (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/30 p-4">
                          {data.rows.length === 0 ? (
                            <p className="text-muted-foreground t-small">Every customer holding {row.asset.toUpperCase()} matches.</p>
                          ) : (
                            <div className="grid gap-3">
                              {data.partial ? (
                                <p className="text-muted-foreground t-caption">
                                  Some accounts couldn&apos;t be read this time; check again before acting on them.
                                </p>
                              ) : null}
                              {data.rows.map((c) => (
                                <div key={c.userId} className="bg-card border-border/60 rounded-lg border p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <p className="t-small font-medium">{c.name || c.email}</p>
                                      <p className="text-muted-foreground t-caption">{c.email}</p>
                                    </div>
                                    <Badge variant={REASON_BADGE[c.reason].variant}>{REASON_BADGE[c.reason].label}</Badge>
                                  </div>
                                  <p className="t-small mt-2">
                                    Our record <span className="font-mono">{formatCoin(c.recorded)}</span> · Quidax holds{' '}
                                    <span className="font-mono">{c.held === null ? '—' : formatCoin(c.held)}</span> · Difference{' '}
                                    <span className="font-mono font-medium">{c.difference === null ? '—' : formatCoin(c.difference)}</span>
                                  </p>
                                  <p className="text-muted-foreground t-caption mt-1">{REASON_TEXT[c.reason]}</p>
                                  {c.open.length ? (
                                    <ul className="mt-2 grid gap-1.5">
                                      {c.open.map((t) => (
                                        <li key={t.id} className="t-small flex flex-wrap items-center gap-2">
                                          <Link href={`/transactions?search=${encodeURIComponent(c.email)}`} className="text-primary hover:underline">
                                            {t.type.toLowerCase()} · {t.status === 'RECONCILING' ? 'being checked' : t.status.toLowerCase()} ·{' '}
                                            {relativeTime(t.createdAt)}
                                          </Link>
                                          {isOwner && t.status === 'RECONCILING' ? (
                                            <>
                                              <Button size="sm" variant="outline" disabled={deciding} onClick={() => decide(row.asset, t.id, 'COMPLETED')}>
                                                It went through
                                              </Button>
                                              <Button size="sm" variant="outline" disabled={deciding} onClick={() => decide(row.asset, t.id, 'FAILED')}>
                                                It failed, give the money back
                                              </Button>
                                            </>
                                          ) : null}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : null}
                                  {isOwner && !c.unreadable ? (
                                    <div className="mt-3">
                                      <Button size="sm" onClick={() => setCorrecting({ asset: row.asset, customer: c })}>
                                        Correct the balance
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!isOwner ? (
        <p className="text-muted-foreground t-caption">Only an owner can decide a send or correct a balance. You can see everything.</p>
      ) : null}

      <div className="bg-card border-border/60 rounded-xl border p-5">
        <h2 className="t-section mb-1">Recent balance corrections</h2>
        <p className="text-muted-foreground t-caption mb-3">Every correction an owner made, newest first. Each is also in the audit log.</p>
        {corrections.length === 0 ? (
          <p className="text-muted-foreground t-small">None yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>What</TableHead>
                <TableHead>Why</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {corrections.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="t-small">{relativeTime(c.createdAt)}</TableCell>
                  <TableCell className="t-small">{c.name || c.email}</TableCell>
                  <TableCell className="t-small font-mono">
                    {c.direction === 'CREDIT' ? '+' : '−'}
                    {formatCoin(c.amount)} {c.asset?.toUpperCase()}
                  </TableCell>
                  <TableCell className="t-small text-muted-foreground max-w-sm">{c.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {correcting ? (
        <CorrectDialog
          key={`${correcting.asset}:${correcting.customer.userId}`}
          asset={correcting.asset}
          customer={correcting.customer}
          onDone={() => {
            const asset = correcting.asset;
            setCorrecting(null);
            void showCustomers(asset, true);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
