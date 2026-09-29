import { Badge } from '@/components/ui/badge';

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
    <Badge variant={TONE[status] ?? 'outline'}>{status.replace(/_/g, ' ').toLowerCase()}</Badge>
  );
}
