import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { kycQueueHref, type KycQueueState } from '@/lib/kyc-queue';

export type { KycQueueState };

/**
 * Order, search, paging and the automated-test switch for the KYC review list
 * (26 Oct 2026). Plain links and a GET form: the server renders each page.
 */
export function KycQueueToolbar({ state }: { state: KycQueueState }) {
  const first = state.total === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
  const last = Math.min(state.page * state.pageSize, state.total);
  const pages = Math.max(1, Math.ceil(state.total / state.pageSize));

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="group" aria-label="Order">
          <Button asChild size="sm" variant={state.order === 'oldest' ? 'default' : 'outline'}>
            <Link href={kycQueueHref(state, { order: 'oldest' })} aria-current={state.order === 'oldest' ? 'true' : undefined}>
              Oldest first
            </Link>
          </Button>
          <Button asChild size="sm" variant={state.order === 'newest' ? 'default' : 'outline'}>
            <Link href={kycQueueHref(state, { order: 'newest' })} aria-current={state.order === 'newest' ? 'true' : undefined}>
              Newest first
            </Link>
          </Button>
        </div>

        <form method="get" action="/kyc" className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-sm">
          {state.order === 'newest' ? <input type="hidden" name="order" value="newest" /> : null}
          {state.includeAutomatedTests ? <input type="hidden" name="includeAutomatedTests" value="true" /> : null}
          <label htmlFor="kyc-search" className="sr-only">
            Search by email or name
          </label>
          <Input id="kyc-search" name="search" defaultValue={state.search} placeholder="Search email or name" className="h-8" />
          <Button type="submit" size="sm" variant="outline">
            <Search className="size-3.5" />
            Search
          </Button>
        </form>

        <Button asChild size="sm" variant="ghost">
          <Link href={kycQueueHref(state, { includeAutomatedTests: !state.includeAutomatedTests })}>
            {state.includeAutomatedTests ? 'Hide automated-test accounts' : 'Show automated-test accounts'}
          </Link>
        </Button>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          {state.total === 0 ? 'Nobody waiting' : `Showing ${first}–${last} of ${state.total} waiting`}
          {state.search ? ` · matching “${state.search}”` : ''}
          {state.order === 'newest' ? ' · newest first' : ' · oldest first'}
        </span>
        {pages > 1 ? (
          <div className="flex items-center gap-1">
            {state.page > 1 ? (
              <Button asChild size="sm" variant="outline">
                <Link href={kycQueueHref(state, { page: state.page - 1 })}>
                  <ChevronLeft className="size-3.5" />
                  Previous
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>
            )}
            <span className="px-2">
              Page {state.page} of {pages}
            </span>
            {state.page < pages ? (
              <Button asChild size="sm" variant="outline">
                <Link href={kycQueueHref(state, { page: state.page + 1 })}>
                  Next
                  <ChevronRight className="size-3.5" />
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
