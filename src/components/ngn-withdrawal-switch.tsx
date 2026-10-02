'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Banknote, Lock, Power, PowerOff, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  getNgnWithdrawals,
  resetNgnWithdrawals,
  setNgnWithdrawals,
  type NgnSwitchResult,
} from '@/app/actions/system';
import type { NgnInFlight, NgnWithdrawalsState } from '@/lib/types-admin';
import { IconTile } from '@/components/dashboard-cards';
import { Badge } from '@/components/ui/badge';
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
import { formatNaira, relativeTime } from '@/lib/utils';

type Action = 'enable' | 'disable' | 'reset';
type Stage = 'idle' | 'inflight' | 'password';

const VERB: Record<Action, string> = {
  enable: 'Switch naira withdrawals on',
  disable: 'Switch naira withdrawals off',
  reset: 'Reset to the server setting',
};

function inFlightLine(inFlight: NgnInFlight): string {
  if (inFlight.count === 0) return 'No naira withdrawals in progress.';
  const what = inFlight.count === 1 ? '1 naira withdrawal' : `${inFlight.count} naira withdrawals`;
  return `${what} in progress (${formatNaira(inFlight.totalNgn)}).`;
}

/**
 * The naira-withdrawal switch.
 *
 * A live override of NGN_WITHDRAWALS_ENABLED. Every change asks for the
 * admin's password; switching off while withdrawals are in progress asks
 * first. The API enforces all of it — this screen only makes it legible.
 */
export function NgnWithdrawalSwitch({
  state,
  isOwner,
}: {
  state: NgnWithdrawalsState;
  isOwner: boolean;
}) {
  const [action, setAction] = useState<Action | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [inFlight, setInFlight] = useState<NgnInFlight | null>(null);
  const [confirmInFlight, setConfirmInFlight] = useState(false);
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  const close = () => {
    setStage('idle');
    setAction(null);
    setInFlight(null);
    setConfirmInFlight(false);
    setPassword('');
  };

  /** Would this action stop payouts? Only those get the in-progress warning. */
  const stopsPayouts = (a: Action) =>
    a === 'disable' || (a === 'reset' && state.enabled && !state.serverSetting);

  const begin = (a: Action) => {
    setAction(a);
    setConfirmInFlight(false);
    if (!stopsPayouts(a)) {
      setStage('password');
      return;
    }
    start(async () => {
      // Counted now, at the click, not when the page loaded.
      const fresh = await getNgnWithdrawals();
      const live = fresh.state?.inFlight ?? state.inFlight;
      if (live.count > 0) {
        setInFlight(live);
        setStage('inflight');
      } else {
        setStage('password');
      }
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!action || !password) return;
    start(async () => {
      const result: NgnSwitchResult =
        action === 'reset'
          ? await resetNgnWithdrawals({ password, reason, confirmInFlight })
          : await setNgnWithdrawals({ enabled: action === 'enable', password, reason, confirmInFlight });

      if (result.inFlight) {
        // A payout started after the last check. Ask again with the new figure.
        setPassword('');
        setInFlight(result.inFlight);
        setConfirmInFlight(false);
        setStage('inflight');
        return;
      }
      if (result.error) {
        setPassword('');
        toast.error('Naira withdrawals were not changed', { description: result.error });
        return;
      }
      const now = result.state;
      close();
      setReason('');
      toast.success(now?.enabled ? 'Naira withdrawals are ON' : 'Naira withdrawals are OFF', {
        description: 'Takes effect within a few seconds. Recorded in the audit log.',
      });
      router.refresh();
    });
  };

  const sourceLine =
    state.source === 'override'
      ? `Set from this dashboard${state.updatedBy ? ` by ${state.updatedBy.name}` : ''}${
          state.updatedAt ? ` · ${relativeTime(state.updatedAt)}` : ''
        }.`
      : 'Following the server setting.';

  return (
    <>
      <div className="bg-card border-border/60 flex flex-col gap-5 rounded-xl border p-5">
        <div className="flex items-start gap-3">
          <IconTile icon={Banknote} tone={state.enabled ? 'green' : 'rose'} size="sm" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="t-section">Naira bank withdrawals</h2>
              {state.enabled ? (
                <Badge variant="success">On</Badge>
              ) : (
                <Badge variant="destructive">Off</Badge>
              )}
              <Badge variant="outline">
                {state.source === 'override' ? 'Dashboard override' : 'Server setting'}
              </Badge>
            </div>
            <p className="text-muted-foreground t-small mt-1 max-w-3xl">
              {state.enabled
                ? 'Users can send naira from their balance to a Nigerian bank account.'
                : 'Users cannot start a naira bank withdrawal; the app shows it as unavailable. Withdrawals already sent still finish or refund normally.'}
            </p>
            <p className="text-muted-foreground t-caption mt-2">
              {sourceLine} Server setting:{' '}
              <code className="font-mono">
                NGN_WITHDRAWALS_ENABLED={state.serverSetting ? 'true' : 'false'}
              </code>
              .
            </p>
            <p className="text-muted-foreground t-caption mt-1">{inFlightLine(state.inFlight)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {state.enabled ? (
            <Button variant="destructive" onClick={() => begin('disable')} loading={pending && stage === 'idle'}>
              <PowerOff className="size-3.5" />
              Switch off
            </Button>
          ) : isOwner ? (
            <Button onClick={() => begin('enable')} loading={pending && stage === 'idle'}>
              <Power className="size-3.5" />
              Switch on
            </Button>
          ) : (
            <p className="text-muted-foreground t-caption">Only an owner can switch this back on.</p>
          )}
          {isOwner && state.source === 'override' ? (
            <Button variant="outline" onClick={() => begin('reset')} disabled={pending}>
              <RotateCcw className="size-3.5" />
              Reset to server setting
            </Button>
          ) : null}
        </div>
      </div>

      {/* 1. Withdrawals are in progress — continue or not. */}
      <Dialog open={stage === 'inflight'} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-warning size-4" />
              Naira withdrawals are in progress
            </DialogTitle>
            <DialogDescription>{inFlight ? inFlightLine(inFlight) : null}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="t-small">
              Switching off stops <strong>new</strong> naira withdrawals. It does not cancel the ones
              already in progress — they will still be paid out or refunded as normal. Do you want to
              continue?
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmInFlight(true);
                setStage('password');
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Prove it is you. */}
      <Dialog open={stage === 'password'} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <form onSubmit={submit} className="flex min-h-0 flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="size-4" />
                {action ? VERB[action] : ''}
              </DialogTitle>
              <DialogDescription>Enter your password to confirm this change.</DialogDescription>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="ngn-switch-password">Your password</Label>
                <Input
                  id="ngn-switch-password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ngn-switch-reason">Reason (kept in the audit log)</Label>
                <Input
                  id="ngn-switch-reason"
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    action === 'enable'
                      ? 'e.g. payout checks with Quidax completed'
                      : 'e.g. payout provider outage'
                  }
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={action === 'enable' ? 'default' : 'destructive'}
                loading={pending}
                disabled={!password}
              >
                Confirm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
