import { Badge } from '@/components/ui/badge';
import { STATUS_HELP } from '@/lib/overview';

const TONE: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'default'> = {
  COMPLETED: 'success',
  APPROVED: 'success',
  PENDING: 'secondary',
  PROCESSING: 'default',
  ON_HOLD: 'warning',
  RECONCILING: 'warning',
  FAILED: 'destructive',
  REJECTED: 'destructive',
};

/**
 * RECONCILING deliberately reads as a warning, never as a failure — the
 * outcome is unknown and the funds are held on purpose.
 */
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={TONE[status] ?? 'outline'} title={STATUS_HELP[status]}>
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-80" />
      {status.replace(/_/g, ' ').toLowerCase()}
    </Badge>
  );
}
