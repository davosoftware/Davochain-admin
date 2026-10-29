/** A customer's transaction PIN as the dashboard sees it (29 Oct 2026). Never the PIN itself. */
export interface TransactionPinInfo {
  isSet: boolean;
  setAt: string | null;
  /** Set while five wrong PINs keep it locked. */
  lockedUntil: string | null;
  failedTries: number;
}

const lagosTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

const isLocked = (pin: TransactionPinInfo | undefined, now: Date) => !!pin?.lockedUntil && new Date(pin.lockedUntil) > now;

export function pinLabel(pin: TransactionPinInfo | undefined, now = new Date()): string {
  if (!pin) return '—';
  if (!pin.isSet) return 'Not set';
  if (isLocked(pin, now)) return `Locked until ${lagosTime(pin.lockedUntil!)}`;
  if (pin.failedTries > 0) return `Set · ${pin.failedTries} wrong ${pin.failedTries === 1 ? 'try' : 'tries'}`;
  return 'Set';
}

/** Only a locked PIN has anything to unlock. */
export function canUnlockPin(pin: TransactionPinInfo | undefined, now = new Date()): boolean {
  return isLocked(pin, now);
}
