/** People → Crypto addresses (spec 2026-10-26): shapes the API sends and small helpers. */

export type AddressStatus = 'PENDING' | 'ACTIVE' | 'FAILED' | 'DISABLED';

export interface AdminAddress {
  id: string;
  customer: { id: string; email: string; name: string };
  asset: string;
  network: string;
  networkLabel: string;
  status: AddressStatus;
  /** FAILED, or still waiting after 10 minutes. */
  stuck: boolean;
  address: string | null;
  destinationTag: string | null;
  /** Made in advance, not asked for by the customer. */
  autoCreated: boolean;
  requestedAt: string;
  activatedAt: string | null;
  failedAt: string | null;
}

export interface AdminAddressPage {
  items: AdminAddress[];
  total: number;
  stuckCount: number;
  page: number;
  pageSize: number;
}

export interface AutoCreateNetwork {
  asset: string;
  network: string;
  label: string;
  autoCreate: boolean;
}

/** The list's filters, as the page address carries them. */
export interface AddressListState {
  page: number;
  status: '' | AddressStatus;
  asset: string;
  search: string;
  stuck: boolean;
}

/** The address for the list with some filters changed; back to page 1 unless one is given. */
export function addressesHref(s: AddressListState, change: Partial<AddressListState>): string {
  const next = { ...s, page: 1, ...change };
  const q = new URLSearchParams();
  if (next.page > 1) q.set('page', String(next.page));
  if (next.status) q.set('status', next.status);
  if (next.asset) q.set('asset', next.asset);
  if (next.search) q.set('search', next.search);
  if (next.stuck) q.set('stuck', 'true');
  const qs = q.toString();
  return qs ? `/crypto-addresses?${qs}` : '/crypto-addresses';
}

export function statusLabel(a: Pick<AdminAddress, 'status' | 'stuck'>): string {
  switch (a.status) {
    case 'ACTIVE':
      return 'Ready';
    case 'PENDING':
      return a.stuck ? 'Stuck: still waiting' : 'Being created';
    case 'FAILED':
      return 'Failed';
    default:
      return 'Network switched off';
  }
}

/** Waiting: ask Quidax again (never a new address). Failed: try again. Otherwise nothing to do. */
export function addressAction(status: AddressStatus): 'Check again' | 'Try again' | null {
  if (status === 'PENDING') return 'Check again';
  if (status === 'FAILED') return 'Try again';
  return null;
}
