'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Eye,
  Mail,
  RotateCcw,
  Save,
  Send,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  previewEmailTemplate,
  resetEmailTemplate,
  saveEmailTemplate,
} from '@/app/actions/cms';
import type { EmailPreview, EmailTemplateRow, SiteSettings } from '@/lib/types-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/rich-text-editor';
import { EmailImagePicker } from '@/components/email-image-picker';
import { EmailFooterCard } from '@/components/email-footer-card';
import { cn, relativeTime } from '@/lib/utils';

/**
 * Every email the system can send, and what it says.
 *
 * The list is grouped the way the events are — an account thing, a deposit
 * thing — rather than alphabetically, because somebody comes here to change
 * "the deposit email" and needs to find it by what it does.
 */
export function EmailTemplateManager({
  templates,
  settings,
  canEdit,
}: {
  templates: EmailTemplateRow[];
  settings: SiteSettings | null;
  canEdit: boolean;
}) {
  const [selectedKey, setSelectedKey] = useState(templates[0]?.key ?? '');
  const selected = templates.find((t) => t.key === selectedKey) ?? templates[0];

  const groups = useMemo(() => {
    const map = new Map<string, EmailTemplateRow[]>();
    for (const t of templates) {
      if (!map.has(t.group)) map.set(t.group, []);
      map.get(t.group)!.push(t);
    }
    return [...map.entries()];
  }, [templates]);

  const off = templates.filter((t) => !t.isActive).length;

  return (
    <>
    <EmailFooterCard settings={settings} canEdit={canEdit} />

    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit">
        <div className="border-border/70 border-b p-3">
          <h2 className="t-section">{templates.length} emails</h2>
          {off > 0 ? (
            <p className="text-warning t-caption mt-0.5">
              {off} switched off — nobody receives {off === 1 ? 'it' : 'them'}.
            </p>
          ) : (
            <p className="text-muted-foreground t-caption mt-0.5">All switched on.</p>
          )}
        </div>

        <CardContent className="scrollbar-thin max-h-[70vh] overflow-y-auto p-1.5">
          {groups.map(([group, items]) => (
            <div key={group} className="mb-2 last:mb-0">
              <span className="eyebrow px-2 py-1">{group}</span>
              {items.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSelectedKey(t.key)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors',
                    t.key === selected?.key
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-secondary/60',
                  )}
                >
                  <Mail
                    className={cn('size-3.5 shrink-0', t.isActive ? 'opacity-60' : 'opacity-25')}
                  />
                  <span className={cn('t-small truncate', !t.isActive && 'opacity-50')}>
                    {t.label}
                  </span>
                  {t.edited ? (
                    <span
                      className="bg-primary ml-auto size-1.5 shrink-0 rounded-full"
                      title="Edited"
                    />
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      {selected ? (
        <TemplateEditor key={selected.key} template={selected} canEdit={canEdit} />
      ) : null}
    </div>
    </>
  );
}

function TemplateEditor({
  template,
  canEdit,
}: {
  template: EmailTemplateRow;
  canEdit: boolean;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [active, setActive] = useState(template.isActive);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  /*
   * Bumped to remount the editor.
   *
   * The editor is uncontrolled — see the note on RichTextEditor — so replacing
   * its content from out here means giving it a new key, not setting a prop.
   */
  const [editorKey, setEditorKey] = useState(0);
  const [testTo, setTestTo] = useState('');
  const [pending, start] = useTransition();
  const [previewing, startPreview] = useTransition();
  const router = useRouter();

  const dirty =
    subject !== template.subject || body !== template.body || active !== template.isActive;

  const save = () =>
    start(async () => {
      const result = await saveEmailTemplate(template.key, { subject, body, isActive: active });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success('Saved', {
        description: active
          ? 'The next one sent uses this wording.'
          : 'This email is switched off — nobody will receive it.',
      });
      router.refresh();
    });

  const reset = () =>
    start(async () => {
      const result = await resetEmailTemplate(template.key);
      if (result.error) {
        toast.error('Could not reset', { description: result.error });
        return;
      }
      setSubject(template.defaultSubject);
      setBody(template.defaultBody);
      setEditorKey((k) => k + 1);
      toast.success('Back to the original wording');
      router.refresh();
    });

  const openPreview = (sendTo?: string) =>
    startPreview(async () => {
      const result = await previewEmailTemplate(template.key, { subject, body, sendTo });
      if (result.error) {
        toast.error('Could not render', { description: result.error });
        return;
      }
      setPreview(result.preview!);
      if (sendTo) {
        if (result.preview!.sent) {
          toast.success(`Test sent to ${sendTo}`);
        } else {
          toast.error('Nothing was sent', {
            description: result.preview!.smtpConfigured
              ? 'The mail server refused it. Check the API log.'
              : 'SMTP is not configured on the server yet.',
          });
        }
      }
    });

  return (
    <Card>
      <div className="border-border/70 flex flex-wrap items-start justify-between gap-2 border-b p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="t-section">{template.label}</h2>
            {!active ? <Badge variant="outline">Off</Badge> : null}
            {template.edited ? <Badge variant="secondary">Edited</Badge> : null}
          </div>
          <p className="text-muted-foreground t-caption mt-1">{template.hint}</p>
          {template.updatedAt ? (
            <p className="text-muted-foreground t-caption mt-0.5">
              Last changed {relativeTime(template.updatedAt)}
            </p>
          ) : null}
        </div>
        <code className="text-muted-foreground t-caption bg-secondary rounded px-1.5 py-1">
          {template.key}
        </code>
      </div>

      <CardContent className="flex flex-col gap-4 p-4">
        {template.pending ? (
          <p className="border-warning/40 bg-warning/10 text-warning t-caption flex items-start gap-2 rounded-md border p-2.5">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            {template.pending} You can write it now; it will start sending the day the rail is
            connected.
          </p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="e-subject">Subject</Label>
          <Input
            id="e-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={!canEdit}
            maxLength={200}
          />
        </div>

        <EmailImagePicker
          templateKey={template.key}
          imageUrl={template.imageUrl}
          imageAlt={template.imageAlt}
          disabled={!canEdit}
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="e-body">Message</Label>
            <span className="text-muted-foreground t-caption">
              Wrapped in the {template.group === 'Admin team' ? 'brand' : 'brand'} layout when sent
            </span>
          </div>
          <RichTextEditor key={editorKey} id="e-body" value={body} onChange={setBody} height={364} />
        </div>

        <Variables template={template} subject={subject} body={body} onInsert={(name) => setBody((b) => `${b}{{${name}}}`)} />
      </CardContent>

      <div className="border-border/70 flex flex-wrap items-center gap-2 border-t p-4">
        {/* "Preview email", not "Preview" — the editor above has its own
            Preview tab for the Markdown, and two identical labels doing
            different things on one screen is a coin toss. */}
        <Button variant="outline" onClick={() => openPreview()} loading={previewing}>
          <Eye className="size-4" />
          Preview email
        </Button>

        {canEdit ? (
          <>
            <div className="flex items-center gap-1.5">
              <Input
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="you@example.com"
                type="email"
                className="h-9 w-52"
                aria-label="Send a test to"
              />
              <Button
                variant="outline"
                onClick={() => openPreview(testTo.trim())}
                disabled={!testTo.trim() || previewing}
              >
                <Send className="size-4" />
                Send test
              </Button>
            </div>

            <div className="flex-1" />

            <label className="t-small flex cursor-pointer items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="accent-primary size-4"
              />
              Send this email
            </label>

            {template.edited ? (
              <Button variant="ghost" onClick={reset} disabled={pending}>
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            ) : null}

            <Button onClick={save} loading={pending} disabled={!dirty}>
              <Save className="size-4" />
              {dirty ? 'Save' : 'Saved'}
            </Button>
          </>
        ) : (
          <span className="text-muted-foreground t-caption ml-auto">
            You can read this but not change it.
          </span>
        )}
      </div>

      <PreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </Card>
  );
}

/**
 * The placeholders this email may use, and a warning for one it may not.
 *
 * A mistyped placeholder is invisible until it reaches an inbox as literal
 * braces, so it is worth naming at the moment of writing rather than after the
 * first send.
 */
function Variables({
  template,
  subject,
  body,
  onInsert,
}: {
  template: EmailTemplateRow;
  subject: string;
  body: string;
  onInsert: (name: string) => void;
}) {
  const allowed = template.variables;
  const used = useMemo(() => {
    const found = new Set<string>();
    for (const m of `${subject}\n${body}`.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g)) {
      found.add(m[1]);
    }
    return found;
  }, [subject, body]);

  const unknown = [...used].filter((u) => !allowed.includes(u));

  return (
    <div className="flex flex-col gap-2">
      <Label>Placeholders</Label>
      <div className="flex flex-wrap gap-1.5">
        {allowed.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onInsert(name)}
            title="Add to the message"
            className={cn(
              't-caption rounded-md border px-2 py-1 font-mono transition-colors',
              used.has(name)
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {`{{${name}}}`}
          </button>
        ))}
      </div>

      {unknown.length > 0 ? (
        <p className="text-destructive t-caption flex items-start gap-1.5">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          <span>
            {unknown.map((u) => `{{${u}}}`).join(', ')}{' '}
            {unknown.length === 1 ? 'is not a placeholder' : 'are not placeholders'} this email
            knows. It will reach users exactly as written.
          </span>
        </p>
      ) : (
        <p className="text-muted-foreground t-caption">
          Click one to add it. Anything left unfilled shows as its own name rather than a blank.
        </p>
      )}
    </div>
  );
}

function PreviewDialog({
  preview,
  onClose,
}: {
  preview: EmailPreview | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={preview !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className="max-w-3xl"
        // Without this, Radix moves focus to the first focusable child — the
        // iframe — and Escape then goes to the sandboxed document instead of
        // closing the dialog. Keeping focus on the panel makes Escape work the
        // way it does everywhere else.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {preview ? (
          <>
            <DialogHeader>
              <DialogTitle>{preview.subject}</DialogTitle>
              <DialogDescription>
                Rendered with sample values — this is what an inbox shows.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="bg-secondary/40 p-0">
              {/*
                An iframe, not innerHTML.
                The email carries its own full document with its own styles; the
                dashboard's CSS must not leak in and make it look right here and
                wrong in a real client. Sandboxed with no allowances, so nothing
                in the preview can run or navigate.
              */}
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={preview.html}
                className="h-[60vh] w-full border-0 bg-white"
              />
            </DialogBody>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
