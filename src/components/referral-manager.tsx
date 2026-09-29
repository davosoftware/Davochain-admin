'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Gift,
  Loader2,
  Search,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { saveReferralSettings } from '@/app/actions/referrals';
import type { ReferralRewardView, ReferralSettings, ReferralsPage } from '@/lib/types-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, formatNaira, relativeTime } from '@/lib/utils';

const TIERS = [
  { value: 'TIER_1', label: 'Tier 1 — BVN or NIN' },
  { value: 'TIER_2', label: 'Tier 2 — ID and selfie' },
  { value: 'TIER_3', label: 'Tier 3 — proof of address' },
];

const STATUSES = [
  { value: '', label: 'All referrals' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'VOID', label: 'Void' },
];

const PAGE_SIZES = [25, 50, 100];

export function ReferralManager({
  settings,
  data,
  canManage,
}: {
  settings: ReferralSettings;
  data: ReferralsPage;
  /** Without it the form is read-only. The API refuses either way. */
  canManage: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Totals settings={settings} data={data} />
      <OfferForm settings={settings} canManage={canManage} />
      <ReferralTable data={data} />
    </div>
  );
}

function Totals({ settings, data }: { settings: ReferralSettings; data: ReferralsPage }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Figure
        label="Paid out"
        value={formatNaira(data.totals.paidNgn)}
        hint={`${data.totals.paidCount} reward${data.totals.paidCount === 1 ? '' : 's'} credited`}
        icon={Gift}
      />
      {/*
        * Deliberately not added to the one beside it. Paid is money that has
        * gone; pending is money that may never go — a referee who never
        * verifies is never paid for, and neither is their referrer.
        */}
      <Figure
        label="Promised, not yet paid"
        value={formatNaira(data.totals.pendingNgn)}
        hint={`${data.totals.pendingCount} waiting on a condition`}
        icon={Loader2}
        muted
      />
      <Figure
        label="Referrals"
        value={data.total.toLocaleString()}
        hint={`${data.rows.filter((r) => r.status === 'COMPLETED').length} completed on this page`}
        icon={TrendingUp}
      />
      <Figure
        label="Programme"
        value={settings.isEnabled ? 'Live' : 'Off'}
        hint={
          settings.isEnabled
            ? `₦${Number(settings.referrerRewardNgn).toLocaleString()} to the referrer, ₦${Number(settings.refereeRewardNgn).toLocaleString()} to the friend`
            : 'No new referrals are being recorded'
        }
        icon={ShieldCheck}
        tone={settings.isEnabled ? 'success' : 'muted'}
      />
    </div>
  );
}

function Figure({
  label,
  value,
  hint,
  icon: Icon,
  muted,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Gift;
  muted?: boolean;
  tone?: 'success' | 'muted';
}) {
  return (
    <div className="bg-card border-border/60 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            'size-3.5',
            tone === 'success' ? 'text-success' : muted ? 'text-muted-foreground' : 'text-primary',
          )}
        />
        <p className="eyebrow">{label}</p>
      </div>
      <p className="t-title mt-1.5 tabular-nums">{value}</p>
      <p className="text-muted-foreground t-caption mt-1 leading-tight">{hint}</p>
    </div>
  );
}

/**
 * The offer.
 *
 * Every amount here is copied onto a reward at the moment it is promised, so
 * changing one affects the next signup and nothing that has already happened.
 * The screen says so, because "will this cut what I already owe people?" is
 * the first question anybody asks before touching it.
 */
function OfferForm({ settings, canManage }: { settings: ReferralSettings; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    isEnabled: settings.isEnabled,
    referrerRewardNgn: settings.referrerRewardNgn,
    refereeRewardNgn: settings.refereeRewardNgn,
    unlockTier: settings.unlockTier as string,
    refereeTradeVolumeNgn: settings.refereeTradeVolumeNgn,
    maxPaidReferralsPerUser: String(settings.maxPaidReferralsPerUser),
    maxEarningsPerUserNgn: settings.maxEarningsPerUserNgn,
    headline: settings.headline,
    terms: settings.terms ?? '',
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const dirty =
    form.isEnabled !== settings.isEnabled ||
    form.referrerRewardNgn !== settings.referrerRewardNgn ||
    form.refereeRewardNgn !== settings.refereeRewardNgn ||
    form.unlockTier !== settings.unlockTier ||
    form.refereeTradeVolumeNgn !== settings.refereeTradeVolumeNgn ||
    form.maxPaidReferralsPerUser !== String(settings.maxPaidReferralsPerUser) ||
    form.maxEarningsPerUserNgn !== settings.maxEarningsPerUserNgn ||
    form.headline !== settings.headline ||
    form.terms !== (settings.terms ?? '');

  const save = () =>
    start(async () => {
      const result = await saveReferralSettings({
        ...form,
        maxPaidReferralsPerUser: Number(form.maxPaidReferralsPerUser),
        terms: form.terms.trim(),
      });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success('Referral offer saved', {
        description: 'It applies to signups from now on. Nothing already promised has changed.',
      });
      router.refresh();
    });

  return (
    <Card>
      <div className="border-border/70 flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h2 className="t-section">The offer</h2>
          <p className="text-muted-foreground t-caption mt-0.5">
            Applies to new signups. A reward already promised keeps the amount it was promised at.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={form.isEnabled}
            disabled={!canManage}
            onChange={(e) => set('isEnabled', e.target.checked)}
            className="accent-primary size-4"
          />
          <span className="t-small font-medium">
            {form.isEnabled ? 'Programme is live' : 'Programme is off'}
          </span>
        </label>
      </div>

      <CardContent className="grid gap-5 p-5 lg:grid-cols-2">
        <Money
          id="referrerRewardNgn"
          label="The referrer gets"
          hint="Paid when the person they invited reaches the tier below."
          value={form.referrerRewardNgn}
          onChange={(v) => set('referrerRewardNgn', v)}
          disabled={!canManage}
        />
        <Money
          id="refereeRewardNgn"
          label="The new user gets"
          hint="Shown to them the moment they sign up, and paid once both conditions below are met."
          value={form.refereeRewardNgn}
          onChange={(v) => set('refereeRewardNgn', v)}
          disabled={!canManage}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unlockTier">Verification that unlocks a reward</Label>
          <select
            id="unlockTier"
            value={form.unlockTier}
            disabled={!canManage}
            onChange={(e) => set('unlockTier', e.target.value)}
            className="border-input bg-card t-small hover:border-primary/40 focus-visible:ring-ring h-10 rounded-lg border px-3 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            {TIERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground t-caption">
            Nobody is paid until the invited person reaches this.
          </p>
        </div>

        <Money
          id="refereeTradeVolumeNgn"
          label="…and the new user must trade"
          hint="Buys, sells and swaps, added up. Deposits do not count. Zero means the verification alone is enough. The referrer never waits for this."
          value={form.refereeTradeVolumeNgn}
          onChange={(v) => set('refereeTradeVolumeNgn', v)}
          disabled={!canManage}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxPaidReferralsPerUser">Most paid referrals per person</Label>
          <Input
            id="maxPaidReferralsPerUser"
            inputMode="numeric"
            value={form.maxPaidReferralsPerUser}
            disabled={!canManage}
            onChange={(e) => set('maxPaidReferralsPerUser', e.target.value.replace(/[^0-9]/g, ''))}
          />
          <p className="text-muted-foreground t-caption">
            0 is unlimited. Past it their referrals still list and still show — they stop paying,
            and raising this later releases what was paused.
          </p>
        </div>

        <Money
          id="maxEarningsPerUserNgn"
          label="Most one person may earn in total"
          hint="0 is unlimited. Reaching it pauses their earning rather than ending it."
          value={form.maxEarningsPerUserNgn}
          onChange={(v) => set('maxEarningsPerUserNgn', v)}
          disabled={!canManage}
        />

        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <Label htmlFor="headline">Headline in the app</Label>
          <Input
            id="headline"
            value={form.headline}
            disabled={!canManage}
            maxLength={120}
            onChange={(e) => set('headline', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <Label htmlFor="terms">Terms shown under the offer</Label>
          <textarea
            id="terms"
            value={form.terms}
            disabled={!canManage}
            maxLength={2000}
            rows={3}
            onChange={(e) => set('terms', e.target.value)}
            className="border-input bg-card t-small hover:border-primary/40 focus-visible:ring-ring rounded-lg border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          />
        </div>
      </CardContent>

      <div className="border-border/70 flex items-center justify-between gap-3 border-t p-4">
        <p className="text-muted-foreground t-caption">
          {settings.updatedBy
            ? `Last changed ${relativeTime(settings.updatedAt)}`
            : 'Never changed'}
        </p>
        <Button onClick={save} disabled={!canManage || !dirty} loading={pending}>
          Save offer
        </Button>
      </div>
    </Card>
  );
}

function Money({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
          ₦
        </span>
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          disabled={disabled}
          className="pl-7 tabular-nums"
          // Digits and one dot only: this is a naira figure that gets copied
          // onto every reward promised from here on.
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        />
      </div>
      <p className="text-muted-foreground t-caption leading-tight">{hint}</p>
    </div>
  );
}

function ReferralTable({ data }: { data: ReferralsPage }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const [query, setQuery] = useState(search);
  const [lastSearch, setLastSearch] = useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setQuery(search);
  }

  const go = (changes: Record<string, string | null>, keepPage = false) =>
    start(() => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      if (!keepPage) next.delete('page');
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });

  const pageCount = Math.max(Math.ceil(data.total / data.pageSize), 1);
  const first = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const last = Math.min(data.page * data.pageSize, data.total);
  const narrowed = Boolean(search || status);

  return (
    <Card>
      <div className="border-border/70 flex flex-wrap items-center gap-2 border-b p-4">
        <h2 className="t-section mr-auto">Referrals</h2>

        <div className="relative min-w-56 sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go({ search: query.trim() || null })}
            onBlur={() => query.trim() !== search && go({ search: query.trim() || null })}
            placeholder="Search name, email or code"
            className="h-10 pl-9"
            aria-label="Search referrals"
          />
        </div>

        <select
          value={status}
          onChange={(e) => go({ status: e.target.value })}
          aria-label="Filter by status"
          className="border-input bg-card t-small hover:border-primary/40 focus-visible:ring-ring h-10 rounded-lg border px-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {narrowed ? (
          <Button variant="ghost" size="sm" onClick={() => go({ search: null, status: null })}>
            <X className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </div>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 pl-5">S/No.</TableHead>
              <TableHead>Referrer</TableHead>
              <TableHead>Who they invited</TableHead>
              <TableHead>Code used</TableHead>
              <TableHead>Their verification</TableHead>
              <TableHead className="text-right">Referrer gets</TableHead>
              <TableHead className="text-right">Friend gets</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="pr-5">Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.rows.length === 0 ? (
              <TableEmpty colSpan={9}>
                {narrowed ? (
                  'No referral matches those filters.'
                ) : (
                  <>
                    Nobody has used a referral code yet.
                    <span className="text-muted-foreground block">
                      Every user gets a code from the moment they sign up — this fills as they
                      share them.
                    </span>
                  </>
                )}
              </TableEmpty>
            ) : (
              data.rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground pl-5 tabular-nums">
                    {first + index}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <p className="t-small font-medium">{row.referrer.name || '—'}</p>
                    <p className="text-muted-foreground t-caption max-w-[13rem] truncate">
                      {row.referrer.email}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <p className="t-small font-medium">{row.referee.name || '—'}</p>
                    <p className="text-muted-foreground t-caption max-w-[13rem] truncate">
                      {row.referee.email}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="border-border/70 bg-secondary/40 t-caption rounded-md border px-2 py-0.5 font-mono">
                      {row.codeUsed}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.referee.kycTier === 'TIER_0' ? 'outline' : 'success'}>
                      {row.referee.kycTier.replace('TIER_', 'T')}
                    </Badge>
                  </TableCell>
                  <RewardCell reward={row.referrerReward} />
                  <RewardCell reward={row.refereeReward} />
                  <TableCell className="text-muted-foreground t-caption whitespace-nowrap">
                    {relativeTime(row.createdAt)}
                  </TableCell>
                  <TableCell className="pr-5">
                    {/* The badge the referrer sees on their own screen. */}
                    <Badge
                      variant={
                        row.status === 'COMPLETED'
                          ? 'success'
                          : row.status === 'VOID'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {row.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <div className="border-border/70 flex flex-wrap items-center justify-between gap-3 border-t p-3">
        <div className="text-muted-foreground t-caption flex items-center gap-2">
          <span>
            Showing {first.toLocaleString()} to {last.toLocaleString()} of{' '}
            {data.total.toLocaleString()} {data.total === 1 ? 'referral' : 'referrals'}
          </span>
          <select
            value={String(data.pageSize)}
            onChange={(e) => go({ pageSize: e.target.value })}
            aria-label="Rows per page"
            className="border-input bg-card t-caption rounded-md border px-2 py-1"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={data.page <= 1 || pending}
            onClick={() => go({ page: String(data.page - 1) }, true)}
          >
            <ChevronLeft className="size-3.5" />
            Prev
          </Button>
          <span className="t-caption tabular-nums px-2">
            {data.page} of {pageCount}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={data.page >= pageCount || pending}
            onClick={() => go({ page: String(data.page + 1) }, true)}
          >
            Next
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * One side's reward.
 *
 * A pending amount is greyed and carries its reason, because the figure alone
 * would read as money somebody has — and it is not. Nothing has moved until it
 * says released.
 */
function RewardCell({ reward }: { reward: ReferralRewardView | null }) {
  if (!reward) {
    return <TableCell className="text-muted-foreground text-right">—</TableCell>;
  }
  const paid = reward.status === 'RELEASED';
  return (
    <TableCell className="text-right whitespace-nowrap">
      <span
        className={cn('t-small tabular-nums', paid ? 'font-medium' : 'text-muted-foreground')}
        title={reward.blockedReason ?? undefined}
      >
        {formatNaira(reward.amountNgn)}
      </span>
      <span
        className={cn('t-caption block', paid ? 'text-success' : 'text-muted-foreground')}
        title={reward.blockedReason ?? undefined}
      >
        {paid ? 'paid' : reward.status === 'VOID' ? 'void' : 'pending'}
      </span>
    </TableCell>
  );
}
