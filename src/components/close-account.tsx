'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, Loader2, Lock, Trash2, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { checkCloseUser, closeUser, deleteUserData } from '@/app/actions/users';
import { closeFormProblem, type CloseCheck, type DataChoice } from '@/lib/account-closure';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
 * The bottom of an opened customer (owners only, 28 Oct 2026). Closing ends
 * sign-in for good, switches the naira account number off and frees the email
 * and phone for a new sign-up. Every record is kept. Refused while the account
 * holds money or has anything in progress.
 */
export function CloseAccountSection({ userId, name, onClosed }: { userId: string; name: string; onClosed: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-destructive/30 mx-5 mb-5 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="t-small font-medium">Close this account</p>
        <p className="text-muted-foreground t-caption">
          {name} won&apos;t be able to sign in again, and their naira account number is switched off. All their records are
          kept. Their email and phone are freed, so they can sign up again later as a new customer. Only possible when the
          account holds no money and nothing is in progress.
        </p>
      </div>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <UserX className="size-3.5" />
        Close account
      </Button>
      {open ? <CloseAccountDialog userId={userId} name={name} onClose={() => setOpen(false)} onClosed={onClosed} /> : null}
    </div>
  );
}

function CloseAccountDialog({ userId, name, onClose, onClosed }: { userId: string; name: string; onClose: () => void; onClosed: () => void }) {
  const [check, setCheck] = useState<CloseCheck | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [dataChoice, setDataChoice] = useState<DataChoice | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  // Ask what is left the moment the window opens.
  useEffect(() => {
    let live = true;
    checkCloseUser(userId).then((r) => {
      if (!live) return;
      if (r.error) setCheckError(r.error);
      else setCheck(r.check ?? null);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const issue = closeFormProblem({ dataChoice, reason, password, confirmed });
    if (issue) return setProblem(issue);
    setProblem(null);
    start(async () => {
      const r = await closeUser(userId, { password, reason, dataChoice: dataChoice! });
      if (r.error) {
        setPassword('');
        setProblem(r.error);
        return;
      }
      onClose();
      onClosed();
      toast.success(`${name}'s account is closed`, {
        description:
          dataChoice === 'DELETE_NOW'
            ? r.dataDeleted
              ? 'Their personal data was deleted. They were emailed first, and so was every owner.'
              : 'Closed, but the data could not be deleted yet: the daily job will finish it.'
            : dataChoice === 'DELETE_LATER'
              ? `Their personal data will be deleted on ${r.dataDeleteAt?.slice(0, 10)}. They and every owner were emailed.`
              : 'They were signed out and emailed. Every owner was emailed too. Recorded in the audit log.',
      });
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="size-4" />
              Close {name}&apos;s account
            </DialogTitle>
            <DialogDescription>
              They can never sign in to this account again. Their records stay. Their email and phone become free for a new
              sign-up. This can&apos;t be undone from the dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            {!check && !checkError ? (
              <p className="text-muted-foreground t-small flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                Checking what is left in the account…
              </p>
            ) : checkError ? (
              <p className="text-destructive t-small">{checkError}</p>
            ) : check && !check.canClose ? (
              <div className="border-warning/40 bg-warning/10 rounded-lg border p-3">
                <p className="t-small flex items-center gap-2 font-medium">
                  <CircleAlert className="text-warning size-4" />
                  This account can&apos;t be closed yet
                </p>
                <ul className="t-small mt-2 list-disc pl-6">
                  {check.blockers.map((b, i) => (
                    <li key={`${b.code}-${i}`}>{b.message}</li>
                  ))}
                </ul>
                <p className="text-muted-foreground t-caption mt-2">
                  The customer withdraws what they hold first, and anything in progress has to finish. Then try again.
                </p>
              </div>
            ) : (
              <>
                <p className="text-success t-small">Nothing is held and nothing is in progress: it can be closed.</p>
                <fieldset className="grid gap-2">
                  <legend className="t-small mb-1 font-medium">What happens to their data?</legend>
                  {(
                    [
                      ['KEEP', 'Keep the records', 'Closed only. Everything stays on file, as the law expects (5 years).'],
                      [
                        'DELETE_LATER',
                        `Delete after ${check?.retentionMonths ?? 6} months`,
                        `Their personal details and documents are deleted automatically ${check?.retentionMonths ?? 6} months from today (change the period on System → Server settings).`,
                      ],
                      [
                        'DELETE_NOW',
                        'Delete from the database now',
                        'Name, email, phone, date of birth, address, BVN/NIN, ID photos and selfies are deleted straight away. Can never be recovered.',
                      ],
                    ] as const
                  ).map(([value, title, help]) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${dataChoice === value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                    >
                      <input
                        type="radio"
                        name="data-choice"
                        value={value}
                        checked={dataChoice === value}
                        onChange={() => setDataChoice(value)}
                        className="accent-primary mt-1"
                      />
                      <span>
                        <span className="t-small block font-medium">{title}</span>
                        <span className="text-muted-foreground t-caption block">{help}</span>
                      </span>
                    </label>
                  ))}
                  <p className="text-muted-foreground t-caption">
                    Either way, their past trades and transfers stay in the books as &quot;Deleted customer&quot;, so the
                    accounts still add up.
                  </p>
                </fieldset>
                <div className="grid gap-1.5">
                  <Label htmlFor="close-reason">Reason (kept in the audit log)</Label>
                  <Input
                    id="close-reason"
                    autoFocus
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. the customer asked by email on 28 Oct"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="close-password">Your password</Label>
                  <Input id="close-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <label className="t-small flex items-start gap-2">
                  <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} className="mt-0.5" />
                  I understand {name} can never use this account again.
                </label>
              </>
            )}
            {problem ? <p className="text-destructive t-caption">{problem}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" loading={pending} disabled={!check?.canClose}>
              Close account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * On a closed customer whose data is still on file (owners only): delete it
 * now instead of keeping it or waiting for the deletion day.
 */
export function DeleteDataSection({ userId, name, onDeleted }: { userId: string; name: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const issue = closeFormProblem({ dataChoice: 'DELETE_NOW', reason, password, confirmed });
    if (issue) return setProblem(issue);
    setProblem(null);
    start(async () => {
      const r = await deleteUserData(userId, { password, reason });
      if (r.error) {
        setPassword('');
        setProblem(r.error);
        return;
      }
      setOpen(false);
      onDeleted();
      toast.success(`${name}'s personal data is deleted`, { description: 'Their money records stay as "Deleted customer". Recorded in the audit log.' });
      router.refresh();
    });
  };

  return (
    <div className="border-destructive/30 mx-5 mb-5 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="t-small font-medium">Delete their data now</p>
        <p className="text-muted-foreground t-caption">
          Deletes {name}&apos;s name, email, phone, date of birth, address, BVN/NIN and documents from the database straight
          away. Their past trades stay in the books as &quot;Deleted customer&quot;.
        </p>
      </div>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5" />
        Delete data
      </Button>
      {open ? (
        <Dialog open onOpenChange={(o) => !o && setOpen(false)}>
          <DialogContent>
            <form onSubmit={submit} className="flex min-h-0 flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="size-4" />
                  Delete {name}&apos;s data
                </DialogTitle>
                <DialogDescription>This can never be undone or recovered.</DialogDescription>
              </DialogHeader>
              <DialogBody className="flex flex-col gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="erase-reason">Reason (kept in the audit log)</Label>
                  <Input id="erase-reason" autoFocus maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. the customer asked to be forgotten" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="erase-password">Your password</Label>
                  <Input id="erase-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <label className="t-small flex items-start gap-2">
                  <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} className="mt-0.5" />
                  I understand {name}&apos;s data can never be recovered.
                </label>
                {problem ? <p className="text-destructive t-caption">{problem}</p> : null}
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" loading={pending}>
                  Delete data
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
