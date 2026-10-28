import Link from 'next/link';
import { ArrowRight, FileText, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { AdvancedQueue, PendingKycPage } from '@/lib/types';
import { KycQueueToolbar, type KycQueueState } from '@/components/kyc-queue-toolbar';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { KycActions } from '@/components/kyc-actions';
import { KycBasicReview } from '@/components/kyc-basic-review';
import { basicFlowLabel } from '@/lib/compliance';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { relativeTime } from '@/lib/utils';
import { documentLabel, storageLine, type StorageStatus } from '@/lib/kyc-documents';

export const dynamic = 'force-dynamic';

const FORWARDED = ['order', 'page', 'search', 'includeAutomatedTests'] as const;

export default async function KycPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of FORWARDED) {
    const value = params[key];
    const single = Array.isArray(value) ? value[0] : value;
    if (single) query.set(key, single);
  }
  const [queue, storage, advanced] = await Promise.all([
    api<PendingKycPage>(`/v1/admin/kyc/pending?${query}`).catch((e: ApiError) => e),
    api<StorageStatus>('/v1/admin/storage/status').catch(() => null),
    api<AdvancedQueue>('/v1/admin/kyc/advanced').catch(() => null),
  ]);
  // Advanced checks a rule could not decide live on their own page (spec 2026-10-21 §8).
  const advancedLink = (
    <Button variant="outline" size="sm" asChild>
      <Link href="/kyc/advanced">
        Advanced checks{advanced ? <Badge variant={advanced.waiting > 0 ? 'warning' : 'outline'}>{advanced.waiting}</Badge> : null}
        <ArrowRight className="size-3.5" />
      </Link>
    </Button>
  );
  const files = storageLine(storage);

  if (queue instanceof ApiError) {
    return (
      <>
        <PageHeader title="KYC review" />
        <ErrorState title="Could not load the review queue" detail={queue.message} />
      </>
    );
  }

  const rows = queue.items;
  const searchParam = Array.isArray(params.search) ? params.search[0] : params.search;
  const state: KycQueueState = {
    order: queue.order,
    page: queue.page,
    pageSize: queue.pageSize,
    total: queue.total,
    search: (searchParam ?? '').trim(),
    includeAutomatedTests: (Array.isArray(params.includeAutomatedTests) ? params.includeAutomatedTests[0] : params.includeAutomatedTests) === 'true',
  };

  return (
    <>
      <PageHeader
        title="KYC review"
        action={advancedLink}
        description="Customers whose Basic identity check could not be passed automatically. Compare what they typed with their BVN/NIN record, then accept or reject. If their background (AML) screening flagged something, accepting sends them on to Compliance review. Approving signs the customer out once, so their new level applies straight away."
      />

      <p
        className={
          'mb-4 text-sm ' +
          (files.tone === 'ok' ? 'text-muted-foreground' : files.tone === 'warn' ? 'text-amber-600' : 'text-destructive')
        }
      >
        {files.text}
      </p>

      <KycQueueToolbar state={state} />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <span className="bg-primary/10 text-primary ring-primary/15 flex size-12 items-center justify-center rounded-full ring-4">
              <ShieldCheck className="size-5" />
            </span>
            <p className="text-sm font-medium">Nothing waiting</p>
            <p className="text-muted-foreground text-sm">
              {state.search
                ? 'No one waiting matches that search.'
                : 'Submissions appear here as users complete verification.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
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
                  {row.documents.length > 0 ? (
                    <ul className="mt-3 flex flex-col gap-1 text-sm">
                      {row.documents.map((d) => (
                        <li key={d.id} className="flex items-center gap-2">
                          <FileText className="text-muted-foreground size-4" />
                          <span>{documentLabel(d.type)}</span>
                          <span className="text-muted-foreground text-xs">{relativeTime(d.uploadedAt)}</span>
                          {/* Opens through this dashboard's server; every opening is recorded. */}
                          <a
                            href={`/kyc-document/${d.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-xs font-medium underline-offset-2 hover:underline"
                          >
                            Open
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {row.user.kycVerifications?.[0] && (row.user.kycVerifications[0].state ?? 'IDENTITY_REVIEW') === 'IDENTITY_REVIEW' ? (
                  <KycBasicReview userId={row.userId} name={row.user.firstName} row={row.user.kycVerifications[0]} />
                ) : row.user.kycVerifications?.[0] ? (
                  // In the Basic flow but not waiting on identity: decided elsewhere, never with the old buttons.
                  <Badge variant="outline">{basicFlowLabel(row.user.kycVerifications[0].state ?? '')}</Badge>
                ) : (
                  <KycActions userId={row.userId} name={row.user.firstName} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-muted-foreground mt-6 text-sm">
        Only the last four digits of a BVN or NIN are stored — the full value never touches this
        database. Opening a document is recorded in the audit log with your name and the time.
      </p>
    </>
  );
}
