'use client';

import { peerLine } from '@/lib/peer';
import { Fragment, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportTransactions, markDepositReturned, rejectDeposit, releaseDeposit } from '@/app/actions/transactions';
import { decideTransaction } from '@/app/actions/reconciliation';
import { completeLabel, decisionFor, type Decision } from '@/lib/transaction-decision';
import type { TxPage, TxRow, TxTab } from '@/lib/types-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DateRangeFilter } from '@/components/date-range-filter';
import { cn, formatCoin, formatNaira, formatUsd, relativeTime } from '@/lib/utils';
import { assetPath, humanType } from '@/lib/overview';

/**
 * One tab per kind of transaction, plus the queue of things waiting on a
 * person.
 *
 * Needs approval is not a type — it is a state a naira deposit gets stuck in —
 * but it earns a tab because it is the only view here where somebody has to do
 * something rather than look at something.
 */
const TABS: { tab: TxTab; label: string }[] = [
  { tab: 'ALL', label: 'All' },
  { tab: 'BUY', label: 'Buys' },
  { tab: 'SELL', label: 'Sells' },
  { tab: 'SWAP', label: 'Swaps' },
  { tab: 'DEPOSIT', label: 'Deposits' },
  { tab: 'WITHDRAWAL', label: 'Withdrawals' },
  { tab: 'APPROVAL', label: 'Needs approval' },
];

const STATUSES = [
  { value: '', label: 'All status' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'ON_HOLD', label: 'On hold' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'RECONCILING', label: 'Reconciling' },
];

const TYPES = [
  { value: '', label: 'All transaction types' },
  { value: 'BUY', label: 'Buy crypto' },
  { value: 'SELL', label: 'Sell crypto' },
  { value: 'SWAP', label: 'Coin swap' },
  { value: 'DEPOSIT', label: 'Deposit' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
];

const AMOUNT_TYPES = [
  { value: '', label: 'Money in or out' },
  { value: 'CREDIT', label: 'Money in (credit)' },
  { value: 'DEBIT', label: 'Money out (debit)' },
];

const MODES = [
  { value: '', label: 'Any mode of payment' },
  { value: 'BANK', label: 'Bank transfer' },
  { value: 'NGN_BALANCE', label: 'Naira balance' },
  { value: 'CHAIN', label: 'On-chain' },
  { value: 'INTERNAL', label: 'Internal' },
];

const PAGE_SIZES = [10, 25, 50, 100];

const TYPE_LABEL: Record<string, string> = {
  BUY: 'Buy crypto',
  SELL: 'Sell crypto',
  SWAP: 'Coin swap',
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  FEE_CLAIM: 'Fee claim',
  INTERNAL: 'Internal',
  GIFT_CARD: 'Gift card sale',
};

/** Money in the unit the row states, which may be naira, dollars or a coin. */
function money(value: string, unit: string): string {
  if (unit === 'NGN') return formatNaira(value);
  if (unit === 'USD') return formatUsd(value);
  return `${formatCoin(value)} ${unit}`;
}

/**
 * The pinned Actions column.
 *
 * A sticky cell needs its own background or the row scrolls underneath it. The
 * row's own tints are semi-transparent over the card, so repeating them on the
 * cell composites to exactly the same colour and the seam does not show —
 * which is why the hover tint is repeated here rather than inherited.
 */
const STICKY =
  'sticky right-0 z-10 pr-5 border-l border-border/60 ' +
  // The shadow is the affordance: without it the pinned column reads as the
  // end of the table rather than as something the rest slides under.
  'shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.18)] group-hover:bg-secondary/40';

function stamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TransactionsManager({
  data,
  canApprove,
  isOwner = false,
}: {
  data: TxPage;
  /** Without it the approval buttons are not rendered at all. */
  canApprove: boolean;
  /** Only an owner completes or rejects a waiting send, withdrawal or trade. */
  isOwner?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);

  const tab = (params.get('tab') as TxTab | null) ?? 'ALL';
  const status = params.get('status') ?? '';
  const type = params.get('type') ?? '';
  const amountType = params.get('amountType') ?? '';
  const mode = params.get('mode') ?? '';
  const search = params.get('search') ?? '';
  const from = params.get('from') ?? undefined;
  const to = params.get('to') ?? undefined;

  /*
   * The box follows the URL rather than the other way round, so Reset empties
   * it too. Adjusted during render, not in an effect — React re-runs this
   * component before touching the DOM, so there is no flash of the stale value.
   */
  const [query, setQuery] = useState(search);
  const [lastSearch, setLastSearch] = useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setQuery(search);
  }

  /** Everything lives in the URL, so a narrowed view is a link you can send. */
  const go = (changes: Record<string, string | null>, keepPage = false) =>
    start(() => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      // Page 4 of a narrower list is usually empty, which reads as "no results"
      // when the truth is "not on this page".
      if (!keepPage) next.delete('page');
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });

  const narrowed = Boolean(search || status || type || amountType || mode || from || to);
  const reset = () =>
    go({ search: null, status: null, type: null, amountType: null, mode: null, from: null, to: null });

  /** The money went back from the Payrep dashboard: an owner closes the deposit so it can't be released later. */
  const markReturned = (row: TxRow) =>
    start(async () => {
      const note = globalThis.prompt(
        `Mark this ₦${Number(row.total).toLocaleString()} deposit as returned to the sender outside DavoChain?\n\n` +
          'Only do this after you have sent it back from the Payrep dashboard. The deposit is closed and can no longer be released.\n\n' +
          'How was it returned (for the team, e.g. the Payrep reference)?',
      );
      if (!note?.trim()) return;
      setDeciding(row.id);
      const result = await markDepositReturned(row.id, note.trim());
      setDeciding(null);
      if (result.error) {
        toast.error('Could not mark it returned', { description: result.error });
        return;
      }
      toast.success('Deposit closed as returned', { description: 'The customer has been told.' });
      router.refresh();
    });

  const decide = (row: TxRow, action: 'release' | 'reject') =>
    start(async () => {
      let reason = '';
      if (action === 'reject') {
        const typed = globalThis.prompt(
          row.returnsToSender
            ? `The ₦${Number(row.total).toLocaleString()} goes back to the account it came from.\n\nReason (the customer sees this):`
            : `Why is this ₦${Number(row.total).toLocaleString()} deposit being refused?\n\nThe depositor is shown this exact text.`,
        );
        if (!typed?.trim()) return;
        reason = typed.trim();
      } else {
        /*
         * Two different decisions, so two different warnings.
         *
         * If their tier has since been raised, letting this through overrides
         * nothing — it is the deposit catching up with the limit. If the limit
         * still stands, releasing deliberately steps past a control that
         * exists for a reason, and the dialog should say so rather than
         * treating both cases as the same click.
         */
        const line = row.withinLimitsNow
          ? 'Their limits now cover this deposit, so nothing is being overridden.'
          : `This is still over their limit — ${row.limitReason ?? 'the cap that held it has not changed'}\n\nReleasing it anyway lets this deposit past that limit.`;

        if (
          !globalThis.confirm(
            `Release ₦${Number(row.total).toLocaleString()} to ${row.name}?\n\n` +
              `${line}\n\nTheir naira balance is credited immediately.`,
          )
        ) {
          return;
        }
      }

      setDeciding(row.id);
      const result =
        action === 'release' ? await releaseDeposit(row.id) : await rejectDeposit(row.id, reason);
      setDeciding(null);

      if (result.error) {
        toast.error(action === 'release' ? 'Could not release' : 'Could not reject', {
          description: result.error,
        });
        return;
      }
      if (action === 'reject' && row.returnsToSender) {
        toast.success(`Returning ₦${Number(row.total).toLocaleString()} to the sender`, {
          description: 'It finishes when Payrep confirms. The customer is told then.',
        });
        router.refresh();
        return;
      }
      toast.success(
        action === 'release'
          ? `₦${Number(row.total).toLocaleString()} credited to ${row.name}`
          : 'Deposit refused',
        {
          description:
            action === 'release'
              ? 'Their balance has been updated and they have been told.'
              : 'No money moved. The depositor has been told why.',
        },
      );
      router.refresh();
    });

  /**
   * An owner finishes a waiting buy, sell, swap or withdrawal by hand (29 Oct
   * 2026): complete it (the customer is credited) or reject it (the money goes
   * back). Both run the same once-only paths the automatic flow uses.
   */
  const resolve = (row: TxRow, outcome: 'COMPLETED' | 'FAILED') =>
    start(async () => {
      const typed =
        outcome === 'COMPLETED'
          ? globalThis.prompt(
              `${completeLabel(row)}?\n\nOnly do this after checking the provider (Quidax for coins, Payrep for naira) shows the money really moved — ` +
                'if it did not, our records would show money that is not there.\n\n' +
                'What did you check? (at least 10 characters, kept in the audit log)',
            )
          : globalThis.prompt(
              `Reject this ${row.type.toLowerCase()} and return the money to ${row.name}'s balance?\n\n` +
                'Only do this after checking the provider (Quidax for coins, Payrep for naira) shows nothing moved — if it did, they would be paid twice.\n\n' +
                'Reason (the customer sees this, at least 10 characters):',
            );
      if (!typed?.trim()) return;
      if (typed.trim().length < 10) {
        toast.error('Write a little more', { description: 'At least 10 characters, so the record explains itself.' });
        return;
      }
      setDeciding(row.id);
      const result = await decideTransaction(row.id, outcome, typed.trim());
      setDeciding(null);
      if (result.error) {
        toast.error(outcome === 'COMPLETED' ? 'Could not complete it' : 'Could not reject it', { description: result.error });
        return;
      }
      toast.success(outcome === 'COMPLETED' ? 'Completed' : 'Rejected and the money returned', {
        description: 'The customer has been told.',
      });
      router.refresh();
    });

  const download = async () => {
    setExporting(true);
    const result = await exportTransactions(params.toString());
    setExporting(false);

    if (result.error || !result.csv) {
      toast.error('Could not export', { description: result.error });
      return;
    }
    if (result.rows === 0) {
      toast.error('Nothing to export', { description: 'No transaction matches the filters.' });
      return;
    }

    // A BOM, so Excel opens it as UTF-8 and the naira sign is a naira sign.
    const blob = new Blob([`﻿${result.csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename ?? 'transactions.csv';
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`${(result.rows ?? 0).toLocaleString()} transactions exported`, {
      description: result.truncated
        ? 'Capped at 10,000 rows — narrow the date range to get the rest.'
        : undefined,
    });
  };

  const pageCount = Math.max(Math.ceil(data.total / data.pageSize), 1);
  const firstOnPage = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const lastOnPage = Math.min(data.page * data.pageSize, data.total);

  return (
    <>
      {/* The one thing on this screen that must never be missed. */}
      {data.stuck > 0 ? (
        <div className="border-warning/30 bg-warning/5 mb-5 flex items-start gap-3 rounded-lg border p-4">
          <ShieldAlert className="text-warning mt-0.5 size-4 shrink-0" />
          <div>
            <p className="t-small font-medium">
              {data.stuck} transaction{data.stuck === 1 ? '' : 's'} waiting for a check (&quot;reconciling&quot;)
            </p>
            <p className="text-muted-foreground t-caption mt-0.5">
              The provider did not give a clear answer, so we do not know yet whether the money moved.
              It is held on purpose while our system keeps asking. <strong>Do not refund these by
              hand</strong>: if the money did move, the customer would be paid twice.{' '}
              {/* Keeps the other filters, so one customer's history stays on that customer. */}
              <Link
                href={`${pathname}?${new URLSearchParams({ ...Object.fromEntries(params), status: 'RECONCILING', page: '1' })}`}
                className="text-primary hover:underline"
              >
                Show them
              </Link>
            </p>
          </div>
        </div>
      ) : null}

      {/* ── which kind ───────────────────────────────────── */}
      <div className="bg-muted/80 border-border/50 mb-5 flex w-fit max-w-full flex-wrap gap-1 overflow-x-auto rounded-lg border p-1">
        {TABS.map(({ tab: value, label }) => {
          const on = value === tab;
          const next = new URLSearchParams(params.toString());
          if (value === 'ALL') next.delete('tab');
          else next.set('tab', value);
          next.delete('page');

          // A type with no transactions still shows 0. An absent badge reads as
          // "not counted", which is a different thing from "none".
          const count = value === 'APPROVAL' ? data.awaiting : (data.counts[value] ?? 0);
          const waiting = value === 'APPROVAL' && data.awaiting > 0;

          return (
            <Link
              key={value}
              href={`${pathname}?${next}`}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 transition-all',
                on ? 'bg-card shadow-xs' : 'hover:bg-card/60',
              )}
            >
              <span
                className={cn('t-small', on ? 'text-foreground font-medium' : 'text-muted-foreground')}
              >
                {label}
              </span>
              {value !== 'ALL' ? (
                <Badge variant={waiting ? 'warning' : 'outline'} className="tabular-nums">
                  {count}
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </div>

      {/* ── narrowing it ─────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go({ search: query.trim() || null })}
            onBlur={() => query.trim() !== search && go({ search: query.trim() || null })}
            placeholder="Search name, email or transaction ID"
            className="h-10 pl-9"
            aria-label="Search transactions by name, email or transaction ID"
          />
        </div>

        <Select value={status} onChange={(v) => go({ status: v })} options={STATUSES} label="Filter by status" />
        {/* Redundant once a tab has already fixed the type. */}
        {tab === 'ALL' ? (
          <Select value={type} onChange={(v) => go({ type: v })} options={TYPES} label="Filter by transaction type" />
        ) : null}
        <Select
          value={amountType}
          onChange={(v) => go({ amountType: v })}
          options={AMOUNT_TYPES}
          label="Filter by amount type"
        />
        <Select value={mode} onChange={(v) => go({ mode: v })} options={MODES} label="Filter by mode of payment" />

        <DateRangeFilter
          from={from}
          to={to}
          placeholder="Select date range"
          onChange={(nextFrom, nextTo) => go({ from: nextFrom, to: nextTo })}
        />

        <div className="ml-auto flex items-center gap-2">
          {narrowed ? (
            <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground hover:text-foreground">
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={download} disabled={exporting}>
            {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => start(() => router.refresh())}>
            <RefreshCw className={cn('size-3.5', pending && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 pl-5">S/No.</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>In / out</TableHead>
                <TableHead>Mode of payment</TableHead>
                <TableHead>Created On</TableHead>
                <TableHead>Status</TableHead>
                {/* Pinned. Thirteen columns do not fit on most screens, and an
                    approval you have to scroll sideways to reach is one that
                    gets missed. */}
                <TableHead className={cn(STICKY, 'bg-card text-right')}>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.rows.length === 0 ? (
                <TableEmpty colSpan={13}>
                  <EmptyReason tab={tab} narrowed={narrowed} />
                </TableEmpty>
              ) : (
                data.rows.map((row, index) => {
                  const isOpen = open === row.id;
                  const busy = deciding === row.id;

                  return (
                    /* The key belongs on what the map returns, not on the row
                       inside it — otherwise React cannot match rows across a
                       filter and an expanded panel can reattach to a different
                       transaction than the one it was opened for. */
                    <Fragment key={row.id}>
                      <TableRow
                        onClick={() => setOpen(isOpen ? null : row.id)}
                        className={cn('group cursor-pointer', isOpen && 'bg-secondary/50')}
                      >
                        <TableCell className="text-muted-foreground pl-5 tabular-nums">
                          {firstOnPage + index}
                        </TableCell>
                        <TableCell className="t-small font-medium whitespace-nowrap">
                          {row.name || '—'}
                          {peerLine(row) ? (
                            <span className="text-muted-foreground t-caption block font-normal">{peerLine(row)}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground t-small max-w-[11rem] truncate">
                          {row.email}
                        </TableCell>
                        <TableCell>
                          <span
                            title={row.reference}
                            className="border-border/70 bg-secondary/40 t-caption inline-block max-w-[10rem] truncate rounded-md border px-2 py-0.5 font-mono"
                          >
                            {row.reference}
                          </span>
                        </TableCell>
                        <TableCell className="t-small text-right tabular-nums whitespace-nowrap">
                          {money(row.total, row.unit)}
                        </TableCell>
                        <TableCell className="t-small text-right tabular-nums whitespace-nowrap">
                          {money(row.amount, row.unit)}
                        </TableCell>
                        <TableCell className="text-muted-foreground t-small text-right tabular-nums whitespace-nowrap">
                          {money(row.fee, row.unit)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="t-small">{TYPE_LABEL[row.type] ?? humanType(row.type)}</span>
                          <span className="text-muted-foreground t-caption block font-mono">
                            {assetPath(row.fromAsset, row.toAsset) || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={row.amountType === 'CREDIT' ? 'success' : 'outline'}
                            title={row.amountType === 'CREDIT' ? 'Credit: money into the customer’s account' : 'Debit: money out of the customer’s account'}
                          >
                            {row.amountType === 'CREDIT' ? 'Money in' : row.amountType === 'DEBIT' ? 'Money out' : row.amountType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground t-small whitespace-nowrap">
                          {row.modeLabel}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="t-small">{stamp(row.createdAt)}</span>
                          <span className="text-muted-foreground t-caption block">
                            {relativeTime(row.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StatusBadge status={row.status} />
                          {/* Whether the reason it was held still applies. A
                              deposit whose depositor has since been raised a
                              tier can be let through without overriding
                              anything — which is a different decision from
                              waving one past a limit that still stands. */}
                          {row.needsApproval && row.withinLimitsNow !== null ? (
                            <span
                              title={row.limitReason ?? 'Now inside their limits'}
                              className={cn(
                                't-caption mt-0.5 block',
                                row.withinLimitsNow ? 'text-success' : 'text-warning',
                              )}
                            >
                              {row.withinLimitsNow ? 'within limits now' : 'still over limit'}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell
                          className={cn(
                            STICKY,
                            'text-right whitespace-nowrap',
                            isOpen ? 'bg-secondary/50' : 'bg-card',
                          )}
                        >
                          {row.needsApproval && canApprove ? (
                            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" loading={busy} onClick={() => decide(row, 'release')}>
                                <Check className="size-3.5" />
                                Release
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => decide(row, 'reject')}
                              >
                                <X className="size-3.5" />
                                Reject
                              </Button>
                              {row.returnsToSender && (
                                <Button variant="ghost" size="sm" disabled={busy} onClick={() => markReturned(row)}>
                                  Mark returned
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground t-caption">
                              {isOpen ? 'Hide' : 'Details'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>

                      {isOpen ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={13} className="bg-secondary/30 p-0">
                            {/* Sized to the visible width, not the table's,
                                and pinned to the left edge — so the panel is
                                whole however far the columns are scrolled. */}
                            <div className="sticky left-0 w-[100cqw]">
                              <Detail
                                row={row}
                                decision={decisionFor(row, { canApprove, isOwner })}
                                busy={busy}
                                onDeposit={(action) => decide(row, action)}
                                onResolve={(outcome) => resolve(row, outcome)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* ── paging ─────────────────────────────────────── */}
        <div className="border-border/70 flex flex-wrap items-center justify-between gap-3 border-t p-3">
          <div className="text-muted-foreground t-caption flex items-center gap-2">
            <span>
              Showing {firstOnPage.toLocaleString()} to {lastOnPage.toLocaleString()} of{' '}
              {data.total.toLocaleString()} {data.total === 1 ? 'record' : 'records'}
            </span>
            <select
              value={String(data.pageSize)}
              onChange={(e) => go({ pageSize: e.target.value })}
              aria-label="Rows per page"
              className="border-input bg-card t-caption hover:border-primary/40 focus-visible:ring-ring rounded-md border px-2 py-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>

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

            {pageWindow(data.page, pageCount).map((n, i) =>
              n === null ? (
                <span key={`gap-${i}`} className="text-muted-foreground t-caption px-1">
                  …
                </span>
              ) : (
                <Button
                  key={n}
                  variant={n === data.page ? 'default' : 'ghost'}
                  size="sm"
                  disabled={pending}
                  onClick={() => go({ page: String(n) }, true)}
                  className="min-w-8 tabular-nums"
                  aria-current={n === data.page ? 'page' : undefined}
                >
                  {n}
                </Button>
              ),
            )}

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
    </>
  );
}

/**
 * What the table cannot show: the settlement legs, what Quidax said, and why a
 * transaction stopped where it did.
 */
function Detail({
  row,
  decision,
  busy,
  onDeposit,
  onResolve,
}: {
  row: TxRow;
  decision: Decision | null;
  busy: boolean;
  onDeposit: (action: 'release' | 'reject') => void;
  onResolve: (outcome: 'COMPLETED' | 'FAILED') => void;
}) {
  const stuck = row.status === 'RECONCILING';

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-3">
      {decision ? (
        <div className="border-border/70 bg-card flex flex-wrap items-center gap-3 rounded-lg border p-3 lg:col-span-3">
          <p className="t-small min-w-0 flex-1">
            {decision === 'DEPOSIT'
              ? 'This deposit is waiting for a decision. Credit it to the customer now, or reject it with a reason they will see.'
              : decision === 'WAITING'
                ? 'This is still waiting. After checking the provider (Quidax for coins, Payrep for naira), complete it (the customer is credited) or reject it with a reason (the money goes back to their balance).'
                : 'This is still waiting. Only an owner can complete or reject it by hand.'}
          </p>
          {decision === 'DEPOSIT' ? (
            <div className="flex gap-2">
              <Button size="sm" loading={busy} onClick={() => onDeposit('release')}>
                <Check className="size-3.5" />
                Credit customer now
              </Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => onDeposit('reject')}>
                <X className="size-3.5" />
                Reject with reason
              </Button>
            </div>
          ) : decision === 'WAITING' ? (
            <div className="flex gap-2">
              <Button size="sm" loading={busy} onClick={() => onResolve('COMPLETED')}>
                <Check className="size-3.5" />
                {completeLabel(row)}
              </Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => onResolve('FAILED')}>
                <X className="size-3.5" />
                Reject with reason
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div>
        <p className="eyebrow mb-2">Movement</p>
        <dl className="t-small flex flex-col gap-1.5">
          <Line label="Out" value={row.fromAmount ? `${formatCoin(row.fromAmount)} ${row.fromAsset?.toUpperCase() ?? ''}` : '—'} />
          <Line label="In" value={row.toAmount ? `${formatCoin(row.toAmount)} ${row.toAsset?.toUpperCase() ?? ''}` : '—'} />
          <Line label="Our fee" value={money(row.fee, row.unit)} />
          {/* A cost we paid out, never revenue — kept apart from our fee. */}
          {row.networkFee && Number(row.networkFee) > 0 ? (
            <Line
              label="Network fee"
              value={`${formatCoin(row.networkFee)} ${row.fromAsset?.toUpperCase() ?? ''}`}
              hint="taken by the chain"
            />
          ) : null}
          <Line label="Settled from" value={row.settledFrom === 'FALLBACK_SWAP' ? 'fallback swap' : (row.settledFrom ?? '—')} />
        </dl>
      </div>

      <div>
        <p className="eyebrow mb-2">Settlement</p>
        {row.legs.length === 0 ? (
          <p className="text-muted-foreground t-small">No legs — nothing was settled in parts.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {row.legs.map((leg, i) => (
              <li key={i} className="t-small flex items-center gap-2">
                <span
                  className={cn(
                    'size-2 shrink-0 rounded-full',
                    leg.state === 'CONFIRMED'
                      ? 'bg-success'
                      : leg.state === 'FAILED'
                        ? 'bg-destructive'
                        : leg.state === 'UNKNOWN'
                          ? 'bg-warning'
                          : 'bg-muted-foreground/40',
                  )}
                />
                <span className="font-medium">{leg.kind}</span>
                <span className="text-muted-foreground">{leg.state.toLowerCase()}</span>
                <span className="text-muted-foreground ml-auto font-mono text-xs">
                  {formatCoin(leg.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {row.legs.some((l) => l.lastError) ? (
          <p className="text-muted-foreground t-caption mt-2">
            {row.legs.find((l) => l.lastError)?.lastError}
          </p>
        ) : null}
      </div>

      <div>
        <p className="eyebrow mb-2">Record</p>
        <dl className="t-small flex flex-col gap-1.5">
          <Line label="Reference" value={row.reference} mono />
          <Line label="Upstream said" value={row.quidaxRawStatus ?? '—'} />
          <Line label="Created" value={stamp(row.createdAt)} />
          <Line label="Completed" value={row.completedAt ? stamp(row.completedAt) : '—'} />
          {row.reviewedBy ? (
            <Line
              label="Decided by"
              value={`${row.reviewedBy}${row.reviewedAt ? ` · ${stamp(row.reviewedAt)}` : ''}`}
            />
          ) : null}
        </dl>

        {row.failureReason ? (
          <p
            className={cn(
              't-caption mt-3 rounded-md border p-2',
              row.needsApproval
                ? 'border-warning/25 bg-warning/5 text-warning'
                : 'border-destructive/25 bg-destructive/5 text-destructive',
            )}
          >
            {row.failureReason}
          </p>
        ) : null}

        {/* Why it was held is history; whether it would be held TODAY is what
            the person deciding needs. Shown only when it says something the
            line above does not — otherwise it is the same sentence twice. */}
        {row.needsApproval &&
        row.withinLimitsNow !== null &&
        (row.withinLimitsNow || row.limitReason !== row.failureReason) ? (
          <p
            className={cn(
              't-caption mt-2 rounded-md border p-2',
              row.withinLimitsNow
                ? 'border-success/25 bg-success/5 text-success'
                : 'border-border/70 text-muted-foreground',
            )}
          >
            {row.withinLimitsNow
              ? 'Checked just now: this is inside their limits today. Releasing it overrides nothing.'
              : `Checked just now: ${row.limitReason}`}
          </p>
        ) : null}

        {stuck ? (
          <p className="border-warning/25 bg-warning/5 text-warning t-caption mt-3 flex gap-2 rounded-md border p-2">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              The outcome is unknown and the funds are deliberately locked. A worker is polling
              Quidax. Only complete or reject it by hand after checking Quidax yourself.
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Line({
  label,
  value,
  hint,
  mono,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className={cn('truncate text-right', mono && 'font-mono text-xs')} title={value}>
        {value}
        {hint ? <span className="text-muted-foreground ml-1.5 t-caption">{hint}</span> : null}
      </dd>
    </div>
  );
}

/** At most seven page buttons. A hundred is a wall, not a control. */
function pageWindow(page: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);

  const pages = new Set([1, count, page]);
  for (const offset of [-1, 1]) {
    const n = page + offset;
    if (n > 1 && n < count) pages.add(n);
  }
  while (pages.size < 5) {
    const sorted = [...pages].sort((a, b) => a - b);
    const next = sorted.find((n) => n > 1 && !pages.has(n + 1) && n + 1 < count);
    if (next === undefined) break;
    pages.add(next + 1);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}

function EmptyReason({ tab, narrowed }: { tab: TxTab; narrowed: boolean }) {
  if (narrowed) return <>No transaction matches those filters.</>;
  if (tab === 'APPROVAL') {
    return (
      <>
        Nothing is waiting.
        <span className="text-muted-foreground block">
          Naira deposits appear here when they arrive over the depositor’s tier limit — the money has
          landed, but their balance does not move until somebody says it may.
        </span>
      </>
    );
  }
  return <>Nothing here yet.</>;
}

function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={cn(
        'border-input bg-card t-small h-10 rounded-lg border px-3 transition-colors',
        'hover:border-primary/40 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
