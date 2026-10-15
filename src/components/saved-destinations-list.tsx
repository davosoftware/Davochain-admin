'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { removeSavedDestination } from '@/app/actions/users';
import type { UserDetail } from '@/lib/types-admin';
import { Button } from '@/components/ui/button';

/**
 * Where this customer's withdrawals may go (Part 2, C6). Bank numbers arrive
 * masked. Removing one (e.g. reported fraud) asks for a reason the customer
 * is emailed; it needs "Suspend and reinstate users" and is audited.
 */
export function SavedDestinationsList({
  userId,
  saved,
  onChanged,
}: {
  userId: string;
  saved: UserDetail['savedDestinations'];
  onChanged: () => void;
}) {
  const [pending, start] = useTransition();
  const banks = saved?.bankAccounts ?? [];
  const addresses = saved?.cryptoAddresses ?? [];

  const remove = (kind: 'bank' | 'crypto', id: string, label: string) =>
    start(async () => {
      const reason = globalThis.prompt(
        `Remove ${label}?\n\nWhy? (at least 10 characters — the customer is emailed this exact text)`,
      );
      if (!reason?.trim()) return;
      const result = await removeSavedDestination(userId, kind, id, reason.trim());
      if (result.error) {
        toast.error('Could not remove', { description: result.error });
        return;
      }
      toast.success(`${label} removed`, { description: 'The customer has been emailed.' });
      onChanged();
    });

  const waiting = (usableFrom: string, usableNow: boolean) =>
    usableNow ? null : (
      <span className="text-warning t-caption ml-1.5">usable {new Date(usableFrom).toLocaleString()}</span>
    );

  return (
    <div className="border-border/40 border-t px-5 py-4">
      <p className="eyebrow mb-2">Saved withdrawal destinations</p>
      {banks.length === 0 && addresses.length === 0 ? (
        <p className="text-muted-foreground t-small">None saved. This customer cannot withdraw until they add one.</p>
      ) : (
        <ul className="t-small grid gap-1.5">
          {banks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-4">
              <span>
                {b.bankName} <span className="font-mono">{b.accountNumberMasked}</span> · {b.accountName}
                {b.nickname ? <span className="text-muted-foreground"> ({b.nickname})</span> : null}
                {waiting(b.usableFrom, b.usableNow)}
              </span>
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => remove('bank', b.id, `${b.bankName} ${b.accountNumberMasked}`)}>
                Remove
              </Button>
            </li>
          ))}
          {addresses.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4">
              <span className="min-w-0 truncate">
                {a.assetCode.toUpperCase()} · {a.networkLabel} · <span className="font-mono">{a.address}</span>
                {a.destinationTag ? <span className="font-mono"> (tag {a.destinationTag})</span> : null}
                {a.nickname ? <span className="text-muted-foreground"> ({a.nickname})</span> : null}
                {waiting(a.usableFrom, a.usableNow)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => remove('crypto', a.id, `${a.assetCode.toUpperCase()} ${a.address.slice(0, 6)}…${a.address.slice(-4)}`)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
