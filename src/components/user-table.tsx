'use client';

import { Fragment, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Search, ShieldOff, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { loadUser, reinstateUser, suspendUser } from '@/app/actions/users';
import type { UserDetail, UserListRow } from '@/lib/types-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { cn, relativeTime } from '@/lib/utils';
import { levelLabel } from '@/lib/levels';
import { SavedDestinationsList } from '@/components/saved-destinations-list';
import { DepositAddressesList } from '@/components/deposit-addresses-list';
import { UserLimitsBox } from '@/components/user-limits-box';
import { formatDateOfBirth } from '@/lib/date-of-birth';
import { dataStatusLine, shownEmail } from '@/lib/account-closure';
import { CloseAccountSection, DeleteDataSection } from '@/components/close-account';
import { PayUsernameRow } from '@/components/pay-username-row';

export function UserTable({
  rows,
  total,
  search,
  isOwner = false,
}: {
  rows: UserListRow[];
  total: number;
  search: string;
  /** Owners see "Close account" on an opened customer (28 Oct 2026). */
  isOwner?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(search);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, UserDetail>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  /* Balances are fetched on expand, not with the list — otherwise opening this
     page costs one query per user for data nobody has asked to see. */
  const toggle = async (id: string) => {
    if (openId === id) return setOpenId(null);
    setOpenId(id);
    if (detail[id]) return;

    setLoadingId(id);
    const result = await loadUser(id);
    setLoadingId(null);
    if (result.error) {
      toast.error('Could not load that user', { description: result.error });
      return;
    }
    if (result.user) setDetail((d) => ({ ...d, [id]: result.user! }));
  };

  /** Fresh detail after a change made from inside the panel. */
  const reload = async (id: string) => {
    const result = await loadUser(id);
    if (result.user) setDetail((d) => ({ ...d, [id]: result.user! }));
  };

  const runSearch = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set('q', value);
    else next.delete('q');
    router.push(`/users?${next}`);
  };

  const decide = (row: UserListRow) =>
    start(async () => {
      if (row.status === 'SUSPENDED') {
        const result = await reinstateUser(row.id);
        if (result.error) {
          toast.error('Could not reinstate', { description: result.error });
          return;
        }
        toast.success(`${row.firstName} reinstated`);
      } else {
        const reason = globalThis.prompt(
          'Why is this account being suspended?\n\nThe user is shown this exact text when they try to sign in.',
        );
        if (!reason?.trim()) return;
        const result = await suspendUser(row.id, reason.trim());
        if (result.error) {
          toast.error('Could not suspend', { description: result.error });
          return;
        }
        toast.success(`${row.firstName} suspended`, {
          description: 'Their sessions were revoked immediately.',
        });
      }
      setDetail({});
      router.refresh();
    });

  return (
    <Card className="overflow-hidden">
      <div className="border-border/70 flex items-center gap-3 border-b p-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
            placeholder="Search name, email or phone"
            className="h-8 pl-8"
          />
        </div>
        <span className="text-muted-foreground t-caption ml-auto">
          {rows.length} of {total}
        </span>
      </div>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 pl-4" />
              <TableHead className="w-12 text-right">S/N</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={8}>
                {search ? `No users match "${search}".` : 'No users have registered yet.'}
              </TableEmpty>
            ) : (
              rows.map((row) => {
                const open = openId === row.id;
                const info = detail[row.id];
                return (
                  /*
                   * The key belongs on what the map returns, not on the row
                   * inside it. With it one level down, React had nothing to
                   * match rows by across a search or a filter — so the expanded
                   * row and its loaded balances could reattach to a different
                   * user than the one they were fetched for.
                   */
                  <Fragment key={row.id}>
                    <TableRow
                      onClick={() => toggle(row.id)}
                      className={cn('cursor-pointer', open && 'bg-secondary/50')}
                    >
                      <TableCell className="pl-4">
                        <ChevronRight
                          className={cn(
                            'text-muted-foreground size-3.5 transition-transform',
                            open && 'rotate-90',
                          )}
                        />
                      </TableCell>
                      {/* 1 is the newest sign-up, counted by the API so it
                          keeps counting across pages. */}
                      <TableCell className="text-muted-foreground w-12 text-right font-mono text-xs">
                        {row.serial}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.firstName} {row.lastName}
                        {row.isTest ? (
                          <Badge variant="outline" className="ml-2">
                            test
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground t-small max-w-[240px] truncate">
                        {shownEmail(row)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={row.kycStatus === 'APPROVED' ? 'success' : 'outline'}
                        >
                          {levelLabel(row.kycTier)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.status === 'ACTIVE' ? (
                          <Badge variant="success">active</Badge>
                        ) : row.status === 'SUSPENDED' ? (
                          <Badge variant="destructive">suspended</Badge>
                        ) : (
                          <Badge variant="secondary">closed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground t-caption">
                        {relativeTime(row.createdAt)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {row.status === 'CLOSED' ? null : (
                        <Button
                          variant={row.status === 'SUSPENDED' ? 'outline' : 'ghost'}
                          size="sm"
                          loading={pending}
                          onClick={(e) => {
                            e.stopPropagation();
                            decide(row);
                          }}
                        >
                          {row.status === 'SUSPENDED' ? (
                            <>
                              <ShieldCheck className="size-3.5" />
                              Reinstate
                            </>
                          ) : (
                            <>
                              <ShieldOff className="size-3.5" />
                              Suspend
                            </>
                          )}
                        </Button>
                        )}
                      </TableCell>
                    </TableRow>

                    {open ? (
                      <TableRow key={row.id + '-detail'} className="hover:bg-transparent">
                        <TableCell colSpan={8} className="bg-secondary/30 p-0">
                          {loadingId === row.id ? (
                            <div className="text-muted-foreground flex items-center gap-2 p-5 t-small">
                              <Loader2 className="size-3.5 animate-spin" />
                              Loading balances
                            </div>
                          ) : info ? (
                            <div className="grid gap-6 p-5 lg:grid-cols-3 [&>div]:min-w-0">
                              <div>
                                <p className="eyebrow mb-2">Details</p>
                                <dl className="t-small flex flex-col gap-1.5">
                                  <Row label="Full name" value={`${info.firstName} ${info.lastName}`} />
                                  <Row label="Email" value={shownEmail(info)} />
                                  <Row label="Phone" value={info.closedPhone ?? info.phone ?? '—'} />
                                  <Row label="Date of birth" value={formatDateOfBirth(info.kyc?.dateOfBirth)} />
                                  <PayUsernameRow userId={row.id} username={info.payUsername} onChanged={() => reload(row.id)} />
                                  <Row
                                    label="Last seen"
                                    value={info.lastLoginAt ? relativeTime(info.lastLoginAt) : 'never'}
                                  />
                                  <Row label="Transactions" value={String(info.transactionCount)} />
                                </dl>
                              </div>

                              <div>
                                <p className="eyebrow mb-2">Verification</p>
                                <dl className="t-small flex flex-col gap-1.5">
                                  <Row label="Level" value={levelLabel(info.kyc?.tier)} />
                                  <Row label="Status" value={info.kyc?.status ?? 'NOT_STARTED'} />
                                  {info.kyc?.bvnLast4 ? (
                                    <Row label="BVN" value={`••••${info.kyc.bvnLast4}`} />
                                  ) : null}
                                  {info.kyc?.ninLast4 ? (
                                    <Row label="NIN" value={`••••${info.kyc.ninLast4}`} />
                                  ) : null}
                                  <Row
                                    label="Wallet"
                                    value={info.quidax ? 'provisioned' : 'not yet'}
                                  />
                                </dl>
                                {info.status === 'CLOSED' ? (
                                  <p className="t-caption bg-secondary border-border mt-3 rounded-md border p-2">
                                    <span className="font-medium">Closed</span>
                                    {info.closedAt ? ` ${relativeTime(info.closedAt)}` : ''}
                                    {info.closedReason ? `: ${info.closedReason}` : ''}. {dataStatusLine(info)}
                                    {info.dataDeletedAt ? '' : ' Its email and phone were freed for a new sign-up; the ones shown here are the originals.'}
                                  </p>
                                ) : null}
                                {info.suspendedReason ? (
                                  <p className="text-destructive t-caption border-destructive/25 bg-destructive/5 mt-3 rounded-md border p-2">
                                    Suspended: {info.suspendedReason}
                                  </p>
                                ) : null}
                              </div>

                              <div>
                                <p className="eyebrow mb-2">Balances</p>
                                {info.balances.length === 0 ? (
                                  <p className="text-muted-foreground t-small">
                                    Nothing held yet.
                                  </p>
                                ) : (
                                  <dl className="t-small flex flex-col gap-1.5">
                                    {info.balances.map((b) => (
                                      <div
                                        key={b.asset}
                                        className="flex items-baseline justify-between gap-4"
                                      >
                                        <dt className="text-muted-foreground">
                                          {b.asset.toUpperCase()}
                                        </dt>
                                        <dd className="font-mono">
                                          {b.total}
                                          {Number(b.locked) > 0 ? (
                                            <span className="text-warning ml-1.5 t-caption">
                                              ({b.locked} locked)
                                            </span>
                                          ) : null}
                                        </dd>
                                      </div>
                                    ))}
                                  </dl>
                                )}
                              </div>
                            </div>
                          ) : null}
                          {info ? (
                            <SavedDestinationsList
                              userId={row.id}
                              saved={info.savedDestinations}
                              onChanged={() => reload(row.id)}
                            />
                          ) : null}
                          {info ? <UserLimitsBox userId={row.id} /> : null}
                          {info ? (
                            <DepositAddressesList addresses={info.depositAddresses} onChanged={() => reload(row.id)} />
                          ) : null}
                          {info && isOwner && info.status === 'CLOSED' && !info.dataDeletedAt ? (
                            <DeleteDataSection
                              userId={row.id}
                              name={`${info.firstName} ${info.lastName}`}
                              onDeleted={() => reload(row.id)}
                            />
                          ) : null}
                          {info && isOwner && info.status !== 'CLOSED' ? (
                            <CloseAccountSection
                              userId={row.id}
                              name={`${info.firstName} ${info.lastName}`}
                              onClosed={() => reload(row.id)}
                            />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    // min-w-0 lets a long value (an email) shrink and end in "…" instead of
    // spilling into the next column; the full value is on hover.
    <div className="flex min-w-0 items-baseline justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="min-w-0 truncate text-right" title={value}>
        {value}
      </dd>
    </div>
  );
}
