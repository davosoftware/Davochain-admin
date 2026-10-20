'use client';

import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * The small "i" beside a figure's label: hover it, or tab to it, to read what
 * the figure means. A real button, so keyboard and screen-reader users get the
 * same explanation as somebody with a mouse.
 */
export function InfoTip({ text, className }: { text: string; className?: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={text}
            className={cn(
              'text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 items-center rounded-full outline-none focus-visible:ring-2',
              className,
            )}
          >
            <Info className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
