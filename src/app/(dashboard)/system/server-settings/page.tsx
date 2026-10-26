import { api, ApiError } from '@/lib/api';
import type { ServerSettingsView } from '@/lib/server-settings';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { ServerSettingsBoard } from '@/components/server-settings-board';
import { EmergencySignOutCard } from '@/components/emergency-sign-out-card';

export const dynamic = 'force-dynamic';

/**
 * Settings that used to live only in the server's .env file, so changing one
 * no longer needs someone to sign in to the server. Owners only: the API sends
 * an empty list to anyone else, and checks the password on every change.
 */
export default async function ServerSettingsPage() {
  const view = await api<ServerSettingsView>('/v1/admin/server-settings').catch((e: ApiError) => e);

  if (view instanceof ApiError) {
    return (
      <>
        <PageHeader title="Server settings" />
        <ErrorState title="Could not load the server settings" detail={view.message} />
      </>
    );
  }

  if (!view.owner) {
    return (
      <>
        <PageHeader title="Server settings" />
        <ErrorState title="Owners only" detail="Only an owner can see and change the server settings." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Server settings"
        description="Change how the platform behaves without signing in to the server. Every change asks for your password and a reason, and is kept in the audit log."
      />
      <div className="flex flex-col gap-6">
        <EmergencySignOutCard />
        <ServerSettingsBoard settings={view.settings} />
      </div>
    </>
  );
}
