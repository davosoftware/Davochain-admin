import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * shadcn's Progress, without the extra Radix package: a bar for "how much of
 * a limit is used". The colour follows how close it is (calm, warning, full).
 */
function Progress({
  value,
  className,
  tone,
  ...props
}: React.ComponentProps<'div'> & { value: number | null; tone?: 'default' | 'warning' | 'destructive' }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const auto = tone ?? (pct >= 100 ? 'destructive' : pct >= 80 ? 'warning' : 'default');
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn('bg-secondary relative h-2 w-full overflow-hidden rounded-full', className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn(
          'h-full rounded-full transition-all',
          auto === 'destructive' ? 'bg-destructive' : auto === 'warning' ? 'bg-warning' : 'bg-primary',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export { Progress };
