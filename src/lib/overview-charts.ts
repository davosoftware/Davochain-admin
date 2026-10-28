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
