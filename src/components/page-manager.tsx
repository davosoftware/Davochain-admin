'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, FileText, Lock, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { createPage, deletePage, updatePage } from '@/app/actions/cms';
import type { StaticPageRow } from '@/lib/types-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/rich-text-editor';
import { cn, relativeTime } from '@/lib/utils';

/**
 * The pages the website and the apps display.
 *
 * A list beside an editor rather than a page per route: these are half a dozen
 * documents somebody edits in one sitting, and a round trip between each is
 * friction with nothing to show for it.
 */
export function PageManager({ pages, canEdit }: { pages: StaticPageRow[]; canEdit: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(pages[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const selected = pages.find((p) => p.id === selectedId) ?? null;

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <div className="border-border/70 flex items-center justify-between border-b p-3">
            <h2 className="t-section">Pages</h2>
            {canEdit ? (
              <Button variant="ghost" size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-3.5" />
                New
              </Button>
            ) : null}
          </div>
          <CardContent className="p-1.5">
            {pages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => setSelectedId(page.id)}
                className={cn(
                  'flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors',
                  page.id === selectedId
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-secondary/60',
                )}
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="size-3.5 shrink-0 opacity-60" />
                  <span className="t-small truncate font-medium">{page.title}</span>
                  {!page.isPublished ? (
                    <EyeOff className="text-warning size-3 shrink-0" aria-label="Draft" />
                  ) : null}
                </span>
                <span className="text-muted-foreground t-caption truncate pl-5 font-mono">
                  /{page.slug}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {selected ? (
          <PageEditor key={selected.id} page={selected} canEdit={canEdit} />
        ) : (
          <Card>
            <CardContent className="text-muted-foreground t-small p-8 text-center">
              No pages yet.
            </CardContent>
          </Card>
        )}
      </div>

      <NewPageDialog open={creating} onClose={() => setCreating(false)} onCreated={setSelectedId} />
    </>
  );
}

function PageEditor({ page, canEdit }: { page: StaticPageRow; canEdit: boolean }) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [excerpt, setExcerpt] = useState(page.excerpt ?? '');
  const [body, setBody] = useState(page.body);
  const [published, setPublished] = useState(page.isPublished);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const dirty =
    title !== page.title ||
    slug !== page.slug ||
    excerpt !== (page.excerpt ?? '') ||
    body !== page.body ||
    published !== page.isPublished;

  const save = () =>
    start(async () => {
      const result = await updatePage(page.id, {
        title,
        // The API refuses a slug change on a system page. Not sending one at
        // all when it has not changed keeps that refusal for the case that
        // actually deserves it.
        ...(slug !== page.slug ? { slug } : {}),
        excerpt,
        body,
        ...(published !== page.isPublished ? { isPublished: published } : {}),
      });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success('Saved', { description: 'Live on the website and in the apps now.' });
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      const result = await deletePage(page.id);
      if (result.error) {
        toast.error('Could not delete', { description: result.error });
        setConfirming(false);
        return;
      }
      toast.success(`"${page.title}" deleted`);
      setConfirming(false);
      router.refresh();
    });

  return (
    <Card>
      <div className="border-border/70 flex flex-wrap items-center justify-between gap-2 border-b p-4">
        <div className="flex items-center gap-2">
          <h2 className="t-section">{page.title}</h2>
          {page.isSystem ? (
            <Badge variant="outline" className="gap-1">
              <Lock className="size-3" />
              Linked from the apps
            </Badge>
          ) : null}
          {!page.isPublished ? <Badge variant="outline">Draft</Badge> : null}
        </div>
        <span className="text-muted-foreground t-caption">
          Updated {relativeTime(page.updatedAt)}
        </span>
      </div>

      <CardContent className="flex flex-col gap-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-title">Title</Label>
            <Input
              id="p-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEdit}
              maxLength={160}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-slug">Address</Label>
            <Input
              id="p-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              // A system page's address is what the shipped apps request. The
              // API refuses to change it; disabling the field says so before
              // somebody types a new one and loses the edit.
              disabled={!canEdit || page.isSystem}
              className="font-mono"
            />
            <p className="text-muted-foreground t-caption">
              {page.isSystem
                ? 'Fixed — the apps request this page by its address.'
                : `The website serves it at /${slug || '…'}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-excerpt">Summary</Label>
          <Input
            id="p-excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            disabled={!canEdit}
            maxLength={300}
            placeholder="One line for a card or a search result. Optional."
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-body">Content</Label>
          <RichTextEditor id="p-body" value={body} onChange={setBody} height={468} />
        </div>
      </CardContent>

      <div className="border-border/70 flex flex-wrap items-center justify-between gap-2 border-t p-4">
        <div className="flex items-center gap-2">
          {canEdit && !page.isSystem ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPublished((p) => !p)}
              disabled={pending}
            >
              {published ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {published ? 'Unpublish' : 'Publish'}
            </Button>
          ) : null}

          {canEdit && !page.isSystem ? (
            confirming ? (
              <span className="flex items-center gap-1.5">
                <Button variant="destructive" size="sm" onClick={remove} loading={pending}>
                  Delete for good
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  <X className="size-3.5" />
                </Button>
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            )
          ) : null}
        </div>

        {canEdit ? (
          <Button onClick={save} loading={pending} disabled={!dirty}>
            <Save className="size-4" />
            {dirty ? 'Save changes' : 'Saved'}
          </Button>
        ) : (
          <span className="text-muted-foreground t-caption">
            You can read this but not change it.
          </span>
        )}
      </div>
    </Card>
  );
}

function NewPageDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  const create = () =>
    start(async () => {
      const result = await createPage({ title: title.trim(), body, isPublished: false });
      if (result.error) {
        toast.error('Could not create', { description: result.error });
        return;
      }
      // New pages start as drafts, so a half-written one is never live. The
      // toast says so, because "created" alone implies it is on the site.
      toast.success(`"${result.page!.title}" created`, {
        description: 'Saved as a draft. Publish it when the wording is right.',
      });
      onCreated(result.page!.id);
      setTitle('');
      setBody('');
      onClose();
      router.refresh();
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New page</DialogTitle>
          <DialogDescription>
            It starts as a draft. Nothing reaches the website until you publish it.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="np-title">Title</Label>
            <Input
              id="np-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="How it works"
              autoFocus
              maxLength={160}
            />
            <p className="text-muted-foreground t-caption">
              The address is made from the title —{' '}
              <span className="font-mono">/{slugPreview(title) || '…'}</span>
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="np-body">Content</Label>
            <RichTextEditor id="np-body" value={body} onChange={setBody} height={260} />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={create} loading={pending} disabled={title.trim().length < 2}>
            <Plus className="size-4" />
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Mirrors the API's slugify, so the address shown is the one that gets made. */
function slugPreview(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '');
}
