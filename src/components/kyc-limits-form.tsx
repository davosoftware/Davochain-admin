'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { saveKycLimits } from '@/app/actions/system';
import type { KycTierLimit } from '@/lib/types-admin';
import { IconTile } from '@/components/dashboard-cards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TIER_NAMES: Record<string, string> = {
  TIER_0: 'Tier 0 — Signed up',
  TIER_1: 'Tier 1 — Basic verification',
  TIER_2: 'Tier 2 — Enhanced verification',
  TIER_3: 'Tier 3 — Full verification',
};

type Draft = Pick<
  KycTierLimit,
  'ngnDepositSingle' | 'ngnDepositDaily' | 'ngnWithdrawSingle' | 'ngnWithdrawDaily'
>;

/** Trailing ".00" on every field is noise when you are typing round numbers. */
const clean = (v: string) => (Number(v) === Math.trunc(Number(v)) ? String(Math.trunc(Number(v))) : v);

const toDraft = (l: KycTierLimit): Draft => ({
  ngnDepositSingle: clean(l.ngnDepositSingle),
  ngnDepositDaily: clean(l.ngnDepositDaily),
  ngnWithdrawSingle: clean(l.ngnWithdrawSingle),
  ngnWithdrawDaily: clean(l.ngnWithdrawDaily),
});

function Money({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
          inputMode="decimal"
          disabled={disabled}
          className="pr-12 font-mono"
        />
        <span className="text-muted-foreground t-caption pointer-events-none absolute inset-y-0 right-3 flex items-center">
          NGN
        </span>
      </div>
      {Number(value) > 0 ? (
        <p className="text-muted-foreground t-caption">₦{Number(value).toLocaleString()}</p>
      ) : (
        <p className="text-muted-foreground t-caption">Zero means this tier cannot do it at all.</p>
      )}
    </div>
  );
}

function TierCard({
  limit,
  canEdit,
}: {
  limit: KycTierLimit;
  canEdit: boolean;
}) {
  const saved = toDraft(limit);
  const [draft, setDraft] = useState<Draft>(saved);
  const [pending, start] = useTransition();
  const router = useRouter();

  const dirty = (Object.keys(draft) as (keyof Draft)[]).some((k) => draft[k] !== saved[k]);
  const set = (key: keyof Draft, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const save = () =>
    start(async () => {
      const result = await saveKycLimits({ tier: limit.tier, ...draft });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success(`${TIER_NAMES[limit.tier] ?? limit.tier} updated`);
      router.refresh();
    });

  return (
    <div className="bg-card border-border/60 rounded-xl border p-5">
      <h2 className="t-section mb-4">{TIER_NAMES[limit.tier] ?? limit.tier}</h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="t-small mb-3 font-medium">NGN Wallet — Deposit</p>
          <div className="grid gap-4">
            <Money
              label="Single transaction limit"
              value={draft.ngnDepositSingle}
              onChange={(v) => set('ngnDepositSingle', v)}
              disabled={!canEdit}
            />
            <Money
              label="Daily transaction limit"
              value={draft.ngnDepositDaily}
              onChange={(v) => set('ngnDepositDaily', v)}
              disabled={!canEdit}
            />
          </div>
        </div>

        <div>
          <p className="t-small mb-3 font-medium">NGN Wallet — Withdraw</p>
          <div className="grid gap-4">
            <Money
              label="Single transaction limit"
              value={draft.ngnWithdrawSingle}
              onChange={(v) => set('ngnWithdrawSingle', v)}
              disabled={!canEdit}
            />
            <Money
              label="Daily transaction limit"
              value={draft.ngnWithdrawDaily}
              onChange={(v) => set('ngnWithdrawDaily', v)}
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>

      {canEdit ? (
        <div className="border-border/40 mt-5 flex items-center gap-3 border-t pt-4">
          <Button size="sm" onClick={save} disabled={!dirty || pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Save this tier
          </Button>
          {dirty ? (
            <Button variant="ghost" size="sm" onClick={() => setDraft(saved)} disabled={pending}>
              Discard
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * What each tier may move, in naira.
 *
 * Naira only, because a tier caps the leg that touches a bank — that is what
 * verifying somebody's identity is for. A coin moving between two wallets we
 * control moves no real money and is governed by the trade limits instead.
 */
export function KycLimitsForm({
  limits,
  canEdit,
}: {
  limits: KycTierLimit[];
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-card border-border/60 flex items-start gap-3 rounded-xl border p-5">
        <IconTile icon={ShieldCheck} tone="green" size="sm" />
        <div>
          <h2 className="t-section">How these are applied</h2>
          <p className="text-muted-foreground t-small mt-1 max-w-3xl">
            A withdrawal over the limit is refused before anything moves. A deposit over it is{' '}
            <span className="text-foreground font-medium">held for review</span> rather than
            refused — the bank transfer already happened, so there is nothing to reject, and
            crediting it anyway would defeat the limit. The day runs midnight to midnight in Lagos.
          </p>
        </div>
      </div>

      {limits.map((limit) => (
        <TierCard key={limit.tier} limit={limit} canEdit={canEdit} />
      ))}

      {!canEdit ? (
        <p className="text-muted-foreground t-caption">
          You have read-only access to KYC limits.
        </p>
      ) : null}
    </div>
  );
}
