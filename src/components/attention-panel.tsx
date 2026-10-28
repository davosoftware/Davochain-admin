import Link from 'next/link';
import { AlertTriangle, ArrowRight, CircleCheck, Clock, OctagonAlert } from 'lucide-react';
import type { AttentionItem } from '@/lib/overview';
import { cn } from '@/lib/utils';

const TONE = {
  danger: { icon: OctagonAlert, row: 'border-destructive/30 bg-destructive/5', fg: 'text-destructive' },
  warning: { icon: AlertTriangle, row: 'border-warning/40 bg-warning/5', fg: 'text-warning' },
  info: { icon: Clock, row: 'border-border/60 bg-muted/40', fg: 'text-muted-foreground' },
} as const;

/**
 * "Needs your attention" on the Overview: each problem in plain words with a
 * link to the page that fixes it, or a calm "All clear" when there is none.
 */
export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="border-success/30 bg-success/5 flex items-center gap-3 rounded-xl border px-5 py-4">
        <CircleCheck className="text-success size-5 shrink-0" />
        <div>
          <p className="t-small font-medium">All clear</p>
          <p className="text-muted-foreground t-caption">Nothing needs you right now. Stock, records and transactions look fine.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-card border-border/60 rounded-xl border p-5">
      <h2 className="t-section mb-3">
        Needs your attention <span className="text-muted-foreground font-normal">({items.length})</span>
      </h2>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => {
          const t = TONE[item.tone];
          const Icon = t.icon;
          return (
            <li key={item.title}>
              <Link
                href={item.href}
                className={cn(
                  'group flex flex-col gap-2 rounded-lg border px-4 py-3 transition-colors hover:bg-accent/60 sm:flex-row sm:items-center',
                  t.row,
                )}
              >
                <Icon className={cn('size-4 shrink-0', t.fg)} />
                <div className="min-w-0 flex-1">
                  <p className="t-small font-medium">{item.title}</p>
                  <p className="text-muted-foreground t-caption">{item.detail}</p>
                </div>
                <span className="text-primary t-caption inline-flex shrink-0 items-center gap-1 font-medium">
                  {item.action}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
