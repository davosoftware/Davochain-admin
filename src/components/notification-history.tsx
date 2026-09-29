'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Search, UserCheck, Users, X } from 'lucide-react';
import type { BroadcastRow } from '@/lib/types-admin';
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
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DateRangeFilter } from '@/components/date-range-filter';
import { cn, relativeTime } from '@/lib/utils';

type SortKey = 'title' | 'createdAt';
type Direction = 'asc' | 'desc';

const RECIPIENT_FILTERS = [
  { value: 'ALL_ROWS', label: 'All recipients' },
  { value: 'ALL', label: 'All Users' },
  { value: 'SELECTED', label: 'Specific Users' },
];

function sentDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Everything that has been sent.
 *
 * The whole history arrives with the page — a broadcast is a rare, deliberate
 * act, so the table is at most a couple of hundred rows — which is why the
 * search, the recipients filter and the date range all narrow in the browser.
 * A round trip to hide four rows would be slower and no more correct.
 */
export function NotificationHistory({ rows }: { rows: BroadcastRow[] }) {
  const [query, setQuery] = useState('');
  const [recipients, setRecipients] = useState('ALL_ROWS');
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; direction: Direction }>({
    key: 'createdAt',
    direction: 'desc',
  });
  const [open, setOpen] = useState<BroadcastRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const after = from ? new Date(from).getTime() : null;
    const before = to ? new Date(to).getTime() : null;

    const kept = rows.filter((b) => {
      if (q && !b.title.toLowerCase().includes(q)) return false;
      if (recipients !== 'ALL_ROWS' && b.audience !== recipients) return false;
      const at = new Date(b.createdAt).getTime();
      if (after !== null && at < after) return false;
      if (before !== null && at > before) return false;
      return true;
    });

    const sign = sort.direction === 'asc' ? 1 : -1;
    return [...kept].sort((a, b) =>
      sort.key === 'title'
        ? sign * a.title.localeCompare(b.title)
        : sign * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    );
  }, [rows, query, recipients, from, to, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, direction: s.direction === 'asc' ? 'desc' : 'asc' }
        : // A new column starts on the reading most people want first: newest
          // dates, and titles from A.
          { key, direction: key === 'createdAt' ? 'desc' : 'asc' },
    );

  const narrowed = query.trim() !== '' || recipients !== 'ALL_ROWS' || from !== null || to !== null;

  const clear = () => {
    setQuery('');
    setRecipients('ALL_ROWS');
    setFrom(null);
    setTo(null);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title"
            className="h-10 pl-9"
            aria-label="Search notifications by title"
          />
        </div>

        <select
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          aria-label="Filter by recipients"
          className={cn(
            'border-input bg-card t-small h-10 rounded-lg border px-3 transition-colors',
            'hover:border-primary/40 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          )}
        >
          {RECIPIENT_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <DateRangeFilter
          from={from ?? undefined}
          to={to ?? undefined}
          placeholder="Filter by creation date"
          onChange={(nextFrom, nextTo) => {
            setFrom(nextFrom);
            setTo(nextTo);
          }}
        />

        {narrowed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            Clear filters
          </Button>
        ) : null}
      </div>

      <Card>
        <div className="border-border/70 flex flex-wrap items-baseline justify-between gap-2 border-b p-4">
          <h2 className="t-section">Notification History</h2>
          <span className="text-muted-foreground t-caption">
            {narrowed
              ? `${filtered.length} of ${rows.length} shown`
              : `${rows.length} ${rows.length === 1 ? 'notification' : 'notifications'}`}
          </span>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-14">S/No.</TableHead>
                <TableHead>
                  <SortButton
                    label="Title"
                    active={sort.key === 'title'}
                    direction={sort.direction}
                    onClick={() => toggleSort('title')}
                  />
                </TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Sent By</TableHead>
                <TableHead>
                  <SortButton
                    label="Sent Date"
                    active={sort.key === 'createdAt'}
                    direction={sort.direction}
                    onClick={() => toggleSort('createdAt')}
                  />
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length === 0 ? (
                <TableEmpty colSpan={7}>
                  {rows.length === 0
                    ? 'Nothing has been sent yet.'
                    : 'No notification matches those filters.'}
                </TableEmpty>
              ) : (
                filtered.map((b, index) => {
                  const openRate =
                    b.recipientCount > 0 ? Math.round((b.readCount / b.recipientCount) * 100) : 0;
                  return (
                    <TableRow key={b.id}>
                      {/* Numbered by position in the list as it is sorted, so
                          the newest is 1 under the default ordering. */}
                      <TableCell className="text-muted-foreground tabular-nums">
                        {index + 1}
                      </TableCell>

                      <TableCell className="max-w-xs">
                        <p className="t-small truncate font-medium">{b.title}</p>
                        <p className="text-muted-foreground t-caption truncate">{b.body}</p>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <span className="t-small tabular-nums">
                          {b.recipientCount.toLocaleString()}
                        </span>
                        {/* Opens, not deliveries — the only measure that means
                            anything once a message has left. */}
                        <span className="text-muted-foreground t-caption ml-1.5">
                          · {b.readCount.toLocaleString()} opened ({openRate}%)
                        </span>
                      </TableCell>

                      <TableCell className="t-small whitespace-nowrap">{b.sentByName}</TableCell>

                      <TableCell className="whitespace-nowrap">
                        <span className="t-small">{sentDate(b.createdAt)}</span>
                        <span className="text-muted-foreground t-caption ml-1.5">
                          {relativeTime(b.createdAt)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge variant={b.audience === 'ALL' ? 'default' : 'outline'} className="gap-1">
                          {b.audience === 'ALL' ? (
                            <Users className="size-3" />
                          ) : (
                            <UserCheck className="size-3" />
                          )}
                          {b.audience === 'ALL' ? 'All Users' : 'Specific Users'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setOpen(b)}
                          aria-label={`View ${b.title}`}
                        >
                          <Eye className="size-3.5" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Read-only. A notification that has already reached a device cannot be
          edited or recalled, so offering either would be a lie. */}
      <Dialog
        open={open !== null}
        onOpenChange={(next) => {
          if (!next) setOpen(null);
        }}
      >
        <DialogContent>
          {open ? (
            <>
              <DialogHeader>
                <DialogTitle>{open.title}</DialogTitle>
                <DialogDescription>
                  Sent by {open.sentByName} · {sentDate(open.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <DialogBody className="flex flex-col gap-4">
                <p className="t-small whitespace-pre-wrap">{open.body}</p>

                <dl className="border-border/70 grid grid-cols-2 gap-3 rounded-lg border p-3">
                  <Detail label="Type" value={open.audience === 'ALL' ? 'All Users' : 'Specific Users'} />
                  <Detail label="Recipients" value={open.recipientCount.toLocaleString()} />
                  <Detail label="Opened" value={open.readCount.toLocaleString()} />
                  <Detail
                    label="Open rate"
                    value={
                      open.recipientCount > 0
                        ? `${Math.round((open.readCount / open.recipientCount) * 100)}%`
                        : '—'
                    }
                  />
                </dl>
              </DialogBody>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground t-caption">{label}</dt>
      <dd className="t-small font-medium">{value}</dd>
    </div>
  );
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: Direction;
  onClick: () => void;
}) {
  const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'hover:text-foreground -mx-1 flex items-center gap-1 rounded px-1 py-0.5 transition-colors',
        'focus-visible:ring-ring/40 outline-none focus-visible:ring-2',
        active && 'text-foreground',
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <Icon className={cn('size-3', !active && 'opacity-50')} />
    </button>
  );
}
