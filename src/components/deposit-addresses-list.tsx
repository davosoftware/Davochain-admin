'use client';

import type { UserDetail } from '@/lib/types-admin';
import { statusLabel } from '@/lib/crypto-addresses';
import { AddressRetryButton } from '@/components/address-retry-button';
import { Badge } from '@/components/ui/badge';

/** The addresses this customer receives crypto at (spec 2026-10-26), in the Users page's expanded row. */
export function DepositAddressesList({
  addresses,
  onChanged,
}: {
  addresses: UserDetail['depositAddresses'];
  onChanged: () => void;
}) {
  const rows = addresses ?? [];
  return (
    <div className="mt-4">
      <h3 className="eyebrow mb-2">Crypto deposit addresses</h3>
      {rows.length === 0 ? (
        <p className="text-muted-foreground t-caption">None yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((a) => {
            const stuck = a.status === 'FAILED';
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-2">
                <span className="t-small font-medium">
                  {a.asset.toUpperCase()} · {a.networkLabel}
                </span>
                <Badge variant={a.status === 'ACTIVE' ? 'success' : stuck ? 'destructive' : 'outline'}>
                  {statusLabel({ status: a.status, stuck })}
                </Badge>
                {a.address ? <code className="font-mono text-xs break-all">{a.address}</code> : null}
                {a.autoCreated ? <span className="text-muted-foreground t-caption">made in advance</span> : null}
                <AddressRetryButton id={a.id} status={a.status} onDone={onChanged} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
