import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { AdminMe, DojahReadiness, DojahUnknownCall } from '@/lib/types-admin';
import { CHECK_TEXT } from '@/lib/dojah';
import { formatNaira } from '@/lib/compliance';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { DojahControls } from '@/components/dojah-controls';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { relativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Dojah (the company that checks BVN/NIN and screens people): can Basic
 * verification run, what to do when it can't, and the numbers and switch that
 * control it, all set from here.
 */
export default async function DojahPage({ searchParams }: { searchParams: Promise<{ refresh?: string }> }) {
  const { refresh } = await searchParams;
  const [report, calls, me] = await Promise.all([
    api<DojahReadiness>(`/v1/admin/dojah/readiness${refresh === '1' ? '?refresh=true' : ''}`).catch((e: ApiError) => e),
    api<DojahUnknownCall[]>('/v1/admin/dojah/unknown-calls').catch((e: ApiError) => e),
    api<AdminMe>('/v1/admin/me').catch(() => null),
  ]);

  const header = (
    <PageHeader
      title="Dojah"
      description="Dojah checks customers' BVN or NIN and screens them against sanctions and PEP lists for Basic verification. This page shows whether that can run, what to fix if it can't, and the numbers and switch that control it."
    />
  );

  if (report instanceof ApiError) {
    return (
      <>
        {header}
        <ErrorState
          title={report.status === 403 ? 'You need the "Edit site settings" permission' : 'Could not load the Dojah check'}
          detail={report.message}
        />
      </>
    );
  }

  const failing = report.checks.filter((c) => c.required && !c.ok).map((c) => c.fix ?? c.detail);
  const s = report.settings;

  return (
    <>
      {header}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={report.enabled ? 'success' : 'outline'}>Basic verification is {report.enabled ? 'on' : 'off'}</Badge>
        <Badge variant={report.ready ? 'success' : 'destructive'}>{report.ready ? 'Ready' : 'Not ready'}</Badge>
        <span className="text-muted-foreground text-xs">checked {relativeTime(report.checkedAt)}</span>
        <Link href="/system/dojah?refresh=1" prefetch={false} className="text-primary text-sm hover:underline">
          Check again
        </Link>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="t-section mb-1">Checks</p>
          <p className="text-muted-foreground t-caption mb-4">Every required check must be ✓ before Basic verification can be switched on.</p>
          <ul className="grid gap-3">
            {report.checks.map((c) => (
              <li key={c.key} className="border-border/60 flex gap-3 rounded-lg border p-3">
                {c.ok ? <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" /> : <XCircle className={`mt-0.5 size-4 shrink-0 ${c.required ? 'text-destructive' : 'text-muted-foreground'}`} />}
                <div className="min-w-0">
                  <p className="t-small font-medium">
                    {CHECK_TEXT[c.key]?.title ?? c.key} {c.required ? null : <span className="text-muted-foreground t-caption">(not required here)</span>}
                  </p>
                  <p className="text-muted-foreground t-caption">{CHECK_TEXT[c.key]?.meaning}</p>
                  <p className="t-small mt-1">{c.detail}</p>
                  {!c.ok && c.fix ? <p className="t-small text-warning mt-1">What to do: {c.fix}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-5 text-sm">
          <p className="t-section mb-2">Dojah wallet</p>
          <p>
            <span className="font-medium">{report.balance.naira === null ? 'Balance unknown' : formatNaira(report.balance.naira)}</span>
            {report.balance.asOf ? <span className="text-muted-foreground"> (as of {relativeTime(report.balance.asOf)})</span> : null}. Verification stops
            below <span className="font-medium">{formatNaira(s.minBalance)}</span>
            {s.lowBalanceWarn !== null ? (
              <>
                {' '}
                and owners are emailed below <span className="font-medium">{formatNaira(s.lowBalanceWarn)}</span>
              </>
            ) : null}
            .
          </p>
          <p className="text-muted-foreground mt-2">
            Busiest hour in the last 7 days: {report.observed.peakHour7d} verifications. Busiest day: {report.observed.peakDay7d}. Each customer may try{' '}
            {s.dailyAttempts} times a day and {s.totalAttempts} times in total.
          </p>
        </CardContent>
      </Card>

      <div className="mt-4">
        <DojahControls settings={s} ready={report.ready} failing={failing} isOwner={me?.role === 'OWNER'} canEdit />
      </div>

      <Card className="mt-4">
        <CardContent className="p-5">
          <p className="t-section mb-1">Calls to check against Dojah&apos;s bill</p>
          <p className="text-muted-foreground mb-3 text-sm">
            Checks whose result we never got (a timeout, a crash). Dojah may still have charged us for them, so compare this list with Dojah&apos;s
            billing statement.
          </p>
          <ul className="text-muted-foreground t-caption mb-3 grid gap-0.5">
            <li>
              <span className="text-foreground">Possibly billed:</span> Dojah may have charged for this call.
            </li>
            <li>
              <span className="text-foreground">Possibly billed twice:</span> a screening we sent again after an unclear first answer.
            </li>
            <li>
              <span className="text-foreground">Dojah reference:</span> the number to look for on Dojah&apos;s statement.
            </li>
          </ul>
          {calls instanceof ApiError ? (
            <p className="text-destructive text-sm">Could not load them: {calls.message}</p>
          ) : calls.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing to check.</p>
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
                    <TableCell>{c.kind === 'LOOKUP' ? 'BVN/NIN check' : 'Screening'}</TableCell>
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
