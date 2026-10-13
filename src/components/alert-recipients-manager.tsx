'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { addAlertRecipient, removeAlertRecipient, setAlertRecipientEnabled } from '@/app/actions/alerts';
import type { AlertRecipientsView } from '@/lib/types-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type TypeView = AlertRecipientsView['types'][number];

function TypeSection({ t, fallbackConfigured }: { t: TypeView; fallbackConfigured: boolean }) {
  const [email, setEmail] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (work: () => Promise<{ error?: string }>, done: string) =>
    start(async () => {
      const result = await work();
      if (result.error) {
        toast.error('Not changed', { description: result.error });
        return;
      }
      toast.success(done);
      router.refresh();
    });

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">{t.label}</h2>
        {t.security && (
          <Badge variant="warning">
            <ShieldAlert className="mr-1 h-3 w-3" /> security
          </Badge>
        )}
        {t.usingEnvFallback && fallbackConfigured && <Badge variant="outline">using the server default</Badge>}
        {t.usingEnvFallback && !fallbackConfigured && (
          <Badge variant="destructive">nobody will be told: add a recipient</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t.description}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {t.recipients.length === 0 ? (
            <TableEmpty colSpan={3}>Nobody here yet.</TableEmpty>
          ) : (
            t.recipients.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.enabled ? <Badge variant="success">receiving</Badge> : <Badge variant="outline">paused</Badge>}</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(() => setAlertRecipientEnabled(r.id, !r.enabled), r.enabled ? `${r.email} paused` : `${r.email} receiving again`)
                    }
                  >
                    {r.enabled ? 'Pause' : 'Resume'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    aria-label={`Remove ${r.email}`}
                    onClick={() => run(() => removeAlertRecipient(r.id), `${r.email} removed`)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const result = await addAlertRecipient(t.type, email);
            if (!result.error) setEmail('');
            return result;
          }, 'Recipient added');
        }}
      >
        <Input type="email" required placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" disabled={pending || !email}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
        </Button>
      </form>
    </section>
  );
}

export function AlertRecipientsManager({ view }: { view: AlertRecipientsView }) {
  const security = view.types.filter((t) => t.security);
  const others = view.types.filter((t) => !t.security);
  return (
    <div className="space-y-4">
      {[...security, ...others].map((t) => (
        <TypeSection key={t.type} t={t} fallbackConfigured={view.fallbackConfigured} />
      ))}
    </div>
  );
}
