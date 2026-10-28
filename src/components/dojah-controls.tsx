'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, Loader2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { saveDojahSettings, setBasicSwitch, suggestThresholds } from '@/app/actions/dojah';
import { settingsChanges, type DojahSettings, type DojahSettingsPatch } from '@/lib/dojah';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DojahAdvancedCard } from '@/components/dojah-advanced-card';

type NumKey = 'minBalance' | 'lowBalanceWarn' | 'dailyAttempts' | 'totalAttempts';

const FIELDS: Array<{ key: NumKey; label: string; help: string; money: boolean }> = [
  { key: 'minBalance', label: 'Hard stop (₦)', help: 'Below this, new Basic checks are refused, so we never run out of money in the middle of one.', money: true },
  { key: 'lowBalanceWarn', label: 'Warning level (₦)', help: 'Below this, owners get an email to top up. Must be higher than the hard stop.', money: true },
  { key: 'dailyAttempts', label: 'Tries per customer per day', help: 'How many times one customer may try Basic verification in a day (1 to 20).', money: false },
  { key: 'totalAttempts', label: 'Tries per customer in total', help: 'How many times one customer may ever try (1 to 20). Must be at least the daily number.', money: false },
];

const digits = (v: string) => v.replace(/\D/g, '');

/** The four numbers, with where each comes from, reset links, and a confirm before saving. */
function SettingsCard({ settings, canEdit }: { settings: DojahSettings; canEdit: boolean }) {
  const router = useRouter();
  const initial = Object.fromEntries(FIELDS.map((f) => [f.key, settings[f.key] === null ? '' : String(settings[f.key])])) as Record<NumKey, string>;
  const [draft, setDraft] = useState(initial);
  const [resets, setResets] = useState<Set<NumKey>>(new Set());
  const [pending, start] = useTransition();

  const patch: DojahSettingsPatch = {};
  for (const f of FIELDS) {
    if (resets.has(f.key)) patch[f.key] = null;
    else if (draft[f.key] !== initial[f.key] && draft[f.key] !== '') patch[f.key] = Number(draft[f.key]);
  }
  const changes = settingsChanges(settings, patch);

  const save = () =>
    start(async () => {
      if (!globalThis.confirm(`Save these Dojah changes?\n\n${changes.join('\n')}`)) return;
      const r = await saveDojahSettings(patch);
      if (r.error) {
        toast.error('Not saved', { description: r.error });
        return;
      }
      toast.success('Dojah settings saved', { description: 'They apply to the very next verification.' });
      setResets(new Set());
      router.refresh();
    });

  return (
    <div className="bg-card border-border/60 rounded-xl border shadow-xs p-5">
      <h2 className="t-section mb-1">Settings</h2>
      <p className="text-muted-foreground t-caption mb-4">
        Set here, these replace the server&apos;s own numbers (from its settings file). &quot;Server default&quot; means nothing is set here yet.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((f) => {
          const fromScreen = settings.source[f.key] === 'screen' && !resets.has(f.key);
          return (
            <div key={f.key} className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label>{f.label}</Label>
                <Badge variant={fromScreen ? 'success' : 'outline'}>{fromScreen ? 'set here' : 'server default'}</Badge>
              </div>
              <Input
                value={draft[f.key]}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, [f.key]: digits(e.target.value) }));
                  setResets((r) => {
                    const n = new Set(r);
                    n.delete(f.key);
                    return n;
                  });
                }}
                inputMode="numeric"
                placeholder={f.money ? 'Not set' : ''}
                className="font-mono"
                disabled={!canEdit || pending}
              />
              <p className="text-muted-foreground t-caption">{f.help}</p>
              {canEdit && settings.source[f.key] === 'screen' && !resets.has(f.key) ? (
                <button type="button" className="text-primary t-caption w-fit hover:underline" onClick={() => setResets((r) => new Set(r).add(f.key))}>
                  Reset to server default
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {canEdit ? (
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={save} disabled={pending || changes.length === 0}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Save
          </Button>
          {changes.length ? (
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(initial);
                setResets(new Set());
              }}
              disabled={pending}
            >
              Discard
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Owners only: Basic verification on or off, with their password. */
function SwitchCard({ enabled, source, ready, failing, isOwner }: { enabled: boolean; source: 'screen' | 'server'; ready: boolean; failing: string[]; isOwner: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const change = (next: boolean | null) =>
    start(async () => {
      const verb = next === null ? 'go back to the server default for' : next ? 'switch ON' : 'switch OFF';
      const password = globalThis.prompt(`To ${verb} Basic verification, type your password.`);
      if (!password) return;
      const r = await setBasicSwitch(next, password);
      if (r.error) {
        toast.error('Not changed', { description: r.error });
        return;
      }
      toast.success(next === null ? 'Back to the server default' : next ? 'Basic verification is on' : 'Basic verification is off');
      router.refresh();
    });

  return (
    <div className="bg-card border-border/60 rounded-xl border shadow-xs p-5">
      <div className="flex items-center gap-2">
        <Power className="size-4" />
        <h2 className="t-section">Basic verification switch</h2>
        <Badge variant={enabled ? 'success' : 'outline'}>{enabled ? 'on' : 'off'}</Badge>
        <Badge variant="outline">{source === 'screen' ? 'set here' : 'server default'}</Badge>
      </div>
      <p className="text-muted-foreground t-caption mt-2">
        When off, customers can&apos;t start BVN/NIN verification (the app says it isn&apos;t available yet). Only owners can change this, and it
        asks for your password. It can only be switched on when every check above is ✓.
      </p>
      {!ready && !enabled ? (
        <div className="border-warning/25 bg-warning/5 mt-3 rounded-md border p-3">
          <p className="t-small font-medium">Fix these first:</p>
          <ul className="t-small mt-1 list-disc pl-5">
            {failing.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {isOwner ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {enabled ? (
            <Button variant="outline" onClick={() => change(false)} disabled={pending}>
              Switch off
            </Button>
          ) : (
            <Button onClick={() => change(true)} disabled={pending || !ready}>
              Switch on
            </Button>
          )}
          {source === 'screen' ? (
            <Button variant="ghost" onClick={() => change(null)} disabled={pending}>
              Use the server default
            </Button>
          ) : null}
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        </div>
      ) : (
        <p className="text-muted-foreground t-caption mt-3">Only an owner can change this.</p>
      )}
    </div>
  );
}

/** The calculator: Dojah's prices in, suggested numbers out, with the working. */
function CalculatorCard({ canEdit, onUse }: { canEdit: boolean; onUse: (min: number, warn: number) => void }) {
  const [lookup, setLookup] = useState('');
  const [aml, setAml] = useState('');
  const [days, setDays] = useState('3');
  const [advanced, setAdvanced] = useState('');
  const [result, setResult] = useState<{ minBalance: number; lowBalanceWarn: number; workings: string[] } | null>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      const r = await suggestThresholds({ lookupPrice: Number(lookup), amlPrice: Number(aml), leadDays: Number(days) || 3, ...(Number(advanced) > 0 ? { advancedPrice: Number(advanced) } : {}) });
      if (r.error) {
        toast.error('Could not work it out', { description: r.error });
        return;
      }
      setResult({ minBalance: r.minBalance!, lowBalanceWarn: r.lowBalanceWarn!, workings: r.workings! });
    });

  return (
    <div className="bg-card border-border/60 rounded-xl border shadow-xs p-5">
      <div className="flex items-center gap-2">
        <Calculator className="size-4" />
        <h2 className="t-section">Work out the hard stop and warning level</h2>
      </div>
      <p className="text-muted-foreground t-caption mt-1 mb-4">
        Type Dojah&apos;s prices from your contract or invoice. We use your busiest hour and busiest day of the last 7 days.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1">
          <Label className="t-caption">Price per BVN/NIN check (₦)</Label>
          <Input value={lookup} onChange={(e) => setLookup(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className="font-mono" />
        </div>
        <div className="grid gap-1">
          <Label className="t-caption">Price per screening (₦)</Label>
          <Input value={aml} onChange={(e) => setAml(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className="font-mono" />
        </div>
        <div className="grid gap-1">
          <Label className="t-caption">Price per Advanced check (₦, optional)</Label>
          <Input value={advanced} onChange={(e) => setAdvanced(e.target.value.replace(/[^d.]/g, ''))} inputMode="decimal" className="font-mono" />
        </div>
        <div className="grid gap-1">
          <Label className="t-caption">Days of warning before running out</Label>
          <Input value={days} onChange={(e) => setDays(digits(e.target.value))} inputMode="numeric" className="font-mono" />
        </div>
      </div>
      <Button className="mt-3" variant="outline" onClick={run} disabled={pending || !lookup || !aml}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        Work it out
      </Button>
      {result ? (
        <div className="border-border/60 mt-4 rounded-md border p-3">
          <ul className="t-small grid gap-1.5">
            {result.workings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          {canEdit ? (
            <Button size="sm" className="mt-3" onClick={() => onUse(result.minBalance, result.lowBalanceWarn)}>
              Use these numbers
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The interactive half of the Dojah screen. */
export function DojahControls({
  settings,
  ready,
  failing,
  isOwner,
  canEdit,
}: {
  settings: DojahSettings;
  ready: boolean;
  failing: string[];
  isOwner: boolean;
  canEdit: boolean;
}) {
  // "Use these numbers" from the calculator, waiting to be saved.
  const [filled, setFilled] = useState<{ minBalance: number; lowBalanceWarn: number } | null>(null);
  return (
    <div className="flex flex-col gap-5">
      <SwitchCard enabled={settings.basicEnabled} source={settings.source.basicEnabled} ready={ready} failing={failing} isOwner={isOwner} />
      <DojahAdvancedCard settings={settings} ready={ready} failing={failing} isOwner={isOwner} />
      {filled ? (
        <FilledSettingsCard saved={settings} filled={filled} canEdit={canEdit} onClose={() => setFilled(null)} />
      ) : (
        <SettingsCard settings={settings} canEdit={canEdit} />
      )}
      <CalculatorCard
        canEdit={canEdit}
        onUse={(minBalance, lowBalanceWarn) => {
          setFilled({ minBalance, lowBalanceWarn });
          toast.message('Filled in under Settings', { description: 'Check the numbers, then press Save.' });
        }}
      />
    </div>
  );
}

/** The calculator's two numbers, compared with what is saved, ready to save or discard. */
function FilledSettingsCard({
  saved,
  filled,
  canEdit,
  onClose,
}: {
  saved: DojahSettings;
  filled: { minBalance: number; lowBalanceWarn: number };
  canEdit: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const patch: DojahSettingsPatch = { minBalance: filled.minBalance, lowBalanceWarn: filled.lowBalanceWarn };
  const changes = settingsChanges(saved, patch);
  const save = () =>
    start(async () => {
      if (!globalThis.confirm(`Save these Dojah changes?\n\n${changes.join('\n')}`)) return;
      const r = await saveDojahSettings(patch);
      if (r.error) {
        toast.error('Not saved', { description: r.error });
        return;
      }
      toast.success('Dojah settings saved', { description: 'They apply to the very next verification.' });
      onClose();
      router.refresh();
    });
  return (
    <div className="bg-card border-primary/40 rounded-xl border p-5">
      <h2 className="t-section mb-1">Settings: the calculator&apos;s numbers</h2>
      <p className="text-muted-foreground t-caption mb-3">Not saved yet.</p>
      <ul className="t-small mb-4 grid gap-1">
        {changes.length ? changes.map((c) => <li key={c}>{c}</li>) : <li>These are already the numbers in use.</li>}
      </ul>
      {canEdit ? (
        <div className="flex gap-3">
          <Button onClick={save} disabled={pending || changes.length === 0}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Save
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Discard
          </Button>
        </div>
      ) : null}
    </div>
  );
}
