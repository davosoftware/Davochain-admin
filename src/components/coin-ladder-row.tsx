'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { saveFeeLadder } from '@/app/actions/users';
import type { Band, FeeKind } from '@/lib/types-admin';
import { FeeBandEditor } from '@/components/fee-band-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, trimNumber } from '@/lib/utils';

/**
 * One coin, one fee, editable in place.
 *
 * Fifteen coins on two ladders is thirty settings, so the row stays a single
 * line until you open it. What it shows closed is the price that coin is
 * charging right now — inherited or its own — because a table of blanks for
 * every coin using the default tells you nothing about what anyone pays.
 */
export function CoinLadderRow({
  kind,
  asset,
  name,
  bands,
  usesGlobal,
  effectiveFrom,
  canEdit,
}: {
  kind: FeeKind;
  asset: string;
  name: string;
  bands: Band[];
  usesGlobal: boolean;
  effectiveFrom: string | null;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const chip = (value: string) =>
    kind === 'RATE' || kind === 'NGN_WITHDRAWAL'
      ? `₦${trimNumber(value)}`
      : `$${trimNumber(value)}`;

  // What the RUNGS are measured in — naira only for the cash-out ladder. Not
  // the same question as what the fee is charged in: the rate ladder has
  // dollar rungs carrying a naira gate.
  const money = kind === 'NGN_WITHDRAWAL' ? '₦' : '$';

  const useDefault = () =>
    start(async () => {
      const result = await saveFeeLadder({ kind, asset, bands: [], inherits: true });
      if (result.error) {
        toast.error('Could not reset that coin', { description: result.error });
        return;
      }
      toast.success(`${asset.toUpperCase()} follows the default again`, {
        description: 'Its old ladders are kept, so past trades can still be explained.',
      });
      setOpen(false);
      router.refresh();
    });

  return (
    <li className="border-border/40 border-b last:border-0">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="flex w-28 shrink-0 items-center gap-2">
          <span className="t-small font-medium">{asset.toUpperCase()}</span>
          {usesGlobal ? (
            <Badge variant="outline">default</Badge>
          ) : (
            <Badge variant="default">custom</Badge>
          )}
        </div>

        {/* The whole ladder inline — one rung is meaningless without its band. */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {bands.length === 0 ? (
            <span className="text-muted-foreground t-caption">no ladder configured</span>
          ) : (
            bands.map((b, i) => (
              <span
                key={i}
                className={cn(
                  't-caption inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono',
                  usesGlobal
                    ? 'border-border/50 bg-transparent'
                    : 'border-border/70 bg-secondary/50',
                )}
              >
                <span className="text-muted-foreground">
                  {money}
                  {Number(b.minAmount).toLocaleString()}
                  {b.maxAmount ? `–${money}${Number(b.maxAmount).toLocaleString()}` : '+'}
                </span>
                <span className={usesGlobal ? 'text-muted-foreground' : 'text-primary font-medium'}>
                  {chip(b.value)}
                </span>
              </span>
            ))
          )}
        </div>

        {canEdit ? (
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setOpen((o) => !o)}>
            <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
            {usesGlobal ? 'Set' : 'Edit'}
          </Button>
        ) : (
          <span className="text-muted-foreground t-caption shrink-0">
            {usesGlobal ? 'inherits' : 'custom'}
          </span>
        )}
      </div>

      {open && canEdit ? (
        <div className="bg-secondary/40 border-border/40 border-t px-4 py-4">
          <p className="text-muted-foreground t-caption mb-3">
            {usesGlobal ? (
              <>
                {name} follows the default. Saving here gives it a ladder of its own — the numbers
                below start from the default so you are editing, not starting blank.
              </>
            ) : (
              <>
                {name} has its own ladder
                {effectiveFrom ? ', set separately from the default' : ''}.
              </>
            )}
          </p>

          <FeeBandEditor
            kind={kind}
            asset={asset}
            initial={bands}
            onDone={() => setOpen(false)}
          />

          {!usesGlobal ? (
            <div className="border-border/40 mt-4 border-t pt-3">
              <Button variant="outline" size="sm" onClick={useDefault} disabled={pending}>
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />}
                Use the default again
              </Button>
              <p className="text-muted-foreground t-caption mt-2">
                Keeps the ladders it has had — they are how a past trade is explained — and follows
                the default from now on.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
