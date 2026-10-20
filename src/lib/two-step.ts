/** M7: admin two-step sign-in. Pure helpers, shared by the sign-in screen and Settings. */

export type LoginAnswer =
  | { kind: 'token'; accessToken: string }
  | { kind: 'CODE' | 'SETUP'; ticket: string; sentTo: string; delivered: boolean }
  | { kind: 'unknown' };

export function parseLoginAnswer(data: unknown): LoginAnswer {
  const d = (data ?? {}) as Record<string, unknown>;
  if (typeof d.accessToken === 'string') return { kind: 'token', accessToken: d.accessToken };
  if ((d.twoStep === 'CODE' || d.twoStep === 'SETUP') && typeof d.ticket === 'string') {
    return { kind: d.twoStep, ticket: d.ticket, sentTo: String(d.sentTo ?? ''), delivered: d.delivered !== false };
  }
  return { kind: 'unknown' };
}

/** What the second-step screen says, in plain words. */
export function codeStepText(kind: 'CODE' | 'SETUP', sentTo: string, delivered: boolean): string {
  if (kind === 'CODE') {
    return delivered
      ? `We sent a 6-digit code to ${sentTo}. Enter it, or one of your backup codes.`
      : "We couldn't send your code. Enter one of your backup codes instead.";
  }
  return delivered
    ? `An owner requires two-step sign-in for every admin. We sent a 6-digit code to ${sentTo} to switch it on for you.`
    : "An owner requires two-step sign-in, but we couldn't send your code. Press Send a new code in a minute, or ask an owner for help.";
}

export function isSixDigits(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

/** The text file an admin downloads to keep their backup codes. */
export function backupCodesText(codes: string[], email: string, at = new Date()): string {
  return [
    `DavoChain admin backup codes for ${email}`,
    `Made ${at.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    '',
    ...codes,
    '',
    'Each code works once. Use one when you cannot get the emailed sign-in code.',
    'Keep this file somewhere safe and private. Making new codes cancels these.',
  ].join('\n');
}
