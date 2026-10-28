'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, Check, Clock, Landmark, ShieldCheck, Users } from 'lucide-react';
import { login, type LoginState } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { ResetForm } from '@/components/reset-form';
import { TwoStepLogin } from '@/components/two-step-login';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" loading={pending}>
      {pending ? 'Signing in' : 'Sign in'}
    </Button>
  );
}

/**
 * Why they are back here.
 *
 * "Signed out after a period of inactivity" is a completely different message
 * from "incorrect password", and landing on a bare login form after being
 * timed out reads as the app having lost your work. Passed in from the server
 * so it is in the first paint rather than appearing after hydration.
 */
function SignedOutReason({ reason }: { reason?: string }) {
  if (!reason) return null;

  return (
    <div
      role="status"
      className="border-warning/30 bg-warning/10 mb-4 flex items-start gap-2 rounded-md border p-3 text-sm"
    >
      <Clock className="text-warning mt-0.5 size-4 shrink-0" />
      <span>{reason}</span>
    </div>
  );
}

/**
 * M7: going back from the second step (or a sign-in that expired) starts the
 * form afresh: a new key remounts it, which clears the step it was on.
 */
export function LoginForm({ reason, invited }: { reason?: string; invited?: string }) {
  const [attempt, setAttempt] = useState(0);
  const [backReason, setBackReason] = useState<string | undefined>(undefined);
  return (
    <LoginBody
      key={attempt}
      reason={backReason ?? reason}
      invited={invited}
      onBackToPassword={(why) => {
        setBackReason(why);
        setAttempt((n) => n + 1);
      }}
    />
  );
}

function LoginBody({ reason, invited, onBackToPassword }: { reason?: string; invited?: string; onBackToPassword: (why?: string) => void }) {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});
  const [resetting, setResetting] = useState(false);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* A single quiet gradient rather than a busy hero — this is a door, not a landing page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_50%_0%,var(--color-primary)/8%,transparent_70%)]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo className="size-10" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Davochain Admin</h1>
            <p className="text-muted-foreground mt-1 text-sm">Treasury, gates and oversight</p>
          </div>
        </div>

        <div className="surface rounded-xl p-6">
          <SignedOutReason reason={reason} />

          {invited && !reason ? (
            <div
              role="status"
              className="border-success/30 bg-success/10 mb-4 flex items-start gap-2 rounded-md border p-3 text-sm"
            >
              <Check className="text-success mt-0.5 size-4 shrink-0" />
              <span>Your password is set. Sign in with it to finish.</span>
            </div>
          ) : null}

          {state.step ? (
            <TwoStepLogin step={state.step} sentTo={state.sentTo ?? ''} delivered={state.delivered !== false} onBack={onBackToPassword} />
          ) : resetting ? (
            <ResetForm onCancel={() => setResetting(false)} />
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@davochain.com"
                  defaultValue={invited ?? undefined}
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setResetting(true)}
                    className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>

              {state.error ? (
                <div
                  role="alert"
                  className="border-destructive/25 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{state.error}</span>
                </div>
              ) : null}

              <SubmitButton />
            </form>
          )}
        </div>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          No account?{' '}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.7rem]">
            npm run create-admin
          </code>
        </p>
      </div>
    </main>
    <BrandPanel />
    </div>
  );
}

/** The right half of the sign-in page on wide screens (shadcn's two-column login). */
function BrandPanel() {
  const points = [
    { icon: Landmark, text: 'Treasury, stock and earnings at a glance' },
    { icon: Users, text: 'Customers, identity checks and daily limits' },
    { icon: ShieldCheck, text: 'Every change asks for a reason and is kept in the audit log' },
  ];
  return (
    <aside className="relative hidden overflow-hidden bg-linear-to-br from-[#135CF7] to-[#0b3fb0] p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-[#66B3FF]/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-white/10 blur-3xl"
      />
      <div className="relative flex items-center gap-2.5">
        <span className="rounded-lg bg-white p-1.5 shadow-sm">
          <Logo className="size-6" />
        </span>
        <span className="text-lg font-semibold tracking-tight">DavoChain</span>
      </div>
      <div className="relative max-w-md">
        <h2 className="text-3xl font-semibold tracking-tight">Run the exchange from one place.</h2>
        <ul className="mt-8 flex flex-col gap-4">
          {points.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-white/90">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                <Icon className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
      <p className="relative text-sm text-white/60">Admin dashboard · for the DavoChain team only</p>
    </aside>
  );
}
