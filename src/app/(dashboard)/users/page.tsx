import { api, ApiError } from '@/lib/api';
import type { UserListRow, UserStats } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { Stat } from '@/components/stat';
import { UserTable } from '@/components/user-table';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ limit: '100' });
  if (params.q) query.set('search', params.q);
  if (params.status) query.set('status', params.status);

  const [list, stats] = await Promise.all([
    api<{ rows: UserListRow[]; total: number }>(`/v1/admin/users?${query}`).catch(
      (e: ApiError) => e,
    ),
    api<UserStats>('/v1/admin/users/stats').catch(() => null),
  ]);

  if (list instanceof ApiError) {
    return (
      <>
        <PageHeader title="Users" />
        <ErrorState title="Could not load users" detail={list.message} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Open a row to see their details and balances. Suspending signs them out immediately."
      />

      {stats ? (
        <Card className="mb-5">
          <CardContent className="grid grid-cols-2 gap-6 p-5 lg:grid-cols-5">
            <Stat label="Registered" value={stats.total} />
            <Stat label="Active" value={stats.active} tone="success" />
            <Stat
              label="Suspended"
              value={stats.suspended}
              tone={stats.suspended > 0 ? 'warning' : 'default'}
            />
            <Stat label="Verified" value={stats.verified} hint="Basic or above" />
            <Stat label="Holding funds" value={stats.withBalance} />
          </CardContent>
        </Card>
      ) : null}

      <UserTable rows={list.rows} total={list.total} search={params.q ?? ''} />
    </>
  );
}
