import type { LucideIcon } from 'lucide-react';
import { CountUp } from '@/components/count-up';
import { cn } from '@/lib/utils';

export type Tile = 'blue' | 'green' | 'amber' | 'rose' | 'violet';

const TILE: Record<Tile, string> = {
  blue: 'bg-[var(--tile-blue-bg)] text-[var(--tile-blue-fg)]',
  green: 'bg-[var(--tile-green-bg)] text-[var(--tile-green-fg)]',
  amber: 'bg-[var(--tile-amber-bg)] text-[var(--tile-amber-fg)]',
  rose: 'bg-[var(--tile-rose-bg)] text-[var(--tile-rose-fg)]',
  violet: 'bg-[var(--tile-violet-bg)] text-[var(--tile-violet-fg)]',
};

/** The coloured square beside a figure. Decoration with a job: see globals.css. */
export function IconTile({
  icon: Icon,
  tone,
  size = 'md',
}: {
  icon: LucideIcon;
  tone: Tile;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl',
        size === 'md' ? 'size-11' : 'size-9',
        TILE[tone],
      )}
    >
      <Icon className={size === 'md' ? 'size-5' : 'size-4'} strokeWidth={2} />
    </span>
  );
}

/**
 * One figure, one card.
 *
 * The label sits above the number rather than beside it, because a column of
 * cards is read down the left edge — the label is what you scan and the number
 * is what you stop on.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone: Tile;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-card border-border/60 flex items-start justify-between gap-4 rounded-xl border p-5',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-muted-foreground t-small">{label}</p>
        <p className="t-figure mt-2 truncate">
          <CountUp value={value} />
        </p>
        {hint ? <p className="text-muted-foreground t-caption mt-1.5">{hint}</p> : null}
      </div>
      <IconTile icon={icon} tone={tone} />
    </div>
  );
}

/**
 * One card, several figures that only mean something together — the way KYC
 * tiers do. Splitting them into separate cards would imply they are unrelated.
 */
export function SplitStatCard({
  label,
  parts,
  icon,
  tone,
}: {
  label: string;
  parts: { label: string; value: string | number }[];
  icon: LucideIcon;
  tone: Tile;
}) {
  return (
    <div className="bg-card border-border/60 rounded-xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-muted-foreground t-small">{label}</p>
        <IconTile icon={icon} tone={tone} />
      </div>
      <div
        className="mt-4 grid gap-x-4 gap-y-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))' }}
      >
        {parts.map((part) => (
          <div key={part.label} className="min-w-0">
            <p className="text-muted-foreground t-caption">{part.label}</p>
            <p className="t-title mt-1 truncate">
              <CountUp value={part.value} />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A wallet: one titled card holding a grid of its own figures.
 *
 * The nesting is the point — "₦5,087 deposited" is meaningless floating on a
 * dashboard, and obvious under a heading that says NGN Wallet.
 */
export function WalletCard({
  title,
  subtitle,
  icon,
  tone,
  stats,
  columns = 3,
  action,
  footer,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  tone: Tile;
  stats: { label: string; value: string; hint?: string }[];
  /** How many across on a wide screen. Pick the one that fills the last row. */
  columns?: 2 | 3 | 4;
  /** A way through to the screen these figures are summarised from. */
  action?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const wide = { 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4' }[columns];
  return (
    <div className="bg-card border-border/60 rounded-xl border p-5">
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone={tone} />
        <div className="min-w-0">
          <h2 className="t-section">{title}</h2>
          {subtitle ? (
            <p className="text-muted-foreground t-caption mt-0.5">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="ml-auto">{action}</div> : null}
      </div>

      <div className={cn('mt-5 grid gap-3 sm:grid-cols-2', wide)}>
        {stats.map((stat) => (
          <div key={stat.label} className="border-border/60 bg-background/60 rounded-lg border p-3.5">
            <p className="text-muted-foreground t-caption">{stat.label}</p>
            <p className="t-title mt-1.5 truncate">
              <CountUp value={stat.value} />
            </p>
            {stat.hint ? (
              <p className="text-muted-foreground t-caption mt-1 leading-tight opacity-80">
                {stat.hint}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}

/** A plain titled card for anything that is not a grid of figures. */
export function PanelCard({
  title,
  icon,
  tone,
  action,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  tone: Tile;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-card border-border/60 flex flex-col rounded-xl border', className)}>
      <div className="flex items-center gap-3 p-5 pb-4">
        <IconTile icon={icon} tone={tone} size="sm" />
        <h2 className="t-section flex-1">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
