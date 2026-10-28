/** People → Users → Close account (28 Oct 2026). */

/** What GET /v1/admin/users/:id/close-check answers. */
export interface CloseCheck {
  canClose: boolean;
  blockers: Array<{ code: string; message: string; asset?: string; amount?: string; count?: number }>;
}

/** The form's own checks; the API checks everything again. */
export function closeFormProblem(f: { reason: string; password: string; confirmed: boolean }): string | null {
  if (f.reason.trim().length < 10) return 'Say why, in at least 10 characters. It is kept in the audit log.';
  if (!f.password) return 'Enter your password.';
  if (!f.confirmed) return 'Tick the box to confirm you understand this cannot be undone here.';
  return null;
}

/** A closed account's email is a placeholder; show the original. */
export function shownEmail(u: { email: string; closedEmail?: string | null }): string {
  return u.closedEmail || u.email;
}
