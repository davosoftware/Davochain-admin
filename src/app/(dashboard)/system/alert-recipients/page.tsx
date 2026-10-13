import { api, ApiError } from '@/lib/api';
import type { AlertRecipientsView } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { AlertRecipientsManager } from '@/components/alert-recipients-manager';

export const dynamic = 'force-dynamic';

/** Who is emailed about each operational alert. Owners, and admins with alerts.manage. */
export default async function AlertRecipientsPage() {
  const view = await api<AlertRecipientsView>('/v1/admin/alert-recipients').catch((e: ApiError) => e);
  if (view instanceof ApiError) {
    return (
      <>
        <PageHeader title="Alert recipients" />
        <ErrorState
          title={view.status === 403 ? 'You need the "Manage alert recipients" permission' : 'Could not load the recipients'}
          detail={view.message}
        />
      </>
    );
  }
  return (
    <>
      <PageHeader
        title="Alert recipients"
        description="Who is emailed about each alert. A type with nobody here uses the server default (ALERT_DEFAULT_RECIPIENTS). Security alerts can never be left with nobody. Every change is audited."
      />
      <AlertRecipientsManager view={view} />
    </>
  );
}
