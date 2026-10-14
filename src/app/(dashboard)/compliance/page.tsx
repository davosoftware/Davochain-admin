import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { ComplianceCaseRow } from '@/lib/types-admin';
import { CATEGORY_LABEL } from '@/lib/compliance';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn, relativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** AML review cases (spec §9). Sanctions first, then the oldest. */
export default async function CompliancePage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter: raw } = await searchParams;
  const filter = raw === 'decided' ? 'decided' : 'open';
  const rows = await api<ComplianceCaseRow[]>(`/v1/admin/compliance/cases?filter=${filter}`).catch((e: ApiError) => e);

  const header = (
    <PageHeader
      title="Compliance review"
      description="AML matches waiting for a decision. Sanctions first, then the oldest. Opening a case is recorded in the audit log."
    />
  );
  if (rows instanceof ApiError) {
    return (
      <>
        {header}
        <ErrorState
          title={rows.status === 403 ? 'You need the "See AML review cases" permission' : 'Could not load the cases'}
          detail={rows.message}
        />
      </>
    );
  }

  const tab = (value: 'open' | 'decided', label: string) => (
    <Link
      href={`/compliance?filter=${value}`}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm',
        filter === value ? 'bg-secondary font-medium' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );

  return (
    <>
      {header}
      <div className="mb-4 flex gap-1">
        {tab('open', 'Open')}
        {tab('decided', 'Decided')}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <ShieldCheck className="text-muted-foreground size-8" />
            <p className="text-sm font-medium">{filter === 'open' ? 'Nothing waiting' : 'No decided cases yet'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Link key={row.id} href={`/compliance/${row.id}`} prefetch={false} className="block">
              <Card className="hover:bg-secondary/40 transition-colors">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {row.user ? `${row.user.firstName} ${row.user.lastName}` : 'Unknown user'}
                    </p>
                    <p className="text-muted-foreground truncate text-sm">{row.user?.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={row.priority === 'CRITICAL' ? 'destructive' : row.priority === 'HIGH' ? 'warning' : 'outline'}>
                        {row.priority.toLowerCase()}
                      </Badge>
                      <Badge variant="outline">{CATEGORY_LABEL[row.category] ?? row.category}</Badge>
                      {row.possible ? <Badge variant="outline">possible</Badge> : null}
                      {row.status === 'CLEARANCE_PROPOSED' ? <Badge variant="warning">awaiting second admin</Badge> : null}
                      {filter === 'decided' ? <Badge variant="secondary">{row.status.toLowerCase().replaceAll('_', ' ')}</Badge> : null}
                      <span className="text-muted-foreground text-xs">opened {relativeTime(row.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
