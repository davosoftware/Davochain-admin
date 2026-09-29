import { api, ApiError } from '@/lib/api';
import type { AdminMe, EmailTemplateRow, SiteSettings } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { EmailTemplateManager } from '@/components/email-template-manager';

export const dynamic = 'force-dynamic';

/**
 * The wording of everything the system emails.
 *
 * Which emails exist is decided by the code — a template is here because
 * something sends it — but what each one says is decided here.
 */
export default async function EmailTemplatesPage() {
  const [templates, settings, me] = await Promise.all([
    api<EmailTemplateRow[]>('/v1/admin/cms/email-templates').catch((e: ApiError) => e),
    // The footer wording lives on the settings row, not on a template. A
    // sub-admin without settings.manage still gets the screen; the card just
    // has nothing to show.
    api<SiteSettings>('/v1/admin/site-settings').catch(() => null),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (templates instanceof ApiError) {
    return (
      <>
        <PageHeader title="Email templates" />
        <ErrorState title="Could not load the templates" detail={templates.message} />
      </>
    );
  }

  const canEdit = me?.permissions.includes('content.emails') ?? false;

  return (
    <>
      <PageHeader
        title="Email templates"
        description="Every email the system sends automatically. Edit the wording, preview it, or switch one off — the in-app alert and the push are separate and unaffected."
      />
      <EmailTemplateManager templates={templates} settings={settings} canEdit={canEdit} />
    </>
  );
}
