'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { changePassword } from '@/app/actions/settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { relativeTime } from '@/lib/utils';

/** The same rules the API enforces, shown while typing instead of after. */
const RULES = [
  { label: 'At least 10 characters', ok: (v: string) => v.length >= 10 },
  { label: 'Contains a letter', ok: (v: string) => /[a-zA-Z]/.test(v) },
  { label: 'Contains a number', ok: (v: string) => /[0-9]/.test(v) },
];

export function PasswordCard({ changedAt }: { changedAt: string }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  const passes = RULES.every((r) => r.ok(next));
  const matches = next.length > 0 && next === confirm;
  const canSubmit = current.length > 0 && passes && matches;

  const submit = () =>
    start(async () => {
      const result = await changePassword(current, next);
      if (result.error) {
        toast.error('Could not change your password', { description: result.error });
        return;
      }
      setCurrent('');
      setNext('');
      setConfirm('');
      toast.success('Password changed', {
        description: 'Every other signed-in session has been ended.',
      });
      router.refresh();
    });

  return (
    <Card>
      <div className="border-border/70 border-b p-4">
        <h2 className="t-section">Password</h2>
        <p className="text-muted-foreground t-caption mt-0.5">
          Last changed {relativeTime(changedAt)}.
        </p>
      </div>

      <CardContent className="grid max-w-md gap-4 p-5">
        <div className="grid gap-1.5">
          <Label htmlFor="pw-current">Current password</Label>
          <Input
            id="pw-current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="pw-new">New password</Label>
          <Input
            id="pw-new"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
          {next.length > 0 ? (
            <ul className="mt-1 grid gap-1">
              {RULES.map((rule) => {
                const ok = rule.ok(next);
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

        <div className="grid gap-1.5">
          <Label htmlFor="pw-confirm">Confirm new password</Label>
          <Input
            id="pw-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          {confirm.length > 0 && !matches ? (
            <p className="text-destructive t-caption">These do not match.</p>
          ) : null}
        </div>

        <p className="text-muted-foreground t-caption border-border/70 border-l-2 pl-3">
          Changing this signs out every other device. You will stay signed in here.
        </p>

        <div>
          <Button onClick={submit} disabled={!canSubmit || pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Change password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
