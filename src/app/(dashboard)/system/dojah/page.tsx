import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { DojahReadiness, DojahUnknownCall } from '@/lib/types-admin';
import { formatNaira } from '@/lib/compliance';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { relativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const CHECK_LABEL: Record<string, string> = {
  mode: 'Mode for this environment',
  credentials: 'App ID and secret key',
  keysAndIp: 'Keys accepted, server IP whitelisted',
  wallet: 'Wallet at or above the minimum',
  recipients: 'Someone receives AML and Dojah alerts',
};

/** Whether Basic verification can run, and the calls to reconcile against Dojah's bill (spec §12.2, §14.5). */
export default async function DojahPage({ searchParams }: { searchParams: Promise<{ refresh?: string }> }) {
  const { refresh } = await searchParams;
  const [report, calls] = await Promise.all([
    api<DojahReadiness>(`/v1/admin/dojah/readiness${refresh === '1' ? '?refresh=true' : ''}`).catch((e: ApiError) => e),
    api<DojahUnknownCall[]>('/v1/admin/dojah/unknown-calls').catch((e: ApiError) => e),
  ]);

  const header = (
    <PageHeader
      title="Dojah"
      description="Whether Basic verification can run. Basic stays off until every required check is green and KYC_BASIC_ENABLED is true on the server."
    />
  );
  if (report instanceof ApiError) {
    return (
      <>
        {header}
        <ErrorState
          title={report.status === 403 ? 'You need the "Edit site settings" permission' : 'Could not load Dojah readiness'}
          detail={report.message}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={report.enabled ? 'success' : 'outline'}>Feature switch: {report.enabled ? 'on' : 'off'}</Badge>
        <Badge variant={report.ready ? 'success' : 'destructive'}>{report.ready ? 'Ready' : 'Not ready'}</Badge>
        <span className="text-muted-foreground text-xs">checked {relativeTime(report.checkedAt)}</span>
        <Link href="/system/dojah?refresh=1" prefetch={false} className="text-primary text-sm hover:underline">
          Check again
        </Link>
      </div>

      <Card>
        <CardContent className="p-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Check</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.checks.map((c) => (
                <TableRow key={c.key}>
                  <TableCell>{CHECK_LABEL[c.key] ?? c.key}</TableCell>
                  <TableCell>{c.required ? 'yes' : 'no'}</TableCell>
                  <TableCell>
                    <Badge variant={c.ok ? 'success' : c.required ? 'destructive' : 'outline'}>{c.ok ? '✓' : '✗'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-5 text-sm">
          <p className="mb-2 font-medium">Wallet</p>
          <p>
            Balance {formatNaira(report.balance.naira)}
            {report.balance.asOf ? ` (as of ${relativeTime(report.balance.asOf)})` : ''}. Hard stop {formatNaira(report.balance.minimum)}. Warning at{' '}
            {formatNaira(report.balance.warnAt)}.
          </p>
          <p className="mt-2">
            Busiest hour in the last 7 days: {report.observed.peakHour7d} verifications. Busiest day: {report.observed.peakDay7d}.
          </p>
          <p className="text-muted-foreground mt-2">
            Recompute the thresholds with <code>scripts/dojah-threshold.ts</code> using these peaks and your contracted prices.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-5">
          <p className="mb-1 font-medium">Calls to reconcile</p>
          <p className="text-muted-foreground mb-3 text-sm">
            Compare these against Dojah&apos;s billing statement. Lookups listed here were possibly billed without a recorded result; AML rows
            marked &quot;twice&quot; were re-sent after an unknown outcome.
          </p>
          {calls instanceof ApiError ? (
            <p className="text-destructive text-sm">Could not load them: {calls.message}</p>
          ) : calls.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing to reconcile.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kind</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Possibly billed</TableHead>
                  <TableHead>Possibly billed twice</TableHead>
                  <TableHead>Dojah reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((c) => (
                  <TableRow key={`${c.kind}-${c.id}`}>
                    <TableCell>{c.kind === 'LOOKUP' ? 'Lookup' : 'AML screen'}</TableCell>
                    <TableCell>{relativeTime(c.at)}</TableCell>
                    <TableCell>{c.outcome.toLowerCase().replaceAll('_', ' ')}</TableCell>
                    <TableCell>{c.possiblyCharged ? 'yes' : 'no'}</TableCell>
                    <TableCell>{c.possibleDuplicateCharge ? 'yes' : 'no'}</TableCell>
                    <TableCell className="font-mono text-xs">{c.entityId ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
