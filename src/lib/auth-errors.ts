export const SAFE_503_MESSAGES = [
  'Temporarily unavailable. Try again shortly.',
  'The service is busy, try again shortly',
] as const;

const API_429 = /^Too many attempts\. Try again in \d+ seconds\.$/;

/** The API's `message`, joined if it is a validation list; null if absent. */
export function messageText(body: unknown): string | null {
  const m = (body as { message?: unknown } | null)?.message;
  if (Array.isArray(m)) return m.join(', ');
  return typeof m === 'string' ? m : null;
}

/**
 * What to show when a sign-in-type call fails (spec §3.2).
 *
 * 429 and 503 get their own safe wording. Everything else gets `fallback`,
 * which for login is "Incorrect email or password", so the screen never
 * reveals more than it did before.
 */
export function authFailureMessage(status: number, body: unknown, retryAfter: string | null, fallback: string): string {
  if (status === 429) {
    const seconds = Number(retryAfter);
    if (retryAfter !== null && Number.isInteger(seconds) && seconds > 0) {
      return `Too many attempts. Try again in ${seconds} seconds.`;
    }
    const m = messageText(body);
    if (m && API_429.test(m)) return m;
    return 'Too many attempts. Try again in a moment.';
  }
  if (status === 503) {
    const m = messageText(body);
    return m && (SAFE_503_MESSAGES as readonly string[]).includes(m) ? m : SAFE_503_MESSAGES[0];
  }
  return fallback;
}

/**
 * An invite check that failed. Only a 429 or 503 carries a reason: then the
 * link may be perfectly good and the person should simply try again. Any
 * other failure stays "this invitation cannot be used", with no detail, so a
 * guessed token learns nothing.
 */
export function inviteCheckFailure(status: number, body: unknown, retryAfter: string | null): { valid: false; error?: string } {
  if (status === 429 || status === 503) return { valid: false, error: authFailureMessage(status, body, retryAfter, '') };
  return { valid: false };
}
