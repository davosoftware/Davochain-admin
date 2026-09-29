import { ShieldCheck } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { PendingKyc } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { KycActions } from '@/components/kyc-actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { relativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function KycPage() {
  const rows = await api<PendingKyc[]>('/v1/admin/kyc/pending').catch((e: ApiError) => e);

  if (rows instanceof ApiError) {
    return (
      <>
        <PageHeader title="KYC review" />
        <ErrorState title="Could not load the review queue" detail={rows.message} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="KYC review"
        description="Approving unlocks trading. It also signs the user out, so the new tier takes effect immediately rather than whenever their token expires."
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <ShieldCheck className="text-muted-foreground size-8" />
            <p className="text-sm font-medium">Nothing waiting</p>
            <p className="text-muted-foreground text-sm">
              Submissions appear here as users complete verification.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="font-medium">
                    {row.user.firstName} {row.user.lastName}
                  </p>
                  <p className="text-muted-foreground truncate text-sm">{row.user.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {row.bvnLast4 ? (
                      <Badge variant="outline">BVN ••••{row.bvnLast4}</Badge>
                    ) : null}
                    {row.ninLast4 ? (
                      <Badge variant="outline">NIN ••••{row.ninLast4}</Badge>
                    ) : null}
                    <Badge variant="outline">{row.documents.length} document(s)</Badge>
                    {row.submittedAt ? (
                      <span className="text-muted-foreground text-xs">
                        submitted {relativeTime(row.submittedAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <KycActions userId={row.userId} name={row.user.firstName} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-muted-foreground mt-6 text-sm">
        Only the last four digits of a BVN or NIN are stored — the full value never touches this
        database.
      </p>
    </>
  );
}
