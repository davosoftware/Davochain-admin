import { api, ApiError } from '@/lib/api';
import type { AdminMe, ReferralSettings, ReferralsPage } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { ReferralManager } from '@/components/referral-manager';

export const dynamic = 'force-dynamic';

const FORWARDED = ['status', 'search', 'page', 'pageSize'] as const;

export default async function ReferralsPage({
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

  const [settings, data, me] = await Promise.all([
    api<ReferralSettings>('/v1/admin/referrals/settings').catch((e: ApiError) => e),
    api<ReferralsPage>(`/v1/admin/referrals?${query}`).catch((e: ApiError) => e),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (settings instanceof ApiError || data instanceof ApiError) {
    const err = settings instanceof ApiError ? settings : (data as ApiError);
    return (
      <>
        <PageHeader title="Rewards & referrals" />
        <ErrorState
          title="Could not load referrals"
          detail={
            err.status === 403
              ? 'Your account does not have the "See referrals and rewards" permission. An owner can grant it from the team screen.'
              : err.message
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Rewards & referrals"
        description="What each side is paid, what unlocks it, and everybody who has been invited."
      />
      {/*
        * The form is read-only without referrals.manage. The guard that
        * matters is on the API, which refuses the write whatever the browser
        * chooses to draw.
        */}
      <ReferralManager
        settings={settings}
        data={data}
        canManage={me?.permissions.includes('referrals.manage') ?? false}
      />
    </>
  );
}
