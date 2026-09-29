import { cn } from '@/lib/utils';

/**
 * One figure with its label. Deliberately not a card — a grid of bordered
 * boxes flattens hierarchy, and these are meant to be scanned as a row.
 */
export function Stat({
  label,
  value,
  hint,
  tone = 'default',
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="eyebrow">{label}</span>
      <span
        className={cn(
          'text-2xl font-semibold tracking-tight tnum',
          tone === 'success' && 'text-success',
          tone === 'warning' && 'text-warning',
          tone === 'destructive' && 'text-destructive',
        )}
      >
        {value}
      </span>
      {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
    </div>
  );
}
