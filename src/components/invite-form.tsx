'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, X } from 'lucide-react';
import { acceptInvite, type InviteCheck } from '@/app/actions/invite';
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
 * Where an invited admin chooses their own password.
 *
 * No password was ever generated for them, so this is the only way in. Nothing
 * usable was in the email — the link proves who they are, and what they type
 * here is the first credential the account has ever had.
 */
export function InviteForm({ token, invite }: { token: string; invite: InviteCheck }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const passes = RULES.every((r) => r.ok(password));
  const matches = confirm.length > 0 && confirm === password;

  const submit = () =>
    start(async () => {
      setError(null);
      const result = await acceptInvite(token, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Straight to the sign-in screen with the address filled in — they have
      // just chosen the password, so typing it once more is the whole job.
      router.push(`/login?invited=${encodeURIComponent(result.email!)}`);
    });

  if (!invite.valid) {
    return (
      <div className="flex flex-col gap-4">
        <div className="border-destructive/30 bg-destructive/10 flex items-start gap-2 rounded-md border p-3 text-sm">
          <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">This invitation cannot be used.</p>
            <p className="text-muted-foreground mt-1">
              It has either expired, been used already, or the account was deactivated. Ask an
              owner to send you a new one.
            </p>
          </div>
        </div>
        <Button variant="outline" asChild className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-4"
    >
      <div className="border-border/70 bg-secondary/40 rounded-md border p-3">
        <p className="text-sm font-medium">{invite.name}</p>
        <p className="text-muted-foreground text-xs">{invite.email}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {invite.role === 'OWNER' ? 'Owner' : 'Sub-admin'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Choose a password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
        />
        <ul className="mt-0.5 flex flex-col gap-1">
          {RULES.map((rule) => {
            const ok = rule.ok(password);
            return (
              <li
                key={rule.label}
                className={cn(
                  'flex items-center gap-1.5 text-xs',
                  ok ? 'text-success' : 'text-muted-foreground',
                )}
              >
                {ok ? <Check className="size-3" /> : <X className="size-3 opacity-40" />}
                {rule.label}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Type it again</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {confirm.length > 0 && !matches ? (
          <p className="text-destructive text-xs">Those do not match.</p>
        ) : null}
      </div>

      {error ? (
        <div className="border-destructive/30 bg-destructive/10 flex items-start gap-2 rounded-md border p-3 text-sm">
          <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <Button type="submit" className="w-full" loading={pending} disabled={!passes || !matches}>
        Set my password
      </Button>
    </form>
  );
}
