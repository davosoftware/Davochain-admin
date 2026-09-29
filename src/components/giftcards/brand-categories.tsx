'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { deleteCategory, saveCategory } from '@/app/actions/giftcards';
import type { GiftCardCategoryRow } from '@/lib/types-admin';
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
import { relativeTime } from '@/lib/utils';

function stamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BrandCategories({
  rows,
  canManage,
}: {
  rows: GiftCardCategoryRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<GiftCardCategoryRow | null | 'new'>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // The whole list arrives with the page — categories are a handful, and a
    // round trip to hide two rows would be slower and no more correct.
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  const toggle = (row: GiftCardCategoryRow) =>
    start(async () => {
      const result = await saveCategory({ id: row.id, name: row.name, isActive: !row.isActive });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success(row.isActive ? `${row.name} deactivated` : `${row.name} is live`, {
        description: row.isActive
          ? 'Its brands disappear from the app. Past trades keep their card name.'
          : undefined,
      });
      router.refresh();
    });

  const remove = (row: GiftCardCategoryRow) =>
    start(async () => {
      if (!globalThis.confirm(`Delete "${row.name}"?\n\nThis cannot be undone.`)) return;
      const result = await deleteCategory(row.id);
      if (result.error) {
        // The API refuses when brands still use it, and says how many.
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
            aria-label="Search brand categories"
          />
        </div>
        {canManage ? (
          <Button onClick={() => setEditing('new')} className="ml-auto">
            <Plus className="size-3.5" />
            Add brand category
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-14 pl-5">S/No.</TableHead>
                <TableHead>Category name</TableHead>
                <TableHead>Brands</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created at</TableHead>
                <TableHead>Updated at</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableEmpty colSpan={7}>
                  {rows.length === 0 ? (
                    <>
                      No brand categories yet.
                      <span className="text-muted-foreground block">
                        A category groups brands — Shopping, Gaming, Streaming. Add one before
                        adding a brand.
                      </span>
                    </>
                  ) : (
                    'No category matches that name.'
                  )}
                </TableEmpty>
              ) : (
                filtered.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground pl-5 tabular-nums">
                      {index + 1}
                    </TableCell>
                    <TableCell className="t-small font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground t-small tabular-nums">
                      {row.brandCount}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? 'success' : 'outline'}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="t-small whitespace-nowrap">
                      {stamp(row.createdAt)}
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

      <CategoryDialog
        open={editing !== null}
        row={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function CategoryDialog({
  open,
  row,
  onClose,
}: {
  open: boolean;
  row: GiftCardCategoryRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState('');
  const [seeded, setSeeded] = useState<string | null>(null);

  // Seed from the row being edited, once per opening.
  const key = row?.id ?? (open ? 'new' : null);
  if (key !== seeded) {
    setSeeded(key);
    setName(row?.name ?? '');
  }

  const save = () =>
    start(async () => {
      const result = await saveCategory({ id: row?.id, name: name.trim() });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success(row ? 'Category updated' : `${name.trim()} added`);
      onClose();
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row ? 'Edit brand category' : 'Add brand category'}</DialogTitle>
          <DialogDescription>
            What a brand sells into — Shopping, Gaming, Streaming.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category-name">Category name</Label>
            <Input
              id="category-name"
              value={name}
              autoFocus
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && save()}
              placeholder="Shopping"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!name.trim()} loading={pending}>
              Save changes
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
