import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { AdminMe } from '@/lib/types-admin';
import {
  addressesHref,
  statusLabel,
  type AddressListState,
  type AddressStatus,
  type AdminAddressPage,
  type AutoCreateNetwork,
} from '@/lib/crypto-addresses';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { AutoCreateCard } from '@/components/auto-create-card';
import { AddressRetryButton } from '@/components/address-retry-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { relativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUSES: AddressStatus[] = ['PENDING', 'ACTIVE', 'FAILED'];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/**
 * People → Crypto addresses (spec 2026-10-26): every customer's deposit
 * addresses, the stuck ones easy to find, and which coin networks are made in
 * advance for verified customers.
 */
export default async function CryptoAddressesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = one(params.status) as AddressListState['status'];
  const state: AddressListState = {
    page: Math.max(1, Number(one(params.page)) || 1),
    status: STATUSES.includes(status as AddressStatus) ? status : '',
    asset: one(params.asset).toLowerCase().replace(/[^a-z0-9]/g, ''),
    search: one(params.search).trim(),
    stuck: one(params.stuck) === 'true',
  };
  const query = addressesHref(state, { page: state.page }).split('?')[1] ?? '';

  const [list, networks, me] = await Promise.all([
    api<AdminAddressPage>(`/v1/admin/deposit-addresses?${query}`).catch((e: ApiError) => e),
    api<AutoCreateNetwork[]>('/v1/admin/asset-networks').catch(() => [] as AutoCreateNetwork[]),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  if (list instanceof ApiError) {
    return (
      <>
        <PageHeader title="Crypto addresses" />
        <ErrorState title="Could not load the addresses" detail={list.message} />
      </>
    );
  }

  const held = new Set(me?.permissions ?? []);
  const canRetry = held.has('users.manage');
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const assets = [...new Set(networks.map((n) => n.asset))];

  return (
    <>
      <PageHeader
        title="Crypto addresses"
        description="The addresses customers receive crypto at. An address Quidax never delivered is marked failed and shows here as stuck; Try again asks Quidax once more."
      />

      <div className="flex flex-col gap-6">
        <AutoCreateCard networks={networks} canEdit={held.has('inventory.manage')} />

        <Card>
          <CardContent className="flex flex-col gap-4 pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant={state.stuck ? 'default' : 'outline'} asChild>
                <Link href={addressesHref(state, { stuck: !state.stuck })}>
                  Stuck
                  <Badge variant={list.stuckCount > 0 ? 'warning' : 'outline'}>{list.stuckCount}</Badge>
                </Link>
              </Button>
              <span className="text-muted-foreground t-caption ml-2">Status:</span>
              <Button size="sm" variant={state.status === '' ? 'secondary' : 'ghost'} asChild>
                <Link href={addressesHref(state, { status: '' })}>All</Link>
              </Button>
              {STATUSES.map((s) => (
                <Button key={s} size="sm" variant={state.status === s ? 'secondary' : 'ghost'} asChild>
                  <Link href={addressesHref(state, { status: s })}>{statusLabel({ status: s, stuck: false })}</Link>
                </Button>
              ))}
              <span className="text-muted-foreground t-caption ml-2">Coin:</span>
              <Button size="sm" variant={state.asset === '' ? 'secondary' : 'ghost'} asChild>
                <Link href={addressesHref(state, { asset: '' })}>All</Link>
              </Button>
              {assets.map((a) => (
                <Button key={a} size="sm" variant={state.asset === a ? 'secondary' : 'ghost'} asChild>
                  <Link href={addressesHref(state, { asset: a })}>{a.toUpperCase()}</Link>
                </Button>
              ))}
            </div>

            <form action="/crypto-addresses" className="flex gap-2">
              {state.status ? <input type="hidden" name="status" value={state.status} /> : null}
              {state.asset ? <input type="hidden" name="asset" value={state.asset} /> : null}
              {state.stuck ? <input type="hidden" name="stuck" value="true" /> : null}
              <Input name="search" defaultValue={state.search} placeholder="Customer email or name" className="max-w-sm" />
              <Button type="submit" size="sm" variant="outline">
                Search
              </Button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Coin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Asked for</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.items.length === 0 ? (
                  <TableEmpty colSpan={6}>No addresses match.</TableEmpty>
                ) : (
                  list.items.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <span className="block font-medium">{a.customer.name || '—'}</span>
                        <span className="text-muted-foreground t-caption">{a.customer.email}</span>
                      </TableCell>
                      <TableCell>
                        {a.asset.toUpperCase()}
                        <span className="text-muted-foreground t-caption block">{a.networkLabel}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.status === 'ACTIVE' ? 'success' : a.stuck ? 'destructive' : 'outline'}>
                          {statusLabel(a)}
                        </Badge>
                        {a.autoCreated ? <span className="text-muted-foreground t-caption block">Made in advance</span> : null}
                      </TableCell>
                      <TableCell className="max-w-[16rem]">
                        {a.address ? (
                          <code className="font-mono text-xs break-all">
                            {a.address}
                            {a.destinationTag ? ` · tag ${a.destinationTag}` : ''}
                          </code>
                        ) : (
                          <span className="text-muted-foreground t-caption">Not yet</span>
                        )}
                      </TableCell>
                      <TableCell className="t-caption">{relativeTime(a.requestedAt)}</TableCell>
                      <TableCell className="text-right">
                        {canRetry ? <AddressRetryButton id={a.id} status={a.status} /> : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground t-caption">
                {list.total} address{list.total === 1 ? '' : 'es'} · page {list.page} of {pages}
              </span>
              <div className="flex gap-2">
                {list.page > 1 ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={addressesHref(state, { page: list.page - 1 })}>Previous</Link>
                  </Button>
                ) : null}
                {list.page < pages ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={addressesHref(state, { page: list.page + 1 })}>Next</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
