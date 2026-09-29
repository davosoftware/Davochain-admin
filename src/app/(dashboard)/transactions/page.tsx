import { api, ApiError } from '@/lib/api';
import type { AdminMe, TxPage } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { TransactionsManager } from '@/components/transactions-manager';

export const dynamic = 'force-dynamic';

/** Only what the API accepts, so a stray param cannot 400 the whole screen. */
const FORWARDED = [
  'tab',
  'status',
  'type',
  'amountType',
  'mode',
  'search',
  'from',
  'to',
  'direction',
  'page',
  'pageSize',
] as const;

export default async function TransactionsPage({
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
    api<TxPage>(`/v1/admin/transactions/manager?${query}`).catch((e: ApiError) => e),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (data instanceof ApiError) {
    return (
      <>
        <PageHeader title="Transactions manager" />
        <ErrorState
          title="Could not load transactions"
          detail={
            data.status === 403
              ? 'Your account does not have the "See transactions" permission. An owner can grant it from the team screen.'
              : data.message
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Transactions manager"
        description="Every movement, what it cost, and the few that are waiting on a decision."
      />

      {/*
        * The approval buttons are not rendered without the permission — but the
        * guard that matters is on the API, which refuses the call whatever the
        * browser chooses to draw.
        */}
      <TransactionsManager
        data={data}
        canApprove={me?.permissions.includes('transactions.approve') ?? false}
      />
    </>
  );
}
