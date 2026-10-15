'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { saveLevels } from '@/app/actions/levels';
import {
  LEVELS,
  changeSummary,
  fieldError,
  capError,
  type LevelCooloffView,
  type LevelRuleView,
  type LevelsView,
} from '@/lib/level-rules';
import { IconTile } from '@/components/dashboard-cards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const amount = (v: string) => v.replace(/[^\d.]/g, '');

/** Every level × action, so a rule an admin never saved still has a cell (missing = not allowed). */
function complete(view: LevelsView): LevelsView {
  const rules: LevelRuleView[] = [];
  for (const { action, unit } of view.actions) {
    for (const { level } of LEVELS) {
      const found = view.rules.find((r) => r.level === level && r.action === action);
      rules.push(found ?? { level, action, allowed: false, currency: unit, minPerTx: null, maxPerTx: null, maxPerDay: null });
    }
  }
  const cooloffs: LevelCooloffView[] = LEVELS.map(
    ({ level }) =>
      view.cooloffs.find((c) => c.level === level) ?? {
        level,
        afterSignupHours: 0,
        afterCredentialChangeHours: 0,
        afterNewPayeeHours: 0,
      },
  );
  return { ...view, rules, cooloffs };
}

function CurrencyToggle({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: 'NGN' | 'USD') => void;
  disabled?: boolean;
}) {
  return (
    <div className="border-border/60 inline-flex overflow-hidden rounded-md border">
      {(['NGN', 'USD'] as const).map((c) => (
        <button
          key={c}
          type="button"
          disabled={disabled}
          onClick={() => onChange(c)}
          className={`t-caption px-2 py-0.5 ${value === c ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          aria-pressed={value === c}
        >
          {c === 'NGN' ? '₦' : '$'}
        </button>
      ))}
    </div>
  );
}

function RuleCell({
  rule,
  onChange,
  disabled,
}: {
  rule: LevelRuleView;
  onChange: (patch: Partial<LevelRuleView>) => void;
  disabled: boolean;
}) {
  const error = fieldError(rule);
  const field = (key: 'minPerTx' | 'maxPerTx' | 'maxPerDay', label: string) => (
    <div className="grid gap-0.5">
      <span className="text-muted-foreground t-caption">{label}</span>
      <Input
        value={rule[key] ?? ''}
        onChange={(e) => onChange({ [key]: amount(e.target.value) || null })}
        placeholder="No limit"
        inputMode="decimal"
        disabled={disabled || !rule.allowed}
        className="h-8 font-mono"
      />
    </div>
  );
  return (
    <div className="grid min-w-44 gap-2">
      <div className="flex items-center justify-between gap-2">
        <label className="t-small flex items-center gap-2">
          <input
            type="checkbox"
            checked={rule.allowed}
            disabled={disabled}
            onChange={(e) => onChange({ allowed: e.target.checked })}
          />
          Allowed
        </label>
        <CurrencyToggle
          value={rule.currency}
          onChange={(currency) => onChange({ currency })}
          disabled={disabled || !rule.allowed}
        />
      </div>
      {field('minPerTx', 'Min per transaction')}
      {field('maxPerTx', 'Max per transaction')}
      {field('maxPerDay', 'Max per day')}
      {error ? <p className="text-destructive t-caption">{error}</p> : null}
    </div>
  );
}

/**
 * The Verification levels screen (level policy spec §6.1): one table, rows are
 * actions, columns are None / Basic / Advanced. Nothing here is hard-coded but
 * the actions themselves; every tick and number is the admin's.
 */
export function LevelPolicyGrid({ initial, canEdit }: { initial: LevelsView; canEdit: boolean }) {
  const saved = useMemo(() => complete(initial), [initial]);
  const [draft, setDraft] = useState<LevelsView>(saved);
  const [reviewing, setReviewing] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const changes = changeSummary(saved, draft);
  const caps = [draft.platform.maxSavedBankAccounts ?? 5, draft.platform.maxSavedCryptoAddresses ?? 10];
  const invalid = draft.rules.some((r) => fieldError(r) !== null) || caps.some((c) => capError(c) !== null);

  const setRule = (level: string, action: string, patch: Partial<LevelRuleView>) =>
    setDraft((d) => ({
      ...d,
      rules: d.rules.map((r) => (r.level === level && r.action === action ? { ...r, ...patch } : r)),
    }));
  const setCooloff = (level: string, key: keyof Omit<LevelCooloffView, 'level'>, value: string) =>
    setDraft((d) => ({
      ...d,
      cooloffs: d.cooloffs.map((c) => (c.level === level ? { ...c, [key]: Number(value.replace(/\D/g, '') || 0) } : c)),
    }));

  const save = () =>
    start(async () => {
      const result = await saveLevels({ rules: draft.rules, cooloffs: draft.cooloffs, platform: draft.platform });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success('Verification levels saved');
      setReviewing(false);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-card border-border/60 flex items-start gap-3 rounded-xl border p-5">
        <IconTile icon={ShieldCheck} tone="green" size="sm" />
        <div>
          <h2 className="t-section">How these are applied</h2>
          <p className="text-muted-foreground t-small mt-1 max-w-3xl">
            A change applies to the very next request. A withdrawal, trade or gift card over a limit is
            refused before anything moves; a naira deposit over it is{' '}
            <span className="text-foreground font-medium">held for review</span>, because the bank
            transfer already happened. A limit in dollars is converted at the live rate. The day runs
            midnight to midnight in Lagos.
          </p>
        </div>
      </div>

      <div className="bg-card border-border/60 overflow-x-auto rounded-xl border">
        <table className="w-full text-left">
          <thead>
            <tr className="border-border/60 border-b">
              <th className="t-small p-4 font-medium">Action</th>
              {LEVELS.map((l) => (
                <th key={l.level} className="t-small p-4 font-medium">
                  {l.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draft.actions.map((a) => (
              <tr key={a.action} className="border-border/40 border-b align-top last:border-0">
                <td className="t-small p-4 font-medium">{capital(a.label)}</td>
                {LEVELS.map(({ level }) => {
                  const rule = draft.rules.find((r) => r.level === level && r.action === a.action)!;
                  return (
                    <td key={level} className="p-4">
                      <RuleCell rule={rule} disabled={!canEdit} onChange={(patch) => setRule(level, a.action, patch)} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="bg-card border-border/60 rounded-xl border p-5">
          <h2 className="t-section mb-1">Withdrawal cool-offs</h2>
          <p className="text-muted-foreground t-caption mb-4">Hours to wait before withdrawing. 0 means no wait.</p>
          <div className="grid gap-4">
            {draft.cooloffs.map((c) => (
              <div key={c.level} className="grid gap-2">
                <p className="t-small font-medium">{LEVELS.find((l) => l.level === c.level)?.title ?? c.level}</p>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      ['afterSignupHours', 'After sign-up'],
                      ['afterCredentialChangeHours', 'After password/email change'],
                      ['afterNewPayeeHours', 'After new address/bank'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="grid gap-1">
                      <Label className="t-caption">{label}</Label>
                      <Input
                        value={String(c[key])}
                        onChange={(e) => setCooloff(c.level, key, e.target.value)}
                        inputMode="numeric"
                        disabled={!canEdit}
                        className="h-8 font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border-border/60 rounded-xl border p-5">
          <h2 className="t-section mb-1">Platform trading limit</h2>
          <p className="text-muted-foreground t-caption mb-4">
            Buying, selling and swapping by everyone together, per day. Empty means no limit.
          </p>
          <div className="flex items-end gap-3">
            <div className="grid flex-1 gap-1">
              <Label className="t-caption">Max trading per day</Label>
              <Input
                value={draft.platform.tradingMaxPerDay ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, platform: { ...d.platform, tradingMaxPerDay: amount(e.target.value) || null } }))
                }
                placeholder="No limit"
                inputMode="decimal"
                disabled={!canEdit}
                className="h-8 font-mono"
              />
            </div>
            <CurrencyToggle
              value={draft.platform.currency}
              onChange={(currency) => setDraft((d) => ({ ...d, platform: { ...d.platform, currency } }))}
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>

      <div className="bg-card border-border/60 rounded-xl border p-5">
        <h2 className="t-section mb-1">Saved withdrawal destinations</h2>
        <p className="text-muted-foreground t-caption mb-4">
          Withdrawals go only to accounts and addresses a customer has saved (with their password). How many each
          customer may keep. Lowering a number never removes saved ones; it only stops new ones.
        </p>
        <div className="grid max-w-xl grid-cols-2 gap-4">
          {(
            [
              ['maxSavedBankAccounts', 'Bank accounts', 5],
              ['maxSavedCryptoAddresses', 'Crypto addresses', 10],
            ] as const
          ).map(([key, label, fallback]) => {
            const value = draft.platform[key] ?? fallback;
            const error = capError(value);
            return (
              <div key={key} className="grid gap-1">
                <Label className="t-caption">{label}</Label>
                <Input
                  value={String(value)}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, platform: { ...d.platform, [key]: Number(e.target.value.replace(/\D/g, '') || 0) } }))
                  }
                  inputMode="numeric"
                  disabled={!canEdit}
                  className="h-8 font-mono"
                />
                {error ? <p className="text-destructive t-caption">{error}</p> : null}
              </div>
            );
          })}
        </div>
      </div>

      {canEdit ? (
        <div className="flex items-center gap-3">
          <Button onClick={() => setReviewing(true)} disabled={invalid || pending}>
            Review changes
          </Button>
          {changes.length > 0 ? (
            <Button variant="ghost" onClick={() => setDraft(saved)} disabled={pending}>
              Discard
            </Button>
          ) : null}
          {invalid ? <p className="text-destructive t-caption">Fix the highlighted limits first.</p> : null}
        </div>
      ) : (
        <p className="text-muted-foreground t-caption">You have read-only access to the verification levels.</p>
      )}

      <Dialog open={reviewing} onOpenChange={(open) => !pending && setReviewing(open)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review changes</DialogTitle>
            <DialogDescription>These take effect on the very next request once saved.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {changes.length === 0 ? (
              <p className="text-muted-foreground t-small">Nothing has changed.</p>
            ) : (
              <ul className="t-small grid gap-1.5">
                {changes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewing(false)} disabled={pending}>
              Back
            </Button>
            <Button onClick={save} disabled={changes.length === 0 || pending}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
