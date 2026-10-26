/** The KYC review list's settings, as the page address carries them (26 Oct 2026). */
export interface KycQueueState {
  order: 'oldest' | 'newest';
  page: number;
  pageSize: number;
  total: number;
  search: string;
  includeAutomatedTests: boolean;
}

/** The address for the list with some settings changed; the page goes back to 1 unless one is given. */
export function kycQueueHref(s: KycQueueState, change: Partial<Omit<KycQueueState, 'total'>>): string {
  const next = { ...s, page: 1, ...change };
  const q = new URLSearchParams();
  if (next.order === 'newest') q.set('order', 'newest');
  if (next.page > 1) q.set('page', String(next.page));
  if (next.search) q.set('search', next.search);
  if (next.includeAutomatedTests) q.set('includeAutomatedTests', 'true');
  const qs = q.toString();
  return qs ? `/kyc?${qs}` : '/kyc';
}
