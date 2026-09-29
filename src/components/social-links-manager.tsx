'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ImageUp,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  clearSocialIcon,
  createSocial,
  deleteSocial,
  reorderSocials,
  setSocialIcon,
  updateSocial,
} from '@/app/actions/cms';
import type { KnownNetworks, SocialLinkRow } from '@/lib/types-admin';
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
import { cn } from '@/lib/utils';

/**
 * The networks in the email footer and on the website.
 *
 * One list, in the order they appear. Everything that decides what a recipient
 * sees is on the row: whether it shows at all, where it points, and the icon —
 * so nobody has to hold three screens in their head to change one footer.
 */
export function SocialLinksManager({
  links,
  known,
  canEdit,
}: {
  links: SocialLinkRow[];
  known: KnownNetworks;
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const shown = links.filter((l) => l.isEnabled).length;

  const move = (index: number, direction: -1 | 1) =>
    start(async () => {
      const next = [...links];
      const target = index + direction;
      if (target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target], next[index]];

      const result = await reorderSocials(next.map((l) => l.id));
      if (result.error) {
        toast.error('Could not save the order', { description: result.error });
        return;
      }
      router.refresh();
    });

  const toggle = (link: SocialLinkRow) =>
    start(async () => {
      const result = await updateSocial(link.id, { isEnabled: !link.isEnabled });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success(
        link.isEnabled ? `${link.label} hidden` : `${link.label} will show`,
        { description: 'Emails sent from now on, and the website.' },
      );
      router.refresh();
    });

  const remove = (link: SocialLinkRow) =>
    start(async () => {
      const result = await deleteSocial(link.id);
      if (result.error) {
        toast.error('Could not remove it', { description: result.error });
        return;
      }
      toast.success(`${link.label} removed`);
      router.refresh();
    });

  return (
    <>
      <Card>
        <div className="border-border/70 flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <div>
            <h2 className="t-section">
              {shown} of {links.length} showing
            </h2>
            <p className="text-muted-foreground t-caption mt-0.5">
              In this order, in every email footer and on the website. Upload an icon at{' '}
              {known.iconPixels}&thinsp;&times;&thinsp;{known.iconPixels}px — without one, the
              letters below are drawn in a circle instead.
            </p>
          </div>
          {canEdit ? (
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              Add a network
            </Button>
          ) : null}
        </div>

        <CardContent className="p-0">
          {links.length === 0 ? (
            <p className="text-muted-foreground t-small p-8 text-center">
              No networks yet. The footer simply has no icon row until there is one.
            </p>
          ) : (
            <ul className="divide-border/50 divide-y">
              {links.map((link, index) => (
                <li key={link.id} className="flex items-center gap-3 p-4">
                  {canEdit ? (
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || pending}
                        aria-label="Move up"
                        className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded p-0.5 transition-colors disabled:opacity-25"
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === links.length - 1 || pending}
                        aria-label="Move down"
                        className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded p-0.5 transition-colors disabled:opacity-25"
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                    </div>
                  ) : null}

                  {/* Drawn the way the email draws it, on the same navy band —
                      so what is on this row is what lands in the inbox. */}
                  <span
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-full',
                      !link.isEnabled && 'opacity-35',
                    )}
                    style={{ background: '#102c58' }}
                  >
                    {link.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={link.iconUrl}
                        alt=""
                        className="size-8 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className="flex size-8 items-center justify-center rounded-full border text-[11px] font-semibold text-white"
                        style={{ borderColor: 'rgba(255,255,255,0.35)' }}
                        dangerouslySetInnerHTML={{ __html: link.glyph }}
                      />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn('t-body font-medium', !link.isEnabled && 'opacity-60')}>
                        {link.label}
                      </p>
                      {!link.isEnabled ? <Badge variant="outline">Hidden</Badge> : null}
                      {!link.iconUrl ? <Badge variant="secondary">No icon</Badge> : null}
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground t-caption inline-flex items-center gap-1 truncate"
                    >
                      {link.url}
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </div>

                  {canEdit ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <IconButton link={link} />
                      <EditDialog link={link} known={known} />
                      <label className="t-caption flex cursor-pointer items-center gap-1.5 select-none">
                        <input
                          type="checkbox"
                          checked={link.isEnabled}
                          onChange={() => toggle(link)}
                          disabled={pending}
                          className="accent-primary size-4"
                        />
                        Show
                      </label>
                      <DeleteButton onConfirm={() => remove(link)} pending={pending} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddDialog
        open={adding}
        known={known}
        existing={links.map((l) => l.label.toLowerCase())}
        onClose={() => setAdding(false)}
      />
    </>
  );
}

/** Downscaled here so a 4000px logo never reaches the API or an inbox. */
async function downscale(file: File, pixels: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, pixels / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not read that image');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // Always PNG: a brand icon usually has a transparent corner, and JPEG would
  // fill it with black on the navy band.
  return canvas.toDataURL('image/png');
}

function IconButton({ link }: { link: SocialLinkRow }) {
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const upload = (file: File) =>
    start(async () => {
      try {
        const dataUrl = await downscale(file, 128);
        const result = await setSocialIcon(link.id, dataUrl);
        if (result.error) {
          toast.error('Could not save that icon', { description: result.error });
          return;
        }
        toast.success(`${link.label} icon saved`);
        router.refresh();
      } catch {
        toast.error('Could not read that file', { description: 'Use a PNG, JPEG or GIF.' });
      }
    });

  const clear = () =>
    start(async () => {
      const result = await clearSocialIcon(link.id);
      if (result.error) {
        toast.error('Could not remove it', { description: result.error });
        return;
      }
      toast.success('Back to the letterform');
      router.refresh();
    });

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = '';
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => (link.iconUrl ? clear() : fileRef.current?.click())}
        loading={pending}
        title={link.iconUrl ? 'Remove the icon' : 'Upload an icon'}
      >
        <ImageUp className="size-3.5" />
        {link.iconUrl ? 'Clear icon' : 'Icon'}
      </Button>
    </>
  );
}

function DeleteButton({ onConfirm, pending }: { onConfirm: () => void; pending: boolean }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setArmed(true)}
        className="text-muted-foreground hover:text-destructive"
        aria-label="Remove"
      >
        <Trash2 className="size-3.5" />
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-0.5">
      <Button variant="destructive" size="sm" onClick={onConfirm} loading={pending}>
        Remove
      </Button>
      <Button variant="ghost" size="icon" onClick={() => setArmed(false)} aria-label="Keep">
        <X className="size-3.5" />
      </Button>
    </span>
  );
}

function EditDialog({ link, known }: { link: SocialLinkRow; known: KnownNetworks }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(link.label);
  const [url, setUrl] = useState(link.url);
  const [pending, start] = useTransition();
  const router = useRouter();

  const save = () =>
    start(async () => {
      const result = await updateSocial(link.id, { label: label.trim(), url: url.trim() });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success('Saved');
      setOpen(false);
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {link.label}</DialogTitle>
          <DialogDescription>Where this icon points, and what it is called.</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`s-label-${link.id}`}>Name</Label>
            <Input
              id={`s-label-${link.id}`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={40}
            />
            <p className="text-muted-foreground t-caption">
              Used as the link&rsquo;s title, and to pick the letterform when there is no icon.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`s-url-${link.id}`}>Your profile</Label>
            <Input
              id={`s-url-${link.id}`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={known.networks.find((n) => n.label === link.label)?.placeholder}
              maxLength={500}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={save}
            loading={pending}
            disabled={label.trim().length < 1 || url.trim().length < 4}
          >
            <Save className="size-4" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddDialog({
  open,
  known,
  existing,
  onClose,
}: {
  open: boolean;
  known: KnownNetworks;
  existing: string[];
  onClose: () => void;
}) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  const suggestion = known.networks.find((n) => n.label === label);

  const add = () =>
    start(async () => {
      const result = await createSocial({ label: label.trim(), url: url.trim() });
      if (result.error) {
        toast.error('Could not add it', { description: result.error });
        return;
      }
      toast.success(`${result.link!.label} added`, {
        description: 'Upload an icon for it, or leave the letterform.',
      });
      setLabel('');
      setUrl('');
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a network</DialogTitle>
          <DialogDescription>
            It appears in every email footer and on the website straight away.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Network</Label>
            {/* The common ones as one tap, but the field is free text — a
                network nobody listed still works, it just gets a letterform. */}
            <div className="flex flex-wrap gap-1.5">
              {known.networks.map((n) => {
                const taken = existing.includes(n.label.toLowerCase());
                return (
                  <button
                    key={n.label}
                    type="button"
                    disabled={taken}
                    onClick={() => {
                      setLabel(n.label);
                      if (!url) setUrl(n.placeholder);
                    }}
                    className={cn(
                      't-caption rounded-md border px-2.5 py-1 transition-colors',
                      label === n.label
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/40',
                      taken && 'cursor-not-allowed opacity-35',
                    )}
                    title={taken ? 'Already added' : undefined}
                  >
                    {n.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-new-label">Name</Label>
            <Input
              id="s-new-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Threads"
              maxLength={40}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-new-url">Your profile</Label>
            <Input
              id="s-new-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={suggestion?.placeholder ?? 'https://…'}
              maxLength={500}
            />
            <p className="text-muted-foreground t-caption">
              The full address of your page. It is a link in every email we send, so only http and
              https are accepted.
            </p>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={add}
            loading={pending}
            disabled={label.trim().length < 1 || url.trim().length < 4}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
