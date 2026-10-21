'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import type { AdvancedReviewRow } from '@/lib/types';
import { decideAdvanced } from '@/app/actions/kyc';
import { kindLabel, reasonText, REJECT_OPTIONS, scoreLine, stepLabel } from '@/lib/advanced';
import { documentLabel } from '@/lib/kyc-documents';
import { relativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const show = (v: string | null | undefined) => (v && v.trim() ? v : '—');
const fullName = (p: { firstName: string | null; middleName?: string | null; lastName: string | null }) =>
  [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || '—';

/**
 * One Advanced check waiting for a person (spec 2026-10-21 §8): why it is here,
 * what was read beside the verified Basic record, the scores, the files, and
 * the decision. Approving raises the level and signs the customer out.
 */
export function KycAdvancedReview({ row, thresholds }: { row: AdvancedReviewRow; thresholds: { liveness: number; pass: number; review: number } }) {
  const [reason, setReason] = useState('DOC_UNCLEAR');
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  const name = row.user ? `${row.user.firstName} ${row.user.lastName}` : 'This customer';
  // Missing only if the Basic record can't be read; the table then shows dashes.
  const v = row.verified ?? { firstName: '—', middleName: null, lastName: '', dateOfBirth: '—', address: { street: null, city: null, state: null } };
  const f = row.findings;
  const basicAddress = [v.address.street, v.address.city, v.address.state].filter(Boolean).join(', ');

  const decide = (approve: boolean) =>
    start(async () => {
      if (!approve && reason === 'OTHER' && !note.trim()) {
        toast.error('Write the note the customer will see.');
        return;
      }
      const r = await decideAdvanced(row.id, approve, approve ? 'APPROVED_AFTER_REVIEW' : reason, note.trim() || undefined);
      if (r.error) {
        toast.error('Could not save the decision', { description: r.error });
        return;
      }
      toast.success(approve ? `${name}: approved` : `${name}: rejected`, {
        description: approve ? 'Their new level applies when they sign in again.' : 'They were told why and may try again if attempts remain.',
      });
      router.refresh();
    });

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{name}</p>
            <p className="text-muted-foreground truncate text-sm">{row.user?.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{stepLabel(row.step)}</Badge>
            <Badge variant="outline">{kindLabel(row.idType ?? row.addressKind)}</Badge>
            {row.docLast4 ? <Badge variant="outline">No. ••••{row.docLast4}</Badge> : null}
            <span className="text-muted-foreground text-xs">sent {relativeTime(row.createdAt)}</span>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-1">Why it is here</p>
          <ul className="list-disc pl-5 text-sm">
            {row.reviewReasons.map((r) => (
              <li key={r}>{reasonText(r)}</li>
            ))}
          </ul>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead>Verified at Basic</TableHead>
              <TableHead>Read from the document</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {row.step === 'IDENTITY' ? (
              <>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>{fullName(v)}</TableCell>
                  <TableCell>{f.id ? fullName(f.id) : '—'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Date of birth</TableCell>
                  <TableCell>{v.dateOfBirth}</TableCell>
                  <TableCell>{show(f.id?.dateOfBirth)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Expiry</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>{show(f.id?.expiry)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Document</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>
                    {show(f.id?.documentName)} {f.id && !f.id.valid ? <Badge variant="destructive">Dojah: not valid</Badge> : null}
                  </TableCell>
                </TableRow>
              </>
            ) : (
              <>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>{fullName(v)}</TableCell>
                  <TableCell>{f.address ? `found: ${f.address.name.toLowerCase()}` : '—'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Address</TableCell>
                  <TableCell>{basicAddress || '—'}</TableCell>
                  <TableCell>{f.address ? `match: ${f.address.address.toLowerCase()}` : '—'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>{show(f.address?.date)}</TableCell>
                </TableRow>
                {f.address?.provider ? (
                  <TableRow>
                    <TableCell>Provider</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>{f.address.provider}</TableCell>
                  </TableRow>
                ) : null}
              </>
            )}
          </TableBody>
        </Table>

        {row.step === 'IDENTITY' ? (
          <div className="text-sm">
            <p>{scoreLine('Liveness', f.liveness?.probability ?? null, thresholds.liveness)}</p>
            <p>{f.noPortrait ? 'Face match — the ID had no face photo to compare' : scoreLine('Face match', f.match?.confidence ?? null, thresholds.pass, thresholds.review)}</p>
          </div>
        ) : null}

        <ul className="flex flex-col gap-1 text-sm">
          {row.documents.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <FileText className="text-muted-foreground size-4" />
              <span>{documentLabel(d.type)}</span>
              {d.mimeType === 'application/pdf' ? <Badge variant="outline">PDF</Badge> : null}
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

        <div className="flex flex-wrap items-end gap-2 border-t pt-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground text-xs">Reason, if rejecting</span>
            <select className="border-input bg-background h-9 rounded-md border px-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REJECT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-64 flex-1 flex-col gap-1 text-sm">
            <span className="text-muted-foreground text-xs">Note (kept in the audit log; shown to the customer only with &quot;Other&quot;)</span>
            <textarea
              className="border-input bg-background min-h-9 rounded-md border px-2 py-1.5 text-sm"
              maxLength={300}
              rows={1}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <Button variant="outline" size="sm" loading={pending} onClick={() => decide(false)}>
            <X className="size-4" /> Reject
          </Button>
          <Button size="sm" loading={pending} onClick={() => decide(true)}>
            <Check className="size-4" /> Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
