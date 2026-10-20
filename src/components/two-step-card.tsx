'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  disableTwoStep,
  enableTwoStep,
  regenerateBackupCodes,
  sendTwoStepCode,
  setTwoStepRequired,
  type TwoStepStatus,
} from '@/app/actions/two-step';
import { BackupCodes } from '@/components/backup-codes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isSixDigits } from '@/lib/two-step';
import { relativeTime } from '@/lib/utils';

type Mode = 'idle' | 'on-code' | 'off' | 'codes';

/**
 * M7: Settings → Security. Each admin switches two-step sign-in on or off for
 * their own account; an owner can require it for everyone.
 */
export function TwoStepCard({ status, email, isOwner, canManageTeam }: { status: TwoStepStatus; email: string; isOwner: boolean; canManageTeam: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('idle');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [pending, start] = useTransition();
  const askPassword = (what: string) => globalThis.prompt(`To ${what}, type your password.`);

  const reset = () => {
    setPassword('');
    setCode('');
    setMode('idle');
  };

  const startOn = () =>
    start(async () => {
      const r = await sendTwoStepCode(password);
      if (r.error) return void toast.error('Could not send a code', { description: r.error });
      toast.message(r.delivered === false ? "We couldn't send the code. Try again in a minute." : `Code sent to ${r.sentTo}`);
      setMode('on-code');
    });

  const finishOn = () =>
    start(async () => {
      const r = await enableTwoStep(code);
      if (r.error) return void toast.error('Not turned on', { description: r.error });
      setCodes(r.backupCodes ?? []);
      setMode('codes');
      toast.success('Two-step sign-in is on', { description: 'Your other signed-in sessions were ended.' });
    });

  const sendOffCode = () =>
    start(async () => {
      const r = await sendTwoStepCode(password);
      if (r.error) return void toast.error('Could not send a code', { description: r.error });
      toast.message(`Code sent to ${r.sentTo}. You can also use a backup code.`);
    });

  const finishOff = () =>
    start(async () => {
      const r = await disableTwoStep(password, code);
      if (r.error) return void toast.error('Not turned off', { description: r.error });
      toast.success('Two-step sign-in is off');
      reset();
      router.refresh();
    });

  const newCodes = () =>
    start(async () => {
      if (!globalThis.confirm('Make 10 new backup codes? Your current backup codes will stop working.')) return;
      const pw = askPassword('make new backup codes');
      if (!pw) return;
      const r = await regenerateBackupCodes(pw);
      if (r.error) return void toast.error('No new codes', { description: r.error });
      setCodes(r.backupCodes ?? []);
      setMode('codes');
    });

  const toggleRequired = () =>
    start(async () => {
      const next = !status.required;
      const what = next ? 'require two-step sign-in for every admin' : 'stop requiring two-step sign-in';
      if (!globalThis.confirm(next ? 'Require two-step sign-in for every admin? Anyone without it must switch it on at their next sign-in.' : 'Stop requiring two-step sign-in? Admins may then switch it off.')) return;
      const pw = askPassword(what);
      if (!pw) return;
      const r = await setTwoStepRequired(next, pw);
      if (r.error) return void toast.error('Not changed', { description: r.error });
      toast.success(next ? 'Two-step sign-in is now required' : 'Two-step sign-in is no longer required');
      router.refresh();
    });

  return (
    <Card>
      <div className="border-border/70 flex items-start justify-between gap-3 border-b p-4">
        <div>
          <h2 className="t-section">Two-step sign-in</h2>
          <p className="text-muted-foreground t-caption mt-0.5">
            After your password, a 6-digit code emailed to you (or a backup code). Stops someone who only has your password.
          </p>
        </div>
        {status.enabled ? (
          <Badge variant="success">
            <ShieldCheck className="size-3.5" /> On
          </Badge>
        ) : (
          <Badge variant="outline">
            <ShieldOff className="size-3.5" /> Off
          </Badge>
        )}
      </div>

      <CardContent className="grid max-w-md gap-4 p-5">
        {mode === 'codes' && codes ? (
          <>
            <BackupCodes codes={codes} email={email} />
            <Button
              onClick={() => {
                setCodes(null);
                reset();
                router.refresh();
              }}
            >
              I have saved them
            </Button>
          </>
        ) : status.enabled ? (
          <>
            <p className="text-sm">
              On since {status.enabledAt ? relativeTime(status.enabledAt) : 'earlier'}. Backup codes left: <strong>{status.backupCodesLeft}</strong> of 10.
            </p>
            {status.required ? (
              <p className="text-muted-foreground text-sm">An owner requires two-step sign-in for every admin, so it cannot be turned off.</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={newCodes} disabled={pending}>
                Make new backup codes
              </Button>
              {!status.required && mode !== 'off' ? (
                <Button size="sm" variant="outline" onClick={() => setMode('off')} disabled={pending}>
                  Turn off
                </Button>
              ) : null}
            </div>
            {mode === 'off' ? (
              <div className="grid gap-3 rounded-md border p-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="ts-off-pw">Your password</Label>
                  <Input id="ts-off-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button size="sm" variant="ghost" onClick={sendOffCode} disabled={pending || !password}>
                  Email me a code
                </Button>
                <div className="grid gap-1.5">
                  <Label htmlFor="ts-off-code">Emailed code or a backup code</Label>
                  <Input id="ts-off-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={finishOff} disabled={pending || !password || !isSixDigits(code)}>
                    Turn off two-step sign-in
                  </Button>
                  <Button size="sm" variant="ghost" onClick={reset} disabled={pending}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : mode === 'on-code' ? (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="ts-on-code">The 6-digit code we emailed you</Label>
              <Input id="ts-on-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={finishOn} disabled={pending || !isSixDigits(code)}>
                Turn on
              </Button>
              <Button size="sm" variant="ghost" onClick={reset} disabled={pending}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            {status.required ? (
              <p className="text-sm">An owner requires two-step sign-in. Turn it on now.</p>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="ts-on-pw">Your password</Label>
              <Input id="ts-on-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button size="sm" onClick={startOn} disabled={pending || !password}>
              Turn on two-step sign-in
            </Button>
          </>
        )}

        {isOwner && canManageTeam ? (
          <div className="border-border/70 mt-2 flex items-center justify-between gap-3 border-t pt-4">
            <div>
              <p className="text-sm font-medium">Require it for every admin</p>
              <p className="text-muted-foreground t-caption">
                {status.required ? 'On: admins without it must turn it on at their next sign-in.' : 'Off: each admin chooses.'}
                {!status.enabled ? ' Turn it on for yourself first.' : ''}
              </p>
            </div>
            <Button size="sm" variant={status.required ? 'outline' : 'default'} onClick={toggleRequired} disabled={pending || (!status.required && !status.enabled)}>
              {status.required ? 'Stop requiring' : 'Require'}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
