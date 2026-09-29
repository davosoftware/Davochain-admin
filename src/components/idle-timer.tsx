'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** How long before the deadline the warning appears. */
const WARN_BEFORE_MS = 60_000;

/**
 * How often activity is reported to the API.
 *
 * The session clock only advances when a request arrives, so someone filling in
 * a long form is active here and silent there. Far enough apart to be cheap,
 * far enough inside a thirty-minute timeout to never be the reason it fires.
 */
const PING_EVERY_MS = 5 * 60_000;

/**
 * Signs an idle admin out, and says so before it happens.
 *
 * The API is the authority — it closes the session on its own clock and refuses
 * the next request regardless. This exists so being signed out looks like being
 * signed out, rather than a dashboard that silently stops working the next time
 * somebody clicks something.
 *
 * The countdown restarts on interaction that implies a person: a pointer, a
 * key, a scroll. Not mouse movement — something resting on a trackpad should
 * not hold a treasury dashboard open all night.
 */
export function IdleTimer({ timeoutMs }: { timeoutMs: number }) {
  const router = useRouter();
  const deadline = useRef(Date.now() + timeoutMs);
  const lastPing = useRef(Date.now());
  const finished = useRef(false);
  const [msLeft, setMsLeft] = useState(timeoutMs);

  const ping = useCallback(async () => {
    lastPing.current = Date.now();
    const res = await fetch('/api/keepalive', { cache: 'no-store' }).catch(() => null);
    if (res && res.status === 401 && !finished.current) {
      finished.current = true;
      // Already over on the server — let the server say so.
      router.refresh();
    }
  }, [router]);

  const stayActive = useCallback(() => {
    deadline.current = Date.now() + timeoutMs;
    setMsLeft(timeoutMs);
    if (Date.now() - lastPing.current > PING_EVERY_MS) void ping();
  }, [ping, timeoutMs]);

  useEffect(() => {
    const events = ['pointerdown', 'keydown', 'scroll'] as const;
    for (const e of events) window.addEventListener(e, stayActive, { passive: true });

    const tick = setInterval(() => {
      const left = deadline.current - Date.now();
      setMsLeft(left);

      if (left <= 0 && !finished.current) {
        finished.current = true;
        // Any request now 401s and the server bounces to /login with the
        // reason attached. Asking for one beats duplicating that logic here,
        // and keeps the API the single source of truth about the session.
        router.refresh();
      }
    }, 1000);

    return () => {
      for (const e of events) window.removeEventListener(e, stayActive);
      clearInterval(tick);
    };
  }, [router, stayActive]);

  if (msLeft > WARN_BEFORE_MS) return null;

  const seconds = Math.max(0, Math.ceil(msLeft / 1000));

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-warning/40 bg-warning/10 fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border p-3 shadow-lg backdrop-blur"
    >
      <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="t-small font-medium">
          {seconds > 0 ? `Signing you out in ${seconds}s` : 'Signing you out…'}
        </p>
        <p className="text-muted-foreground t-caption mt-0.5">
          You have been idle. Anything unsaved on this page will be lost.
        </p>
      </div>
      <Button
        size="sm"
        className="shrink-0"
        onClick={() => {
          deadline.current = Date.now() + timeoutMs;
          setMsLeft(timeoutMs);
          void ping();
        }}
      >
        Stay
      </Button>
    </div>
  );
}
