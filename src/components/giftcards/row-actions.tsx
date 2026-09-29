'use client';

import { useState } from 'react';
import { MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * The "…" menu on every catalogue row.
 *
 * Deactivate sits above Delete deliberately. Deactivating is what somebody
 * almost always wants — it takes the card out of the app and leaves every past
 * trade readable — and Delete is refused outright once anything depends on the
 * row, so putting it first would lead with the option that usually fails.
 */
export function RowActions({
  isActive,
  onToggle,
  onEdit,
  onDelete,
  busy,
}: {
  isActive: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" disabled={busy} aria-label="Actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <MenuItem onClick={run(onToggle)} icon={isActive ? PowerOff : Power}>
          {isActive ? 'Deactivate' : 'Activate'}
        </MenuItem>
        <MenuItem onClick={run(onEdit)} icon={Pencil}>
          Edit
        </MenuItem>
        <MenuItem onClick={run(onDelete)} icon={Trash2} destructive>
          Delete
        </MenuItem>
      </PopoverContent>
    </Popover>
  );
}

function MenuItem({
  onClick,
  icon: Icon,
  destructive,
  children,
}: {
  onClick: () => void;
  icon: typeof Pencil;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        't-small flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors',
        destructive
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground hover:bg-secondary',
      )}
    >
      <Icon className="size-3.5" />
      {children}
    </button>
  );
}
