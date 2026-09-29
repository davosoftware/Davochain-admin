'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Coins } from 'lucide-react';
import { toast } from 'sonner';
import { claimFees } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';

export function ClaimButton({ assets }: { assets: string[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      loading={pending}
      onClick={() =>
        start(async () => {
          const result = await claimFees(assets);
          if (result.error) {
            toast.error('Claim failed', { description: result.error });
            return;
          }
          // Enqueued, not done — a run of 400 receivables takes a while on the
          // throttled background lane, and saying "claimed" would be a lie.
          toast.success('Claim run queued', {
            description: `${result.queued} receivable(s) queued. It runs in the background.`,
          });
          router.refresh();
        })
      }
    >
      <Coins className="size-4" />
      Claim all
    </Button>
  );
}
