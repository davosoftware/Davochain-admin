/**
 * Plain-words helpers for the Overview page (27 Oct 2026): the greeting, the
 * "Needs your attention" list and the lines in Recent activity. Display only:
 * every number comes from what the page already loads.
 */

/** "Good morning, Ada", by the time of day in Lagos (UTC+1, no daylight saving). */
export function greeting(name: string | null | undefined, now: Date = new Date()): string {
  const hour = (now.getUTCHours() + 1) % 24;
  const part = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : 'evening';
  const first = (name ?? '').trim().split(/\s+/)[0];
  return first ? `Good ${part}, ${first}` : `Good ${part}`;
}

export interface AttentionItem {
  tone: 'danger' | 'warning' | 'info';
  title: string;
  detail: string;
  href: string;
  action: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const coins = (list: string[]) => list.map((c) => c.toUpperCase()).join(', ');

/**
 * What needs someone, worst first, each linking to the page that fixes it.
 * Items for pages this admin cannot open are left out, like the sidebar does.
 */
export function attentionItems(input: {
  permissions: string[];
  daysOfCover: number | null;
  lowCoins: string[];
  driftCoins: string[];
  pending: number;
  reconciling: number;
}): AttentionItem[] {
  const can = (p: string) => input.permissions.includes(p);
  const items: AttentionItem[] = [];
  const d = input.daysOfCover;

  if (can('inventory.view') && d !== null && d < 3) {
    items.push({
      tone: d < 1 ? 'danger' : 'warning',
      title: d < 1 ? 'Naira for buys is almost gone' : `Naira for buys lasts about ${d.toFixed(1)} more days`,
      detail: 'When a coin is out of stock, buys are paid from this naira at Quidax. When it runs out, buys fail. Top up the Quidax NGN wallet.',
      href: '/inventory',
      action: 'Open Inventory desk',
    });
  }
  if (can('reconciliation.view') && input.driftCoins.length > 0) {
    items.push({
      tone: 'danger',
      title: `Our records and Quidax disagree on ${coins(input.driftCoins)}`,
      detail: 'What customers hold in our books is not what Quidax holds for them. Look before it grows.',
      href: '/reconciliation',
      action: 'Open Reconciliation',
    });
  }
  if (can('transactions.view') && input.reconciling > 0) {
    items.push({
      tone: 'warning',
      title: `${plural(input.reconciling, 'transaction', 'transactions')} waiting for a check`,
      detail: 'The provider did not give a clear answer, so the money is held, not refunded, until someone confirms what happened.',
      href: '/transactions?status=RECONCILING',
      action: 'Review them',
    });
  }
  if (can('inventory.view') && input.lowCoins.length > 0) {
    items.push({
      tone: 'warning',
      title: `Running low on ${coins(input.lowCoins)}`,
      detail: 'Buys still work, but they cost us more until the coin is restocked.',
      href: '/inventory',
      action: 'Open Inventory desk',
    });
  }
  if (can('transactions.view') && input.pending > 0) {
    items.push({
      tone: 'info',
      title: `${plural(input.pending, 'transaction', 'transactions')} still in progress`,
      detail: 'Started but not finished yet. Most finish on their own within minutes.',
      href: '/transactions?status=PENDING',
      action: 'See them',
    });
  }
  return items;
}

const TYPE_WORDS: Record<string, string> = {
  ADJUSTMENT: 'Balance adjustment',
  GIFT_CARD: 'Gift card',
};

/** A transaction type code in words: "BUY" → "Buy", "FEE_CLAIM" → "Fee claim". */
export function humanType(type: string): string {
  return TYPE_WORDS[type] ?? type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ');
}

/** "USDT → BTC", or just "NGN" when both sides are the same coin. */
export function assetPath(fromAsset: string | null | undefined, toAsset: string | null | undefined): string {
  const from = fromAsset?.toUpperCase();
  const to = toAsset?.toUpperCase();
  if (from && to && from !== to) return `${from} → ${to}`;
  return from ?? to ?? '';
}

/** "Buy · NGN → BTC", "Withdrawal · NGN", "Balance adjustment · BTC". */
export function activityLine(tx: { type: string; fromAsset: string | null; toAsset: string | null }): string {
  const assets = assetPath(tx.fromAsset, tx.toAsset);
  return assets ? `${humanType(tx.type)} · ${assets}` : humanType(tx.type);
}

/** What each status means, shown when you hover over its badge. */
export const STATUS_HELP: Record<string, string> = {
  COMPLETED: 'Finished. The money has moved.',
  APPROVED: 'Approved by an admin.',
  PENDING: 'Started, not finished yet. Most finish on their own within minutes.',
  PROCESSING: 'With the provider (Quidax or Payrep) right now.',
  ON_HOLD: 'Stopped for an admin to approve, usually because it is over a limit.',
  RECONCILING:
    'The provider did not give a clear answer, so the money is held, not refunded, while our system keeps checking. Do not refund it by hand.',
  FAILED: 'Did not go through. Open it to see why.',
  REJECTED: 'Turned down by an admin.',
};
