import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--muted)_0%,var(--secondary)_25%,var(--card)_50%,var(--secondary)_75%,var(--muted)_100%)] bg-[length:200%_100%]', className)} {...props} />;
}

export { Skeleton };
