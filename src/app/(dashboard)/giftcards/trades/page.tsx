import { api, ApiError } from '@/lib/api';
import type { AdminMe, GiftCardTradesPage } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { GiftCardTrades } from '@/components/giftcards/trades';

export const dynamic = 'force-dynamic';

const FORWARDED = ['status', 'search', 'page', 'pageSize'] as const;

export default async function Page({
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

  const [data, me] = await Promise.all([
    api<GiftCardTradesPage>(`/v1/admin/giftcards/trades?${query}`).catch((e: ApiError) => e),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (data instanceof ApiError) {
    return (
      <>
        <PageHeader title="Card trades" />
        <ErrorState
          title="Could not load card trades"
          detail={
            data.status === 403
              ? 'Your account does not have the "See gift cards and trades" permission. An owner can grant it from the team screen.'
              : data.message
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Gift card trades"
        description="Every card somebody has offered. Approving one credits real naira."
      />
      {/*
        * The decision buttons are not drawn without giftcards.review — but the
        * guard that matters is on the API, which refuses the call whatever the
        * browser chooses to render.
        */}
      <GiftCardTrades
        data={data}
        canReview={me?.permissions.includes('giftcards.review') ?? false}
      />
    </>
  );
}
