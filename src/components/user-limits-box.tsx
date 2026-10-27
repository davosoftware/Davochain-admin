'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUserLimits } from '@/app/actions/limits';
import type { CustomerUsage } from '@/lib/daily-limits';
import { LEVEL_NAMES } from '@/lib/daily-limits';
import { LimitUsage, shownLimits } from '@/components/limit-usage';
import { Skeleton } from '@/components/ui/skeleton';

/** "Today vs limits" in a customer's row on the Users page (27 Oct 2026). */
export function UserLimitsBox({ userId }: { userId: string }) {
  const [state, setState] = useState<{ customer?: CustomerUsage | null; date?: string; error?: string } | null>(null);

  useEffect(() => {
    let live = true;
    getUserLimits(userId).then((r) => live && setState(r));
    return () => {
      live = false;
    };
  }, [userId]);

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="eyebrow">Today vs limits</h3>
        {state?.customer ? (
          <span className="text-muted-foreground t-caption">
            {LEVEL_NAMES[state.customer.level]} level · {state.date} ·{' '}
            <Link className="text-primary hover:underline" href={`/limits?search=${encodeURIComponent(state.customer.email)}`}>
              other days
            </Link>
          </span>
        ) : null}
      </div>
      {!state ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : state.error ? (
        <p className="text-muted-foreground t-caption">{state.error}</p>
      ) : !state.customer || shownLimits(state.customer.actions).length === 0 ? (
        <p className="text-muted-foreground t-caption">Nothing used today, and no daily limits set at this level.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shownLimits(state.customer.actions).map((a) => (
            <LimitUsage key={a.action} usage={a} />
          ))}
        </div>
      )}
    </div>
  );
}
