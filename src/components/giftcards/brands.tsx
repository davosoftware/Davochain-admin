'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Plus, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { deleteBrand, saveBrand } from '@/app/actions/giftcards';
import type { GiftCardBrandRow, GiftCardCategoryRow } from '@/lib/types-admin';
import { RowActions } from '@/components/giftcards/row-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, relativeTime } from '@/lib/utils';

const MAX_BYTES = 5 * 1024 * 1024;
const MIN_PIXELS = 100;

/*
 * Brand logos need no proxy.
 *
 * They are a public, versioned, immutable URL on the API — the same thing the
 * app loads. Routing them through this server would add a hop per row and a
 * second cache for no benefit; only the private trade photographs need the
 * cookie-holding proxy.
 */

export function Brands({
  rows,
  categories,
  canManage,
}: {
  rows: GiftCardBrandRow[];
  categories: GiftCardCategoryRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<GiftCardBrandRow | null | 'new'>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? rows.filter(
          (r) => r.name.toLowerCase().includes(q) || r.category.name.toLowerCase().includes(q),
        )
      : rows;
  }, [rows, query]);

  const toggle = (row: GiftCardBrandRow) =>
    start(async () => {
      const result = await saveBrand({
        id: row.id,
        name: row.name,
        categoryId: row.category.id,
        isActive: !row.isActive,
      });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success(row.isActive ? `${row.name} deactivated` : `${row.name} is live`, {
        description: row.isActive ? 'It disappears from the app immediately.' : undefined,
      });
      router.refresh();
    });

  const remove = (row: GiftCardBrandRow) =>
    start(async () => {
      if (!globalThis.confirm(`Delete "${row.name}"?\n\nThis cannot be undone.`)) return;
      const result = await deleteBrand(row.id);
      if (result.error) {
        toast.error('Cannot delete', { description: result.error });
        return;
      }
      toast.success(`${row.name} deleted`);
      router.refresh();
    });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-md">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="h-10 pl-9"
            aria-label="Search brands"
          />
        </div>
        {canManage ? (
          <Button
            onClick={() => setEditing('new')}
            disabled={categories.length === 0}
            title={categories.length === 0 ? 'Add a brand category first' : undefined}
            className="ml-auto"
          >
            <Plus className="size-3.5" />
            Add brand
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-14 pl-5">S/No.</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Brand name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Card types</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated at</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableEmpty colSpan={8}>
                  {rows.length === 0 ? (
                    <>
                      No brands yet.
                      <span className="text-muted-foreground block">
                        {categories.length === 0
                          ? 'Add a brand category first — a brand has to belong to one.'
                          : 'A brand is the card a user taps: Amazon, Steam, iTunes.'}
                      </span>
                    </>
                  ) : (
                    'No brand matches that name.'
                  )}
                </TableEmpty>
              ) : (
                filtered.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground pl-5 tabular-nums">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      {row.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.imageUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="border-border/60 bg-secondary/40 size-10 rounded-lg border object-contain"
                        />
                      ) : (
                        <div className="border-border/60 bg-secondary/40 text-muted-foreground flex size-10 items-center justify-center rounded-lg border">
                          <ImagePlus className="size-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="t-small font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground t-small">
                      {row.category.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground t-small tabular-nums">
                      {row.typeCount}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? 'success' : 'outline'}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground t-small whitespace-nowrap">
                      {relativeTime(row.updatedAt)}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      {canManage ? (
                        <RowActions
                          isActive={row.isActive}
                          busy={pending}
                          onToggle={() => toggle(row)}
                          onEdit={() => setEditing(row)}
                          onDelete={() => remove(row)}
                        />
                      ) : (
                        <span className="text-muted-foreground t-caption">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BrandDialog
        open={editing !== null}
        row={editing === 'new' ? null : editing}
        categories={categories}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function BrandDialog({
  open,
  row,
  categories,
  onClose,
}: {
  open: boolean;
  row: GiftCardBrandRow | null;
  categories: GiftCardCategoryRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  /** A fresh data URL, or null to leave whatever is already stored alone. */
  const [image, setImage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [seeded, setSeeded] = useState<string | null>(null);

  const key = row?.id ?? (open ? 'new' : null);
  if (key !== seeded) {
    setSeeded(key);
    setName(row?.name ?? '');
    setCategoryId(row?.category.id ?? categories.find((c) => c.isActive)?.id ?? '');
    setImage(null);
  }

  /**
   * Read, check and downscale-check a picture before it is sent.
   *
   * The dimensions are checked here because the API cannot: it verifies the
   * bytes really are an image, but reading a picture's size server-side would
   * mean a decoding dependency for a rule the browser already knows.
   */
  const take = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error('That image is too large', {
        description: `${Math.round(file.size / 1024 / 1024)} MB — the limit is 5 MB.`,
      });
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error('Use a JPEG, PNG or WebP');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const probe = new globalThis.Image();
      probe.onload = () => {
        if (probe.width < MIN_PIXELS || probe.height < MIN_PIXELS) {
          toast.error('That image is too small', {
            description: `${probe.width}×${probe.height} — at least ${MIN_PIXELS}×${MIN_PIXELS} so it stays sharp in the app.`,
          });
          return;
        }
        setImage(dataUrl);
      };
      probe.onerror = () => toast.error('That file is not an image');
      probe.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const preview = image ?? (row?.imageUrl ?? null);
  const canSave = name.trim() !== '' && categoryId !== '' && (row !== null || image !== null);

  const save = () =>
    start(async () => {
      const result = await saveBrand({
        id: row?.id,
        name: name.trim(),
        categoryId,
        // Omitted when unchanged, which is what leaves an existing logo alone.
        ...(image ? { image } : {}),
      });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success(row ? 'Brand updated' : `${name.trim()} added`);
      onClose();
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row ? 'Edit brand' : 'Add brand'}</DialogTitle>
          <DialogDescription>
            The card a user taps to start a trade. The image is what they see.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>
              Image {row ? <span className="text-muted-foreground">(optional)</span> : null}
            </Label>
            <div className="flex items-start gap-3">
              <div className="border-border/60 bg-secondary/40 text-muted-foreground flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="size-full object-contain" />
                ) : (
                  <ImagePlus className="size-5" />
                )}
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  take(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-lg border border-dashed p-4 text-center transition-colors',
                  dragging ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <p className="t-small">
                  Drag and drop your image here, or{' '}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-primary font-medium hover:underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-muted-foreground t-caption">
                  JPEG, PNG or WebP · Max 5 MB · Min {MIN_PIXELS}×{MIN_PIXELS}px
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  Upload image
                </Button>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                take(e.target.files?.[0]);
                // Cleared so picking the same file twice still fires a change.
                e.target.value = '';
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="brand-name">Name</Label>
            <Input
              id="brand-name"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="Amazon"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="brand-category">Category</Label>
            <select
              id="brand-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="border-input bg-card t-small hover:border-primary/40 focus-visible:ring-ring h-10 rounded-lg border px-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!canSave} loading={pending}>
              Save changes
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
