'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { deleteType, saveType } from '@/app/actions/giftcards';
import type { Currency, GiftCardBrandRow, GiftCardTypeRow } from '@/lib/types-admin';
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
import { formatNaira } from '@/lib/utils';

/**
 * An amount with its symbol on the correct side.
 *
 * The symbol comes from the row or the API list, never from a table kept here
 * — one place decides what a currency looks like, and it is the one the app
 * reads too.
 */
function amount(value: string | number, c?: { symbol: string; symbolFirst: boolean }): string {
  const n = Number(value).toLocaleString();
  if (!c) return n;
  return c.symbolFirst ? `${c.symbol}${n}` : `${n} ${c.symbol}`;
}

export function CardTypes({
  rows,
  brands,
  currencies,
  canManage,
}: {
  rows: GiftCardTypeRow[];
  brands: GiftCardBrandRow[];
  /** From the API, so the dropdown can only offer what the app can draw. */
  currencies: Currency[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<GiftCardTypeRow | null | 'new'>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? rows.filter(
          (r) => r.name.toLowerCase().includes(q) || r.brand.name.toLowerCase().includes(q),
        )
      : rows;
  }, [rows, query]);

  const payload = (row: GiftCardTypeRow) => ({
    id: row.id,
    brandId: row.brand.id,
    name: row.name,
    currency: row.currency,
    minAmount: row.minAmount,
    maxAmount: row.maxAmount,
    rateNgn: row.rateNgn,
  });

  const toggle = (row: GiftCardTypeRow) =>
    start(async () => {
      const result = await saveType({ ...payload(row), isActive: !row.isActive });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success(row.isActive ? `${row.brand.name} ${row.name} deactivated` : 'Back on sale', {
        description: row.isActive ? 'It disappears from the app immediately.' : undefined,
      });
      router.refresh();
    });

  const remove = (row: GiftCardTypeRow) =>
    start(async () => {
      if (!globalThis.confirm(`Delete "${row.brand.name} ${row.name}"?\n\nThis cannot be undone.`))
        return;
      const result = await deleteType(row.id);
      if (result.error) {
        toast.error('Cannot delete', { description: result.error });
        return;
      }
      toast.success('Card type deleted');
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
            placeholder="Search by card or brand…"
            className="h-10 pl-9"
            aria-label="Search card types"
          />
        </div>
        {canManage ? (
          <Button
            onClick={() => setEditing('new')}
            disabled={brands.length === 0}
            title={brands.length === 0 ? 'Add a brand first' : undefined}
            className="ml-auto"
          >
            <Plus className="size-3.5" />
            Add card category
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-14 pl-5">S/No.</TableHead>
                <TableHead>Card category</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead className="text-right">Max</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Trades</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableEmpty colSpan={9}>
                  {rows.length === 0 ? (
                    <>
                      No card types yet.
                      <span className="text-muted-foreground block">
                        {brands.length === 0
                          ? 'Add a brand first — a card type belongs to one.'
                          : 'A brand can be traded in more than one form: an Amazon e-code and an Amazon physical card are not worth the same, so each gets its own rate.'}
                      </span>
                    </>
                  ) : (
                    'No card type matches that.'
                  )}
                </TableEmpty>
              ) : (
                filtered.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground pl-5 tabular-nums">
                      {index + 1}
                    </TableCell>
                    <TableCell className="t-small font-medium">{row.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="t-small">{row.brand.name}</span>
                      <span className="text-muted-foreground t-caption block">
                        {row.category.name}
                      </span>
                    </TableCell>
                    <TableCell className="t-small text-right tabular-nums whitespace-nowrap">
                      {amount(row.minAmount, currencies.find((c) => c.code === row.currency))}
                    </TableCell>
                    <TableCell className="t-small text-right tabular-nums whitespace-nowrap">
                      {amount(row.maxAmount, currencies.find((c) => c.code === row.currency))}
                    </TableCell>
                    {/* The one figure a user is quoted. */}
                    <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                      {formatNaira(row.rateNgn, 0)}
                      <span className="text-muted-foreground t-caption block font-normal">
                        per {row.currencySymbol}1 · {row.currency}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground t-small tabular-nums">
                      {row.tradeCount}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? 'success' : 'outline'}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </Badge>
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

      <TypeDialog
        open={editing !== null}
        row={editing === 'new' ? null : editing}
        brands={brands}
        currencies={currencies}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function TypeDialog({
  open,
  row,
  brands,
  currencies,
  onClose,
}: {
  open: boolean;
  row: GiftCardTypeRow | null;
  brands: GiftCardBrandRow[];
  currencies: Currency[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [brandId, setBrandId] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [minAmount, setMin] = useState('');
  const [maxAmount, setMax] = useState('');
  const [rateNgn, setRate] = useState('');
  const [seeded, setSeeded] = useState<string | null>(null);

  const key = row?.id ?? (open ? 'new' : null);
  if (key !== seeded) {
    setSeeded(key);
    setBrandId(row?.brand.id ?? brands.find((b) => b.isActive)?.id ?? '');
    setName(row?.name ?? '');
    setCurrency(row?.currency ?? 'USD');
    setMin(row ? String(Number(row.minAmount)) : '');
    setMax(row ? String(Number(row.maxAmount)) : '');
    setRate(row ? String(Number(row.rateNgn)) : '');
  }

  const num = (v: string) => (v === '' ? NaN : Number(v));
  const valid =
    brandId !== '' &&
    name.trim() !== '' &&
    num(minAmount) > 0 &&
    num(maxAmount) > 0 &&
    num(maxAmount) >= num(minAmount) &&
    num(rateNgn) > 0;

  const save = () =>
    start(async () => {
      const result = await saveType({
        id: row?.id,
        brandId,
        name: name.trim(),
        currency,
        minAmount,
        maxAmount,
        rateNgn,
      });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success(row ? 'Card type updated' : 'Card type added', {
        description: row
          ? 'New trades are quoted at this rate. Cards already submitted keep the rate they were sent at.'
          : undefined,
      });
      onClose();
      router.refresh();
    });

  const money = (v: string) => v.replace(/[^0-9.]/g, '');
  const picked = currencies.find((c) => c.code === currency);
  const symbol = picked?.symbol ?? currency;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row ? 'Edit card category' : 'Add card category'}</DialogTitle>
          <DialogDescription>
            One tradeable form of a brand — an e-code and a physical card are not worth the same.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type-brand">Brand</Label>
            <select
              id="type-brand"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="border-input bg-card t-small hover:border-primary/40 focus-visible:ring-ring h-10 rounded-lg border px-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <option value="">Select brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.category.name}
                  {b.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type-name">Card category</Label>
            <Input
              id="type-name"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="E-code"
            />
            <p className="text-muted-foreground t-caption">
              What kind of card this is: E-code, Physical, Receipt.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-currency">Currency</Label>
              <select
                id="type-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="border-input bg-card t-small hover:border-primary/40 focus-visible:ring-ring h-10 rounded-lg border px-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
            <Amount id="type-min" label="Min limit" prefix={symbol} value={minAmount} onChange={(v) => setMin(money(v))} />
            <Amount id="type-max" label="Max limit" prefix={symbol} value={maxAmount} onChange={(v) => setMax(money(v))} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type-rate">Rate</Label>
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                ₦
              </span>
              <Input
                id="type-rate"
                inputMode="decimal"
                value={rateNgn}
                onChange={(e) => setRate(money(e.target.value))}
                className="pl-7 tabular-nums"
                placeholder="1000"
              />
            </div>
            <p className="text-muted-foreground t-caption">
              Naira per {symbol}1. This is what the app quotes, and what a trade is priced at —
              cards already submitted keep the rate they were sent at.
            </p>
          </div>

          {/* What the numbers above mean, in the sentence a user will see. */}
          {valid ? (
            <p className="border-border/70 bg-secondary/40 t-caption rounded-md border p-2.5">
              A {amount(maxAmount, picked)} card would pay{' '}
              <strong>{formatNaira(Number(maxAmount) * Number(rateNgn), 0)}</strong>.
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!valid} loading={pending}>
              Save changes
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function Amount({
  id,
  label,
  prefix,
  value,
  onChange,
}: {
  id: string;
  label: string;
  prefix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
          {prefix}
        </span>
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="tabular-nums"
          style={{ paddingLeft: `${1.5 + prefix.length * 0.4}rem` }}
        />
      </div>
    </div>
  );
}
