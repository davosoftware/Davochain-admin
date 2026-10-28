'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { startsNavigation } from '@/lib/route-progress';

/**
 * A thin brand-blue bar across the top while the next page loads (the
 * "nprogress" bar of the shadcn dashboards). Dashboard pages wait on the API,
 * so this says "your click was heard" before the page arrives.
 *
 * Driven straight on the element, not through React state: it starts on the
 * click and finishes when the address changes.
 */
export function RouteProgress() {
  const bar = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const running = useRef(false);
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const clear = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
    const set = (width: string, opacity: string, ms: number) => {
      const el = bar.current;
      if (!el) return;
      el.style.transition = `width ${ms}ms ease-out, opacity 300ms ease`;
      el.style.width = width;
      el.style.opacity = opacity;
    };

    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || e.defaultPrevented) return;
      if (!startsNavigation(e, { href: a.href, target: a.target, download: a.hasAttribute('download') }, window.location.href)) return;
      clear();
      running.current = true;
      set('0%', '1', 0);
      // Creep towards the end without ever reaching it until the page is in.
      timers.current.push(window.setTimeout(() => set('35%', '1', 400), 20));
      timers.current.push(window.setTimeout(() => set('65%', '1', 1500), 450));
      timers.current.push(window.setTimeout(() => set('85%', '1', 4000), 2000));
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      clear();
    };
  }, []);

  // The address changed: the new page is here. Finish and fade out.
  useEffect(() => {
    if (!running.current) return;
    running.current = false;
    timers.current.forEach((t) => window.clearTimeout(t));
    const el = bar.current;
    if (!el) return;
    el.style.transition = 'width 200ms ease-out, opacity 300ms ease 200ms';
    el.style.width = '100%';
    el.style.opacity = '0';
  }, [pathname, search]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5">
      <div
        ref={bar}
        className="bg-primary h-full w-0 opacity-0 shadow-[0_0_10px_var(--primary),0_0_4px_var(--primary)]"
      />
    </div>
  );
}
