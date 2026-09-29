import { api, ApiError } from '@/lib/api';
import type { AdminMe, CredentialsView } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { CredentialsForm } from '@/components/credentials-form';

export const dynamic = 'force-dynamic';

/**
 * Partner secrets, held by the platform rather than the deployment.
 *
 * This page never receives a stored key — only which ones are set, their last
 * four characters and when they changed.
 */
export default async function CredentialsPage() {
  const [view, me] = await Promise.all([
    api<CredentialsView>('/v1/admin/credentials').catch((e: ApiError) => e),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (view instanceof ApiError) {
    return (
      <>
        <PageHeader title="API keys" />
        <ErrorState title="Could not load the keys" detail={view.message} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="API keys"
        description="The secrets our partners issued us. Set them here instead of in a deployment, and rotate one without a release."
      />
      <CredentialsForm view={view} canEdit={me?.role === 'OWNER'} />
    </>
  );
}
