'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { setAutoCreate } from '@/app/actions/crypto-addresses';
import type { AutoCreateNetwork } from '@/lib/crypto-addresses';
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
 * "Created in advance": the coin networks every verified customer gets an
 * address for without opening Receive. Changing one needs "Manage inventory"
 * and the admin's password; audited.
 */
export function AutoCreateCard({ networks, canEdit }: { networks: AutoCreateNetwork[]; canEdit: boolean }) {
  const [changing, setChanging] = useState<AutoCreateNetwork | null>(null);
  const [password, setPassword] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const on = networks.filter((n) => n.autoCreate);

  const close = () => {
    setChanging(null);
    setPassword('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changing) return;
    start(async () => {
      const r = await setAutoCreate({ asset: changing.asset, network: changing.network, enabled: !changing.autoCreate, password });
      if (r.error) {
        setPassword('');
        toast.error('Nothing changed', { description: r.error });
        return;
      }
      toast.success(
        r.network?.autoCreate
          ? `${changing.asset.toUpperCase()} on ${changing.label} will be made in advance`
          : `${changing.asset.toUpperCase()} on ${changing.label} is made only when asked for`,
        { description: 'Verified customers are filled in a few at a time. Recorded in the audit log.' },
      );
      close();
      router.refresh();
    });
  };

  return (
    <>
      <div className="bg-card border-border/60 rounded-xl border shadow-xs p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="text-primary mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <h2 className="t-section">Created in advance</h2>
            <p className="text-muted-foreground t-small mt-1 max-w-3xl">
              Verified customers get these addresses automatically, so Receive shows them straight away. Others are
              made the first time a customer opens Receive for that coin. Now on:{' '}
              {on.length ? on.map((n) => `${n.asset.toUpperCase()} (${n.label})`).join(', ') : 'none'}.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {networks.map((n) => (
            <Button
              key={`${n.asset}/${n.network}`}
              size="sm"
              variant={n.autoCreate ? 'default' : 'outline'}
              disabled={!canEdit}
              onClick={() => setChanging(n)}
              title={canEdit ? undefined : 'Needs the "manage inventory" permission'}
            >
              {n.asset.toUpperCase()} · {n.label}
              {n.autoCreate ? ' · on' : ''}
            </Button>
          ))}
        </div>
      </div>

      <Dialog open={changing !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <form onSubmit={submit} className="flex min-h-0 flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="size-4" />
                {changing?.autoCreate ? 'Stop making this in advance?' : 'Make this in advance?'}
              </DialogTitle>
              <DialogDescription>
                {changing
                  ? changing.autoCreate
                    ? `New customers won't get a ${changing.asset.toUpperCase()} address on ${changing.label} until they open Receive. Addresses already made are kept.`
                    : `Every verified customer will get a ${changing.asset.toUpperCase()} address on ${changing.label}, a few customers a minute.`
                  : null}
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <div className="grid gap-1.5">
                <Label htmlFor="auto-create-password">Your password</Label>
                <Input
                  id="auto-create-password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" loading={pending} disabled={!password}>
                Confirm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
