'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronDown,
  Mail,
  Loader2,
  Plus,
  ShieldCheck,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { addAdmin, resendInvite, setAdminActive, setPermissions, setRole } from '@/app/actions/settings';
import type { AdminProfile, PermissionGroup } from '@/lib/types-admin';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, relativeTime } from '@/lib/utils';

export function TeamCard({
  team,
  meId,
  isOwner,
  catalogue,
}: {
  team: AdminProfile[];
  meId: string;
  isOwner: boolean;
  catalogue: PermissionGroup[];
}) {
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [newPermissions, setNewPermissions] = useState<string[]>([]);
  const [issued, setIssued] = useState<{ email: string; delivered: boolean } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const active = team.filter((a) => a.isActive).length;

  const create = () =>
    start(async () => {
      const result = await addAdmin({
        email: email.trim(),
        name: name.trim(),
        role: 'SUB_ADMIN',
        permissions: newPermissions,
      });
      if (result.error || !result.invite) {
        toast.error('Could not add that admin', { description: result.error });
        return;
      }
      setIssued({ email: result.invite.sentTo, delivered: result.invite.delivered });
      setEmail('');
      setName('');
      setNewPermissions([]);
      setAdding(false);
      router.refresh();
    });

  const toggleActive = (admin: AdminProfile) =>
    start(async () => {
      const result = await setAdminActive(admin.id, !admin.isActive);
      if (result.error) {
        toast.error('Could not change that account', { description: result.error });
        return;
      }
      toast.success(admin.isActive ? `${admin.name} deactivated` : `${admin.name} reactivated`);
      router.refresh();
    });

  const savePermissions = (admin: AdminProfile, permissions: string[]) =>
    start(async () => {
      const result = await setPermissions(admin.id, permissions);
      if (result.error) {
        toast.error('Could not save those permissions', { description: result.error });
        return;
      }
      toast.success(`Updated what ${admin.name} can do`);
      router.refresh();
    });

  const promote = (admin: AdminProfile) =>
    start(async () => {
      const next = admin.role === 'OWNER' ? 'SUB_ADMIN' : 'OWNER';
      const result = await setRole(admin.id, next);
      if (result.error) {
        toast.error('Could not change that role', { description: result.error });
        return;
      }
      toast.success(`${admin.name} is now ${next === 'OWNER' ? 'an owner' : 'a sub-admin'}`);
      router.refresh();
    });

  const resend = (admin: AdminProfile) =>
    start(async () => {
      const result = await resendInvite(admin.id);
      if (result.error || !result.invite) {
        toast.error('Could not send it', { description: result.error });
        return;
      }
      if (result.invite.delivered) {
        toast.success(`New invitation sent to ${admin.email}`, {
          description: 'Any earlier link has stopped working.',
        });
      } else {
        toast.error('Nothing was sent', {
          description: 'SMTP is not configured, or the mail server refused it.',
        });
      }
      router.refresh();
    });

  return (
    <Card>
      <div className="border-border/70 flex items-start justify-between gap-3 border-b p-4">
        <div>
          <h2 className="t-section">Team</h2>
          <p className="text-muted-foreground t-caption mt-0.5">
            {active} {active === 1 ? 'person' : 'people'} can sign in. Owners see everything;
            sub-admins see only what you grant.
          </p>
        </div>
        <Button
          variant={adding ? 'ghost' : 'outline'}
          size="sm"
          onClick={() => setAdding((a) => !a)}
        >
          {adding ? (
            <>
              <X className="size-3.5" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="size-3.5" />
              Add sub-admin
            </>
          )}
        </Button>
      </div>

      <CardContent className="p-0">
        {adding ? (
          <div className="border-border/70 bg-secondary/40 border-b p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="new-admin-name">Name</Label>
                <Input
                  id="new-admin-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Okonkwo"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="new-admin-email">Email</Label>
                <Input
                  id="new-admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ada@davochain.com"
                />
              </div>
            </div>

            <p className="eyebrow mt-4 mb-2">What they can do</p>
            <PermissionPicker
              catalogue={catalogue}
              selected={newPermissions}
              onChange={setNewPermissions}
              disabled={!isOwner}
            />

            <div className="mt-4">
              <Button
                size="sm"
                onClick={create}
                disabled={pending || name.trim().length < 2 || !email.includes('@')}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-3.5" />
                )}
                Create account
              </Button>
              <p className="text-muted-foreground t-caption mt-2">
                They get an emailed link and choose their own password. Nothing you have to pass
                on, and no credential sitting in an inbox.
              </p>
            </div>
          </div>
        ) : null}

        {issued ? (
          <div
            className={cn(
              'border-b p-4',
              issued.delivered ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning/10',
            )}
          >
            {issued.delivered ? (
              <>
                <p className="t-small flex items-center gap-1.5 font-medium">
                  <Check className="text-success size-4" />
                  Invitation sent to {issued.email}
                </p>
                <p className="text-muted-foreground t-caption mt-1">
                  The link works once and expires in 48 hours. Until they use it, the account has
                  no password and nobody can sign in to it.
                </p>
              </>
            ) : (
              <>
                <p className="t-small font-medium">
                  {issued.email} was added, but the invitation did not send.
                </p>
                <p className="text-muted-foreground t-caption mt-1">
                  SMTP is not configured, or the mail server refused it. Set it up under{' '}
                  <strong>System → API keys</strong>, then use <strong>Resend invitation</strong>{' '}
                  on their row — they cannot sign in until they have the link.
                </p>
              </>
            )}
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setIssued(null)}>
              Done
            </Button>
          </div>
        ) : null}

        <ul>
          {team.map((admin) => {
            const isYou = admin.id === meId;
            const isOpen = expanded === admin.id;
            return (
              <li key={admin.id} className="border-border/40 border-b last:border-0">
                <div
                  className={cn('flex items-center gap-3 px-4 py-3', !admin.isActive && 'opacity-60')}
                >
                  <Avatar
                    id={admin.id}
                    name={admin.name}
                    email={admin.email}
                    version={admin.avatarVersion}
                    size={36}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="t-small truncate font-medium">{admin.name}</span>
                      <Badge variant={admin.role === 'OWNER' ? 'default' : 'outline'}>
                        {admin.role === 'OWNER' ? 'Owner' : 'Sub-admin'}
                      </Badge>
                      {isYou ? <Badge variant="outline">You</Badge> : null}
                      {!admin.isActive ? <Badge variant="outline">Deactivated</Badge> : null}
                    </div>
                    <p className="text-muted-foreground t-caption truncate">
                      {admin.email}
                      {admin.role === 'SUB_ADMIN' ? (
                        <>
                          {' · '}
                          {admin.permissions.length === 0
                            ? 'no permissions yet'
                            : `${admin.permissions.length} permission${admin.permissions.length === 1 ? '' : 's'}`}
                        </>
                      ) : null}
                    </p>
                  </div>

                  <span className="text-muted-foreground t-caption hidden shrink-0 md:block">
                    {admin.lastLoginAt ? `seen ${relativeTime(admin.lastLoginAt)}` : 'not signed in yet'}
                  </span>

                  {/*
                    Never signed in means the invitation is probably still
                    unopened — or expired before they got to it. Offering the
                    resend here is what stops "I never got the email" being a
                    dead end.
                  */}
                  {isOwner && !admin.lastLoginAt && admin.isActive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resend(admin)}
                      disabled={pending}
                      title="Send a new invitation link, cancelling any earlier one"
                    >
                      <Mail className="size-3.5" />
                      Resend invite
                    </Button>
                  ) : null}

                  {admin.role === 'SUB_ADMIN' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(isOpen ? null : admin.id)}
                    >
                      <ChevronDown
                        className={cn('size-3.5 transition-transform', isOpen && 'rotate-180')}
                      />
                      Access
                    </Button>
                  ) : (
                    <span className="w-[5.8rem]" />
                  )}

                  {/* No button against yourself: the API refuses it anyway, and
                      offering an action that cannot work is just a trap. */}
                  {isYou ? (
                    <span className="w-[5.5rem]" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(admin)}
                      disabled={pending}
                      className={cn(
                        'w-[5.5rem] shrink-0',
                        admin.isActive && 'text-muted-foreground hover:text-destructive',
                      )}
                    >
                      {admin.isActive ? (
                        <>
                          <UserMinus className="size-3.5" />
                          Disable
                        </>
                      ) : (
                        <>
                          <UserPlus className="size-3.5" />
                          Enable
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {isOpen && admin.role === 'SUB_ADMIN' ? (
                  <AccessEditor
                    admin={admin}
                    catalogue={catalogue}
                    isOwner={isOwner}
                    pending={pending}
                    onSave={(permissions) => savePermissions(admin, permissions)}
                    onPromote={() => promote(admin)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>

        <p className="text-muted-foreground t-caption border-border/70 border-t px-4 py-3">
          Admins are never deleted — the audit log points at them, and a trail with holes in it is
          not a trail. Deactivating stops them signing in and ends any session they already have.
        </p>
      </CardContent>
    </Card>
  );
}

/** The grant editor for one sub-admin. */
function AccessEditor({
  admin,
  catalogue,
  isOwner,
  pending,
  onSave,
  onPromote,
}: {
  admin: AdminProfile;
  catalogue: PermissionGroup[];
  isOwner: boolean;
  pending: boolean;
  onSave: (permissions: string[]) => void;
  onPromote: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(admin.permissions);
  const dirty =
    selected.length !== admin.permissions.length ||
    selected.some((p) => !admin.permissions.includes(p));

  return (
    <div className="bg-secondary/40 border-border/40 border-t px-4 py-4">
      <PermissionPicker
        catalogue={catalogue}
        selected={selected}
        onChange={setSelected}
        disabled={!isOwner}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => onSave(selected)} disabled={!isOwner || !dirty || pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Save access
        </Button>
        {dirty ? (
          <Button variant="ghost" size="sm" onClick={() => setSelected(admin.permissions)}>
            Reset
          </Button>
        ) : null}
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={onPromote} disabled={!isOwner || pending}>
          <ShieldCheck className="size-3.5" />
          Make owner
        </Button>
      </div>

      {!isOwner ? (
        <p className="text-muted-foreground t-caption mt-3">
          Only an owner can change what someone can do.
        </p>
      ) : null}
    </div>
  );
}

function PermissionPicker({
  catalogue,
  selected,
  onChange,
  disabled,
}: {
  catalogue: PermissionGroup[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const toggle = (key: string) =>
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {catalogue.map((group) => (
        <div key={group.label}>
          <p className="eyebrow mb-1.5">{group.label}</p>
          <div className="flex flex-col gap-1.5">
            {group.permissions.map((permission) => {
              const on = selected.includes(permission.key);
              return (
                <label
                  key={permission.key}
                  className={cn(
                    'flex cursor-pointer items-start gap-2',
                    disabled && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={disabled}
                    onChange={() => toggle(permission.key)}
                    className="accent-primary mt-0.5 size-3.5 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="t-caption block leading-tight">{permission.label}</span>
                    {permission.hint ? (
                      <span className="text-muted-foreground t-caption block leading-tight opacity-80">
                        {permission.hint}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
