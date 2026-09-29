'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertCircle, Check, Clock } from 'lucide-react';
import { login, type LoginState } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { ResetForm } from '@/components/reset-form';

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

export function LoginForm({ reason, invited }: { reason?: string; invited?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});
  const [resetting, setResetting] = useState(false);

  return (
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

          {resetting ? (
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
  );
}
