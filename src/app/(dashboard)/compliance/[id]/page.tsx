import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { getToken, readClaims } from '@/lib/session';
import type { ComplianceCaseDetail } from '@/lib/types-admin';
import { CATEGORY_LABEL, comparison } from '@/lib/compliance';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { ComplianceDecision } from '@/components/compliance-decision';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { relativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? '—'}</span>
    </div>
  );
}

/** One AML case. Fetched once per render: the API audits every view (spec §10). */
export default async function ComplianceCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, token] = await Promise.all([
    api<ComplianceCaseDetail>(`/v1/admin/compliance/cases/${encodeURIComponent(id)}`).catch((e: ApiError) => e),
    getToken(),
  ]);
  if (detail instanceof ApiError) {
    return (
      <>
        <PageHeader title="Compliance case" />
        <ErrorState
          title={detail.status === 403 ? 'You need the "See AML review cases" permission' : 'Could not load the case'}
          detail={detail.message}
        />
      </>
    );
  }
  const me = { id: (token ? readClaims(token)?.sub : null) ?? '' };
  const { case: c, user, screening, verification } = detail;
  const inputs = screening?.inputs ?? {};

  return (
    <>
      <PageHeader
        title={`${CATEGORY_LABEL[c.category] ?? c.category} case`}
        description="Decide on what is here. Never tell the person why their account is under review."
      />
      <p className="mb-4 text-sm">
        <Link href="/compliance" className="text-primary hover:underline">
          ← Back to the queue
        </Link>
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="mb-2 font-medium">Case</p>
            <Row label="Status" value={<Badge variant="secondary">{c.status.toLowerCase().replaceAll('_', ' ')}</Badge>} />
            <Row label="Priority" value={<Badge variant={c.priority === 'CRITICAL' ? 'destructive' : 'outline'}>{c.priority.toLowerCase()}</Badge>} />
            <Row label="Category" value={`${CATEGORY_LABEL[c.category] ?? c.category}${c.possible ? ' (possible)' : ''}`} />
            <Row label="Risk" value={c.riskLevel} />
            <Row label="Opened" value={relativeTime(c.createdAt)} />
            <Row label="Screening result" value={screening?.status.toLowerCase().replaceAll('_', ' ')} />
            <Row label="Dojah said" value={screening?.matchStatus} />
            <Row label="Dojah reference" value={c.entityId ?? screening?.entityId} />
            {c.rescreenCount > 0 ? <Row label="Re-screens" value={`${c.rescreenCount}${c.rescreenResult ? `, last: ${c.rescreenResult.toLowerCase()}` : ''}`} /> : null}
            {screening?.possibleDuplicateCharge ? (
              <p className="text-warning mt-2 text-sm">Dojah may have billed this screen twice: see System → Dojah.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="mb-2 font-medium">Person</p>
            <Row label="Name" value={user ? `${user.firstName} ${user.lastName}` : null} />
            <Row label="Email" value={user?.email} />
            <Row label="AML status" value={user?.amlStatus.toLowerCase().replaceAll('_', ' ')} />
            {verification ? <Row label="ID" value={`${verification.idType} ••••${verification.idLast4}`} /> : null}
            <p className="text-muted-foreground mt-3 text-sm">
              Screened as: {inputs.names ?? '—'}, born {inputs.date_of_birth ?? 'date not given'}, {inputs.gender ?? 'gender not given'},{' '}
              {inputs.nationality ?? 'NG'}.
            </p>
          </CardContent>
        </Card>
      </div>

      {verification ? (
        <Card className="mt-4">
          <CardContent className="p-5">
            <p className="mb-2 font-medium">Identity</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Typed</TableHead>
                  <TableHead>On the record</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison({ ...verification, match: null }).map((r) => (
                  <TableRow key={r.field}>
                    <TableCell>{r.field}</TableCell>
                    <TableCell>{r.typed}</TableCell>
                    <TableCell>{r.record}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-4">
        <CardContent className="p-5">
          <p className="mb-2 font-medium">Matches</p>
          {screening?.matches && screening.matches.length > 0 ? (
            <div className="flex flex-col gap-3">
              {screening.matches.map((m, i) => (
                <div key={i} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{m.name ?? 'Unnamed'}</p>
                  <Row label="Source" value={m.sourceType} />
                  <Row label="Score" value={m.score === null ? null : String(m.score)} />
                  <Row label="Date of birth" value={m.dateOfBirth} />
                  <Row label="Country" value={m.country} />
                  {m.aliases.length ? <Row label="Also known as" value={m.aliases.join(', ')} /> : null}
                  {m.positions.length ? <Row label="Positions" value={m.positions.join(', ')} /> : null}
                  {m.articles.length ? (
                    <ul className="mt-2 list-disc pl-5">
                      {m.articles.map((a, j) => (
                        <li key={j}>
                          {a.url ? (
                            <a href={a.url} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline">
                              {a.title || a.url}
                            </a>
                          ) : (
                            a.title
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Dojah returned no match details.</p>
          )}
        </CardContent>
      </Card>

      {c.proposedBy || c.decidedBy ? (
        <Card className="mt-4">
          <CardContent className="p-5">
            <p className="mb-2 font-medium">History</p>
            {c.proposedBy ? <Row label="Clearance proposed" value={`${c.proposedAt ? relativeTime(c.proposedAt) : ''}: ${c.proposalReason ?? ''}`} /> : null}
            {c.decidedBy ? <Row label="Decided" value={`${c.decidedAt ? relativeTime(c.decidedAt) : ''}: ${c.reason ?? ''}`} /> : null}
            {c.confirmedBy ? <Row label="Confirmed by a second admin" value={c.confirmedAt ? relativeTime(c.confirmedAt) : 'yes'} /> : null}
            {c.reportedToAuthority !== null ? (
              <Row label="Reported to the authority" value={c.reportedToAuthority ? `Yes, ${c.reportReference ?? ''}` : 'Not yet'} />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-4">
        <ComplianceDecision detail={detail} me={me} />
      </div>
    </>
  );
}
