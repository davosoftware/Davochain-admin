'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Search,
  SplitSquareHorizontal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  approveTrade,
  loadTrade,
  partiallyApproveTrade,
  rejectTrade,
} from '@/app/actions/giftcards';
import type { GiftCardTradeDetail, GiftCardTradeRow, GiftCardTradesPage } from '@/lib/types-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, formatNaira, relativeTime } from '@/lib/utils';
import { TIPS } from '@/lib/tips';
import { InfoTip } from '@/components/info-tip';

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PARTIALLY_APPROVED', label: 'Partially approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

/**
 * The card's face value, with its symbol.
 *
 * The symbol travels on the row from the API, so this screen holds no
 * code-to-symbol table of its own — adding a currency does not mean editing
 * the dashboard.
 */
const face = (t: { currencySymbol: string; faceValue: string }) =>
  `${t.currencySymbol}${Number(t.faceValue).toLocaleString()}`;

/** The API's path, through the proxy that can send the admin's cookie. */
const proxied = (apiPath: string) => apiPath.replace('/v1/admin/giftcards/', '/giftcard-image/');

function statusBadge(status: GiftCardTradeRow['status']) {
  switch (status) {
    case 'APPROVED':
      return <Badge variant="success">approved</Badge>;
    case 'PARTIALLY_APPROVED':
      return <Badge variant="warning">partially approved</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">rejected</Badge>;
    default:
      return <Badge variant="secondary">pending</Badge>;
  }
}

export function GiftCardTrades({
  data,
  canReview,
}: {
  data: GiftCardTradesPage;
  /** Without it the decision buttons are not drawn. The API refuses either way. */
  canReview: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<GiftCardTradeDetail | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const [query, setQuery] = useState(search);
  const [lastSearch, setLastSearch] = useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setQuery(search);
  }

  const go = (changes: Record<string, string | null>, keepPage = false) =>
    start(() => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      if (!keepPage) next.delete('page');
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });

  /**
   * Open one card.
   *
   * A separate call, because this is the only request that decrypts the
   * voucher code — and reading one is written to the audit log. Fetching it
   * with the list would mean auditing a read nobody made.
   */
  const inspect = async (row: GiftCardTradeRow) => {
    setLoading(row.id);
    const result = await loadTrade(row.id);
    setLoading(null);
    if (result.error || !result.data) {
      toast.error('Could not open that card', { description: result.error });
      return;
    }
    setOpen(result.data);
  };

  const pageCount = Math.max(Math.ceil(data.total / data.pageSize), 1);
  const first = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const last = Math.min(data.page * data.pageSize, data.total);

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Figure
          label="Waiting on you"
          value={data.waiting.toLocaleString()}
          hint={data.waiting ? 'cards nobody has decided yet' : 'nothing in the queue'}
          tone={data.waiting > 0 ? 'warning' : undefined}
          tip={TIPS.giftCards.waiting}
        />
        <Figure
          label="Paid out"
          value={formatNaira(data.totals.creditedNgn)}
          hint="credited to sellers"
          tip={TIPS.giftCards.paidOut}
        />
        {/*
          * Can be negative — a card cleared below the rate quoted lost money,
          * and that is exactly the number worth seeing.
          */}
        <Figure
          label="Margin"
          value={formatNaira(data.totals.profitNgn)}
          hint="what cards cleared at, less what was quoted"
          tone={Number(data.totals.profitNgn) < 0 ? 'destructive' : 'success'}
          tip={TIPS.giftCards.margin}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-md">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go({ search: query.trim() || null })}
            onBlur={() => query.trim() !== search && go({ search: query.trim() || null })}
            placeholder="Search by user or brand…"
            className="h-10 pl-9"
            aria-label="Search card trades"
          />
        </div>
        <select
          value={status}
          onChange={(e) => go({ status: e.target.value })}
          aria-label="Filter by status"
          className="border-input bg-card t-small hover:border-primary/40 focus-visible:ring-ring h-10 rounded-lg border px-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {search || status ? (
          <Button variant="ghost" size="sm" onClick={() => go({ search: null, status: null })}>
            <X className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-14 pl-5">S/No.</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Card</TableHead>
                <TableHead className="text-right">Voucher amount</TableHead>
                <TableHead className="text-right">They expect</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.length === 0 ? (
                <TableEmpty colSpan={10}>
                  {search || status ? (
                    'No card matches those filters.'
                  ) : (
                    <>
                      No cards have been submitted yet.
                      <span className="text-muted-foreground block">
                        They appear here the moment somebody offers one in the app.
                      </span>
                    </>
                  )}
                </TableEmpty>
              ) : (
                data.rows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    onClick={() => inspect(row)}
                    className="cursor-pointer"
                  >
                    <TableCell className="text-muted-foreground pl-5 tabular-nums">
                      {first + index}
                    </TableCell>
                    <TableCell>
                      {row.images.length > 0 ? (
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={proxied(row.images[0])}
                            alt=""
                            /* A card photo is a phone photo. Most rows are
                               below the fold on a 25-row page, and there is no
                               reason to pull megabytes for a 40px square
                               nobody has scrolled to. */
                            loading="lazy"
                            decoding="async"
                            className="border-border/60 bg-secondary/40 size-10 rounded-lg border object-cover"
                          />
                          {row.images.length > 1 ? (
                            <span className="bg-foreground text-background absolute -top-1 -right-1 rounded-full px-1.5 text-[10px] leading-4">
                              {row.images.length}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground t-caption">code only</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="t-small font-medium">{row.user.name || '—'}</p>
                      <p className="text-muted-foreground t-caption max-w-[13rem] truncate">
                        {row.user.email}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="t-small">{row.brand}</p>
                      <p className="text-muted-foreground t-caption">{row.type}</p>
                    </TableCell>
                    <TableCell className="t-small text-right tabular-nums whitespace-nowrap">
                      {face(row)}
                      <span className="text-muted-foreground t-caption block">
                        at {formatNaira(row.rateNgn, 0)} per {row.currencySymbol}1
                      </span>
                    </TableCell>
                    <TableCell className="t-small text-right tabular-nums whitespace-nowrap">
                      {formatNaira(row.expectedNgn)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                      {row.creditedNgn ? formatNaira(row.creditedNgn) : '—'}
                      {row.profitNgn ? (
                        <span
                          className={cn(
                            't-caption block font-normal',
                            Number(row.profitNgn) < 0 ? 'text-destructive' : 'text-success',
                          )}
                        >
                          {Number(row.profitNgn) < 0 ? '' : '+'}
                          {formatNaira(row.profitNgn, 0)} margin
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                    <TableCell className="text-muted-foreground t-caption whitespace-nowrap">
                      {relativeTime(row.createdAt)}
                    </TableCell>
                    <TableCell className="pr-5 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" loading={loading === row.id}>
                        {row.status === 'PENDING' && canReview ? 'Review' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        <div className="border-border/70 flex flex-wrap items-center justify-between gap-3 border-t p-3">
          <span className="text-muted-foreground t-caption">
            Showing {first.toLocaleString()} to {last.toLocaleString()} of{' '}
            {data.total.toLocaleString()} {data.total === 1 ? 'card' : 'cards'}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={data.page <= 1 || pending}
              onClick={() => go({ page: String(data.page - 1) }, true)}
            >
              <ChevronLeft className="size-3.5" />
              Prev
            </Button>
            <span className="t-caption px-2 tabular-nums">
              {data.page} of {pageCount}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={data.page >= pageCount || pending}
              onClick={() => go({ page: String(data.page + 1) }, true)}
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      <TradeDialog
        trade={open}
        canReview={canReview}
        onClose={() => setOpen(null)}
        onDone={() => {
          setOpen(null);
          router.refresh();
        }}
      />
    </>
  );
}

function Figure({
  label,
  value,
  hint,
  tone,
  tip,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'warning' | 'success' | 'destructive';
  tip: string;
}) {
  return (
    <div className="bg-card border-border/60 rounded-xl border p-4">
      <div className="flex items-center gap-1.5">
        <p className="eyebrow">{label}</p>
        <InfoTip text={tip} />
      </div>
      <p
        className={cn(
          't-title mt-1.5 tabular-nums',
          tone === 'warning' && 'text-warning',
          tone === 'destructive' && 'text-destructive',
        )}
      >
        {value}
      </p>
      <p className="text-muted-foreground t-caption mt-1 leading-tight">{hint}</p>
    </div>
  );
}

/**
 * One card, and the three decisions.
 *
 * The photographs and the code are the whole point of the screen: nobody can
 * decide anything without seeing what was actually sent.
 */
function TradeDialog({
  trade,
  canReview,
  onClose,
  onDone,
}: {
  trade: GiftCardTradeDetail | null;
  canReview: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<'view' | 'approve' | 'partial' | 'reject'>('view');
  const [pending, start] = useTransition();

  const [actualRate, setActualRate] = useState('');
  const [approvedValue, setApprovedValue] = useState('');
  const [approvedRate, setApprovedRate] = useState('');
  const [reason, setReason] = useState('');
  const [seeded, setSeeded] = useState<string | null>(null);

  if (trade && trade.id !== seeded) {
    setSeeded(trade.id);
    setMode('view');
    setActualRate('');
    setApprovedValue(String(Number(trade.faceValue)));
    setApprovedRate(String(Number(trade.rateNgn)));
    setReason('');
  }

  if (!trade) return null;

  const money = (v: string) => v.replace(/[^0-9.]/g, '');
  const decide = (fn: () => Promise<{ error?: string }>, done: string) =>
    start(async () => {
      const result = await fn();
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success(done);
      onDone();
    });

  const credited = Number(approvedValue) * Number(approvedRate);
  const partialMargin = Number(approvedValue) * (Number(actualRate) - Number(approvedRate));
  const fullMargin = Number(trade.faceValue) * (Number(actualRate) - Number(trade.rateNgn));

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {trade.brand} · {trade.type}
          </DialogTitle>
          <DialogDescription>
            {trade.user.name} · {face(trade)} at {formatNaira(trade.rateNgn, 0)} per{' '}
            {trade.currencySymbol}1
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          {trade.images.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {trade.images.map((src) => (
                <a
                  key={src}
                  href={proxied(src)}
                  target="_blank"
                  rel="noreferrer"
                  className="border-border/60 block overflow-hidden rounded-lg border"
                  title="Open full size"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proxied(src)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-32 w-auto object-cover"
                  />
                </a>
              ))}
            </div>
          ) : null}

          <VoucherCode trade={trade} />

          <dl className="border-border/70 grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-3">
            <Line label="They expect" value={formatNaira(trade.expectedNgn)} />
            <Line
              label="Paid"
              value={trade.creditedNgn ? formatNaira(trade.creditedNgn) : 'nothing yet'}
            />
            <Line
              label="Margin"
              value={trade.profitNgn ? formatNaira(trade.profitNgn) : '—'}
              tone={trade.profitNgn && Number(trade.profitNgn) < 0 ? 'destructive' : undefined}
            />
          </dl>

          {trade.reason ? (
            <p className="border-border/70 bg-secondary/40 t-caption rounded-md border p-2.5">
              <span className="text-muted-foreground">Reason shown to the user: </span>
              {trade.reason}
            </p>
          ) : null}

          {trade.status !== 'PENDING' ? (
            <p className="text-muted-foreground t-caption">
              Decided {trade.reviewedAt ? relativeTime(trade.reviewedAt) : ''}. Nothing further to
              do.
            </p>
          ) : !canReview ? (
            <p className="text-muted-foreground t-caption">
              You do not have the &ldquo;Approve or reject traded cards&rdquo; permission. An owner
              can grant it from the team screen.
            </p>
          ) : mode === 'view' ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setMode('approve')}>
                <Check className="size-3.5" />
                Approve
              </Button>
              <Button variant="outline" onClick={() => setMode('partial')}>
                <SplitSquareHorizontal className="size-3.5" />
                Partially approve
              </Button>
              <Button variant="ghost" onClick={() => setMode('reject')}>
                <X className="size-3.5" />
                Reject
              </Button>
            </div>
          ) : mode === 'approve' ? (
            <Panel
              title="Approve in full"
              onCancel={() => setMode('view')}
              onSubmit={() =>
                decide(() => approveTrade(trade.id, actualRate), 'Card approved and paid')
              }
              disabled={!(Number(actualRate) > 0)}
              pending={pending}
              submitLabel={`Pay ${formatNaira(trade.expectedNgn)}`}
            >
              <Money
                id="actual-rate"
                label="What you actually cleared it at"
                hint={`Naira per ${trade.currencySymbol}1. The seller is paid at the ${formatNaira(trade.rateNgn, 0)} they were quoted — this only sets the margin, and they never see it.`}
                value={actualRate}
                onChange={(v) => setActualRate(money(v))}
              />
              {Number(actualRate) > 0 ? (
                <Outcome
                  credited={Number(trade.expectedNgn)}
                  margin={fullMargin}
                />
              ) : null}
            </Panel>
          ) : mode === 'partial' ? (
            <Panel
              title="Partially approve"
              onCancel={() => setMode('view')}
              onSubmit={() =>
                decide(
                  () =>
                    partiallyApproveTrade(trade.id, {
                      approvedValue,
                      approvedRateNgn: approvedRate,
                      actualRateNgn: actualRate,
                      reason: reason.trim(),
                    }),
                  'Card partially approved and paid',
                )
              }
              disabled={
                !(
                  Number(approvedValue) > 0 &&
                  Number(approvedValue) <= Number(trade.faceValue) &&
                  Number(approvedRate) > 0 &&
                  Number(actualRate) > 0 &&
                  reason.trim() !== ''
                )
              }
              pending={pending}
              submitLabel={credited > 0 ? `Pay ${formatNaira(credited)}` : 'Pay'}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Money
                  id="approved-value"
                  label="What the card is really worth"
                  prefix={trade.currencySymbol}
                  hint={`They said ${face(trade)}. Cannot be more than that.`}
                  value={approvedValue}
                  onChange={(v) => setApprovedValue(money(v))}
                />
                <Money
                  id="approved-rate"
                  label="Rate to pay them at"
                  hint="Defaults to what they were quoted."
                  value={approvedRate}
                  onChange={(v) => setApprovedRate(money(v))}
                />
              </div>
              <Money
                id="partial-actual"
                label="What you actually cleared it at"
                hint="Sets the margin only. The seller never sees this."
                value={actualRate}
                onChange={(v) => setActualRate(money(v))}
              />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partial-reason">Why</Label>
                <textarea
                  id="partial-reason"
                  value={reason}
                  maxLength={500}
                  rows={2}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Card had $60 left, not $200."
                  className="border-input bg-card t-small hover:border-primary/40 focus-visible:ring-ring rounded-lg border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                />
                <p className="text-muted-foreground t-caption">
                  Shown to the seller word for word, on this card in their history.
                </p>
              </div>
              {Number(approvedValue) > 0 && Number(approvedRate) > 0 && Number(actualRate) > 0 ? (
                <Outcome credited={credited} margin={partialMargin} />
              ) : null}
            </Panel>
          ) : (
            <Panel
              title="Reject"
              onCancel={() => setMode('view')}
              onSubmit={() =>
                decide(() => rejectTrade(trade.id, reason.trim()), 'Card rejected')
              }
              disabled={reason.trim() === ''}
              pending={pending}
              submitLabel="Reject the card"
              destructive
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reject-reason">Why</Label>
                <textarea
                  id="reject-reason"
                  value={reason}
                  maxLength={500}
                  rows={2}
                  autoFocus
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="The code had already been redeemed."
                  className="border-input bg-card t-small hover:border-primary/40 focus-visible:ring-ring rounded-lg border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                />
                <p className="text-muted-foreground t-caption">
                  Shown to the seller word for word. No money moves.
                </p>
              </div>
            </Panel>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The voucher code, decrypted for this one view.
 *
 * Behind a click, because it is a bearer instrument: whoever reads it can
 * spend it, and it should not be sitting on screen behind somebody in an
 * office. Reading the trade at all is already in the audit log.
 */
function VoucherCode({ trade: t }: { trade: GiftCardTradeDetail }) {
  const [shown, setShown] = useState(false);

  if (!t.hasCode) return null;
  if (t.codeUnreadable) {
    return (
      <p className="border-destructive/25 bg-destructive/5 text-destructive t-caption rounded-md border p-2.5">
        A code was sent but could not be decrypted — the encryption key may have changed. Ask the
        seller to resend it.
      </p>
    );
  }

  return (
    <div className="border-border/70 flex items-center gap-2 rounded-md border p-2.5">
      <span className="text-muted-foreground t-caption shrink-0">Voucher code</span>
      {shown ? (
        <code className="t-small flex-1 truncate font-mono">{t.code}</code>
      ) : (
        <span className="text-muted-foreground t-small flex-1">••••••••••••</span>
      )}
      <Button variant="ghost" size="sm" onClick={() => setShown(!shown)}>
        {shown ? 'Hide' : 'Reveal'}
      </Button>
      {shown && t.code ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(t.code!);
            toast.success('Code copied');
          }}
        >
          <Copy className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

function Panel({
  title,
  children,
  onCancel,
  onSubmit,
  disabled,
  pending,
  submitLabel,
  destructive,
}: {
  title: string;
  children: React.ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  disabled: boolean;
  pending: boolean;
  submitLabel: string;
  destructive?: boolean;
}) {
  return (
    <div className="border-border/70 flex flex-col gap-3 rounded-lg border p-3">
      <p className="t-small font-medium">{title}</p>
      {children}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={disabled}
          loading={pending}
          variant={destructive ? 'destructive' : 'default'}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

/** What the numbers just typed will actually do, before anybody commits. */
function Outcome({ credited, margin }: { credited: number; margin: number }) {
  return (
    <div className="border-border/70 bg-secondary/40 t-caption flex flex-wrap gap-x-6 gap-y-1 rounded-md border p-2.5">
      <span>
        Seller is paid <strong>{formatNaira(credited)}</strong>
      </span>
      <span className={margin < 0 ? 'text-destructive' : 'text-success'}>
        {margin < 0 ? 'Loss' : 'Margin'} <strong>{formatNaira(Math.abs(margin))}</strong>
      </span>
    </div>
  );
}

function Money({
  id,
  label,
  hint,
  value,
  onChange,
  prefix = '₦',
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
          {prefix}
        </span>
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="tabular-nums"
          style={{ paddingLeft: `${1.5 + prefix.length * 0.4}rem` }}
        />
      </div>
      <p className="text-muted-foreground t-caption leading-tight">{hint}</p>
    </div>
  );
}

function Line({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'destructive';
}) {
  return (
    <div>
      <dt className="text-muted-foreground t-caption">{label}</dt>
      <dd className={cn('t-small font-medium tabular-nums', tone === 'destructive' && 'text-destructive')}>
        {value}
      </dd>
    </div>
  );
}
