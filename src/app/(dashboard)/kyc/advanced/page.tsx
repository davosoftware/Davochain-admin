import { ShieldCheck } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { AdvancedQueue } from '@/lib/types';
import type { DojahSettings } from '@/lib/dojah';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { Stat } from '@/components/stat';
import { KycAdvancedReview } from '@/components/kyc-advanced-review';
import { Card, CardContent } from '@/components/ui/card';
import { TIPS } from '@/lib/tips';

export const dynamic = 'force-dynamic';

export default async function KycAdvancedPage() {
  const [queue, readiness] = await Promise.all([
    api<AdvancedQueue>('/v1/admin/kyc/advanced').catch((e: ApiError) => e),
    // The live thresholds, for the score lines. Only for admins who can see the Dojah screen; defaults otherwise.
    api<{ settings: DojahSettings }>('/v1/admin/dojah/readiness').catch(() => null),
  ]);

  if (queue instanceof ApiError) {
    return (
      <>
        <PageHeader title="Advanced checks" />
        <ErrorState title="Could not load the Advanced checks" detail={queue.message} />
      </>
    );
  }
  const s = readiness?.settings;
  const thresholds = { liveness: s?.livenessMin ?? 90, pass: s?.faceMatchPass ?? 75, review: s?.faceMatchReview ?? 60 };

  return (
    <>
      <PageHeader
        title="Advanced checks"
        description="ID, selfie and proof-of-address checks a rule could not decide. Approving raises the customer's level and signs them out so it applies at once."
      />

      <Card className="mb-5">
        <CardContent className="grid grid-cols-3 gap-6 p-5">
          <Stat label="Waiting" value={queue.waiting} tone={queue.waiting > 0 ? 'warning' : 'default'} tip={TIPS.kycAdvanced.waiting} />
          <Stat label="Approved today" value={queue.approvedToday} tip={TIPS.kycAdvanced.approvedToday} />
          <Stat label="Rejected today" value={queue.rejectedToday} tip={TIPS.kycAdvanced.rejectedToday} />
        </CardContent>
      </Card>

      {queue.rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <span className="bg-primary/10 text-primary ring-primary/15 flex size-12 items-center justify-center rounded-full ring-4">
              <ShieldCheck className="size-5" />
            </span>
            <p className="text-sm font-medium">Nothing waiting</p>
            <p className="text-muted-foreground text-sm">Checks appear here when the automatic rules need a person.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {queue.rows.map((row) => (
            <KycAdvancedReview key={row.id} row={row} thresholds={thresholds} />
          ))}
        </div>
      )}

      <p className="text-muted-foreground mt-6 text-sm">
        Only the last four digits of an ID number are stored. The face photo Dojah reads from an ID is never kept. Opening a
        document is recorded in the audit log with your name and the time.
      </p>
    </>
  );
}
