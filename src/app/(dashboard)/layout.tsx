import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { api, isRedirect } from '@/lib/api';
import type { AdminMe } from '@/lib/types-admin';
import { Avatar } from '@/components/ui/avatar';
import { IdleTimer } from '@/components/idle-timer';
import { Badge } from '@/components/ui/badge';
import { getToken, readClaims } from '@/lib/session';
import { Nav } from '@/components/nav';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { MobileNav } from '@/components/mobile-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = await getToken();
  const claims = token ? readClaims(token) : null;
  /*
   * This call is what notices a session has ended.
   *
   * api() redirects to /login on a 401, and a redirect in Next is a thrown
   * error — so it has to be let back out. Pages catch their own failures to
   * render an error card, which would swallow it; the layout runs on every
   * dashboard request, so doing the check here covers all of them at once.
   */
  const me = await api<AdminMe>('/v1/admin/me').catch((err) => {
    if (isRedirect(err)) throw err;
    return null; // API unwell — the shell still renders, without a name.
  });
  const permissions = me?.permissions ?? [];

  return (
    <div className="flex min-h-screen">
      {/*
        * Sidebar: pinned on desktop, a sheet on mobile.
        *
        * sticky + a viewport height, rather than letting it stretch to the page.
        * As a plain flex child it grew as tall as the content and scrolled away
        * with it — so on a long dashboard the navigation was somewhere above
        * you. Bounding it here is also what gives the link list below a height
        * to overflow within, so a long nav scrolls on its own without moving
        * the logo or the account footer.
        */}
      <aside className="bg-sidebar border-sidebar-border sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r lg:flex">
        <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
          <Logo className="size-6" />
          <span className="text-sm font-semibold tracking-tight">Davochain</span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <Nav permissions={permissions} />
        </div>
        <div className="border-sidebar-border shrink-0 border-t p-3">
          <Link
            href="/settings"
            className="hover:bg-sidebar-accent/60 mb-1 flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors"
          >
            <Avatar
              id={me?.id ?? 'unknown'}
              name={me?.name ?? ''}
              email={me?.email ?? claims?.email ?? ''}
              version={me?.avatarVersion}
              size={30}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">
                {me?.name ?? claims?.email ?? 'Signed in'}
              </span>
              <span className="text-muted-foreground block truncate text-[0.7rem]">
                {me ? me.email : 'Administrator'}
              </span>
            </span>
            {me ? (
              <Badge variant={me.role === 'OWNER' ? 'default' : 'outline'} className="shrink-0">
                {me.role === 'OWNER' ? 'Owner' : 'Sub-admin'}
              </Badge>
            ) : null}
          </Link>
          <form action={logout}>
            <Button variant="ghost" size="sm" className="w-full justify-start" type="submit">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 border-border/70 sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 backdrop-blur lg:px-6">
          <MobileNav email={claims?.email ?? null} permissions={permissions} />
          <div className="flex-1" />
          <ThemeToggle />
          <Button variant="outline" size="sm" asChild>
            <Link href="http://localhost:3000/docs" target="_blank" rel="noreferrer">
              API docs
            </Link>
          </Button>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>

      {me ? <IdleTimer timeoutMs={me.idleTimeoutMs} /> : null}
    </div>
  );
}
