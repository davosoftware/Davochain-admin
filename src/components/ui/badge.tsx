import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Status is encoded in form AND colour, never colour alone — a red dot means
 * nothing to a colourblind operator scanning a table of two hundred rows.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border border-transparent px-2 py-0.5 text-xs font-normal w-fit whitespace-nowrap [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        destructive: 'bg-destructive/10 text-destructive',
        outline: 'border-border text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
