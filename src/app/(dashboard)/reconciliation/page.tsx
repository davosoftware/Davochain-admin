import { api, ApiError } from '@/lib/api';
import type { DriftRow } from '@/lib/types';
import type { AdminMe } from '@/lib/types-admin';
import type { CorrectionRow } from '@/lib/reconciliation';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { ReconciliationBoard } from '@/components/reconciliation-board';

export const dynamic = 'force-dynamic';

export default async function ReconciliationPage() {
  const [rows, corrections, me] = await Promise.all([
    api<DriftRow[]>('/v1/admin/reconciliation').catch((e: ApiError) => e),
    api<CorrectionRow[]>('/v1/admin/reconciliation/corrections').catch(() => [] as CorrectionRow[]),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (rows instanceof ApiError) {
    return (
      <>
        <PageHeader title="Reconciliation" />
        <ErrorState title="Could not run the check" detail={rows.message} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Reconciliation"
        description="Is every customer's money really there? This compares what customers own in our records with what Quidax actually holds for them, coin by coin, and leads you to anyone who doesn't match."
      />
      <ReconciliationBoard rows={rows} corrections={corrections} isOwner={me?.role === 'OWNER'} checkedAt={new Date().toISOString()} />
    </>
  );
}
