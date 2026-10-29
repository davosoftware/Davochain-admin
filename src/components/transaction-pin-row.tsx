'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { unlockTransactionPin } from '@/app/actions/users';
import { canUnlockPin, pinLabel, type TransactionPinInfo } from '@/lib/transaction-pin';

/**
 * The customer's transaction PIN (29 Oct 2026): set or not, and locked after
 * five wrong tries. An owner can unlock it for a customer who called support;
 * audited. The PIN itself is never shown or sent here.
 */
export function TransactionPinRow({
  userId,
  pin,
  isOwner,
  onChanged,
}: {
  userId: string;
  pin?: TransactionPinInfo;
  isOwner: boolean;
  onChanged: () => void;
}) {
  const [pending, start] = useTransition();

  const unlock = () =>
    start(async () => {
      if (!globalThis.confirm('Unlock this customer\'s PIN?\n\nOnly do this after checking it is really them. Five wrong PINs can mean someone else has their phone.')) return;
      const result = await unlockTransactionPin(userId);
      if (result.error) {
        toast.error('Could not unlock', { description: result.error });
        return;
      }
      toast.success('PIN unlocked', { description: 'They can send, withdraw and swap again with their PIN.' });
      onChanged();
    });

  return (
    <div className="flex min-w-0 items-baseline justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">Transaction PIN</dt>
      <dd className="flex min-w-0 items-baseline gap-2 text-right">
        <span className="truncate">{pinLabel(pin)}</span>
        {isOwner && canUnlockPin(pin) ? (
          <button type="button" disabled={pending} onClick={unlock} className="text-primary t-caption shrink-0 hover:underline disabled:opacity-50">
            Unlock
          </button>
        ) : null}
      </dd>
    </div>
  );
}
