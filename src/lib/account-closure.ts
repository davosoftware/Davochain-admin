/** People → Users → Close account (28 Oct 2026). */
import { formatDay } from './date-of-birth.ts';

/** What GET /v1/admin/users/:id/close-check answers. */
export interface CloseCheck {
  canClose: boolean;
  blockers: Array<{ code: string; message: string; asset?: string; amount?: string; count?: number }>;
  /** How many months "delete later" waits (System → Server settings). */
  retentionMonths?: number;
}

/** What happens to the customer's data, chosen by the owner when closing. */
export type DataChoice = 'KEEP' | 'DELETE_LATER' | 'DELETE_NOW';

/** The form's own checks; the API checks everything again. */
export function closeFormProblem(f: { dataChoice: DataChoice | null; reason: string; password: string; confirmed: boolean }): string | null {
  if (!f.dataChoice) return 'Choose what happens to their data.';
  if (f.reason.trim().length < 10) return 'Say why, in at least 10 characters. It is kept in the audit log.';
  if (!f.password) return 'Enter your password.';
  if (!f.confirmed) return 'Tick the box to confirm you understand this cannot be undone here.';
  return null;
}

/** A closed account's email is a placeholder; show the original. */
export function shownEmail(u: { email: string; closedEmail?: string | null }): string {
  return u.closedEmail || u.email;
}

/** "Personal data deleted on …", "… will be deleted on …", or kept. */
export function dataStatusLine(u: { dataDeletedAt?: string | null; dataDeleteAt?: string | null }): string {
  if (u.dataDeletedAt) return `Personal data deleted on ${formatDay(u.dataDeletedAt.slice(0, 10))}.`;
  if (u.dataDeleteAt) return `Personal data will be deleted on ${formatDay(u.dataDeleteAt.slice(0, 10))}.`;
  return 'Data kept on file.';
}
