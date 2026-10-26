'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { retryAddress } from '@/app/actions/crypto-addresses';
import { addressAction, type AddressStatus } from '@/lib/crypto-addresses';
import { Button } from '@/components/ui/button';

/**
 * "Check again" (still waiting: asks Quidax, never makes a new address) or
 * "Try again" (failed). Needs "Suspend and reinstate users"; audited.
 */
export function AddressRetryButton({
  id,
  status,
  onDone,
}: {
  id: string;
  status: AddressStatus;
  onDone?: () => void;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const label = addressAction(status);
  if (!label) return null;

  const run = () =>
    start(async () => {
      const r = await retryAddress(id);
      if (r.error) {
        toast.error('Nothing changed', { description: r.error });
        return;
      }
      const now = r.address?.status;
      toast.success(
        now === 'ACTIVE' ? 'The address is ready' : now === 'PENDING' ? 'Asked Quidax again' : 'Still not ready',
        {
          description:
            now === 'ACTIVE'
              ? 'The customer can use it now.'
              : 'Quidax usually takes a few seconds. The customer is told when it is ready.',
        },
      );
      onDone?.();
      router.refresh();
    });

  return (
    <Button size="sm" variant={status === 'FAILED' ? 'default' : 'outline'} onClick={run} loading={pending}>
      <RefreshCw className="size-3.5" />
      {label}
    </Button>
  );
}
