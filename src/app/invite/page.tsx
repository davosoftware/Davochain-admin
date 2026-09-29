import { checkInvite } from '@/app/actions/invite';
import { InviteForm } from '@/components/invite-form';
import { Logo } from '@/components/logo';

export const dynamic = 'force-dynamic';

/**
 * Where an emailed invitation lands.
 *
 * Checked on the server before the form is shown, so nobody is asked to choose
 * a password and only then told the link expired.
 */
export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const invite = token ? await checkInvite(token) : { valid: false };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_50%_0%,var(--color-primary)/8%,transparent_70%)]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo className="size-10" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Set your password</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              One step, and the dashboard is yours
            </p>
          </div>
        </div>

        <div className="surface rounded-xl p-6">
          <InviteForm token={token ?? ''} invite={invite} />
        </div>
      </div>
    </main>
  );
}
