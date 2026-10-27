/** People → Daily limits (27 Oct 2026): shapes from the API and small helpers. */

export interface ActionUsage {
  action: string;
  label: string;
  allowed: boolean;
  currency: 'NGN' | 'USD';
  maxPerTx: string | null;
  maxPerDay: string | null;
  used: string;
  remaining: string | null;
  percent: number | null;
}

export interface CustomerUsage {
  userId: string;
  email: string;
  name: string;
  level: 'NONE' | 'BASIC' | 'ADVANCED';
  highestPercent: number | null;
  actions: ActionUsage[];
}

export interface DailyLimitsPage {
  date: string;
  ngnPerUsd: string;
  total: number;
  page: number;
  pageSize: number;
  customers: CustomerUsage[];
}

export interface LimitsState {
  date: string;
  action: string;
  near: string;
  search: string;
  page: number;
}

export function limitsHref(s: LimitsState, change: Partial<LimitsState>): string {
  const next = { ...s, page: 1, ...change };
  const q = new URLSearchParams();
  if (next.date) q.set('date', next.date);
  if (next.action) q.set('action', next.action);
  if (next.near) q.set('near', next.near);
  if (next.search) q.set('search', next.search);
  if (next.page > 1) q.set('page', String(next.page));
  const qs = q.toString();
  return qs ? `/limits?${qs}` : '/limits';
}

function money(value: string, currency: 'NGN' | 'USD'): string {
  const n = Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'NGN' ? `₦${n}` : `$${n}`;
}

/** "$800.00 of $1,000.00", in the limit's own currency. */
export function usageLine(a: Pick<ActionUsage, 'currency' | 'used' | 'maxPerDay' | 'allowed'>): string {
  if (!a.allowed) return 'Not allowed at this level';
  if (!a.maxPerDay) return `${money(a.used, a.currency)} (no daily limit)`;
  return `${money(a.used, a.currency)} of ${money(a.maxPerDay, a.currency)}`;
}

export const LEVEL_NAMES: Record<CustomerUsage['level'], string> = { NONE: 'Not verified', BASIC: 'Basic', ADVANCED: 'Advanced' };
