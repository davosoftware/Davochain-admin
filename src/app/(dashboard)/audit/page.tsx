import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { AuditPage } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn, relativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Actions worth spotting at a glance.
 *
 * Colour is reserved for the ones that move money or change who can reach the
 * dashboard. If everything is highlighted, nothing is.
 */
function toneOf(action: string): 'default' | 'warning' | 'destructive' | 'muted' {
  if (/deactivate|suspend|reject|pause/.test(action)) return 'destructive';
  if (/password|permissions|role|admin\.create|claim|fee_ladder|rate_config/.test(action))
    return 'warning';
  if (/approve|reinstate|resume/.test(action)) return 'default';
  return 'muted';
}

function describe(action: string): string {
  const words = action.replace(/[._]/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string; action?: string; cursor?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ limit: '60' });
  if (params.admin) query.set('admin', params.admin);
  if (params.action) query.set('action', params.action);
  if (params.cursor) query.set('cursor', params.cursor);

  const page = await api<AuditPage>(`/v1/admin/audit?${query}`).catch((e: ApiError) => e);

  if (page instanceof ApiError) {
    return (
      <>
        <PageHeader title="Audit log" />
        <ErrorState title="Could not load the audit log" detail={page.message} />
      </>
    );
  }

  const filters = [
    { label: 'Everything', action: undefined },
    { label: 'Fees', action: 'fee' },
    { label: 'Admins', action: 'admin' },
    { label: 'KYC', action: 'kyc' },
    { label: 'Users', action: 'user' },
  ];

  const href = (next: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { admin: params.admin, action: params.action, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/audit?${s}` : '/audit';
  };

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every admin action, and who took it. Append-only — there is no way to edit or delete an entry, because a log somebody can tidy is not evidence."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filters.map((f) => {
          const active = (params.action ?? undefined) === f.action;
          return (
            <Button
              key={f.label}
              variant={active ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href={href({ action: f.action, cursor: undefined })}>{f.label}</Link>
            </Button>
          );
        })}

        <div className="flex-1" />

        {page.actors.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground t-caption">by</span>
            <Button variant={params.admin ? 'outline' : 'default'} size="sm" asChild>
              <Link href={href({ admin: undefined, cursor: undefined })}>anyone</Link>
            </Button>
            {page.actors.map((a) => (
              <Button
                key={a.id}
                variant={params.admin === a.id ? 'default' : 'outline'}
                size="sm"
                asChild
              >
                <Link href={href({ admin: a.id, cursor: undefined })}>{a.name}</Link>
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <Card>
        <div className="border-border/70 flex items-baseline justify-between border-b p-4">
          <h2 className="t-section">
            {page.total.toLocaleString()} {page.total === 1 ? 'entry' : 'entries'}
          </h2>
          <span className="text-muted-foreground t-caption">newest first</span>
        </div>

        <CardContent className="p-0">
          {page.rows.length === 0 ? (
            <p className="text-muted-foreground t-small p-4">Nothing matches that filter.</p>
          ) : (
            <ul>
              {page.rows.map((entry) => {
                const tone = toneOf(entry.action);
                return (
                  <li
                    key={entry.id}
                    className="border-border/40 flex items-center gap-3 border-b px-4 py-2.5 last:border-0"
                  >
                    <Avatar
                      id={entry.admin.id}
                      name={entry.admin.name}
                      email={entry.admin.email}
                      size={28}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            't-small font-medium',
                            tone === 'destructive' && 'text-destructive',
                            tone === 'warning' && 'text-warning',
                            tone === 'default' && 'text-success',
                          )}
                        >
                          {describe(entry.action)}
                        </span>
                        <Badge variant="outline">{entry.entity}</Badge>
                        {entry.admin.role === 'SUB_ADMIN' ? (
                          <Badge variant="outline">sub-admin</Badge>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground t-caption truncate">
                        {entry.admin.name}
                        {entry.entityId ? (
                          <span className="ml-1 font-mono opacity-70">
                            · {entry.entityId.slice(0, 8)}
                          </span>
                        ) : null}
                        {entry.ip ? <span className="ml-1 opacity-70">· {entry.ip}</span> : null}
                      </p>
                    </div>

                    <span className="text-muted-foreground t-caption shrink-0">
                      {relativeTime(entry.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {page.nextCursor ? (
        <div className="mt-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={href({ cursor: page.nextCursor })}>Older entries</Link>
          </Button>
        </div>
      ) : null}
    </>
  );
}
