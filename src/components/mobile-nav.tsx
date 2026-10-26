'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Nav } from '@/components/nav';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function MobileNav({
  email,
  permissions,
  isOwner = false,
}: {
  email: string | null;
  permissions: string[];
  isOwner?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="size-4" />
      </Button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className={cn(
              'bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r',
            )}
          >
            <div className="flex h-14 items-center gap-2.5 px-4">
              <Logo className="size-6" />
              <span className="text-sm font-semibold tracking-tight">Davochain</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Nav permissions={permissions} isOwner={isOwner} onNavigate={() => setOpen(false)} />
            </div>
            {email ? (
              <div className="border-sidebar-border border-t px-5 py-3">
                <p className="truncate text-xs font-medium">{email}</p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
