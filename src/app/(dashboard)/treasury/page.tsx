import { api, ApiError } from '@/lib/api';
import type { AdminMe } from '@/lib/types-admin';
import type { TreasurySnapshot } from '@/lib/treasury';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { TreasuryBoard } from '@/components/treasury-board';

export const dynamic = 'force-dynamic';

export default async function TreasuryPage() {
  const [snapshot, banks, me] = await Promise.all([
    api<TreasurySnapshot>('/v1/admin/treasury').catch((e: ApiError) => e),
    api<Array<{ code: string; name: string }>>('/v1/admin/treasury/banks').catch(() => [] as Array<{ code: string; name: string }>),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  const header = (
    <PageHeader
      title="Treasury"
      description="Is there enough naira to cover what customers own? This shows our naira at the naira rail (Flutterwave) and at Quidax against what customers are owed, the payout reserve, and lets an owner send naira to Quidax for buying coins."
    />
  );

  if (snapshot instanceof ApiError) {
    return (
      <>
        {header}
        <ErrorState title={snapshot.status === 403 ? 'You need the "See treasury" permission' : 'Could not load the treasury'} detail={snapshot.message} />
      </>
    );
  }

  return (
    <>
      {header}
      <TreasuryBoard s={snapshot} banks={banks} isOwner={me?.role === 'OWNER'} />
    </>
  );
}
