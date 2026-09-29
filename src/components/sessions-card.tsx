'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { endOtherSessions } from '@/app/actions/settings';
import type { AdminSessionRow } from '@/lib/types-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { relativeTime } from '@/lib/utils';

/** "Mozilla/5.0 (Windows NT 10.0…) Chrome/…" is not a thing to show a person. */
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';
  const browser =
    /Edg\//.test(userAgent) ? 'Edge'
    : /OPR\//.test(userAgent) ? 'Opera'
    : /Chrome\//.test(userAgent) ? 'Chrome'
    : /Safari\//.test(userAgent) ? 'Safari'
    : /Firefox\//.test(userAgent) ? 'Firefox'
    : 'Browser';
  const os =
    /Windows/.test(userAgent) ? 'Windows'
    : /Macintosh|Mac OS/.test(userAgent) ? 'macOS'
    : /Android/.test(userAgent) ? 'Android'
    : /iPhone|iPad/.test(userAgent) ? 'iOS'
    : /Linux/.test(userAgent) ? 'Linux'
    : '';
  return os ? `${browser} on ${os}` : browser;
}

export function SessionsCard({
  sessions,
  idleTimeoutMs,
}: {
  sessions: AdminSessionRow[];
  idleTimeoutMs: number;
}) {
  const [pending, start] = useTransition();
  const [ended, setEnded] = useState(false);
  const router = useRouter();
  const others = sessions.filter((s) => !s.isCurrent).length;

  const endThem = () =>
    start(async () => {
      const result = await endOtherSessions();
      if (result.error) {
        toast.error('Could not end those sessions', { description: result.error });
        return;
      }
      setEnded(true);
      toast.success(
        result.ended === 0 ? 'Nothing else was signed in' : `Ended ${result.ended} session(s)`,
      );
      router.refresh();
    });

  return (
    <Card>
      <div className="border-border/70 flex items-start justify-between gap-3 border-b p-4">
        <div>
          <h2 className="t-section">Where you are signed in</h2>
          <p className="text-muted-foreground t-caption mt-0.5">
            Sessions end automatically after {Math.round(idleTimeoutMs / 60000)} minutes of
            inactivity.
          </p>
        </div>
        {others > 0 && !ended ? (
          <Button variant="outline" size="sm" onClick={endThem} disabled={pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
            Sign out others
          </Button>
        ) : null}
      </div>

      <CardContent className="p-0">
        {sessions.length === 0 ? (
          <p className="text-muted-foreground t-small p-4">No active sessions.</p>
        ) : (
          <ul>
            {sessions.map((session) => (
              <li
                key={session.id}
                className="border-border/40 flex items-center gap-3 border-b px-4 py-3 last:border-0"
              >
                <Monitor className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="t-small truncate">{describeDevice(session.userAgent)}</span>
                    {session.isCurrent ? <Badge variant="success">This device</Badge> : null}
                  </div>
                  <p className="text-muted-foreground t-caption truncate">
                    {session.ip ?? 'unknown address'} · active {relativeTime(session.lastSeenAt)}
                  </p>
                </div>
                <span className="text-muted-foreground t-caption hidden shrink-0 sm:block">
                  started {relativeTime(session.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
