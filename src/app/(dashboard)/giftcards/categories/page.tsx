import { api, ApiError } from '@/lib/api';
import type { AdminMe, GiftCardCategoryRow } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { BrandCategories } from '@/components/giftcards/brand-categories';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [rows, me] = await Promise.all([
    api<GiftCardCategoryRow[]>('/v1/admin/giftcards/categories').catch((e: ApiError) => e),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (rows instanceof ApiError) {
    return (
      <>
        <PageHeader title="Brand categories" />
        <ErrorState
          title="Could not load brand categories"
          detail={
            rows.status === 403
              ? 'Your account does not have the "See gift cards and trades" permission. An owner can grant it from the team screen.'
              : rows.message
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Brand category management"
        description="What a brand sells into — Shopping, Gaming, Streaming. Every brand belongs to one."
      />
      <BrandCategories rows={rows} canManage={me?.permissions.includes('giftcards.manage') ?? false} />
    </>
  );
}
