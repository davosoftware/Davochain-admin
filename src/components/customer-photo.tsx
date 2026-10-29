'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { removeCustomerPhoto } from '@/app/actions/users';
import { customerPhotoSrc } from '@/lib/customer-photo';

/**
 * The customer's profile photo (29 Oct 2026), at the top of their details.
 * An offensive one can be removed with a reason the customer is told; they can
 * upload another. Needs "Suspend and reinstate users"; audited.
 */
export function CustomerPhoto({
  userId,
  avatarUrl,
  firstName,
  lastName,
  onChanged,
}: {
  userId: string;
  avatarUrl?: string | null;
  firstName: string;
  lastName: string;
  onChanged: () => void;
}) {
  const [pending, start] = useTransition();
  const src = customerPhotoSrc(avatarUrl);
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  const remove = () =>
    start(async () => {
      const reason = globalThis.prompt('Remove this profile photo?\n\nWhy? (at least 10 characters — the customer is told this exact text)');
      if (!reason?.trim()) return;
      const result = await removeCustomerPhoto(userId, reason.trim());
      if (result.error) {
        toast.error('Could not remove', { description: result.error });
        return;
      }
      toast.success('Photo removed', { description: 'The customer was told why and can upload another.' });
      onChanged();
    });

  return (
    <div className="mb-3 flex items-center gap-3">
      {src ? (
        // A private, signed-in picture from our own route: next/image adds nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`${firstName} ${lastName}`} className="border-border size-14 rounded-full border object-cover" />
      ) : (
        <div className="bg-secondary text-muted-foreground t-small flex size-14 items-center justify-center rounded-full font-medium">
          {initials || '?'}
        </div>
      )}
      <div className="t-small flex flex-col">
        <span className="text-muted-foreground">{src ? 'Profile photo' : 'No profile photo'}</span>
        {src ? (
          <button type="button" disabled={pending} onClick={remove} className="text-destructive t-caption self-start hover:underline disabled:opacity-50">
            Remove photo
          </button>
        ) : null}
      </div>
    </div>
  );
}
