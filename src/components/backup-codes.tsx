'use client';

import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { backupCodesText } from '@/lib/two-step';

/**
 * M7: the 10 backup codes, shown once. They exist on the server only as
 * hashes, so this is the only time anyone can see them.
 */
export function BackupCodes({ codes, email }: { codes: string[]; email: string }) {
  const text = backupCodesText(codes, email);
  const copy = () =>
    navigator.clipboard.writeText(text).then(
      () => toast.success('Backup codes copied'),
      () => toast.error('Could not copy. Download them instead.'),
    );
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'davochain-admin-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="border-warning/30 bg-warning/10 rounded-md border p-3 text-sm">
        <strong>Save these backup codes now.</strong> You will not see them again. Each one works once, when you
        cannot get the emailed code.
      </div>
      <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
        {codes.map((c) => (
          <li key={c} className="bg-muted rounded px-2 py-1 text-center tracking-widest">
            {c}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          <Copy className="size-3.5" /> Copy
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={download}>
          <Download className="size-3.5" /> Download
        </Button>
      </div>
    </div>
  );
}
