import { api, ApiError } from '@/lib/api';
import type { BroadcastRow, UserListRow } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { SendNotification } from '@/components/notification-composer';
import { NotificationHistory } from '@/components/notification-history';

export const dynamic = 'force-dynamic';

/**
 * Sending, and the record of what was sent.
 *
 * The user list is fetched alongside the history so the composer can offer
 * recipients the moment it opens — a modal that has to load before it is usable
 * reads as broken. Only ACTIVE accounts are offered, because the API refuses to
 * message any other kind.
 */
export default async function NotificationsPage() {
  const [history, users] = await Promise.all([
    api<BroadcastRow[]>('/v1/admin/broadcasts').catch((e: ApiError) => e),
    api<{ rows: UserListRow[] }>('/v1/admin/users?limit=200&status=ACTIVE').catch(() => ({
      rows: [] as UserListRow[],
    })),
  ]);

  if (history instanceof ApiError) {
    return (
      <>
        <PageHeader title="Notification Management" />
        <ErrorState title="Could not load notifications" detail={history.message} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Notification Management"
        description="Send and manage notifications. They land in the in-app feed alongside deposit and trade alerts, and go to devices as a push."
        action={<SendNotification users={users.rows} />}
      />

      <NotificationHistory rows={history} />
    </>
  );
}
