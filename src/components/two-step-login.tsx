'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { abandonTwoStep, completeTwoStepSetup, resendLoginCode, verifyLoginCode } from '@/app/actions/auth';
import { BackupCodes } from '@/components/backup-codes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { codeStepText, isSixDigits } from '@/lib/two-step';

/**
 * M7: the second step of signing in. CODE: the emailed code or a backup code.
 * SETUP: an owner requires two-step, so the emailed code switches it on and the
 * backup codes are shown once before the dashboard opens.
 */
export function TwoStepLogin({
  step,
  sentTo,
  delivered,
  onBack,
}: {
  step: 'CODE' | 'SETUP';
  sentTo: string;
  delivered: boolean;
  /** Back to the password step, with why (a sign-in that expired). */
  onBack: (why?: string) => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(codeStepText(step, sentTo, delivered));
  const [codes, setCodes] = useState<string[] | null>(null);
  const [pending, start] = useTransition();

  const back = () =>
    start(async () => {
      await abandonTwoStep();
      onBack();
    });

  const submit = () =>
    start(async () => {
      setError(null);
      if (step === 'CODE') {
        const r = await verifyLoginCode(code);
        if (r?.expired) return void onBack(r.error);
        if (r?.error) setError(r.error);
        return;
      }
      const r = await completeTwoStepSetup(code);
      if (r.expired) return void onBack(r.error);
      if (r.error) return void setError(r.error);
      setCodes(r.backupCodes ?? []);
    });

  const resend = () =>
    start(async () => {
      setError(null);
      const r = await resendLoginCode();
      if (r.expired) return void onBack(r.error);
      if (r.error) return void setError(r.error);
      setNote(codeStepText(step, r.sentTo ?? sentTo, r.delivered !== false));
    });

  if (codes) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-success size-5" />
          <h2 className="t-section">Two-step sign-in is on</h2>
        </div>
        <BackupCodes codes={codes} email={sentTo} />
        <Button
          onClick={() => {
            router.replace('/');
            router.refresh();
          }}
        >
          I have saved them, continue
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div>
        <h2 className="t-section">{step === 'CODE' ? 'Check your email' : 'Turn on two-step sign-in'}</h2>
        <p className="text-muted-foreground t-caption mt-0.5">{note}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="two-step-code">6-digit code</Label>
        <Input
          id="two-step-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          autoFocus
          required
        />
      </div>
      {error ? (
        <div role="alert" className="border-destructive/25 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      <Button type="submit" loading={pending} disabled={!isSixDigits(code)}>
        {step === 'CODE' ? 'Sign in' : 'Turn on and sign in'}
      </Button>
      <div className="flex justify-between text-xs">
        <button type="button" onClick={resend} disabled={pending} className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
          Send a new code
        </button>
        <button type="button" onClick={back} disabled={pending} className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
          Back to sign in
        </button>
      </div>
    </form>
  );
}
