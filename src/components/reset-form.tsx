'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Check, Mail, X } from 'lucide-react';
import { confirmReset, requestResetCode } from '@/app/actions/reset';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** The same rules the API enforces, shown while typing instead of after. */
const RULES = [
  { label: 'At least 10 characters', ok: (v: string) => v.length >= 10 },
  { label: 'Contains a letter', ok: (v: string) => /[a-zA-Z]/.test(v) },
  { label: 'Contains a number', ok: (v: string) => /[0-9]/.test(v) },
];

/**
 * Reset by emailed code, in two steps on one screen.
 *
 * Step one never says whether the email matched an account — that answer would
 * be a way to find out which addresses are admins — so the second step appears
 * either way and a wrong address simply never receives a code.
 */
export function ResetForm({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const passes = RULES.every((r) => r.ok(password));

  const askForCode = () =>
    start(async () => {
      setError(null);
      const result = await requestResetCode(email.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      setStep('code');
    });

  const finish = () =>
    start(async () => {
      setError(null);
      const result = await confirmReset({
        email: email.trim(),
        code: code.trim(),
        newPassword: password,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      // The reset signs them in, so go straight to the dashboard.
      router.replace('/');
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="t-section">Reset your password</h2>
        <p className="text-muted-foreground t-caption mt-0.5">
          {step === 'email'
            ? 'We will email a six-digit code to your admin address.'
            : 'Enter the code and choose a new password.'}
        </p>
      </div>

      {step === 'email' ? (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@davochain.com"
              autoFocus
            />
          </div>
          <Button onClick={askForCode} disabled={pending || !email.includes('@')} loading={pending}>
            <Mail className="size-4" />
            Send me a code
          </Button>
        </>
      ) : (
        <>
          <div className="border-border/70 bg-secondary/40 rounded-md border p-3">
            <p className="t-caption">
              If <span className="text-foreground font-medium">{email}</span> belongs to an admin, a
              code is on its way. Sub-admins: an owner is copied on it.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reset-code">Six-digit code</Label>
            <Input
              id="reset-code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center font-mono text-lg tracking-[0.4em]"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {password.length > 0 ? (
              <ul className="grid gap-1">
                {RULES.map((rule) => {
                  const ok = rule.ok(password);
                  return (
                    <li
                      key={rule.label}
                      className={cn(
                        't-caption flex items-center gap-1.5',
                        ok ? 'text-success' : 'text-muted-foreground',
                      )}
                    >
                      {ok ? <Check className="size-3" /> : <X className="size-3" />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <Button
            onClick={finish}
            disabled={pending || code.length !== 6 || !passes}
            loading={pending}
          >
            Set new password
          </Button>

          <button
            type="button"
            onClick={() => setStep('email')}
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
          >
            Use a different email
          </button>
        </>
      )}

      {error ? (
        <div
          role="alert"
          className="border-destructive/25 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onCancel}
        className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 text-xs"
      >
        <ArrowLeft className="size-3" />
        Back to sign in
      </button>
    </div>
  );
}
