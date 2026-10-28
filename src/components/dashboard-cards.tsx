import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { CountUp } from '@/components/count-up';
import { InfoTip } from '@/components/info-tip';
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
  tip,
  link,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone: Tile;
  /** What the figure means, behind an "i". */
  tip?: string;
  /** A small "See …" button to the page behind the figure. */
  link?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        'from-secondary to-card dark:bg-card bg-linear-to-t border-border/60 flex items-start justify-between gap-4 rounded-xl border p-5 shadow-xs lift',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-muted-foreground t-small">{label}</p>
          {tip ? <InfoTip text={tip} /> : null}
        </div>
        <p className="t-figure mt-2 truncate">
          <CountUp value={value} />
        </p>
        {hint ? <p className="text-muted-foreground t-caption mt-1.5">{hint}</p> : null}
        {link ? <CardLink {...link} /> : null}
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
  tip,
  link,
  columns,
  className,
}: {
  label: string;
  parts: { label: string; value: string | number }[];
  icon: LucideIcon;
  tone: Tile;
  tip?: string;
  link?: { href: string; label: string };
  /** A fixed number of columns; otherwise as many as fit. */
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'from-secondary to-card dark:bg-card bg-linear-to-t border-border/60 rounded-xl border p-5 shadow-xs lift',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <p className="text-muted-foreground t-small">{label}</p>
          {tip ? <InfoTip text={tip} /> : null}
        </div>
        <IconTile icon={icon} tone={tone} />
      </div>
      <div
        className="mt-4 grid gap-x-4 gap-y-3"
        style={{
          gridTemplateColumns: columns ? `repeat(${columns}, minmax(0, 1fr))` : 'repeat(auto-fit, minmax(84px, 1fr))',
        }}
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
      {link ? <CardLink {...link} /> : null}
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
  tip,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  tone: Tile;
  /** Each figure may carry its own "i"; `tip` explains the card as a whole. */
  stats: { label: string; value: string; hint?: string; tip?: string }[];
  tip?: string;
  /** How many across on a wide screen. Pick the one that fills the last row. */
  columns?: 2 | 3 | 4;
  /** A way through to the screen these figures are summarised from. */
  action?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const wide = { 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4' }[columns];
  return (
    <div className="from-secondary to-card dark:bg-card bg-linear-to-t border-border/60 rounded-xl border p-5 shadow-xs lift">
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone={tone} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="t-section">{title}</h2>
            {tip ? <InfoTip text={tip} /> : null}
          </div>
          {subtitle ? (
            <p className="text-muted-foreground t-caption mt-0.5">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="ml-auto">{action}</div> : null}
      </div>

      <div className={cn('mt-5 grid gap-3 sm:grid-cols-2', wide)}>
        {stats.map((stat) => (
          <div key={stat.label} className="border-border/60 bg-card rounded-lg border p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5">
              <p className="text-muted-foreground t-caption">{stat.label}</p>
              {stat.tip ? <InfoTip text={stat.tip} /> : null}
            </div>
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
  tip,
}: {
  title: string;
  icon: LucideIcon;
  tone: Tile;
  tip?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-card border-border/60 flex flex-col rounded-xl border shadow-xs', className)}>
      <div className="flex items-center gap-3 p-5 pb-4">
        <IconTile icon={icon} tone={tone} size="sm" />
        <div className="flex flex-1 items-center gap-1.5">
          <h2 className="t-section">{title}</h2>
          {tip ? <InfoTip text={tip} /> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** The small outlined "See report →" button under a figure. */
export function CardLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="bg-card border-border/70 hover:bg-secondary group mt-3 inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium shadow-xs transition-colors"
    >
      {label}
      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
