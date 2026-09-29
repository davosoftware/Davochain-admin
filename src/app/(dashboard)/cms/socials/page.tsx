import { api, ApiError } from '@/lib/api';
import type { AdminMe, KnownNetworks, SocialLinkRow } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { SocialLinksManager } from '@/components/social-links-manager';

export const dynamic = 'force-dynamic';

/**
 * The networks in the email footer and on the website.
 *
 * One list feeds both, so an icon added here is in the next email sent and on
 * the site at the same moment — rather than in two places that drift.
 */
export default async function SocialLinksPage() {
  const [links, known, me] = await Promise.all([
    api<SocialLinkRow[]>('/v1/admin/cms/socials').catch((e: ApiError) => e),
    api<KnownNetworks>('/v1/admin/cms/socials/known').catch(() => ({
      networks: [],
      iconPixels: 128,
    })),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (links instanceof ApiError) {
    return (
      <>
        <PageHeader title="Social links" />
        <ErrorState title="Could not load the links" detail={links.message} />
      </>
    );
  }

  const canEdit = me?.permissions.includes('content.manage') ?? false;

  return (
    <>
      <PageHeader
        title="Social links"
        description="The icons in every email footer and on the website. Add a network, point it at your profile, upload its icon, and switch it on or off."
      />
      <SocialLinksManager links={links} known={known} canEdit={canEdit} />
    </>
  );
}
