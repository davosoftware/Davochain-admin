import { cn } from '@/lib/utils';

/**
 * Five tints from the chart palette, chosen by the id.
 *
 * Deterministic rather than random so a colleague's face-less initials are the
 * same colour on every screen and every reload — that consistency is what makes
 * a list of people scannable at a glance.
 */
const TINTS = [
  'bg-[oklch(0.93_0.045_259)] text-[oklch(0.42_0.15_259)]',
  'bg-[oklch(0.93_0.04_162)] text-[oklch(0.40_0.11_162)]',
  'bg-[oklch(0.94_0.05_62)] text-[oklch(0.42_0.11_62)]',
  'bg-[oklch(0.94_0.04_25)] text-[oklch(0.44_0.14_25)]',
  'bg-[oklch(0.93_0.04_300)] text-[oklch(0.42_0.13_300)]',
];

function tintFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

export function initialsOf(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length > 0) return parts[0].slice(0, 2).toUpperCase();
  return (email.trim()[0] ?? '?').toUpperCase();
}

/**
 * A picture if there is one, initials if there is not.
 *
 * The image is served through this app rather than linked straight to the API:
 * the admin token is httpOnly, so a browser <img> could never carry it.
 */
export function Avatar({
  id,
  name,
  email,
  version,
  size = 36,
  className,
}: {
  id: string;
  name: string;
  email: string;
  /** Bumped whenever the picture changes; absent means there is none. */
  version?: string | null;
  size?: number;
  className?: string;
}) {
  const dimension = { width: size, height: size };

  return (
    <span
      style={dimension}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'ring-border/60 ring-1',
        version ? 'bg-muted' : tintFor(id),
        className,
      )}
    >
      {version ? (
        // eslint-disable-next-line @next/next/no-img-element -- bytes come from
        // our own proxy route, not a remote host the image loader can optimise.
        <img
          src={`/avatar/${id}?v=${version}`}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
        />
      ) : (
        <span
          className="font-semibold leading-none select-none"
          style={{ fontSize: Math.max(10, Math.round(size * 0.36)) }}
        >
          {initialsOf(name, email)}
        </span>
      )}
    </span>
  );
}
