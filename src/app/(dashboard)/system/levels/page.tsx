import { api, ApiError } from '@/lib/api';
import type { AdminMe } from '@/lib/types-admin';
import type { LevelsView } from '@/lib/level-rules';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { LevelPolicyGrid } from '@/components/level-policy-grid';

export const dynamic = 'force-dynamic';

export default async function LevelsPage() {
  const [view, me] = await Promise.all([
    api<LevelsView>('/v1/admin/levels').catch((e: ApiError) => e),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (view instanceof ApiError) {
    return (
      <>
        <PageHeader title="Verification levels" />
        <ErrorState title="Could not load the verification levels" detail={view.message} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Verification levels"
        description="What people at each level may do: None (not verified), Basic (BVN or NIN checked) and Advanced (proof of address too). Tick what each level may do, set its limits in naira or dollars, and how long new accounts wait before withdrawing. Leave a limit empty for no limit."
      />
      <LevelPolicyGrid initial={view} canEdit={me?.permissions.includes('levels.manage') ?? false} />
    </>
  );
}
