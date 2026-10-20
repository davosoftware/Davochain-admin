import { api, ApiError } from '@/lib/api';
import type {
  AdminActivity,
  AdminMe,
  AdminProfile,
  AdminSessionRow,
} from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { ProfileCard } from '@/components/profile-card';
import { PasswordCard } from '@/components/password-card';
import { SessionsCard } from '@/components/sessions-card';
import { TwoStepCard } from '@/components/two-step-card';
import type { TwoStepStatus } from '@/app/actions/two-step';
import { TeamCard } from '@/components/team-card';
import { Card, CardContent } from '@/components/ui/card';
import { relativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** `fee_ladder.swap.set` reads as "Fee ladder swap set" with no lookup table. */
function describe(action: string): string {
  const words = action.replace(/[._]/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default async function SettingsPage() {
  const me = await api<AdminMe>('/v1/admin/me').catch((e: ApiError) => e);

  if (me instanceof ApiError) {
    return (
      <>
        <PageHeader title="Settings" />
        <ErrorState title="Could not load your account" detail={me.message} />
      </>
    );
  }

  const canManageTeam = me.permissions.includes('team.manage');

  const [team, activity, sessions] = await Promise.all([
    canManageTeam
      ? api<AdminProfile[]>('/v1/admin/admins').catch(() => [] as AdminProfile[])
      : Promise.resolve([] as AdminProfile[]),
    api<AdminActivity[]>('/v1/admin/me/activity?limit=12').catch(() => [] as AdminActivity[]),
    api<AdminSessionRow[]>('/v1/admin/me/sessions').catch(() => [] as AdminSessionRow[]),
  ]);
  const twoStep = await api<TwoStepStatus>('/v1/admin/me/two-step').catch(() => null);

  return (
    <>
      <PageHeader
        title="Settings"
        description={
          me.role === 'OWNER'
            ? 'Your account, and who else holds the keys to this dashboard.'
            : 'Your account. An owner controls what you can reach.'
        }
      />

      {/* One column: this page is forms, and a form is easier to read narrow. */}
      <div className="grid max-w-3xl gap-5">
        <ProfileCard profile={me} />
        <PasswordCard changedAt={me.passwordChangedAt} />
        {twoStep ? <TwoStepCard status={twoStep} email={me.email} isOwner={me.role === 'OWNER'} canManageTeam={canManageTeam} /> : null}
        <SessionsCard sessions={sessions} idleTimeoutMs={me.idleTimeoutMs} />

        {canManageTeam ? (
          <TeamCard
            team={team}
            meId={me.id}
            isOwner={me.role === 'OWNER'}
            catalogue={me.permissionCatalogue}
          />
        ) : (
          <Card>
            <div className="border-border/70 border-b p-4">
              <h2 className="t-section">What you can do</h2>
              <p className="text-muted-foreground t-caption mt-0.5">
                Granted by an owner. Ask one if you need more.
              </p>
            </div>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-1.5">
                {me.permissions.length === 0 ? (
                  <p className="text-muted-foreground t-small">
                    Nothing granted yet — you can reach your own account and nothing else.
                  </p>
                ) : (
                  me.permissionCatalogue
                    .flatMap((g) => g.permissions)
                    .filter((p) => me.permissions.includes(p.key))
                    .map((p) => (
                      <span
                        key={p.key}
                        className="border-border/70 bg-secondary/50 t-caption rounded border px-2 py-0.5"
                      >
                        {p.label}
                      </span>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <div className="border-border/70 border-b p-4">
            <h2 className="t-section">Your recent activity</h2>
            <p className="text-muted-foreground t-caption mt-0.5">
              Every admin action is recorded against the account that took it.
            </p>
          </div>
          <CardContent className="p-0">
            {activity.length === 0 ? (
              <p className="text-muted-foreground t-small p-4">Nothing recorded yet.</p>
            ) : (
              <ul>
                {activity.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-border/40 flex items-baseline justify-between gap-4 border-b px-4 py-2.5 last:border-0"
                  >
                    <span className="t-small">{describe(entry.action)}</span>
                    <span className="text-muted-foreground t-caption shrink-0 font-mono">
                      {relativeTime(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
