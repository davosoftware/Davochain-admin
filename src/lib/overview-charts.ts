/**
 * Data for the Overview charts (28 Oct 2026). Pure shaping of numbers the page
 * already loads; the charts themselves are in components/overview-charts.tsx.
 */
import type { OverviewSnapshot } from './types-admin';

export interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
}

// Fixed colour per kind, so "Swaps" is the same colour on every visit.
const MIX = [
  { key: 'buys', label: 'Buys', color: 'var(--chart-1)' },
  { key: 'sells', label: 'Sells', color: 'var(--chart-2)' },
  { key: 'swaps', label: 'Swaps', color: 'var(--chart-3)' },
  { key: 'deposits', label: 'Deposits', color: 'var(--chart-5)' },
  { key: 'withdrawals', label: 'Withdrawals', color: 'var(--chart-4)' },
] as const;

/** How many of each kind of transaction, biggest first; kinds with none are left out. */
export function transactionMix(t: OverviewSnapshot['transactions']): Slice[] {
  return MIX.map((m) => ({ ...m, value: Number(t[m.key]) || 0 }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Dollars moved by kind, in a fixed order for the bar chart. */
export function cryptoBars(c: OverviewSnapshot['crypto']): { label: string; value: number }[] {
  const n = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return [
    { label: 'Bought', value: n(c.boughtUsd) },
    { label: 'Sold', value: n(c.soldUsd) },
    { label: 'Swapped', value: n(c.swappedUsd) },
    { label: 'Deposited', value: n(c.depositedUsd) },
    { label: 'Withdrawn', value: n(c.withdrawnUsd) },
  ];
}

/** "08:05", Lagos time (UTC+1), for the Recent activity timeline. */
export function timeOfDay(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 60 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

const LAGOS_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * The last 7 Lagos days, oldest first and ending today, each as an exact
 * start and end time for the API ("Wed 28", 23:00Z the day before → 22:59:59.999Z).
 */
export function lastSevenDays(now: Date = new Date()): { label: string; from: string; to: string }[] {
  const lagosNow = new Date(now.getTime() + LAGOS_MS);
  const todayStartUtc = Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate()) - LAGOS_MS;
  return Array.from({ length: 7 }, (_, i) => {
    const start = todayStartUtc - (6 - i) * DAY_MS;
    const lagosDay = new Date(start + LAGOS_MS);
    return {
      label: `${WEEKDAYS[lagosDay.getUTCDay()]} ${lagosDay.getUTCDate()}`,
      from: new Date(start).toISOString(),
      to: new Date(start + DAY_MS - 1).toISOString(),
    };
  });
}

const naira = (n: number) =>
  '₦' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * What the customer got (+) or sent out (−) in a transaction, for the Recent
 * activity list: withdrawals are money out, everything else is what arrived.
 */
export function activityAmount(tx: {
  type: string;
  fromAsset: string | null;
  fromAmount: string | null;
  toAsset: string | null;
  toAmount: string | null;
}): { text: string; sign: 'in' | 'out' } | null {
  const out = tx.type === 'WITHDRAWAL' || !tx.toAmount;
  const amount = out ? tx.fromAmount : tx.toAmount;
  const asset = out ? tx.fromAsset : tx.toAsset;
  if (!amount || !asset || !Number.isFinite(Number(amount))) return null;
  const coin = Number(Number(amount).toFixed(8)).toString();
  const value = asset.toLowerCase() === 'ngn' ? naira(Number(amount)) : `${coin} ${asset.toUpperCase()}`;
  return { text: `${out ? '−' : '+'}${value}`, sign: out ? 'out' : 'in' };
}

/** How full a coin's stock is against its target, 0–100; null when there is no target. */
export function stockLevel(row: { held: string; target: string }): number | null {
  const held = Number(row.held);
  const target = Number(row.target);
  if (!Number.isFinite(held) || !Number.isFinite(target) || target <= 0) return null;
  return Math.min(100, Math.round((held / target) * 100));
}
