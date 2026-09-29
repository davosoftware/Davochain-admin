'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <ErrorState title="Something went wrong" detail={error.message} />
      <Button variant="outline" className="mt-4" onClick={reset}>
        <RefreshCw className="size-4" />
        Try again
      </Button>
    </div>
  );
}
