import Link from 'next/link';
import {
  ArrowLeftRight,
  ArrowRight,
  Coins,
  Fuel,
  PiggyBank,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  Wallet,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { DriftRow, FuelLevel, InventoryRow, AdminTransaction } from '@/lib/types';
import type { AdminMe, OverviewSnapshot } from '@/lib/types-admin';
import { StartHere } from '@/components/start-here';
import { AttentionPanel } from '@/components/attention-panel';
import { activityLine, attentionItems, greeting } from '@/lib/overview';
import { DateRangeFilter } from '@/components/date-range-filter';
import { TIPS } from '@/lib/tips';
import { ErrorState } from '@/components/error-state';
import { StatusBadge } from '@/components/status-badge';
import {
  PanelCard,
  SplitStatCard,
  StatCard,
  WalletCard,
} from '@/components/dashboard-cards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCoin, formatNaira, formatPercent, formatUsd, relativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  // Sign-in lands everyone here, so somebody without overview.view gets a
  // starting point rather than an error card on their own home page.
  const me = await api<AdminMe>('/v1/admin/me').catch(() => null);
  if (me && !me.permissions.includes('overview.view')) {
    return <StartHere me={me} />;
  }

  /*
   * The desk panels need inventory.view on top of overview.view.
   *
   * Somebody cleared for the dashboard but not the desk still gets their
   * dashboard — minus the panels they are not cleared for. Asking for them
   * anyway and letting the 403 through turned this page into an error card on
   * that person's own home screen, every single login.
   */
  const canSeeDesk = me?.permissions.includes('inventory.view') ?? false;
  const noRows = <T,>() => Promise.resolve([] as T[]);

  const [fuel, inventory, drift, transactions, snapshot, reconciling] = await Promise.all([
    // Null means "not cleared to see it"; an ApiError means it was asked for
    // and genuinely failed. Those are different and must not look the same.
    canSeeDesk
      ? api<FuelLevel>('/v1/admin/inventory/fuel').catch((e: ApiError) => e)
      : Promise.resolve(null),
    canSeeDesk
      ? api<InventoryRow[]>('/v1/admin/inventory').catch(() => [] as InventoryRow[])
      : noRows<InventoryRow>(),
    canSeeDesk
      ? api<DriftRow[]>('/v1/admin/reconciliation').catch(() => [] as DriftRow[])
      : noRows<DriftRow>(),
    api<AdminTransaction[]>('/v1/admin/transactions?limit=8').catch(() => [] as AdminTransaction[]),
    api<OverviewSnapshot>(
      `/v1/admin/overview${(() => {
        const q = new URLSearchParams();
        if (from) q.set('from', from);
        if (to) q.set('to', to);
        const s = q.toString();
        return s ? `?${s}` : '';
      })()}`,
    ).catch(() => null),
    // Only counted, for "Needs your attention". 100 is plenty to say "100+".
    api<AdminTransaction[]>('/v1/admin/transactions?status=RECONCILING&limit=100').catch(() => [] as AdminTransaction[]),
  ]);

  const deskFailed = fuel instanceof ApiError ? fuel : null;
  const level = fuel instanceof ApiError ? null : fuel;

  // Null when the desk is hidden or broken — in both cases there is no reading
  // to alarm anybody with, so the alert stays quiet rather than reading zero.
  const daysOfCover = level ? Number(level.daysOfCover) : null;
  const low = inventory.filter((r) => r.belowFloor);
  const broken = drift.filter((d) => !d.withinTolerance && !d.partial);
  const marginLost = inventory.reduce((s, r) => s + Number(r.marginLostPerDayNgn || 0), 0);
  const attention = attentionItems({
    permissions: me?.permissions ?? [],
    daysOfCover,
    lowCoins: low.map((r) => r.asset),
    driftCoins: broken.map((b) => b.asset),
    pending: Number(snapshot?.transactions.pending ?? 0),
    reconciling: reconciling.length,
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-display">{greeting(me?.name)}</h1>
          <p className="text-muted-foreground t-body mt-1">
            Here is how DavoChain is doing{from || to ? ' for the dates you picked' : ''}. Hover over any{' '}
            <span className="font-medium">ⓘ</span> to see what a number means.
          </p>
        </div>
        <DateRangeFilter from={from} to={to} />
      </div>

      <div className="stagger flex flex-col gap-5">
        {/* What needs someone, first, with a link to the page that fixes it. */}
        <AttentionPanel items={attention} />

        {/* Stock and naira for buys, first, because running out is what stops trading. */}
        {level ? (
          <WalletCard
            title="Stock and naira for buys"
            subtitle="What lets customers' buys go through"
            icon={Fuel}
            tone={daysOfCover !== null && daysOfCover < 3 ? 'rose' : 'amber'}
            columns={4}
            stats={[
              {
                label: 'Naira for buys',
                value: formatNaira(level.balanceNgn, 0),
                hint:
                  Number(level.dailyBurnNgn) > 0
                    ? `lasts about ${Number(level.daysOfCover) >= 10 ? Math.round(Number(level.daysOfCover)) : level.daysOfCover} days`
                    : 'not used in the last 7 days',
                tip: TIPS.overview.nairaFuel,
              },
              {
                label: 'Naira used per day',
                value: formatNaira(level.dailyBurnNgn, 0),
                hint: 'buying from Quidax, 7-day average',
                tip: TIPS.overview.dailyBurn,
              },
              {
                label: 'Coins running low',
                value: String(low.length),
                hint: low.length ? low.map((r) => r.asset.toUpperCase()).join(', ') : 'all well stocked',
                tip: TIPS.overview.coinsBelowFloor,
              },
              {
                label: 'Profit missed per day',
                value: formatNaira(marginLost, 0),
                hint: 'while coins are low',
                tip: TIPS.overview.marginForgone,
              },
            ]}
          />
        ) : deskFailed ? (
          // Asked for and failed. One panel is missing, not the whole page.
          <ErrorState title="Could not load stock and naira for buys" detail={deskFailed.message} />
        ) : null}

        {/* People. */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Customers"
            value={snapshot?.users.total ?? '—'}
            hint="every account ever registered"
            icon={Users}
            tone="blue"
            tip={TIPS.overview.totalUsers}
          />
          <StatCard
            label="Active customers"
            value={snapshot?.users.active ?? '—'}
            hint="can sign in and trade"
            icon={UserCheck}
            tone="green"
            tip={TIPS.overview.activeUsers}
          />
          <StatCard
            label="Suspended"
            value={snapshot?.users.suspended ?? '—'}
            hint={snapshot?.users.suspended ? 'cannot sign in' : 'nobody suspended'}
            icon={UserX}
            tone="rose"
            tip={TIPS.overview.suspendedUsers}
          />
          <SplitStatCard
            label="Identity checks"
            icon={ShieldCheck}
            tone="green"
            tip={TIPS.overview.kyc}
            parts={[
              { label: 'Approved', value: snapshot?.users.kycApproved ?? '—' },
              { label: 'Pending', value: snapshot?.users.kycPending ?? '—' },
            ]}
          />
        </div>

        {/* Counts, on one line. What the money was worth lives in the wallets. */}
        <SplitStatCard
          label="Transactions"
          icon={ArrowLeftRight}
          tone="blue"
          tip={TIPS.overview.transactions}
          parts={[
            { label: 'Total', value: snapshot?.transactions.total ?? '—' },
            { label: 'Buys', value: snapshot?.transactions.buys ?? '—' },
            { label: 'Sells', value: snapshot?.transactions.sells ?? '—' },
            { label: 'Swaps', value: snapshot?.transactions.swaps ?? '—' },
            { label: 'Deposits', value: snapshot?.transactions.deposits ?? '—' },
            { label: 'Withdrawals', value: snapshot?.transactions.withdrawals ?? '—' },
            { label: 'Pending', value: snapshot?.transactions.pending ?? '—' },
            { label: 'Failed', value: snapshot?.transactions.failed ?? '—' },
          ]}
        />

        {/* The two wallets. items-start so the shorter card keeps its own
            height instead of being stretched into a panel of empty space. */}
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <WalletCard
            title="Naira"
            subtitle="Naira in, out and held"
            tip={TIPS.overview.ngnWallet}
            icon={Wallet}
            tone="blue"
            stats={[
              {
                label: 'Deposited',
                value: snapshot ? formatNaira(snapshot.ngn.deposits, 0) : '—',
              },
              {
                label: 'Withdrawn',
                value: snapshot ? formatNaira(snapshot.ngn.withdrawals, 0) : '—',
              },
              {
                label: 'Spent buying crypto',
                value: snapshot ? formatNaira(snapshot.ngn.spentBuying, 0) : '—',
              },
              {
                label: 'Received from selling crypto',
                value: snapshot ? formatNaira(snapshot.ngn.fromSelling, 0) : '—',
              },
              {
                label: 'Held by customers',
                value: snapshot ? formatNaira(snapshot.ngn.available, 0) : '—',
                hint: 'available to spend',
              },
              {
                label: 'Locked in trades',
                value: snapshot ? formatNaira(snapshot.ngn.locked, 0) : '—',
                hint: 'in trades not finished yet',
              },
            ]}
          />

          <WalletCard
            title="Crypto"
            subtitle="Every coin movement in dollars, priced when it happened"
            tip={TIPS.overview.cryptoWallet}
            icon={Coins}
            tone="green"
            columns={3}
            stats={[
              {
                label: 'Bought',
                value: snapshot ? formatUsd(snapshot.crypto.boughtUsd) : '—',
              },
              {
                label: 'Sold',
                value: snapshot ? formatUsd(snapshot.crypto.soldUsd) : '—',
              },
              {
                label: 'Swapped',
                value: snapshot ? formatUsd(snapshot.crypto.swappedUsd) : '—',
              },
              {
                label: 'Deposited',
                value: snapshot ? formatUsd(snapshot.crypto.depositedUsd) : '—',
                hint: 'priced on arrival',
              },
              {
                label: 'Withdrawn',
                value: snapshot ? formatUsd(snapshot.crypto.withdrawnUsd) : '—',
                hint: 'priced on the way out',
              },
            ]}
          />
        </div>

        {/*
          * Earnings, in the two currencies they are actually charged in.
          *
          * Never added together and never converted: the rate fee is naira
          * folded into a naira trade, the swap fee is dollars on a trade with
          * no naira leg at all. One total would need a rate, and picking one
          * would make today's exchange rate silently rewrite last month's
          * earnings every time the page loads.
          */}
        <WalletCard
          title="Earnings"
          subtitle="What the platform kept, in the currency it was charged in"
          tip={TIPS.overview.earnings}
          icon={PiggyBank}
          tone="violet"
          columns={3}
          /* Only for somebody who can actually open it — a link that always
             403s is worse than no link, which is the same rule the sidebar
             follows. */
          action={
            me?.permissions.includes('earnings.view') ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/earnings">
                  Every earning <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            ) : undefined
          }
          stats={[
            {
              label: 'From buys and sells',
              value: snapshot ? formatNaira(snapshot.earnings.rateFeeNgn) : '—',
              hint: 'the rate fee, folded into every naira trade',
            },
            {
              label: 'From swaps',
              value: snapshot ? formatUsd(snapshot.earnings.swapFeeUsd) : '—',
              hint: 'the flat swap fee, charged in dollars',
            },
            {
              label: 'From crypto withdrawals',
              value: snapshot ? formatUsd(snapshot.earnings.withdrawalFeeUsd) : '—',
              hint: 'our fee only; the network fee is not ours',
            },
            {
              label: 'From naira withdrawals',
              value: snapshot ? formatNaira(snapshot.earnings.ngnWithdrawalFeeNgn) : '—',
              hint: 'cashing out to a bank',
            },
            {
              label: 'From gift cards',
              value: snapshot ? formatNaira(snapshot.earnings.giftCardProfitNgn) : '—',
              hint: 'what a card cleared at, less what we quoted',
            },
          ]}
        />

        {/* Detail, last. */}
        <div className="grid gap-5 lg:grid-cols-5">
          {canSeeDesk ? (
          <PanelCard
            title="Coin stock"
            tip={TIPS.overview.inventoryPanel}
            icon={Wallet}
            tone="amber"
            className="lg:col-span-3"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/inventory">
                  All coins <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Coin</TableHead>
                  <TableHead className="text-right">Held</TableHead>
                  <TableHead className="text-right">Price vs what we paid</TableHead>
                  <TableHead className="pr-5 text-right">Profit missed / day</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.length === 0 ? (
                  <TableEmpty colSpan={4}>No coins set up on the Inventory desk yet.</TableEmpty>
                ) : (
                  inventory.slice(0, 6).map((row) => (
                    <TableRow key={row.asset}>
                      <TableCell className="pl-5 font-medium">
                        <div className="flex items-center gap-2">
                          {row.asset.toUpperCase()}
                          {row.belowFloor ? <Badge variant="warning">low</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatCoin(row.held)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs ${
                          Number(row.vsAvgPct) < 0 ? 'text-success' : 'text-muted-foreground'
                        }`}
                      >
                        {formatPercent(row.vsAvgPct)}
                      </TableCell>
                      <TableCell className="pr-5 text-right font-mono text-xs">
                        {Number(row.marginLostPerDayNgn) > 0
                          ? formatNaira(row.marginLostPerDayNgn, 0)
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </PanelCard>
          ) : null}

          <PanelCard
            title="Recent activity"
            tip={TIPS.overview.recentActivity}
            icon={ArrowLeftRight}
            tone="violet"
            // Takes the whole row when the inventory panel beside it is hidden,
            // rather than sitting at two fifths width with a gap next to it.
            className={canSeeDesk ? 'lg:col-span-2' : 'lg:col-span-5'}
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/transactions">
                  All <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            <div className="flex flex-col gap-3 px-5 pb-5">
              {transactions.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No transactions yet. They appear here as customers buy, sell and swap.
                </p>
              ) : (
                transactions.slice(0, 6).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{activityLine(tx)}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {tx.user} · {relativeTime(tx.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={tx.status} />
                  </div>
                ))
              )}
            </div>
          </PanelCard>
        </div>
      </div>
    </>
  );
}
