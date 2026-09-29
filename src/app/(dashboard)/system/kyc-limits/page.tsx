import { api, ApiError } from '@/lib/api';
import type { AdminMe, KycTierLimit } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { KycLimitsForm } from '@/components/kyc-limits-form';

export const dynamic = 'force-dynamic';

export default async function KycLimitsPage() {
  const [limits, me] = await Promise.all([
    api<KycTierLimit[]>('/v1/admin/kyc-limits').catch((e: ApiError) => e),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (limits instanceof ApiError) {
    return (
      <>
        <PageHeader title="KYC limits" />
        <ErrorState title="Could not load the limits" detail={limits.message} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="KYC limits"
        description="How much naira each verification tier may move, per transaction and per day. Naira only — a tier caps the leg that touches a bank, which is what verifying an identity is for."
      />
      <KycLimitsForm
        limits={limits}
        canEdit={me?.permissions.includes('kyc.limits') ?? false}
      />
    </>
  );
}
