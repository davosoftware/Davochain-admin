import Link from 'next/link';
import { Gauge } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { LEVEL_NAMES, limitsHref, type DailyLimitsPage, type LimitsState } from '@/lib/daily-limits';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { LimitUsage, shownLimits } from '@/components/limit-usage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

const ACTIONS: Array<[string, string]> = [
  ['', 'All'],
  ['BUY', 'Buy'],
  ['SELL', 'Sell'],
  ['SWAP', 'Swap'],
  ['CRYPTO_WITHDRAW', 'Crypto out'],
  ['NGN_DEPOSIT', 'Naira in'],
  ['NGN_WITHDRAW', 'Naira out'],
  ['GIFTCARD_SELL', 'Gift cards'],
];
const NEAR: Array<[string, string]> = [
  ['', 'Everyone active'],
  ['50', '50% or more'],
  ['80', '80% or more'],
  ['100', 'At the limit'],
];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/**
 * People → Daily limits (27 Oct 2026): how much of each verification-level
 * limit every customer used on a day, counted exactly as the limits check
 * counts it (the check refuses anything over a limit; naira deposits over it
 * are held). Read-only.
 */
export default async function DailyLimitsPageView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const state: LimitsState = {
    date: /^\d{4}-\d{2}-\d{2}$/.test(one(params.date)) ? one(params.date) : '',
    action: ACTIONS.some(([k]) => k === one(params.action)) ? one(params.action) : '',
    near: NEAR.some(([k]) => k === one(params.near)) ? one(params.near) : '',
    search: one(params.search).trim(),
    page: Math.max(1, Number(one(params.page)) || 1),
  };
  const query = limitsHref(state, { page: state.page }).split('?')[1] ?? '';
  const data = await api<DailyLimitsPage>(`/v1/admin/limits/daily?${query}`).catch((e: ApiError) => e);

  if (data instanceof ApiError) {
    return (
      <>
        <PageHeader title="Daily limits" />
        <ErrorState title="Could not load the daily limits" detail={data.message} />
      </>
    );
  }

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <>
      <PageHeader
        title="Daily limits"
        description="How much of their verification level's daily limits each customer used, counted exactly as the limits check counts it. Anything over a limit is refused (naira deposits are held for review). Change the limits on System → Verification levels."
      />

      <Card className="mb-5">
        <CardContent className="flex flex-col gap-4 pt-5">
          <form action="/limits" className="flex flex-wrap items-end gap-3">
            {state.action ? <input type="hidden" name="action" value={state.action} /> : null}
            {state.near ? <input type="hidden" name="near" value={state.near} /> : null}
            <label className="grid gap-1.5">
              <span className="t-caption text-muted-foreground">Day (Lagos time)</span>
              <Input type="date" name="date" defaultValue={state.date || data.date} className="w-44" />
            </label>
            <label className="grid flex-1 gap-1.5">
              <span className="t-caption text-muted-foreground">Customer</span>
              <Input name="search" defaultValue={state.search} placeholder="Email or name" className="max-w-sm" />
            </label>
            <Button type="submit" size="sm" variant="outline">
              Show
            </Button>
          </form>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="t-caption text-muted-foreground mr-1">Limit:</span>
            {ACTIONS.map(([k, label]) => (
              <Button key={k || 'all'} size="sm" variant={state.action === k ? 'secondary' : 'ghost'} asChild>
                <Link href={limitsHref(state, { action: k })}>{label}</Link>
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="t-caption text-muted-foreground mr-1">Show:</span>
            {NEAR.map(([k, label]) => (
              <Button key={k || 'all'} size="sm" variant={state.near === k ? 'secondary' : 'ghost'} asChild>
                <Link href={limitsHref(state, { near: k })}>{label}</Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {data.customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Gauge className="text-muted-foreground size-6" />
            <p className="t-small font-medium">No customers match</p>
            <p className="text-muted-foreground t-caption">Nobody used a limit on {data.date} with these filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.customers.map((c) => (
            <Card key={c.userId}>
              <CardContent className="flex flex-col gap-4 pt-5">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="t-small truncate font-medium">{c.name || c.email}</p>
                    <p className="text-muted-foreground t-caption truncate">{c.email}</p>
                  </div>
                  <Badge variant="outline">{LEVEL_NAMES[c.level]}</Badge>
                  {c.highestPercent !== null ? (
                    <Badge variant={c.highestPercent >= 100 ? 'destructive' : c.highestPercent >= 80 ? 'warning' : 'secondary'}>
                      {c.highestPercent >= 100 ? 'At a limit' : `Up to ${c.highestPercent}%`}
                    </Badge>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {shownLimits(c.actions).map((a) => (
                    <LimitUsage key={a.action} usage={a} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <span className="text-muted-foreground t-caption">
          {data.total} customer{data.total === 1 ? '' : 's'} · {data.date} · ₦{Number(data.ngnPerUsd).toLocaleString('en-US')} per $1 for
          conversions
        </span>
        <div className="flex gap-2">
          {data.page > 1 ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={limitsHref(state, { page: data.page - 1 })}>Previous</Link>
            </Button>
          ) : null}
          {data.page < pages ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={limitsHref(state, { page: data.page + 1 })}>Next</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}
