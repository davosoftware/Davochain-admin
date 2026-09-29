'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * A modal, not a drawer.
 *
 * Radix handles the parts that are easy to get wrong by hand: focus is trapped
 * inside while it is open and returned to the trigger on close, the page behind
 * it stops scrolling, and Escape closes it.
 */
export function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          // Capped at the viewport with its own scroll: a long form on a laptop
          // must not push the buttons off the bottom of the screen.
          'bg-card text-card-foreground border-border/70 fixed top-1/2 left-1/2 z-50 flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-lg',
          '-translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border shadow-xl outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close
            className={cn(
              'text-muted-foreground hover:bg-secondary hover:text-foreground absolute top-4 right-4',
              'focus-visible:ring-ring/40 rounded-md p-1 transition-colors outline-none focus-visible:ring-[3px]',
            )}
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('border-border/70 flex flex-col gap-1 border-b px-5 py-4 pr-12', className)}
      {...props}
    />
  );
}

export function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('scrollbar-thin flex-1 overflow-y-auto px-5 py-4', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'border-border/70 flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-base font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}
