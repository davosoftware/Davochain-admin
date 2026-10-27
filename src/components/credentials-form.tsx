'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Bell, Check, CheckCircle2, Coins, Fingerprint, HardDrive, KeyRound, Landmark, Loader2, Mail, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { clearCredential, saveCredential } from '@/app/actions/system';
import type { CredentialsView } from '@/lib/types-admin';
import { IconTile } from '@/components/dashboard-cards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { relativeTime } from '@/lib/utils';
import { providerCards, type ProviderCard } from '@/lib/credentials';

function SourceBadge({ source }: { source: 'database' | 'environment' | 'unset' }) {
  if (source === 'database') return <Badge variant="success">set here</Badge>;
  if (source === 'environment') return <Badge variant="outline">from the server</Badge>;
  return <Badge variant="warning">not set</Badge>;
}

function CredentialRow({
  credential,
  canEdit,
}: {
  credential: CredentialsView['credentials'][number];
  canEdit: boolean;
}) {
  const [value, setValue] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  const save = () =>
    start(async () => {
      const result = await saveCredential(credential.name, value);
      if (result.error) {
        toast.error('Could not save that key', { description: result.error });
        return;
      }
      // Out of the browser the moment it is stored. It cannot be read back, so
      // leaving it in an input only risks it being shoulder-read or screenshotted.
      setValue('');
      toast.success(`${credential.label} updated`, {
        description: 'It takes effect on the next request — no restart needed.',
      });
      router.refresh();
    });

  const clear = () =>
    start(async () => {
      const result = await clearCredential(credential.name);
      if (result.error) {
        toast.error('Could not clear that key', { description: result.error });
        return;
      }
      toast.success(`${credential.label} cleared`, {
        description: `The server's ${credential.envVar} takes over again.`,
      });
      router.refresh();
    });

  return (
    <div className="border-border/50 border-t px-5 py-4 first:border-t-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="t-small font-medium">{credential.label}</span>
        <SourceBadge source={credential.source} />
        {credential.last4 ? (
          <span className="text-muted-foreground t-caption font-mono">
            ends ····{credential.last4}
          </span>
        ) : null}
        <div className="flex-1" />
        {credential.updatedAt ? (
          <span className="text-muted-foreground t-caption">
            changed {relativeTime(credential.updatedAt)}
          </span>
        ) : null}
      </div>

      <p className="text-muted-foreground t-caption mb-3 line-clamp-2" title={credential.hint}>{credential.hint}</p>

      {canEdit ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid min-w-0 flex-1 basis-48 gap-1.5">
            <Label htmlFor={credential.name} className="sr-only">New value for {credential.label}</Label>
            <Input
              id={credential.name}
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={credential.source === 'unset' ? 'Paste the key' : 'Paste a new key to replace it'}
              autoComplete="off"
              className="font-mono"
            />
          </div>
          <Button size="sm" onClick={save} disabled={!value.trim() || pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            {credential.source === 'unset' ? 'Set' : 'Replace'}
          </Button>
          {credential.source === 'database' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              disabled={pending}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground t-caption">
          Only an owner can change this. Ask one if it needs rotating.
        </p>
      )}
    </div>
  );
}

/**
 * Partner secrets, set here instead of in a deployment.
 *
 * Nothing on this screen has ever seen a stored key. The API encrypts on the
 * way in and returns only the last four characters, so a photograph of this
 * page is worth nothing.
 */
export function CredentialsForm({
  view,
  canEdit,
}: {
  view: CredentialsView;
  canEdit: boolean;
}) {

  return (
    <div className="flex flex-col gap-5">
      {!view.encryptionConfigured ? (
        <div className="border-destructive/30 bg-destructive/10 flex items-start gap-3 rounded-xl border p-5">
          <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
          <div>
            <p className="t-small font-medium">Keys cannot be stored yet</p>
            <p className="text-muted-foreground t-small mt-1">
              The API has no <code className="font-mono">CREDENTIALS_KEY</code>, which is what
              encrypts these before they touch the database. Set it on the server and restart.
              Until then the values in the server&rsquo;s environment are still used, so nothing is
              broken — they just cannot be changed from here.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card border-border/60 flex items-start gap-3 rounded-xl border px-4 py-3">
          <KeyRound className="text-warning mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground t-small">
            Keys are encrypted before they&rsquo;re stored, with a key that never touches the database. Nothing shows a
            stored key again: you see its last four characters and when it changed. <strong>Clear</strong> goes back to
            the value in the server&rsquo;s settings file.
          </p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {providerCards(view.credentials).map((card) => (
          <ProviderBox key={card.group} card={card} canEdit={canEdit} />
        ))}
      </div>
    </div>
  );
}


const ICONS: Record<string, LucideIcon> = {
  Quidax: Coins,
  Payrep: Landmark,
  Dojah: Fingerprint,
  Email: Mail,
  'File storage': HardDrive,
  Push: Bell,
};

/** One provider's keys, in its own box. */
function ProviderBox({ card, canEdit }: { card: ProviderCard; canEdit: boolean }) {
  const Icon = ICONS[card.group] ?? KeyRound;
  return (
    <section className="bg-card border-border/60 flex flex-col overflow-hidden rounded-xl border shadow-xs">
      <header className="flex items-start gap-3 px-5 pt-5 pb-4">
        <IconTile icon={Icon} tone={card.status === 'ready' ? 'green' : 'amber'} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="t-section">{card.group}</h2>
            {card.status === 'ready' ? (
              <Badge variant="success">
                <CheckCircle2 className="size-3" />
                All set
              </Badge>
            ) : (
              <Badge variant="warning">{card.missing === 1 ? '1 key missing' : `${card.missing} keys missing`}</Badge>
            )}
          </div>
          <p className="text-muted-foreground t-caption mt-1">{card.description}</p>
        </div>
      </header>
      <div className="bg-muted/30 flex-1">
        {card.credentials.map((c) => (
          <CredentialRow key={c.name} credential={c} canEdit={canEdit} />
        ))}
      </div>
    </section>
  );
}
