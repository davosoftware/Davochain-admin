'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ComplianceCaseDetail } from '@/lib/types-admin';
import { DECISION_LABEL, decisionsFor } from '@/lib/compliance';
import { confirmCase, decideCase, rescreenCase, withdrawProposal } from '@/app/actions/compliance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** The decision controls for one case. The API enforces every rule; this only offers what it allows. */
export function ComplianceDecision({ detail, me }: { detail: ComplianceCaseDetail; me: { id: string } }) {
  const c = detail.case;
  const [reason, setReason] = useState('');
  const [decision, setDecision] = useState('');
  const [reported, setReported] = useState<'' | 'yes' | 'no'>('');
  const [reference, setReference] = useState('');
  const [reportedAt, setReportedAt] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const options = decisionsFor(c.category, c.status);

  const run = (minLength: number, fn: () => Promise<{ error?: string }>, ok: string) =>
    start(async () => {
      if (reason.trim().length < minLength) {
        toast.error(`Write a reason of at least ${minLength} characters. It is kept in the audit log.`);
        return;
      }
      const r = await fn();
      if (r.error) {
        toast.error('Not saved', { description: r.error });
        return;
      }
      toast.success(ok);
      setReason('');
      router.refresh();
    });

  if (c.status === 'CLEARANCE_PROPOSED') {
    const mine = c.proposedBy === me.id;
    return (
      <div className="flex flex-col gap-3 rounded-md border p-4">
        <p className="text-sm font-medium">Clearance proposed. The person stays blocked until a different admin confirms.</p>
        {!detail.eligibility.canConfirm && detail.eligibility.why ? (
          <p className="text-muted-foreground text-sm">{detail.eligibility.why}</p>
        ) : null}
        <Input placeholder="Reason (audited)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {detail.eligibility.canConfirm ? (
            <>
              <Button loading={pending} onClick={() => run(10, () => confirmCase(c.id, true, reason.trim()), 'Clearance confirmed')}>
                Confirm clearance
              </Button>
              <Button variant="outline" loading={pending} onClick={() => run(10, () => confirmCase(c.id, false, reason.trim()), 'Proposal rejected: case reopened')}>
                Reject proposal
              </Button>
            </>
          ) : null}
          {mine ? (
            <Button variant="outline" loading={pending} onClick={() => run(5, () => withdrawProposal(c.id, reason.trim()), 'Proposal withdrawn')}>
              Withdraw my proposal
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const canRescreen = c.category === 'ERROR' && c.rescreenCount < 3 && (c.status === 'OPEN' || c.status === 'RESTRICTED');
  if (options.length === 0 && !canRescreen) return <p className="text-muted-foreground text-sm">This case is decided.</p>;

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      {canRescreen ? (
        <p className="text-sm">
          Dojah never returned a result for this person.{' '}
          <Button
            variant="link"
            className="h-auto p-0"
            disabled={pending}
            onClick={() => run(5, () => rescreenCase(c.id, reason.trim()), 'Re-screen started: refresh in a minute')}
          >
            Re-screen ({3 - c.rescreenCount} left; each is a paid call)
          </Button>
        </p>
      ) : null}
      {options.length > 0 ? (
        <>
          <Label htmlFor="decision">Decision</Label>
          <select id="decision" className="bg-background h-9 rounded-md border px-2 text-sm" value={decision} onChange={(e) => setDecision(e.target.value)}>
            <option value="">Choose…</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {DECISION_LABEL[o]}
              </option>
            ))}
          </select>
        </>
      ) : null}
      {decision === 'SANCTIONS_CONFIRMED' ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="reported">Reported to the authority (for example an NFIU filing)?</Label>
          <select
            id="reported"
            className="bg-background h-9 rounded-md border px-2 text-sm"
            value={reported}
            onChange={(e) => setReported(e.target.value as '' | 'yes' | 'no')}
          >
            <option value="">Choose…</option>
            <option value="yes">Yes</option>
            <option value="no">Not yet</option>
          </select>
          {reported === 'yes' ? (
            <>
              <Input placeholder="Report reference" value={reference} onChange={(e) => setReference(e.target.value)} />
              <Input type="datetime-local" value={reportedAt} onChange={(e) => setReportedAt(e.target.value)} />
            </>
          ) : null}
        </div>
      ) : null}
      <Input placeholder="Reason (audited; never shown to the user)" value={reason} onChange={(e) => setReason(e.target.value)} />
      {options.length > 0 ? (
        <Button
          disabled={!decision || (decision === 'SANCTIONS_CONFIRMED' && !reported)}
          loading={pending}
          onClick={() =>
            run(
              10,
              () =>
                decideCase(c.id, {
                  decision,
                  reason: reason.trim(),
                  ...(decision === 'SANCTIONS_CONFIRMED'
                    ? {
                        reportedToAuthority: reported === 'yes',
                        reportReference: reported === 'yes' ? reference : undefined,
                        reportedAt: reported === 'yes' && reportedAt ? new Date(reportedAt).toISOString() : undefined,
                      }
                    : {}),
                }),
              decision === 'SANCTIONS_FALSE_POSITIVE' ? 'Clearance proposed: a second admin must confirm' : 'Decision saved',
            )
          }
        >
          Save decision
        </Button>
      ) : null}
    </div>
  );
}
