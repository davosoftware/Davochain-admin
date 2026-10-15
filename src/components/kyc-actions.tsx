'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { reviewKyc } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';

export function KycActions({ userId, name }: { userId: string; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const decide = (approve: boolean) =>
    start(async () => {
      const reason = approve
        ? undefined
        : (globalThis.prompt('Why is this being rejected? The user sees this.') ?? undefined);
      if (!approve && !reason) return;

      const result = await reviewKyc(userId, approve, reason);
      if (result.error) {
        toast.error('Could not save the decision', { description: result.error });
        return;
      }
      toast.success(approve ? `${name} approved as Basic` : `${name} rejected`, {
        description: approve ? 'They can trade once they sign in again.' : reason,
      });
      router.refresh();
    });

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" loading={pending} onClick={() => decide(false)}>
        <X className="size-4" />
        Reject
      </Button>
      <Button size="sm" loading={pending} onClick={() => decide(true)}>
        <Check className="size-4" />
        Approve
      </Button>
    </div>
  );
}
