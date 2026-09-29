import { api, ApiError } from '@/lib/api';
import type { AdminMe, Currency, GiftCardBrandRow, GiftCardTypeRow } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { CardTypes } from '@/components/giftcards/card-types';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [rows, brands, currencies, me] = await Promise.all([
    api<GiftCardTypeRow[]>('/v1/admin/giftcards/types').catch((e: ApiError) => e),
    api<GiftCardBrandRow[]>('/v1/admin/giftcards/brands').catch(() => [] as GiftCardBrandRow[]),
    api<Currency[]>('/v1/admin/giftcards/currencies').catch(() => [] as Currency[]),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (rows instanceof ApiError) {
    return (
      <>
        <PageHeader title="Card categories" />
        <ErrorState
          title="Could not load card categories"
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
        title="Gift card category management"
        description="One tradeable form of a brand, with the rate a user is quoted. An e-code and a physical card are not worth the same."
      />
      <CardTypes
        rows={rows}
        brands={brands}
        currencies={currencies}
        canManage={me?.permissions.includes('giftcards.manage') ?? false}
      />
    </>
  );
}
