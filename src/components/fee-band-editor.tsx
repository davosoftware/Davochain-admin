'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { saveFeeLadder } from '@/app/actions/users';
import type { Band, FeeKind } from '@/lib/types-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trimNumber } from '@/lib/utils';

/** What each ladder charges, and what a number in it means. */
const SHAPE: Record<
  FeeKind,
  { column: string; prefix: string; defaults: Band[]; explain: (bands: Band[]) => string }
> = {
  RATE: {
    column: 'Rate fee (₦ per $)',
    prefix: '₦',
    defaults: [
      { minAmount: '10', maxAmount: '100', value: '25' },
      { minAmount: '100', maxAmount: null, value: '20' },
    ],
    explain: (bands) => {
      const b = bandFor(bands, 500);
      return b ? `A $500 buy pays ₦${trimNumber(b.value)} per dollar — ₦${(Number(b.value) * 500).toLocaleString()} in all.` : '';
    },
  },
  NGN_WITHDRAWAL: {
    column: 'Fee (₦)',
    prefix: '₦',
    // Naira-sized, because the rungs are naira. A band of "0-50" here means
    // fifty naira, not fifty dollars.
    defaults: [
      { minAmount: '0', maxAmount: '50000', value: '50' },
      { minAmount: '50000', maxAmount: '500000', value: '100' },
      { minAmount: '500000', maxAmount: null, value: '250' },
    ],
    explain: (bands) => {
      const b = bandFor(bands, 200000);
      return b
        ? `Cashing out ₦200,000 costs ₦${trimNumber(b.value)} — ₦${(200000 + Number(b.value)).toLocaleString()} leaves the balance.`
        : '';
    },
  },
  WITHDRAWAL: {
    column: 'Our fee ($)',
    prefix: '$',
    defaults: [
      { minAmount: '0', maxAmount: '100', value: '1' },
      { minAmount: '100', maxAmount: null, value: '2.5' },
    ],
    explain: (bands) => {
      const b = bandFor(bands, 300);
      return b
        ? `Sending $300 out costs $${trimNumber(b.value)} to us, plus whatever the chain charges on top.`
        : '';
    },
  },
  SWAP: {
    column: 'Swap fee ($)',
    prefix: '$',
    defaults: [
      { minAmount: '10', maxAmount: '100', value: '1' },
      { minAmount: '100', maxAmount: null, value: '2' },
    ],
    explain: (bands) => {
      const b = bandFor(bands, 500);
      return b ? `A $500 swap pays $${trimNumber(b.value)} — ${((Number(b.value) / 500) * 100).toFixed(2)}% of it.` : '';
    },
  },
};

function bandFor(bands: Band[], usd: number): Band | undefined {
  return bands.find(
    (b) => Number(b.minAmount) <= usd && (b.maxAmount === null || Number(b.maxAmount) > usd),
  );
}

/**
 * The ladder editor, for either fee.
 *
 * Bands must tile the whole range with no gap and no overlap, so editing one
 * boundary moves its neighbour with it — the alternative is letting someone
 * save a ladder the API will reject and making them work out why.
 */
export function FeeBandEditor({
  kind,
  asset,
  initial,
  onDone,
}: {
  kind: FeeKind;
  asset?: string;
  initial: Band[];
  onDone?: () => void;
}) {
  const shape = SHAPE[kind];
  // What the RUNGS are measured in. Labelling naira rungs "USD" is how somebody
  // types 50 meaning fifty thousand naira and sets a band at fifty.
  const bandCurrency = kind === 'NGN_WITHDRAWAL' ? '₦' : '$';
  const [bands, setBands] = useState<Band[]>(initial.length ? initial : shape.defaults);
  const [pending, start] = useTransition();
  const router = useRouter();

  /* Editing a boundary drags the next band's floor with it, so the ladder
     stays contiguous by construction rather than by validation. */
  const setBoundary = (index: number, value: string) => {
    setBands((prev) =>
      prev.map((b, i) =>
        i === index ? { ...b, maxAmount: value } : i === index + 1 ? { ...b, minAmount: value } : b,
      ),
    );
  };

  const setValue = (index: number, value: string) =>
    setBands((prev) => prev.map((b, i) => (i === index ? { ...b, value } : b)));

  const addBand = () =>
    setBands((prev) => {
      const last = prev[prev.length - 1];
      const boundary = String(Math.max(1000, Number(last.minAmount) * 10));
      return [
        ...prev.slice(0, -1),
        { ...last, maxAmount: boundary },
        { minAmount: boundary, maxAmount: null, value: last.value },
      ];
    });

  const removeBand = (index: number) =>
    setBands((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      // Whatever is left has to reach the top, or trades above it have no price.
      next[next.length - 1] = { ...next[next.length - 1], maxAmount: null };
      // And it has to start where the removed one did, or a gap opens.
      if (index === 0) next[0] = { ...next[0], minAmount: prev[0].minAmount };
      else next[index - 1] = { ...next[index - 1], maxAmount: next[index]?.minAmount ?? null };
      return next;
    });

  const save = () =>
    start(async () => {
      const result = await saveFeeLadder({
        kind,
        asset,
        bands: bands.map((b) => ({
          minAmount: b.minAmount,
          maxAmount: b.maxAmount === null || b.maxAmount === '' ? null : b.maxAmount,
          value: b.value,
        })),
      });
      if (result.error) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      toast.success('Ladder saved', {
        description: 'Trades from now on price off it. Earlier ones keep the ladder they had.',
      });
      router.refresh();
      onDone?.();
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="text-muted-foreground eyebrow grid grid-cols-[1fr_1fr_1.2fr_auto] items-center gap-2 px-1">
        <span>From ({bandCurrency})</span>
        <span>To ({bandCurrency})</span>
        <span>{shape.column}</span>
        <span className="w-8" />
      </div>

      {bands.map((band, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1.2fr_auto] items-center gap-2">
          <Input
            value={band.minAmount}
            onChange={(e) =>
              setBands((prev) => prev.map((b, j) => (j === i ? { ...b, minAmount: e.target.value } : b)))
            }
            inputMode="decimal"
            disabled={i > 0}
            className="h-8 font-mono"
          />
          <Input
            value={band.maxAmount ?? ''}
            onChange={(e) => setBoundary(i, e.target.value)}
            inputMode="decimal"
            placeholder={band.maxAmount === null ? 'no limit' : ''}
            disabled={i === bands.length - 1}
            className="h-8 font-mono"
          />
          <Input
            value={band.value}
            onChange={(e) => setValue(i, e.target.value)}
            inputMode="decimal"
            className="h-8 font-mono"
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-8"
            onClick={() => removeBand(i)}
            disabled={bands.length <= 1}
            aria-label="Remove this band"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}

      <div className="text-muted-foreground t-caption px-1">{shape.explain(bands)}</div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={addBand}>
          <Plus className="size-3.5" />
          Add band
        </Button>
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save ladder
        </Button>
      </div>
    </div>
  );
}
