'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Midnight local, so a day is the whole day rather than the instant of loading. */
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

/**
 * Six weeks, always.
 *
 * A month spans four to six week-rows depending on where it starts, and a grid
 * that changes height as you page through the year makes the whole popover
 * jump. Padding to a fixed six keeps the calendar still.
 */
function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const PRESETS: { label: string; range: () => { from: Date; to: Date } }[] = [
  { label: 'Today', range: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  {
    label: 'Last 7 days',
    range: () => {
      const to = endOfDay(new Date());
      const from = startOfDay(new Date());
      from.setDate(from.getDate() - 6);
      return { from, to };
    },
  },
  {
    label: 'Last 30 days',
    range: () => {
      const to = endOfDay(new Date());
      const from = startOfDay(new Date());
      from.setDate(from.getDate() - 29);
      return { from, to };
    },
  },
  {
    label: 'This month',
    range: () => {
      const now = new Date();
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    },
  },
  {
    label: 'This year',
    range: () => {
      const now = new Date();
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };
    },
  },
];

/**
 * Narrows a screen to a period.
 *
 * Two ways to use it. By default the range lives in the URL, so a filtered view
 * is a link somebody can send, a tab they can reopen, and a back button that
 * does what it looks like it does. Pass `onChange` instead and it reports the
 * range to the parent without touching the URL — for a table that filters rows
 * it already holds, where a round trip would be a page reload to hide four
 * rows.
 */
export function DateRangeFilter({
  from,
  to,
  basePath = '/',
  placeholder = 'Filter by date range',
  onChange,
}: {
  from?: string;
  to?: string;
  /** Where the URL form pushes to. Ignored when `onChange` is given. */
  basePath?: string;
  placeholder?: string;
  onChange?: (from: string | null, to: string | null) => void;
}) {
  const initialFrom = from ? new Date(from) : null;
  const initialTo = to ? new Date(to) : null;

  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<Date | null>(initialFrom);
  const [end, setEnd] = useState<Date | null>(initialTo);
  const [hovered, setHovered] = useState<Date | null>(null);
  const [month, setMonth] = useState<Date>(() =>
    initialFrom ? new Date(initialFrom.getFullYear(), initialFrom.getMonth(), 1) : addMonths(new Date(), -1),
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const label = useMemo(() => {
    if (!initialFrom && !initialTo) return null;
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    if (initialFrom && initialTo) {
      return sameDay(initialFrom, initialTo)
        ? fmt(initialFrom)
        : `${fmt(initialFrom)} – ${fmt(initialTo)}`;
    }
    return initialFrom ? `Since ${fmt(initialFrom)}` : `Up to ${fmt(initialTo!)}`;
  }, [initialFrom, initialTo]);

  const apply = (nextFrom: Date | null, nextTo: Date | null) =>
    startTransition(() => {
      if (onChange) {
        onChange(nextFrom?.toISOString() ?? null, nextTo?.toISOString() ?? null);
        setOpen(false);
        return;
      }
      const params = new URLSearchParams();
      if (nextFrom) params.set('from', nextFrom.toISOString());
      if (nextTo) params.set('to', nextTo.toISOString());
      const query = params.toString();
      router.push(query ? `${basePath}?${query}` : basePath);
      setOpen(false);
    });

  /* First click sets the start; the second closes the range. Clicking before
     the start begins again there, which is what someone means when they click
     backwards rather than an error to complain about. */
  const pick = (day: Date) => {
    if (!start || (start && end)) {
      setStart(startOfDay(day));
      setEnd(null);
      return;
    }
    if (day < start) {
      setStart(startOfDay(day));
      return;
    }
    const finished = endOfDay(day);
    setEnd(finished);
    apply(start, finished);
  };

  const clear = () => {
    setStart(null);
    setEnd(null);
    apply(null, null);
  };

  const previewEnd = end ?? (start && hovered && hovered > start ? hovered : null);
  const inRange = (day: Date) =>
    start && previewEnd && day > startOfDay(start) && day < startOfDay(previewEnd);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'border-input bg-card flex h-10 min-w-[15rem] items-center gap-2.5 rounded-lg border px-3 text-left transition-colors',
              'hover:border-primary/40 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            )}
          >
            {pending ? (
              <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />
            ) : (
              <CalendarDays className="text-muted-foreground size-4 shrink-0" />
            )}
            <span className={cn('t-small truncate', !label && 'text-muted-foreground')}>
              {label ?? placeholder}
            </span>
          </button>
        </PopoverTrigger>

        {label ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={pending}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </div>

      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex flex-col sm:flex-row">
          <div className="border-border/60 flex shrink-0 flex-row gap-1 border-b p-2 sm:flex-col sm:border-r sm:border-b-0">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  const r = preset.range();
                  setStart(r.from);
                  setEnd(r.to);
                  setMonth(new Date(r.from.getFullYear(), r.from.getMonth(), 1));
                  apply(r.from, r.to);
                }}
                className="hover:bg-secondary t-caption rounded-md px-2.5 py-1.5 text-left whitespace-nowrap transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="p-3">
            <div className="mb-2 flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setMonth(addMonths(month, -1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex flex-1 justify-around gap-6">
                {[0, 1].map((offset) => {
                  const m = addMonths(month, offset);
                  return (
                    <span key={offset} className="t-small font-medium">
                      {MONTHS[m.getMonth()]} {m.getFullYear()}
                    </span>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setMonth(addMonths(month, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="flex gap-6" onMouseLeave={() => setHovered(null)}>
              {[0, 1].map((offset) => {
                const m = addMonths(month, offset);
                return (
                  <div key={offset}>
                    <div className="mb-1 grid grid-cols-7">
                      {WEEKDAYS.map((d) => (
                        <span
                          key={d}
                          className="text-muted-foreground t-caption flex size-8 items-center justify-center"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {monthGrid(m).map((day, i) => {
                        const outside = day.getMonth() !== m.getMonth();
                        const isStart = start && sameDay(day, start);
                        const isEnd = previewEnd && sameDay(day, previewEnd);
                        const between = inRange(day);
                        const isToday = sameDay(day, new Date());

                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => pick(day)}
                            onMouseEnter={() => setHovered(day)}
                            className={cn(
                              't-caption relative flex size-8 items-center justify-center transition-colors',
                              outside
                                ? 'text-muted-foreground/40'
                                : 'text-foreground hover:bg-secondary',
                              between && 'bg-primary/12 rounded-none',
                              (isStart || isEnd) &&
                                'bg-primary text-primary-foreground hover:bg-primary font-medium',
                              isStart && previewEnd && !isEnd && 'rounded-r-none',
                              isEnd && start && !isStart && 'rounded-l-none',
                              !between && !isStart && !isEnd && 'rounded-md',
                              (isStart || isEnd) && 'rounded-md',
                              isToday && !isStart && !isEnd && 'ring-border ring-1',
                            )}
                          >
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-muted-foreground t-caption border-border/60 mt-3 border-t pt-2.5">
              {start && !end
                ? 'Now pick the end of the range.'
                : onChange
                  ? 'Filters to what was created in the period.'
                  : 'Filters what happened in the period. Balances and inventory are current either way.'}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
