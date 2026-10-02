import { api, ApiError } from '@/lib/api';
import type { AdminMe, NgnWithdrawalsState } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { NgnWithdrawalSwitch } from '@/components/ngn-withdrawal-switch';

export const dynamic = 'force-dynamic';

/**
 * The switch for naira bank withdrawals: a live override of the server's
 * NGN_WITHDRAWALS_ENABLED. Off stops new payouts within seconds; ones already
 * sent still finish or refund. Switching on releases real money, so only an
 * owner can, and every change costs the admin's password.
 */
export default async function WithdrawalsPage() {
  const [state, me] = await Promise.all([
    api<NgnWithdrawalsState>('/v1/admin/withdrawals/ngn').catch((e: ApiError) => e),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (state instanceof ApiError) {
    return (
      <>
        <PageHeader title="Withdrawals" />
        <ErrorState title="Could not load the withdrawal switch" detail={state.message} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Withdrawals"
        description="Switch naira bank withdrawals on or off without a deploy. This overrides the server setting until you reset it."
      />
      <NgnWithdrawalSwitch state={state} isOwner={me?.role === 'OWNER'} />
    </>
  );
}
