import { AlertTriangle } from 'lucide-react';

export function ErrorState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="border-destructive/25 bg-destructive/5 flex items-start gap-3 rounded-lg border p-4">
      <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-destructive text-sm font-medium">{title}</p>
        {detail ? <p className="text-muted-foreground mt-1 text-sm break-words">{detail}</p> : null}
      </div>
    </div>
  );
}
