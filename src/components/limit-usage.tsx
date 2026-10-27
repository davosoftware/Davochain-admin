import type { ActionUsage } from '@/lib/daily-limits';
import { usageLine } from '@/lib/daily-limits';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/** One limit: its name, "used of limit" and a bar (amber from 80%, red at 100%). */
export function LimitUsage({ usage }: { usage: ActionUsage }) {
  const pct = usage.percent;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="t-caption font-medium first-letter:uppercase">{usage.label}</span>
        <span
          className={cn(
            't-caption tabular-nums',
            pct !== null && pct >= 100
              ? 'text-destructive font-medium'
              : pct !== null && pct >= 80
                ? 'text-warning font-medium'
                : 'text-muted-foreground',
          )}
        >
          {pct !== null ? `${pct}%` : ''}
        </span>
      </div>
      <Progress value={usage.allowed ? pct : 0} />
      <span className="text-muted-foreground text-[0.7rem] tabular-nums">{usageLine(usage)}</span>
    </div>
  );
}

/** Only the limits worth showing: used that day, or with a daily limit set. */
export function shownLimits(actions: ActionUsage[]): ActionUsage[] {
  return actions.filter((a) => Number(a.used) > 0 || (a.allowed && a.maxPerDay));
}
