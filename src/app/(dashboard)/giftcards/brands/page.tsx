import { api, ApiError } from '@/lib/api';
import type { AdminMe, GiftCardBrandRow, GiftCardCategoryRow } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { Brands } from '@/components/giftcards/brands';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [rows, categories, me] = await Promise.all([
    api<GiftCardBrandRow[]>('/v1/admin/giftcards/brands').catch((e: ApiError) => e),
    api<GiftCardCategoryRow[]>('/v1/admin/giftcards/categories').catch(
      () => [] as GiftCardCategoryRow[],
    ),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (rows instanceof ApiError) {
    return (
      <>
        <PageHeader title="Brands" />
        <ErrorState
          title="Could not load brands"
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
        title="Brand management"
        description="The card a user taps to start a trade. The image is what they see."
      />
      <Brands
        rows={rows}
        categories={categories}
        canManage={me?.permissions.includes('giftcards.manage') ?? false}
      />
    </>
  );
}
