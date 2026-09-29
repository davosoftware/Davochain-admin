'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportEarnings } from '@/app/actions/earnings';
import type { EarningCurrency, EarningKind, EarningsPage } from '@/lib/types-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { cn, formatNaira, formatUsd, relativeTime } from '@/lib/utils';

/**
 * One tab per fee ladder, named after the ladder that earned it.
 *
 * Deliberately the same four names as the Fees section of the sidebar: seeing
 * "Swap fee" earn ₦0 and knowing exactly which screen sets it is the whole
 * point of naming them the same thing twice.
 */
const TABS: {
  kind: EarningKind | null;
  label: string;
  /** The currency this ladder charges in, or null where a tab mixes both. */
  currency: EarningCurrency | null;
  ladder: string | null;
}[] = [
  { kind: null, label: 'All earnings', currency: null, ladder: null },
  { kind: 'RATE', label: 'Buy & sell', currency: 'NGN', ladder: '/rates' },
  { kind: 'SWAP', label: 'Swaps', currency: 'USD', ladder: '/swap-fees' },
  { kind: 'WITHDRAWAL', label: 'Crypto withdrawals', currency: 'USD', ladder: '/withdrawal-fees' },
  {
    kind: 'NGN_WITHDRAWAL',
    label: 'Naira withdrawals',
    currency: 'NGN',
    ladder: '/ngn-withdrawal-fees',
  },
  // Not a fee ladder — the margin between what a card cleared at and what the
  // seller was quoted. The rate that produces it is set per card type.
  { kind: 'GIFT_CARD', label: 'Gift cards', currency: 'NGN', ladder: '/giftcards/types' },
];

const TYPES = [
  { value: '', label: 'All transaction types' },
  { value: 'BUY', label: 'Buy crypto' },
  { value: 'SELL', label: 'Sell crypto' },
  { value: 'SWAP', label: 'Coin swap' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
];

const CURRENCIES = [
  { value: '', label: 'Any currency' },
  { value: 'NGN', label: 'Charged in NGN' },
  { value: 'USD', label: 'Charged in USD' },
];

const PAGE_SIZES = [10, 25, 50, 100];

const TYPE_LABEL: Record<string, string> = {
  BUY: 'Buy crypto',
  SELL: 'Sell crypto',
  SWAP: 'Coin swap',
  WITHDRAWAL: 'Withdrawal',
  GIFT_CARD: 'Gift card',
};

/** Which ladder to go and change, when a figure looks wrong. */
const KIND_LABEL: Record<EarningKind, string> = {
  RATE: 'Buy & sell rate fee',
  SWAP: 'Swap fee',
  WITHDRAWAL: 'Crypto withdrawal fee',
  NGN_WITHDRAWAL: 'Naira withdrawal fee',
  GIFT_CARD: 'gift card rates',
};

const money = (value: string, currency: EarningCurrency) =>
  currency === 'NGN' ? formatNaira(value) : formatUsd(value);

function stamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EarningsManager({ data }: { data: EarningsPage }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [exporting, setExporting] = useState(false);

  const kind = (params.get('kind') as EarningKind | null) ?? null;
  const currency = params.get('currency') ?? '';
  const type = params.get('type') ?? '';
  const search = params.get('search') ?? '';
  const from = params.get('from') ?? undefined;
  const to = params.get('to') ?? undefined;
  const sort = params.get('sort') ?? 'createdAt';
  const direction = params.get('direction') ?? 'desc';

  /*
   * The box follows the URL, not the other way round.
   *
   * Otherwise "Clear filters" leaves the last search sitting in the box,
   * describing a list it no longer narrows. Adjusted during render rather than
   * in an effect — React re-runs this component before touching the DOM, so
   * there is no flash of the stale value and no second paint.
   */
  const [query, setQuery] = useState(search);
  const [lastSearch, setLastSearch] = useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setQuery(search);
  }

  const active = TABS.find((t) => t.kind === kind) ?? TABS[0];

  /**
   * Rewrites the query string.
   *
   * Everything lives in the URL: a filtered view is then a link somebody can
   * send to whoever asked the question, a tab they can reopen tomorrow, and a
   * back button that goes back rather than resetting the screen.
   */
  const go = (changes: Record<string, string | null>, keepPage = false) =>
    start(() => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      // Any change to what is being filtered invalidates which page you are on:
      // page 4 of a narrower list is usually empty, which reads as "no results"
      // when the truth is "not on this page".
      if (!keepPage) next.delete('page');
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });

  const narrowed = Boolean(search || currency || type || from || to);
  const clear = () => go({ search: null, currency: null, type: null, from: null, to: null });

  /**
   * Ranking naira against dollars is meaningless, so the fee sort is only
   * offered once a single currency is in view. On a mixed tab the column is
   * still a heading — it just does not pretend to be a control.
   */
  const singleCurrency = active.currency ?? (currency as EarningCurrency | '') ?? '';
  const canSortByFee = Boolean(singleCurrency);

  const toggleSort = (key: 'createdAt' | 'fee') =>
    go(
      sort === key
        ? { sort: key, direction: direction === 'asc' ? 'desc' : 'asc' }
        : { sort: key, direction: 'desc' },
      true,
    );

  const download = async () => {
    setExporting(true);
    const result = await exportEarnings(params.toString());
    setExporting(false);

    if (result.error || !result.csv) {
      toast.error('Could not export', { description: result.error });
      return;
    }
    if (result.rows === 0) {
      toast.error('Nothing to export', {
        description: 'No earning matches the current filters.',
      });
      return;
    }

    // A BOM, so Excel opens it as UTF-8 and the naira sign in the header is a
    // naira sign rather than three mojibake characters.
    const blob = new Blob([`﻿${result.csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename ?? 'earnings.csv';
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`${(result.rows ?? 0).toLocaleString()} earnings exported`, {
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
      {/* ── which ladder ─────────────────────────────────── */}
      <div className="border-border/70 mb-5 flex flex-wrap gap-1 overflow-x-auto border-b">
        {TABS.map((tab) => {
          const on = tab.kind === kind;
          const totals = tab.kind ? data.summary.byKind[tab.kind] : data.summary.all;
          const next = new URLSearchParams(params.toString());
          if (tab.kind) next.set('kind', tab.kind);
          else next.delete('kind');
          next.delete('page');

          return (
            <Link
              key={tab.label}
              href={`${pathname}?${next}`}
              className={cn(
                'group relative flex min-w-40 flex-col gap-0.5 rounded-t-lg px-4 py-2.5 transition-colors',
                on ? 'bg-secondary/60' : 'hover:bg-secondary/30',
              )}
            >
              <span
                className={cn(
                  't-small font-medium',
                  on ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {tab.label}
              </span>
              <span className={cn('t-small tabular-nums', on ? 'text-primary' : 'text-foreground')}>
                {tab.currency === 'USD'
                  ? formatUsd(totals.usd)
                  : tab.currency === 'NGN'
                    ? formatNaira(totals.ngn)
                    : /* The All tab, where one number would need an exchange
                         rate nobody agreed to. */
                      `${formatNaira(totals.ngn)} · ${formatUsd(totals.usd)}`}
              </span>
              <span className="text-muted-foreground t-caption">
                {totals.count.toLocaleString()} {totals.count === 1 ? 'earning' : 'earnings'}
              </span>
              {on ? <span className="bg-primary absolute inset-x-0 -bottom-px h-0.5" /> : null}
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
            aria-label="Search earnings by name, email or transaction ID"
          />
        </div>

        <Select
          value={type}
          onChange={(value) => go({ type: value })}
          options={TYPES}
          label="Filter by transaction type"
        />

        {/* Redundant on a single-ladder tab, which already fixes the currency. */}
        {active.currency === null ? (
          <Select
            value={currency}
            onChange={(value) => go({ currency: value })}
            options={CURRENCIES}
            label="Filter by the currency the fee was charged in"
          />
        ) : null}

        <DateRangeFilter
          from={from}
          to={to}
          placeholder="Select date range"
          onChange={(nextFrom, nextTo) => go({ from: nextFrom, to: nextTo })}
        />

        {narrowed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            Clear filters
          </Button>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={download} disabled={exporting}>
            {exporting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => start(() => router.refresh())}>
            <RefreshCw className={cn('size-3.5', pending && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <div className="border-border/70 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b p-4">
          <div>
            <h2 className="t-section">{active.label}</h2>
            {active.ladder ? (
              <p className="text-muted-foreground t-caption mt-0.5">
                Charged by the{' '}
                <Link href={active.ladder} className="text-primary hover:underline">
                  {KIND_LABEL[active.kind!].toLowerCase()} ladder
                </Link>
              </p>
            ) : (
              <p className="text-muted-foreground t-caption mt-0.5">
                Every fee the platform has kept, from all four ladders
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="eyebrow">{narrowed ? 'Matching these filters' : 'This tab'}</p>
            <p className="t-title tabular-nums">
              {active.currency === 'USD'
                ? formatUsd(data.totals.usd)
                : active.currency === 'NGN'
                  ? formatNaira(data.totals.ngn)
                  : `${formatNaira(data.totals.ngn)} · ${formatUsd(data.totals.usd)}`}
            </p>
          </div>
        </div>

        {/* No overflow wrapper here — Table brings its own, and nesting a
            second one clips the last columns instead of scrolling to them. */}
        <CardContent className="p-0">
          <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-14 pl-5">S/No.</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">
                    {canSortByFee ? (
                      <SortButton
                        label="Fee"
                        active={sort === 'fee'}
                        direction={direction}
                        onClick={() => toggleSort('fee')}
                        className="ml-auto"
                      />
                    ) : (
                      <span
                        title="Naira and dollars cannot be ranked against each other. Pick a tab or a currency to sort by fee."
                        className="cursor-help"
                      >
                        Fee
                      </span>
                    )}
                  </TableHead>
                  <TableHead>Charged in</TableHead>
                  <TableHead>Transaction Type</TableHead>
                  <TableHead className="pr-5">
                    <SortButton
                      label="Created On"
                      active={sort === 'createdAt'}
                      direction={direction}
                      onClick={() => toggleSort('createdAt')}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.rows.length === 0 ? (
                  <TableEmpty colSpan={10}>
                    <EmptyReason kind={kind} narrowed={narrowed} />
                  </TableEmpty>
                ) : (
                  data.rows.map((row, index) => (
                    <TableRow key={row.id}>
                      {/* Continues across pages: row 11 is the eleventh
                          earning, not the first on page two. */}
                      <TableCell className="text-muted-foreground pl-5 tabular-nums">
                        {firstOnPage + index}
                      </TableCell>

                      <TableCell>
                        <span
                          title={row.reference}
                          className="t-caption block max-w-[13rem] truncate font-mono"
                        >
                          {row.reference}
                        </span>
                      </TableCell>

                      <TableCell className="t-small font-medium whitespace-nowrap">
                        {row.name || '—'}
                      </TableCell>

                      <TableCell className="text-muted-foreground t-small max-w-[15rem] truncate">
                        {row.email}
                      </TableCell>

                      <TableCell className="t-small text-right tabular-nums whitespace-nowrap">
                        {money(row.amount, row.currency)}
                      </TableCell>

                      <TableCell className="t-small text-right tabular-nums whitespace-nowrap">
                        {money(row.total, row.currency)}
                      </TableCell>

                      {/* The earning itself — the one figure this screen exists
                          for, so it is the only one given weight. */}
                      <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                        {money(row.fee, row.currency)}
                      </TableCell>

                      <TableCell>
                        <Badge variant={row.currency === 'NGN' ? 'secondary' : 'outline'}>
                          {row.currency}
                        </Badge>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <span className="t-small">{TYPE_LABEL[row.type] ?? row.type}</span>
                        {/* Which account it moved between — the coins involved. */}
                        <span className="text-muted-foreground t-caption block font-mono">
                          {[row.fromAsset, row.toAsset]
                            .filter(Boolean)
                            .map((a) => a!.toUpperCase())
                            .join(' → ') || '—'}
                        </span>
                      </TableCell>

                      <TableCell className="pr-5 whitespace-nowrap">
                        <span className="t-small">{stamp(row.createdAt)}</span>
                        <span className="text-muted-foreground t-caption block">
                          {relativeTime(row.createdAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
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
 * At most seven page buttons, always including the first, the last and the
 * current. A hundred pages of buttons is not a control, it is a wall.
 */
function pageWindow(page: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);

  const pages = new Set([1, count, page]);
  for (const offset of [-1, 1]) {
    const n = page + offset;
    if (n > 1 && n < count) pages.add(n);
  }
  // Pad towards the middle so the row keeps a steady width as you walk it.
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

/**
 * Why the table is empty, which is rarely "nothing happened".
 *
 * A ladder that has never earned anything is usually a ladder that has not been
 * set, or a product that has not shipped — and saying so is the difference
 * between a screen that looks broken and one that tells you what to do next.
 */
function EmptyReason({ kind, narrowed }: { kind: EarningKind | null; narrowed: boolean }) {
  if (narrowed) return <>No earning matches those filters.</>;

  if (kind === 'NGN_WITHDRAWAL') {
    return (
      <>
        Nothing yet — naira cash-outs are priced but cannot be sent.
        <span className="text-muted-foreground block">
          There is no payout rail wired up, so no naira withdrawal has ever completed. The fee is
          already set and will start earning the moment one does.
        </span>
      </>
    );
  }

  return (
    <>
      Nothing earned here yet.
      <span className="text-muted-foreground block">
        Earnings appear once a transaction on this ladder completes.
      </span>
    </>
  );
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

function SortButton({
  label,
  active,
  direction,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  direction: string;
  onClick: () => void;
  className?: string;
}) {
  const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'hover:text-foreground -mx-1 flex items-center gap-1 rounded px-1 py-0.5 transition-colors',
        'focus-visible:ring-ring/40 outline-none focus-visible:ring-2',
        active && 'text-foreground',
        className,
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <Icon className={cn('size-3', !active && 'opacity-50')} />
    </button>
  );
}
