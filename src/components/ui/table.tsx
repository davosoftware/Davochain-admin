import * as React from 'react';
import { cn } from '@/lib/utils';

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    /*
     * Wide tables scroll in their own container so the page body never moves
     * sideways — a horizontally scrolling dashboard is unusable.
     *
     * Marked as a container so a full-width row inside can size itself to what
     * is VISIBLE (100cqw) rather than to the table, which may be much wider. A
     * detail panel spanning every column would otherwise lay itself out across
     * the whole scroll width and put its right-hand third off screen.
     */
    <div className="@container relative w-full overflow-x-auto scrollbar-thin">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('[&_tr]:border-b [&_tr]:border-border/60', className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'border-b border-border/50 transition-colors hover:bg-secondary/40 data-[state=selected]:bg-secondary',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'text-muted-foreground h-10 px-3 text-left align-middle text-xs font-medium tracking-wide whitespace-nowrap',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('px-3 py-2.5 align-middle', className)} {...props} />;
}

function TableEmpty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-muted-foreground py-10 text-center text-sm">
        {children}
      </td>
    </tr>
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty };
