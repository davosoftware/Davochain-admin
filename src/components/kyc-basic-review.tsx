'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { BasicReviewRow } from '@/lib/types-admin';
import { comparison, reasonLabel } from '@/lib/compliance';
import { decideBasic } from '@/app/actions/kyc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/** One Basic verification waiting for a person: the typed details beside the BVN/NIN record. */
export function KycBasicReview({ userId, name, row }: { userId: string; name: string; row: BasicReviewRow }) {
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const amlRunning = row.screening?.status === 'PENDING';
  const address = [row.typedAddress.street, row.typedAddress.city, row.typedAddress.lga, row.typedAddress.state].filter(Boolean).join(', ');

  const decide = (approve: boolean) =>
    start(async () => {
      if (reason.trim().length < 10) {
        toast.error('Write a reason of at least 10 characters. It is kept in the audit log.');
        return;
      }
      const r = await decideBasic(userId, approve, reason.trim());
      if (r.error) {
        toast.error('Could not save the decision', { description: r.error });
        return;
      }
      toast.success(approve ? `${name}: identity accepted` : `${name}: rejected`, {
        description:
          r.state === 'COMPLIANCE_REVIEW'
            ? 'Their AML screening was not clear, so the case moves to Compliance review.'
            : r.state === 'APPROVED'
              ? 'They are Basic now and must sign in again.'
              : undefined,
      });
      router.refresh();
    });

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {row.idType} ••••{row.idLast4}
        </Badge>
        <Badge variant="warning">{reasonLabel(row.reviewReason)}</Badge>
        {row.match?.swapped ? <Badge variant="outline">First and last names swapped</Badge> : null}
        {amlRunning ? <Badge variant="outline">AML screening still running</Badge> : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field</TableHead>
            <TableHead>Typed by the user</TableHead>
            <TableHead>On the {row.idType} record</TableHead>
            <TableHead>Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comparison(row).map((c) => (
            <TableRow key={c.field}>
              <TableCell>{c.field}</TableCell>
              <TableCell>{c.typed}</TableCell>
              <TableCell>{c.record}</TableCell>
              <TableCell>
                <Badge variant={c.result === 'MISMATCH' ? 'destructive' : c.result === 'MATCH' ? 'success' : 'outline'}>{c.result.toLowerCase()}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-muted-foreground text-sm">
        Address: {address || '—'}. State of origin: {row.typedAddress.stateOfOrigin ?? '—'}. Not verified at Basic.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="min-w-64 flex-1"
          placeholder="Reason (kept in the audit log; a rejection reason is emailed to the user)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button variant="outline" size="sm" loading={pending} onClick={() => decide(false)}>
          <X className="size-4" /> Reject
        </Button>
        <Button size="sm" loading={pending} disabled={amlRunning} onClick={() => decide(true)}>
          <Check className="size-4" /> Accept identity
        </Button>
      </div>
    </div>
  );
}
