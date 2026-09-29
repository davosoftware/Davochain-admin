import { api, ApiError } from '@/lib/api';
import type { SiteSettings } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { SiteSettingsForm } from '@/components/site-settings-form';

export const dynamic = 'force-dynamic';

/**
 * Everything the public website says about this business.
 *
 * Served unauthenticated at GET /v1/site, so what is typed here is what the
 * landing page renders — no deploy, no second copy to keep in step.
 */
export default async function GeneralSettingsPage() {
  const settings = await api<SiteSettings>('/v1/admin/site-settings').catch((e: ApiError) => e);

  if (settings instanceof ApiError) {
    return (
      <>
        <PageHeader title="General settings" />
        <ErrorState title="Could not load these settings" detail={settings.message} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="General settings"
        description="Contact details, store links, branding and social handles. The public website and the apps read these directly, so a change here lands there without a deploy."
      />
      <SiteSettingsForm settings={settings} />
    </>
  );
}
