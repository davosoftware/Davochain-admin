import { cn } from '@/lib/utils';

/** Interlocking links — a chain, and a ledger's paired entries. Always the brand blue, whatever the theme. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('size-6', className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#135CF7" />
      <path
        d="M11 12.5a3.5 3.5 0 0 1 3.5-3.5h1.25a3.5 3.5 0 0 1 0 7H14.5"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M21 19.5a3.5 3.5 0 0 1-3.5 3.5h-1.25a3.5 3.5 0 0 1 0-7h1.25"
        stroke="#ffffff"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
