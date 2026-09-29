'use client';

import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import type { Band, FeeKind } from '@/lib/types-admin';
import { FeeBandEditor } from '@/components/fee-band-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { trimNumber } from '@/lib/utils';

/**
 * A ladder, read-only until you ask to change it.
 *
 * Fees are the single most consequential setting in the product — every trade
 * prices off them — so editing is a deliberate act rather than a form that is
 * always live and one stray keystroke from repricing the platform.
 */
export function LadderPanel({
  kind,
  title,
  subtitle,
  bands,
  meta,
  asset,
  canEdit = true,
}: {
  kind: FeeKind;
  title: string;
  subtitle?: string;
  bands: Band[];
  meta?: string;
  asset?: string;
  canEdit?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  // What the RUNGS are measured in — naira only for the cash-out ladder, whose
  // whole point is that nothing about it is denominated in dollars.
  const money = kind === 'NGN_WITHDRAWAL' ? '₦' : '$';

  // RATE is naira per dollar; NGN_WITHDRAWAL is a flat naira amount. Both are
  // naira, so both wear the naira sign — only RATE carries the "/ $".
  const render = (value: string) =>
    kind === 'RATE' || kind === 'NGN_WITHDRAWAL' ? (
      <>
        ₦{trimNumber(value)}
        {kind === 'RATE' ? (
          <span className="text-muted-foreground ml-1 t-caption font-normal">/ $</span>
        ) : null}
      </>
    ) : (
      <>${trimNumber(value)}</>
    );

  return (
    <Card>
      <div className="border-border/70 flex items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <h2 className="t-section">{title}</h2>
          {subtitle ? <p className="text-muted-foreground t-caption mt-0.5">{subtitle}</p> : null}
        </div>
        {canEdit ? (
          <Button
            variant={editing ? 'ghost' : 'outline'}
            size="sm"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? (
              <>
                <X className="size-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Pencil className="size-3.5" />
                Edit
              </>
            )}
          </Button>
        ) : null}
      </div>

      <CardContent className="p-4">
        {editing ? (
          <FeeBandEditor kind={kind} asset={asset} initial={bands} onDone={() => setEditing(false)} />
        ) : bands.length === 0 ? (
          <p className="text-muted-foreground t-small">
            No ladder configured. Every trade falls back to the flat value on the coin&rsquo;s rate
            config.
          </p>
        ) : (
          <div className="flex flex-col">
            {bands.map((b, i) => (
              <div
                key={i}
                className="border-border/40 flex items-baseline justify-between gap-4 border-b py-2.5 last:border-0"
              >
                <span className="t-small font-mono">
                  {money}
                  {Number(b.minAmount).toLocaleString()}
                  <span className="text-muted-foreground mx-1">–</span>
                  {b.maxAmount ? (
                    `${money}${Number(b.maxAmount).toLocaleString()}`
                  ) : (
                    <span className="text-muted-foreground">no limit</span>
                  )}
                </span>
                <span className="t-body text-primary font-mono font-medium">
                  {render(b.value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {meta && !editing ? (
          <p className="text-muted-foreground t-caption mt-3">{meta}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
