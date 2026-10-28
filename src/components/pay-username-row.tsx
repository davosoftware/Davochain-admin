'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { removePayUsername } from '@/app/actions/users';
import { payUsernameLabel } from '@/lib/peer';

/**
 * The customer's payment username (28 Oct 2026), the name others send crypto
 * to. An offensive one can be removed with a reason the customer is told; they
 * get a new generated one at once, and the old name is kept from everyone else
 * for 30 days. Needs "Suspend and
 * reinstate users"; audited.
 */
export function PayUsernameRow({ userId, username, onChanged }: { userId: string; username?: string | null; onChanged: () => void }) {
  const [pending, start] = useTransition();
  const label = payUsernameLabel(username);

  const remove = () =>
    start(async () => {
      const reason = globalThis.prompt(`Remove ${label}?\n\nWhy? (at least 10 characters — the customer is told this exact text)`);
      if (!reason?.trim()) return;
      const result = await removePayUsername(userId, reason.trim());
      if (result.error) {
        toast.error('Could not remove', { description: result.error });
        return;
      }
      toast.success(`${label} removed`, {
        description: result.newUsername
          ? `They now have @${result.newUsername} and were told why. They can choose another.`
          : 'The customer was told why and can choose a new one.',
      });
      onChanged();
    });

  return (
    <div className="flex min-w-0 items-baseline justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">Payment username</dt>
      <dd className="flex min-w-0 items-baseline gap-2 text-right">
        <span className="truncate" title={label}>
          {label}
        </span>
        {username ? (
          <button type="button" disabled={pending} onClick={remove} className="text-destructive t-caption shrink-0 hover:underline disabled:opacity-50">
            Remove
          </button>
        ) : null}
      </dd>
    </div>
  );
}
