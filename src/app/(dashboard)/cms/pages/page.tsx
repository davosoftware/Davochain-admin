import { api, ApiError } from '@/lib/api';
import type { AdminMe, StaticPageRow } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { PageManager } from '@/components/page-manager';

export const dynamic = 'force-dynamic';

/**
 * About us, Terms, Privacy — and anything else added here.
 *
 * The same words reach the public website and both apps, so this is the one
 * place any of them is written. Saving publishes: there is no review step.
 */
export default async function StaticContentPage() {
  const [pages, me] = await Promise.all([
    api<StaticPageRow[]>('/v1/admin/cms/pages').catch((e: ApiError) => e),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (pages instanceof ApiError) {
    return (
      <>
        <PageHeader title="Static content" />
        <ErrorState title="Could not load the pages" detail={pages.message} />
      </>
    );
  }

  const canEdit = me?.permissions.includes('content.manage') ?? false;

  return (
    <>
      <PageHeader
        title="Static content"
        description="What the website and the apps show for About us, Terms, Privacy and anything else you add. Saved changes are live immediately."
      />
      <PageManager pages={pages} canEdit={canEdit} />
    </>
  );
}
