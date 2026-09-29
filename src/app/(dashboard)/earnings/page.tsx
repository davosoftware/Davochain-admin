import { api, ApiError } from '@/lib/api';
import type { EarningsPage } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { EarningsManager } from '@/components/earnings-manager';
import { formatNaira, formatUsd } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** Only what the API accepts, so a stray param cannot 400 the whole screen. */
const FORWARDED = [
  'kind',
  'currency',
  'type',
  'search',
  'from',
  'to',
  'sort',
  'direction',
  'page',
  'pageSize',
] as const;

export default async function EarningsPageRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of FORWARDED) {
    const value = params[key];
    const single = Array.isArray(value) ? value[0] : value;
    if (single) query.set(key, single);
  }

  const data = await api<EarningsPage>(`/v1/admin/earnings?${query}`).catch((e: ApiError) => e);

  if (data instanceof ApiError) {
    return (
      <>
        <PageHeader title="Earning manager" />
        <ErrorState
          title="Could not load earnings"
          detail={
            data.status === 403
              ? 'Your account does not have the "See the earnings manager" permission. An owner can grant it from the team screen.'
              : data.message
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Earning manager"
        description="Every fee the platform has kept, and the trade and person it came from."
        action={
          <div className="text-right">
            <p className="eyebrow">Total earned{params.from || params.to ? ' in range' : ''}</p>
            {/*
              * Two figures, never one.
              *
              * The rate fee is naira folded into a naira trade; the swap fee is
              * a flat dollar charge on a trade with no naira leg at all. Adding
              * them needs an exchange rate, and picking one would let today's
              * rate silently rewrite last month's earnings on every reload.
              */}
            <p className="t-title tabular-nums">
              {formatNaira(data.summary.all.ngn)}
              <span className="text-muted-foreground mx-1.5 font-normal">·</span>
              {formatUsd(data.summary.all.usd)}
            </p>
          </div>
        }
      />

      <EarningsManager data={data} />
    </>
  );
}
