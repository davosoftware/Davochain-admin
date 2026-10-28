'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ScanFace } from 'lucide-react';
import { toast } from 'sonner';
import { saveAdvancedSettings, setAdvancedSwitch } from '@/app/actions/dojah';
import type { AdvancedSettingsPatch, DojahSettings } from '@/lib/dojah';
import { TIPS } from '@/lib/tips';
import { InfoTip } from '@/components/info-tip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Key = keyof AdvancedSettingsPatch;
const DEFAULTS: Record<Key, number> = { livenessMin: 90, faceMatchPass: 75, faceMatchReview: 60, addressRecencyMonths: 3, advancedDailyAttempts: 3, advancedTotalAttempts: 10 };
const FIELDS: Array<{ key: Key; label: string; range: string; tip: string }> = [
  { key: 'livenessMin', label: 'Live selfie score to pass', range: '50–100', tip: TIPS.dojahAdvanced.liveness },
  { key: 'faceMatchPass', label: 'Face match: pass mark', range: '60–100', tip: TIPS.dojahAdvanced.faceMatch },
  { key: 'faceMatchReview', label: 'Face match: a person decides from', range: '60 up to the pass mark', tip: TIPS.dojahAdvanced.faceMatch },
  { key: 'addressRecencyMonths', label: 'Proof of address: months old at most', range: '1–12', tip: TIPS.dojahAdvanced.recency },
  { key: 'advancedDailyAttempts', label: 'Tries per step per day', range: '1–20', tip: TIPS.dojahAdvanced.tries },
  { key: 'advancedTotalAttempts', label: 'Tries per step in total', range: '1–20', tip: TIPS.dojahAdvanced.tries },
];
const askPassword = (what: string) => globalThis.prompt(`To ${what}, type your password.`);

/**
 * Advanced checks (spec 2026-10-21 §5.3): the switch and the numbers that decide
 * who is approved without a person. Owners only, with their password.
 */
export function DojahAdvancedCard({ settings, ready, failing, isOwner }: { settings: DojahSettings; ready: boolean; failing: string[]; isOwner: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const current = (k: Key) => settings[k] ?? DEFAULTS[k];
  const [form, setForm] = useState<Record<Key, string>>(() => Object.fromEntries(FIELDS.map((f) => [f.key, String(current(f.key))])) as Record<Key, string>);
  const enabled = settings.advancedEnabled === true;
  const source = settings.source.advancedEnabled ?? 'server';

  const toggle = (next: boolean | null) =>
    start(async () => {
      const password = askPassword(next === null ? 'go back to the server default for Advanced checks' : next ? 'switch Advanced checks ON' : 'switch Advanced checks OFF');
      if (!password) return;
      const r = await setAdvancedSwitch(next, password);
      if (r.error) {
        toast.error('Not changed', { description: r.error });
        return;
      }
      toast.success(next === null ? 'Back to the server default' : next ? 'Advanced checks are on' : 'Advanced checks are off');
      router.refresh();
    });

  const save = () =>
    start(async () => {
      const patch: AdvancedSettingsPatch = {};
      for (const f of FIELDS) {
        const n = Number(form[f.key]);
        if (form[f.key] !== '' && n !== current(f.key)) patch[f.key] = n;
      }
      if (Object.keys(patch).length === 0) {
        toast.message('Nothing changed');
        return;
      }
      const password = askPassword('change the Advanced checks');
      if (!password) return;
      const r = await saveAdvancedSettings(patch, password);
      if (r.error) {
        toast.error('Not saved', { description: r.error });
        return;
      }
      toast.success('Advanced settings saved', { description: 'They apply to the next check.' });
      router.refresh();
    });

  return (
    <div className="bg-card border-border/60 rounded-xl border shadow-xs p-5">
      <div className="flex flex-wrap items-center gap-2">
        <ScanFace className="size-4" />
        <h2 className="t-section">Advanced checks (ID, selfie, proof of address)</h2>
        <InfoTip text={TIPS.dojahAdvanced.switch} />
        <Badge variant={enabled ? 'success' : 'outline'}>{enabled ? 'on' : 'off'}</Badge>
        <Badge variant="outline">{source === 'screen' ? 'set here' : 'server default'}</Badge>
      </div>
      <p className="text-muted-foreground t-caption mt-2">
        When on, Dojah reads the customer&apos;s ID, checks the selfie is a live face that matches the ID, and reads their proof of address.
        Clear passes are approved by themselves; anything unclear waits for a person on KYC → Advanced checks.
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="grid gap-1">
            <div className="flex items-center gap-1.5">
              <Label className="t-caption">{f.label}</Label>
              <InfoTip text={f.tip} />
            </div>
            <Input
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value.replace(/\D/g, '') })}
              inputMode="numeric"
              className="font-mono"
              disabled={!isOwner}
              aria-label={f.label}
            />
            <span className="text-muted-foreground t-caption">
              {f.range}
              {settings.source[f.key] === 'screen' ? ' · set here' : ' · default'}
            </span>
          </div>
        ))}
      </div>

      {isOwner ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={save} disabled={pending}>
            Save the numbers
          </Button>
          {enabled ? (
            <Button variant="outline" onClick={() => toggle(false)} disabled={pending}>
              Switch off
            </Button>
          ) : (
            <Button variant="outline" onClick={() => toggle(true)} disabled={pending || !ready}>
              Switch on
            </Button>
          )}
          {source === 'screen' ? (
            <Button variant="ghost" onClick={() => toggle(null)} disabled={pending}>
              Use the server default
            </Button>
          ) : null}
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        </div>
      ) : (
        <p className="text-muted-foreground t-caption mt-3">Only an owner can change these.</p>
      )}
    </div>
  );
}
