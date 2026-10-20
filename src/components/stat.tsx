import { InfoTip } from '@/components/info-tip';
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
  tip,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
  /** What the figure means, behind an "i". */
  tip?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="flex items-center gap-1.5">
        <span className="eyebrow">{label}</span>
        {tip ? <InfoTip text={tip} /> : null}
      </span>
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
