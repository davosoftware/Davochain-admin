'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, Search, Send, UserCheck, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { sendBroadcast } from '@/app/actions/users';
import type { UserListRow } from '@/lib/types-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Matches the API, which is the thing that actually rejects an overlong one. */
const TITLE_MAX = 200;
/** Shorter than the API allows, deliberately — a notification is read on a lock
 *  screen, and anything past a few lines is truncated by the device anyway. */
const BODY_MAX = 350;

const AUDIENCES = [
  {
    value: 'ALL' as const,
    icon: Users,
    label: 'All Users',
    hint: 'Send notification to all registered users',
  },
  {
    value: 'SELECTED' as const,
    icon: UserCheck,
    label: 'Specific Users',
    hint: 'Select individual users to receive the notification',
  },
];

/**
 * The one way to send a notification.
 *
 * A modal rather than a panel on the page: sending to every user is not
 * something to stumble into by tabbing through a form that is always open, and
 * the history behind it is what this screen is normally for.
 */
export function SendNotification({ users }: { users: UserListRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Send Notification
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        {/* Keyed on open so each send starts from an empty form rather than
            whatever the last one left behind. */}
        <ComposerForm key={String(open)} users={users} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ComposerForm({ users, onDone }: { users: UserListRow[]; onDone: () => void }) {
  const [audience, setAudience] = useState<'ALL' | 'SELECTED'>('ALL');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q
      ? users.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(q),
        )
      : users;
    return list.slice(0, 50);
  }, [users, filter]);

  const canSend =
    title.trim().length > 0 && body.trim().length > 0 && (audience === 'ALL' || picked.length > 0);

  const send = () =>
    start(async () => {
      const result = await sendBroadcast({
        title: title.trim(),
        body: body.trim(),
        userIds: audience === 'SELECTED' ? picked : undefined,
      });
      if (result.error) {
        toast.error('Could not send', { description: result.error });
        return;
      }
      toast.success('Notification sent', {
        description: `Delivered to ${result.recipientCount} user(s).`,
      });
      router.refresh();
      onDone();
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Send New Notification</DialogTitle>
        <DialogDescription>Create and send notifications to users</DialogDescription>
      </DialogHeader>

      <DialogBody className="flex flex-col gap-5">
        <Field
          label="Title"
          htmlFor="n-title"
          counter={`${title.length}/${TITLE_MAX}`}
          full={title.length >= TITLE_MAX}
        >
          <Input
            id="n-title"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            placeholder="Scheduled maintenance"
            autoFocus
          />
        </Field>

        <div className="flex flex-col gap-2">
          <Label>
            Send To <span className="text-destructive">*</span>
          </Label>

          {/* Two cards rather than a dropdown: who receives this is the most
              consequential choice on the form, and "everyone" should not be one
              stray keystroke away from being picked. */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {AUDIENCES.map((option) => {
              const on = audience === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAudience(option.value)}
                  aria-pressed={on}
                  className={cn(
                    'relative flex flex-col gap-1 rounded-lg border p-3 pr-8 text-left transition-colors',
                    'focus-visible:ring-ring/40 outline-none focus-visible:ring-[3px]',
                    on
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40 hover:bg-secondary/50',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <option.icon
                      className={cn('size-4', on ? 'text-primary' : 'text-muted-foreground')}
                    />
                    <span className="t-small font-medium">{option.label}</span>
                  </span>
                  <span className="text-muted-foreground t-caption">{option.hint}</span>
                  {on ? (
                    <span className="bg-primary text-primary-foreground absolute top-2.5 right-2.5 flex size-4 items-center justify-center rounded-full">
                      <Check className="size-2.5" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {audience === 'SELECTED' ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="n-filter">Recipients</Label>
              <span
                className={cn(
                  't-caption',
                  picked.length ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {picked.length} selected
              </span>
            </div>

            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
              <Input
                id="n-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search by name or email"
                className="h-8 pl-8"
              />
            </div>

            {picked.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {picked.map((id) => {
                  const u = users.find((x) => x.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1">
                      {u ? `${u.firstName} ${u.lastName}` : id.slice(0, 6)}
                      <button
                        type="button"
                        onClick={() => setPicked((p) => p.filter((x) => x !== id))}
                        className="hover:text-destructive"
                        aria-label="Remove recipient"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            ) : null}

            <div className="border-border/70 scrollbar-thin max-h-44 overflow-y-auto rounded-md border">
              {matches.length === 0 ? (
                <p className="text-muted-foreground t-caption p-3">No matching users.</p>
              ) : (
                matches.map((u) => {
                  const on = picked.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() =>
                        setPicked((p) => (on ? p.filter((x) => x !== u.id) : [...p, u.id]))
                      }
                      className={cn(
                        't-small hover:bg-secondary flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors',
                        on && 'bg-accent text-accent-foreground',
                      )}
                    >
                      <span className="truncate">
                        {u.firstName} {u.lastName}
                      </span>
                      <span className="text-muted-foreground t-caption truncate">{u.email}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground t-caption">
            Goes to every active user. Suspended and closed accounts are skipped — they cannot act
            on it.
          </p>
        )}

        <Field
          label="Notification Description"
          htmlFor="n-body"
          counter={`${body.length}/${BODY_MAX}`}
          full={body.length >= BODY_MAX}
        >
          <textarea
            id="n-body"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
            rows={4}
            placeholder="Deposits pause briefly at 02:00 WAT tonight. Trading is unaffected."
            className="border-input bg-background t-small focus-visible:border-ring focus-visible:ring-ring/30 w-full resize-none rounded-md border px-3 py-2 outline-none focus-visible:ring-[3px]"
          />
        </Field>
      </DialogBody>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={send} loading={pending} disabled={!canSend}>
          <Send className="size-4" />
          Send Notification
        </Button>
      </DialogFooter>
    </>
  );
}

function Field({
  label,
  htmlFor,
  counter,
  full,
  children,
}: {
  label: string;
  htmlFor: string;
  counter: string;
  full: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={htmlFor}>
          {label} <span className="text-destructive">*</span>
        </Label>
        <span className={cn('t-caption', full ? 'text-warning' : 'text-muted-foreground')}>
          {counter}
        </span>
      </div>
      {children}
    </div>
  );
}
