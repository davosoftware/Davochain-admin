import { api, ApiError } from '@/lib/api';
import type { AdminMe, FeeKind, FeeLadderView } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { LadderPanel } from '@/components/ladder-panel';
import { CoinLadderRow } from '@/components/coin-ladder-row';
import { Card, CardContent } from '@/components/ui/card';
import { cn, relativeTime } from '@/lib/utils';

/**
 * One fee, every coin.
 *
 * The rate fee and the swap fee are different charges on different trades, so
 * they get a screen each — the same screen, told which fee it is. Seeing one
 * ladder at a time is the point: a single table of both invited exactly the
 * confusion of setting the wrong one.
 */
export async function LadderScreen({
  kind,
  title,
  description,
  globalSubtitle,
  assetsTitle = 'Per coin',
  perCoin = true,
}: {
  kind: FeeKind;
  title: string;
  description: string;
  globalSubtitle: string;
  assetsTitle?: string;
  /**
   * Whether coins can carry their own ladder.
   *
   * False for the naira cash-out fee: naira is one currency, and a
   * "BTC naira-withdrawal fee" is not a thing that exists. Offering fifteen
   * rows that all mean the same number invites somebody to set one and wonder
   * why nothing changed.
   */
  perCoin?: boolean;
}) {
  const [ladder, me] = await Promise.all([
    api<FeeLadderView>(`/v1/admin/fee-ladders/${kind.toLowerCase()}`).catch((e: ApiError) => e),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (ladder instanceof ApiError) {
    return (
      <>
        <PageHeader title={title} />
        <ErrorState title="Could not load this ladder" detail={ladder.message} />
      </>
    );
  }

  const canEdit = me?.permissions.includes('fees.manage') ?? false;
  const overridden = ladder.assets.filter((a) => !a.usesGlobal).length;

  return (
    <>
      <PageHeader title={title} description={description} />

      <div className={cn('grid gap-5', perCoin && 'lg:grid-cols-5')}>
        {/* The default sits first because most coins inherit it. */}
        <div className={cn(perCoin ? 'lg:col-span-2' : 'max-w-2xl')}>
          <LadderPanel
            kind={kind}
            title="Default ladder"
            subtitle={globalSubtitle}
            bands={ladder.global?.bands ?? []}
            canEdit={canEdit}
            meta={
              ladder.global
                ? `set by ${ladder.global.setBy} · ${relativeTime(ladder.global.effectiveFrom)}`
                : 'not configured'
            }
          />
        </div>

        {perCoin ? (
          <div className="lg:col-span-3">
            <Card>
              <div className="border-border/70 flex items-baseline justify-between border-b p-4">
                <div>
                  <h2 className="t-section">{assetsTitle}</h2>
                  <p className="text-muted-foreground t-caption mt-0.5">
                    Every coin can carry its own ladder. Open one to set it.
                  </p>
                </div>
                <span className="text-muted-foreground t-caption shrink-0">
                  {overridden} of {ladder.assets.length} custom
                </span>
              </div>
              <CardContent className="p-0">
                {ladder.assets.length === 0 ? (
                  <p className="text-muted-foreground t-small p-4">No coins listed.</p>
                ) : (
                  <ul>
                    {ladder.assets.map((row) => (
                      <CoinLadderRow
                        key={row.asset}
                        kind={kind}
                        asset={row.asset}
                        name={row.name}
                        bands={row.bands}
                        usesGlobal={row.usesGlobal}
                        effectiveFrom={row.effectiveFrom}
                        canEdit={canEdit}
                      />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
  
            <p className="text-muted-foreground t-small mt-4">
              Saving writes a <span className="text-foreground font-medium">new schedule</span> rather
              than editing the bands in place, so a trade from last week can still be explained with
              the ladder that was live when it happened.
              {canEdit ? null : ' You have read-only access to fees.'}
            </p>
          </div>
          ) : null}
      </div>
    </>
  );
}
