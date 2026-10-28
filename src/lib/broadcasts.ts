/** Broadcasts sent by the background worker, in waves (29 Oct 2026). */

export type BroadcastStatus = 'QUEUED' | 'SENDING' | 'PAUSED' | 'CANCELLED' | 'DONE';
export type BroadcastAction = 'pause' | 'resume' | 'cancel';

const LABELS: Record<BroadcastStatus, string> = {
  QUEUED: 'Waiting to start',
  SENDING: 'Sending',
  PAUSED: 'Paused',
  CANCELLED: 'Cancelled',
  DONE: 'Sent',
};

export function statusLabel(status: string): string {
  return LABELS[status as BroadcastStatus] ?? status;
}

const n = (v: number) => v.toLocaleString('en-US');

/** "3,400 of 10,000 (34%) · 12 phones failed" */
export function progressLine(b: {
  status?: string;
  recipientCount: number;
  processedCount: number;
  percent: number;
  pushFailedCount: number;
  withEmail: boolean;
  emailQueuedCount: number;
}): string {
  const parts = [`${n(b.processedCount)} of ${n(b.recipientCount)} (${b.percent}%)`];
  if (b.withEmail) parts.push(`${n(b.emailQueuedCount)} email${b.emailQueuedCount === 1 ? '' : 's'}`);
  if (b.pushFailedCount) parts.push(`${n(b.pushFailedCount)} phone${b.pushFailedCount === 1 ? '' : 's'} failed`);
  return parts.join(' · ');
}

/** The buttons a broadcast in this state offers. */
export function broadcastActions(status: string): BroadcastAction[] {
  if (status === 'QUEUED' || status === 'SENDING') return ['pause', 'cancel'];
  if (status === 'PAUSED') return ['resume', 'cancel'];
  return [];
}

/** While anything is waiting or sending, the page refreshes itself to show progress. */
export function isRunning(rows: Array<{ status: string }>): boolean {
  return rows.some((r) => r.status === 'QUEUED' || r.status === 'SENDING');
}
