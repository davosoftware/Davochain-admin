/** Reconciliation screen helpers: plain words for the numbers (pure, tested). */

export interface DriftRowLike {
  asset: string;
  drift: string;
  withinTolerance: boolean;
  partial: boolean;
}

export type MismatchReason = 'BEING_CHECKED' | 'IN_PROGRESS' | 'UNEXPLAINED' | 'UNREADABLE';

/** GET /v1/admin/reconciliation/:asset/customers */
export interface CustomerMismatches {
  asset: string;
  checkedAt: string;
  partial: boolean;
  rows: Array<{
    userId: string;
    name: string;
    email: string;
    recorded: string;
    held: string | null;
    difference: string | null;
    unreadable: boolean;
    open: Array<{ id: string; type: string; status: string; createdAt: string }>;
    reason: MismatchReason;
  }>;
}

/** GET /v1/admin/reconciliation/corrections */
export interface CorrectionRow {
  id: string;
  createdAt: string;
  userId: string;
  name: string;
  email: string;
  direction: 'CREDIT' | 'DEBIT';
  asset: string;
  amount: string;
  reason: string | null;
  adjustedBy: string | null;
}

export const REASON_TEXT: Record<MismatchReason, string> = {
  BEING_CHECKED: 'A send is being checked with Quidax. Decide it below; the difference usually goes away.',
  IN_PROGRESS: 'A trade or withdrawal is still going through. Wait a few minutes and check again.',
  UNEXPLAINED: 'Nothing explains this. Look at their transactions, then correct the balance if you are sure.',
  UNREADABLE: "We couldn't read their Quidax account this time. Check again before doing anything.",
};

/** "0.0020" → "0.002"; never scientific notation. */
function plain(amount: string): string {
  let s = amount.replace(/^-/, '');
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

export function coinSummary(row: DriftRowLike): string {
  const coin = row.asset.toUpperCase();
  if (row.partial) return `${coin}: some accounts couldn't be read this time, so this can't say money is missing. Check again.`;
  if (row.withinTolerance || Number(row.drift) === 0) return `${coin} matches: our records and Quidax agree.`;
  const n = plain(row.drift);
  return row.drift.startsWith('-')
    ? `${coin}: Quidax holds ${n} more than our records say customers own.`
    : `${coin}: our records say customers own ${n} more than Quidax holds for them.`;
}

/**
 * The correction that makes our record equal what Quidax holds: a positive
 * difference (record > held) is a debit, a negative one a credit.
 */
export function suggestCorrection(row: { difference: string | null; unreadable: boolean }): { direction: 'CREDIT' | 'DEBIT'; amount: string } | null {
  if (row.unreadable || row.difference === null || Number(row.difference) === 0) return null;
  return { direction: row.difference.startsWith('-') ? 'CREDIT' : 'DEBIT', amount: plain(row.difference) };
}
