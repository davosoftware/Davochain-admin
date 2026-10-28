import Link from 'next/link';
import { CircleX } from 'lucide-react';
import type { AdvancedRejectedRow } from '@/lib/types';
import { formatDay } from '@/lib/date-of-birth';
import { relativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const STEP = { IDENTITY: 'ID and selfie', ADDRESS: 'Proof of address' } as const;

/**
 * Advanced checks → Recently rejected (28 Oct 2026). Most rejections are made
 * by the rules and never reach the queue, so this is where an admin sees why a
 * customer was told "we couldn't verify you yet".
 */
export function AdvancedRejectedList({ rows }: { rows: AdvancedRejectedRow[] }) {
  return (
    <section className="mt-8">
      <h2 className="t-section">Recently rejected</h2>
      <p className="text-muted-foreground t-caption mb-3">
        The latest 20, newest first. &quot;By the rules&quot; means no person decided it: the customer was told the reason
        at once and can try again with a better document.
      </p>
      {rows.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">Nothing rejected yet.</CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-border divide-y">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
                <CircleX className="text-destructive mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="t-small font-medium">
                      {r.user ? `${r.user.firstName} ${r.user.lastName}` : 'Unknown customer'}
                    </span>
                    {r.user ? (
                      <Link
                        href={`/users?q=${encodeURIComponent(r.user.email)}`}
                        className="text-muted-foreground t-caption hover:text-foreground truncate underline-offset-2 hover:underline"
                      >
                        {r.user.email}
                      </Link>
                    ) : null}
                    <Badge variant="outline">{STEP[r.step as keyof typeof STEP] ?? r.step}</Badge>
                    <Badge variant={r.decidedBy === 'RULES' ? 'secondary' : 'default'}>
                      {r.decidedBy === 'RULES' ? 'By the rules' : 'By an admin'}
                    </Badge>
                  </div>
                  <p className="t-small mt-1">{r.customerMessage ?? r.rejectCode ?? 'Rejected'}</p>
                  {r.dateOfBirth ? (
                    <p className="text-muted-foreground t-caption mt-1">
                      On the ID: <span className="text-foreground font-medium">{formatDay(r.dateOfBirth.onDocument)}</span> ·
                      Verified at Basic: <span className="text-foreground font-medium">{formatDay(r.dateOfBirth.verified)}</span>
                    </p>
                  ) : null}
                </div>
                <span className="text-muted-foreground t-caption shrink-0">{relativeTime(r.decidedAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
