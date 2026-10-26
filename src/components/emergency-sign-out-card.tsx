'use client';

import { useState, useTransition } from 'react';
import { LogOut, Siren } from 'lucide-react';
import { toast } from 'sonner';
import { signOutAllCustomers } from '@/app/actions/server-settings';
import { reasonProblem, SIGN_OUT_PHRASE } from '@/lib/server-settings';
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

/**
 * Emergency: sign every customer out at once (for example after a leaked
 * signing key). Customers' money is untouched; they just sign in again.
 * Admins are not affected. Owners are emailed.
 */
export function EmergencySignOutCard() {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const close = () => {
    setOpen(false);
    setPhrase('');
    setPassword('');
    setProblem(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const issue = phrase.trim() !== SIGN_OUT_PHRASE ? `Type ${SIGN_OUT_PHRASE} to confirm.` : reasonProblem(reason);
    if (issue) {
      setProblem(issue);
      return;
    }
    start(async () => {
      const r = await signOutAllCustomers({ password, reason });
      if (r.error) {
        setPassword('');
        setProblem(r.error);
        return;
      }
      close();
      setReason('');
      toast.success('Every customer has been signed out', {
        description: `${r.result?.refreshTokensRevoked ?? 0} sign-ins ended. They can sign in again with their password. Owners were emailed.`,
      });
    });
  };

  return (
    <>
      <div className="bg-card border-destructive/30 flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-start">
        <IconTile icon={Siren} tone="rose" size="sm" />
        <div className="flex-1">
          <h2 className="t-section">Emergency: sign out all customers</h2>
          <p className="text-muted-foreground t-small mt-1 max-w-3xl">
            Ends every customer&apos;s sign-in on every phone, straight away. Use it if you think customer
            sessions may have been stolen. Balances and orders are not touched, and admins stay signed in.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <LogOut className="size-3.5" />
          Sign out all customers
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <form onSubmit={submit} className="flex min-h-0 flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Siren className="text-destructive size-4" />
                Sign out all customers?
              </DialogTitle>
              <DialogDescription>
                Every customer will have to sign in again. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="signout-phrase">
                  Type <code className="font-mono">{SIGN_OUT_PHRASE}</code> to confirm
                </Label>
                <Input id="signout-phrase" autoFocus autoComplete="off" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="signout-reason">Reason (kept in the audit log)</Label>
                <Input
                  id="signout-reason"
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. suspected leak of customer sessions"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="signout-password">Your password</Label>
                <Input
                  id="signout-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {problem ? <p className="text-destructive t-caption">{problem}</p> : null}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" loading={pending} disabled={!password}>
                Sign everyone out
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
