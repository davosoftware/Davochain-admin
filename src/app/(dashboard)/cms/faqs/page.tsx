import { api, ApiError } from '@/lib/api';
import type { AdminMe, FaqRow } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { FaqManager } from '@/components/faq-manager';

export const dynamic = 'force-dynamic';

/** Website only — the apps have their own help screen. */
export default async function FaqsPage() {
  const [faqs, me] = await Promise.all([
    api<FaqRow[]>('/v1/admin/cms/faqs').catch((e: ApiError) => e),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (faqs instanceof ApiError) {
    return (
      <>
        <PageHeader title="FAQs" />
        <ErrorState title="Could not load the questions" detail={faqs.message} />
      </>
    );
  }

  const canEdit = me?.permissions.includes('content.manage') ?? false;

  return (
    <>
      <PageHeader
        title="FAQs"
        description="Questions and answers for the website, grouped and ordered however you arrange them here."
      />
      <FaqManager faqs={faqs} canEdit={canEdit} />
    </>
  );
}
