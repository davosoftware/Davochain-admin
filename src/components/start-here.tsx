import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { AdminMe } from '@/lib/types-admin';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Where a sub-admin lands when they cannot see the overview.
 *
 * Sign-in sends everyone to "/", so somebody without overview.view would
 * otherwise be met by an error card on their own home page — which reads as
 * the dashboard being broken rather than as a permission they were never
 * given.
 */
const DESTINATIONS: { href: string; label: string; blurb: string; permission: string }[] = [
  { href: '/inventory', label: 'Inventory desk', blurb: 'Holdings and days of cover', permission: 'inventory.view' },
  { href: '/reconciliation', label: 'Reconciliation', blurb: 'Do the books agree', permission: 'reconciliation.view' },
  { href: '/rates', label: 'Buy & sell rate', blurb: 'The naira margin ladder', permission: 'fees.view' },
  { href: '/swap-fees', label: 'Swap fee', blurb: 'The coin-to-coin ladder', permission: 'fees.view' },
  { href: '/withdrawal-fees', label: 'Withdrawal fee', blurb: 'What we add to a send-out', permission: 'fees.view' },
  { href: '/ngn-withdrawal-fees', label: 'Naira withdrawal fee', blurb: 'Cashing out to a bank', permission: 'fees.view' },
  { href: '/system/general', label: 'General settings', blurb: 'What the website says', permission: 'settings.manage' },
  { href: '/system/levels', label: 'Verification levels', blurb: 'What None, Basic and Advanced may do', permission: 'levels.view' },
  { href: '/system/credentials', label: 'API keys', blurb: 'Partner secrets', permission: 'credentials.manage' },
  { href: '/fees', label: 'Fee claims', blurb: 'What is waiting to be swept', permission: 'claims.view' },
  { href: '/users', label: 'Users', blurb: 'Accounts and balances', permission: 'users.view' },
  { href: '/kyc', label: 'KYC review', blurb: 'Submissions awaiting a decision', permission: 'kyc.view' },
  { href: '/compliance', label: 'Compliance review', blurb: 'AML matches awaiting a decision', permission: 'compliance.view' },
  { href: '/system/notifications', label: 'Notifications', blurb: 'Send a message to users', permission: 'notifications.send' },
  { href: '/transactions', label: 'Transactions', blurb: 'Every trade and transfer', permission: 'transactions.view' },
  { href: '/audit', label: 'Audit log', blurb: 'Every admin action', permission: 'audit.view' },
];

export function StartHere({ me }: { me: AdminMe }) {
  const held = new Set(me.permissions);
  const open = DESTINATIONS.filter((d) => held.has(d.permission));

  return (
    <>
      <PageHeader
        title={`Welcome, ${me.name.split(' ')[0]}`}
        description="An owner decides what you can reach. Here is what is open to you."
      />

      {open.length === 0 ? (
        <Card className="max-w-xl">
          <CardContent className="p-5">
            <p className="t-body">Nothing has been granted to you yet.</p>
            <p className="text-muted-foreground t-small mt-2">
              Ask an owner to open the parts of the dashboard you need. You can still manage your
              own account from{' '}
              <Link href="/settings" className="text-primary underline-offset-2 hover:underline">
                Settings
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
          {open.map((d) => (
            <Link key={d.href} href={d.href} className="group">
              <Card className="hover:border-primary/40 h-full transition-colors">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="t-body font-medium">{d.label}</p>
                    <p className="text-muted-foreground t-caption mt-0.5">{d.blurb}</p>
                  </div>
                  <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
