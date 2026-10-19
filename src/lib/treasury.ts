/** Treasury screen helpers: plain words for the figures (pure, tested). */

/** GET /v1/admin/treasury */
export interface TreasurySnapshot {
  checkedAt: string;
  rail: { name: string; available: string | null; error: string | null };
  quidaxNgn: string | null;
  owed: string;
  covered: 'YES' | 'SHORT' | 'UNKNOWN';
  spare: string | null;
  shortBy: string | null;
  reserve: string;
  inFlightPayouts: string;
  availableToMove: string | null;
  fundingAccount: { bankCode: string; bankName: string; accountNumberMasked: string; accountName: string } | null;
  moves: Array<{
    id: string;
    amount: string;
    status: 'SENDING' | 'CHECKING' | 'ARRIVED' | 'FAILED';
    to: string;
    railRef: string | null;
    failureReason: string | null;
    createdBy: string;
    createdAt: string;
    completedAt: string | null;
  }>;
}

/** "₦1,500,000.5". Read by a person, not parsed. */
export function naira(amount: string | number): string {
  return '₦' + Number(amount).toLocaleString('en-NG', { maximumFractionDigits: 2 });
}

/** The covered check in one line. */
export function coverLine(s: Pick<TreasurySnapshot, 'covered' | 'owed' | 'spare' | 'shortBy' | 'rail' | 'quidaxNgn'>): string {
  if (s.covered === 'UNKNOWN') {
    const why = s.rail.error ?? "We couldn't read the Quidax naira balance.";
    return `Can't tell right now: ${why} Try Check again.`;
  }
  const held = Number(s.rail.available ?? 0) + Number(s.quidaxNgn ?? 0);
  return s.covered === 'YES'
    ? `✓ Covered: we hold ${naira(held)}; customers are owed ${naira(s.owed)} (${naira(s.spare ?? 0)} spare).`
    : `⚠ Short by ${naira(s.shortBy ?? 0)}: customers are owed ${naira(s.owed)}; we hold ${naira(held)}.`;
}

export function moveStatusText(status: TreasurySnapshot['moves'][number]['status']): string {
  return {
    SENDING: 'Sending',
    CHECKING: 'Checking with the bank',
    ARRIVED: 'Arrived',
    FAILED: 'Failed (nothing left)',
  }[status];
}
