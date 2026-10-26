'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, Lock, Pencil, RotateCcw, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { resetServerSetting, saveServerSetting } from '@/app/actions/server-settings';
import {
  displayValue,
  groupSettings,
  parseSettingInput,
  reasonProblem,
  type ServerSetting,
} from '@/lib/server-settings';
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

type Editing = { setting: ServerSetting; mode: 'edit' | 'reset' };

/**
 * The server settings, by group. Each row shows the value in use and where it
 * comes from; Edit and Reset both ask for the owner's password and a reason.
 * The API checks everything again — this screen only makes it legible.
 */
export function ServerSettingsBoard({ settings }: { settings: ServerSetting[] }) {
  const [editing, setEditing] = useState<Editing | null>(null);

  return (
    <>
      {groupSettings(settings).map((group) => (
        <section key={group.name} className="bg-card border-border/60 rounded-xl border">
          <h2 className="t-section border-border/60 border-b px-5 py-3">{group.name}</h2>
          <ul className="divide-border/60 divide-y">
            {group.settings.map((s) => (
              <li key={s.key} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="t-small font-medium">{s.label}</span>
                    <Badge variant={s.source === 'dashboard' ? 'default' : 'outline'}>
                      {s.source === 'dashboard' ? 'Set on dashboard' : 'Server default'}
                    </Badge>
                    {s.money ? (
                      <Badge variant="warning">
                        <Banknote className="size-3" />
                        Money · owners emailed
                      </Badge>
                    ) : null}
                    {!s.live ? (
                      <Badge variant="secondary">
                        <Timer className="size-3" />
                        Applies after restart
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground t-caption mt-1 max-w-3xl">{s.help}</p>
                  <p className="text-muted-foreground t-caption mt-1">
                    <code className="font-mono">{s.key}</code>
                    {s.source === 'dashboard'
                      ? ` · server default: ${displayValue({ ...s, value: s.serverDefault })}`
                      : null}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="t-small font-mono break-all">{displayValue(s)}</span>
                  <Button size="sm" variant="outline" onClick={() => setEditing({ setting: s, mode: 'edit' })}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  {s.source === 'dashboard' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing({ setting: s, mode: 'reset' })}
                      aria-label={`Reset ${s.label} to the server default`}
                    >
                      <RotateCcw className="size-3.5" />
                      Reset
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {editing ? (
        <SettingDialog key={`${editing.setting.key}-${editing.mode}`} editing={editing} onClose={() => setEditing(null)} />
      ) : null}
    </>
  );
}

function SettingDialog({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const { setting: s, mode } = editing;
  const [raw, setRaw] = useState<string | boolean>(
    s.kind === 'boolean' ? s.value === true || s.value === 'true' : s.value === null ? '' : String(s.value),
  );
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = mode === 'edit' ? parseSettingInput(s, raw) : {};
    const issue = parsed.error ?? reasonProblem(reason);
    if (issue) {
      setProblem(issue);
      return;
    }
    setProblem(null);
    start(async () => {
      const result =
        mode === 'edit'
          ? await saveServerSetting({ key: s.key, value: parsed.value, password, reason })
          : await resetServerSetting({ key: s.key, password, reason });
      if (result.error) {
        setPassword('');
        setProblem(result.error);
        return;
      }
      onClose();
      toast.success(mode === 'edit' ? `${s.label} saved` : `${s.label} is back to the server default`, {
        description: s.live
          ? 'Takes effect within about 10 seconds. Recorded in the audit log.'
          : 'Takes effect when the API next restarts. Recorded in the audit log.',
      });
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="size-4" />
              {mode === 'edit' ? `Change ${s.label.toLowerCase()}` : `Reset ${s.label.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>
              {mode === 'edit'
                ? s.help
                : `Forget the dashboard value. The server default applies again: ${displayValue({ ...s, value: s.serverDefault })}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            {mode === 'edit' ? (
              <div className="grid gap-1.5">
                <Label htmlFor="setting-value">
                  New value{s.unit ? ` (${s.unit})` : ''}
                  {s.min !== null && s.max !== null ? ` · ${s.min} to ${s.max}` : ''}
                </Label>
                {s.kind === 'boolean' ? (
                  <div className="flex gap-2" id="setting-value">
                    <Button type="button" size="sm" variant={raw === true ? 'default' : 'outline'} onClick={() => setRaw(true)}>
                      On
                    </Button>
                    <Button type="button" size="sm" variant={raw === false ? 'default' : 'outline'} onClick={() => setRaw(false)}>
                      Off
                    </Button>
                  </div>
                ) : (
                  <Input
                    id="setting-value"
                    autoFocus
                    inputMode={s.kind === 'int' || s.kind === 'decimal' || s.kind === 'account' ? 'decimal' : undefined}
                    value={String(raw)}
                    onChange={(e) => setRaw(e.target.value)}
                  />
                )}
              </div>
            ) : null}
            {s.money ? (
              <p className="text-warning t-caption">This setting affects money. Every owner will get an email about the change.</p>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="setting-reason">Reason (kept in the audit log)</Label>
              <Input
                id="setting-reason"
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. moving to the new mail provider"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="setting-password">Your password</Label>
              <Input
                id="setting-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {problem ? <p className="text-destructive t-caption">{problem}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={pending} disabled={!password}>
              {mode === 'edit' ? 'Save' : 'Reset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
