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
