import type { TxRow } from './types-admin';

/**
 * What a person can decide from a transaction's detail (29 Oct 2026).
 *
 *  - DEPOSIT: a naira deposit held over a limit. Credit it now, or reject it
 *    with a reason (anyone with "approve transactions").
 *  - WAITING: a buy, sell, swap or withdrawal (sends included) still pending,
 *    processing or being checked. An owner completes it (the customer is
 *    credited) or rejects it (the money goes back), after checking Quidax.
 *  - OWNER_ONLY: the same, seen by someone who may approve but is not an owner.
 *
 * Never a deposit or gift card still arriving: rejecting one could drop money
 * that did arrive. The API refuses those too.
 */
export type Decision = 'DEPOSIT' | 'WAITING' | 'OWNER_ONLY';

const WAITING = new Set(['PENDING', 'PROCESSING', 'RECONCILING']);
const DECIDABLE = new Set(['BUY', 'SELL', 'SWAP', 'WITHDRAWAL']);

type Row = Pick<TxRow, 'type' | 'status' | 'needsApproval' | 'peer' | 'name'>;

export function decisionFor(row: Row, who: { canApprove: boolean; isOwner: boolean }): Decision | null {
  if (row.needsApproval) return who.canApprove ? 'DEPOSIT' : null;
  if (!WAITING.has(row.status) || !DECIDABLE.has(row.type)) return null;
  if (who.isOwner) return 'WAITING';
  return who.canApprove ? 'OWNER_ONLY' : null;
}

/** Says who gets what: a send credits the receiver, a withdrawal is marked sent. */
export function completeLabel(row: Row): string {
  if (row.peer) return `Credit ${row.peer.name} now`;
  if (row.type === 'WITHDRAWAL') return 'Mark as sent';
  return `Credit ${row.name} now`;
}
