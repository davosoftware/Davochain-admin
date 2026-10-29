/**
 * One customer's history and balance check (29 Oct 2026): the transactions
 * manager narrowed to them, and every coin compared three ways.
 */

export type CheckVerdict = 'OK' | 'RECORDS_DISAGREE' | 'BEING_CHECKED' | 'IN_PROGRESS' | 'UNEXPLAINED' | 'NOT_CHECKED';

/** GET /v1/admin/users/:id/balance-check */
export interface CustomerCheck {
  userId: string;
  name: string;
  email: string;
  checkedAt: string;
  quidax: 'READ' | 'UNREADABLE' | 'NO_ACCOUNT';
  rows: Array<{
    asset: string;
    available: string;
    locked: string;
    recorded: string;
    fromEntries: string;
    entriesMatch: boolean;
    uncollectedFees: string;
    held: string | null;
    difference: string | null;
    open: Array<{ id: string; type: string; status: string; createdAt: string }>;
    verdict: CheckVerdict;
  }>;
}

export function historyHref(userId: string, asset?: string): string {
  const q = new URLSearchParams({ userId });
  if (asset) q.set('asset', asset);
  return `/transactions?${q}`;
}

type Tone = 'success' | 'warning' | 'destructive' | 'outline';

const VERDICTS: Record<CheckVerdict, { label: string; tone: Tone }> = {
  OK: { label: 'Matches', tone: 'success' },
  RECORDS_DISAGREE: { label: 'Our records disagree', tone: 'destructive' },
  UNEXPLAINED: { label: 'Quidax differs', tone: 'destructive' },
  IN_PROGRESS: { label: 'Transaction still going', tone: 'warning' },
  BEING_CHECKED: { label: 'Being checked', tone: 'warning' },
  NOT_CHECKED: { label: 'Quidax not read', tone: 'outline' },
};

export function verdictInfo(verdict: CheckVerdict): { label: string; tone: Tone } {
  return VERDICTS[verdict] ?? { label: verdict, tone: 'outline' };
}

/** recorded + fees − held, said the way a person reads it. */
export function differenceLabel(difference: string | null, asset: string): string {
  if (difference === null) return '—';
  const n = Number(difference);
  if (n === 0) return 'None';
  const coin = asset.toUpperCase();
  const size = difference.replace(/^-/, '');
  return n > 0 ? `Quidax holds ${size} ${coin} less than our records` : `Quidax holds ${size} ${coin} more than our records`;
}

/** Rows that are wrong now; a transaction still settling is not yet a problem. */
export function problemCount(check: CustomerCheck): number {
  return check.rows.filter((r) => verdictInfo(r.verdict).tone === 'destructive').length;
}
