'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeftRight,
  Landmark,
  ArrowUpFromLine,
  Banknote,
  Bell,
  SlidersHorizontal,
  Users,
  Coins,
  FileText,
  Share2,
  Mail,
  MessageCircleQuestion,
  KeyRound,
  Gift,
  CreditCard,
  LayoutDashboard,
  Layers,
  Store,
  Tags,
  PiggyBank,
  Power,
  Repeat,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  Sliders,
  Wallet,
  MailWarning,
  ShieldAlert,
  Fingerprint,
  ServerCog,
  QrCode,
  Gauge,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Grouped by what you are doing, not by which controller serves it.
 * "Watch" is the read-only morning check; "Operate" is where money moves.
 *
 * Each entry names the permission that opens it. A sub-admin sees only what
 * they can actually use — a link that always 403s is worse than no link.
 */
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: string | null;
  /** Owners only, whatever permissions a sub-admin holds. */
  ownerOnly?: boolean;
}

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Watch',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard, permission: 'overview.view' },
      { href: '/treasury', label: 'Treasury', icon: Landmark, permission: 'treasury.view' },
      { href: '/inventory', label: 'Inventory desk', icon: Wallet, permission: 'inventory.view' },
      {
        href: '/reconciliation',
        label: 'Reconciliation',
        icon: Scale,
        permission: 'reconciliation.view',
      },
    ],
  },
  {
    label: 'Fees',
    items: [
      { href: '/rates', label: 'Buy margin', icon: Sliders, permission: 'fees.view' },
      { href: '/sell-margin', label: 'Sell margin', icon: Sliders, permission: 'fees.view' },
      { href: '/swap-fees', label: 'Swap fee', icon: Repeat, permission: 'fees.view' },
      {
        href: '/withdrawal-fees',
        label: 'Withdrawal fee',
        icon: ArrowUpFromLine,
        permission: 'fees.view',
      },
      {
        href: '/ngn-withdrawal-fees',
        label: 'Naira withdrawal fee',
        icon: Banknote,
        permission: 'fees.view',
      },
      { href: '/fees', label: 'Fee claims', icon: Coins, permission: 'claims.view' },
      // What the four ladders above actually earned. Last in the group, because
      // it is the consequence of the four settings that precede it.
      {
        href: '/earnings',
        label: 'Earning manager',
        icon: PiggyBank,
        permission: 'earnings.view',
      },
      // What the platform gives away, next to what it earns.
      {
        href: '/referrals',
        label: 'Rewards & referrals',
        icon: Gift,
        permission: 'referrals.view',
      },
    ],
  },
  {
    label: 'Gift cards',
    items: [
      {
        href: '/giftcards/categories',
        label: 'Brand categories',
        icon: Layers,
        permission: 'giftcards.view',
      },
      { href: '/giftcards/brands', label: 'Brands', icon: Store, permission: 'giftcards.view' },
      {
        href: '/giftcards/types',
        label: 'Card categories',
        icon: Tags,
        permission: 'giftcards.view',
      },
      {
        href: '/giftcards/trades',
        label: 'Card trades',
        icon: CreditCard,
        permission: 'giftcards.view',
      },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/users', label: 'Users', icon: Users, permission: 'users.view' },
      { href: '/kyc', label: 'KYC review', icon: ShieldCheck, permission: 'kyc.view' },
      { href: '/compliance', label: 'Compliance review', icon: ShieldAlert, permission: 'compliance.view' },
      { href: '/crypto-addresses', label: 'Crypto addresses', icon: QrCode, permission: 'users.view' },
      { href: '/limits', label: 'Daily limits', icon: Gauge, permission: 'users.view' },
    ],
  },
  {
    label: 'CMS',
    items: [
      {
        href: '/cms/pages',
        label: 'Static content',
        icon: FileText,
        permission: 'content.view',
      },
      {
        href: '/cms/emails',
        label: 'Email templates',
        icon: Mail,
        permission: 'content.view',
      },
      {
        href: '/cms/faqs',
        label: 'FAQs',
        icon: MessageCircleQuestion,
        permission: 'content.view',
      },
      {
        href: '/cms/socials',
        label: 'Social links',
        icon: Share2,
        permission: 'content.view',
      },
    ],
  },
  {
    label: 'Records',
    items: [
      {
        href: '/transactions',
        label: 'Transactions',
        icon: ArrowLeftRight,
        permission: 'transactions.view',
      },
      { href: '/audit', label: 'Audit log', icon: ScrollText, permission: 'audit.view' },
    ],
  },
  {
    label: 'Account',
    items: [
      // No permission: your own account is always yours.
      { href: '/settings', label: 'Settings', icon: Settings, permission: null },
    ],
  },
  {
    label: 'System',
    items: [
      {
        href: '/system/general',
        label: 'General settings',
        icon: SlidersHorizontal,
        permission: 'settings.manage',
      },
      {
        href: '/system/withdrawals',
        label: 'Withdrawals',
        icon: Power,
        permission: 'withdrawals.manage',
      },
      {
        href: '/system/levels',
        label: 'Verification levels',
        icon: ShieldCheck,
        permission: 'levels.view',
      },
      {
        href: '/system/notifications',
        label: 'Notifications',
        icon: Bell,
        permission: 'notifications.send',
      },
      {
        href: '/system/alert-recipients',
        label: 'Alert recipients',
        icon: MailWarning,
        permission: 'alerts.manage',
      },
      { href: '/system/dojah', label: 'Dojah', icon: Fingerprint, permission: 'settings.manage' },
      {
        href: '/system/credentials',
        label: 'API keys',
        icon: KeyRound,
        permission: 'credentials.manage',
      },
      {
        href: '/system/server-settings',
        label: 'Server settings',
        icon: ServerCog,
        permission: null,
        ownerOnly: true,
      },
    ],
  },
];

export function Nav({
  permissions,
  isOwner = false,
  onNavigate,
}: {
  permissions: string[];
  isOwner?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const held = new Set(permissions);

  const visible = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((i) =>
        i.ownerOnly ? isOwner : i.permission === null || held.has(i.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {visible.map((group) => (
        <NavGroup key={group.label} group={group} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function NavGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: { label: string; items: NavItem[] };
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="eyebrow px-2 pb-1">{group.label}</span>

      {group.items.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  't-small flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors',
                  active
                    ? 'bg-sidebar-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                )}
              >
                <item.icon className={cn('size-4', active && 'text-primary')} />
                {item.label}
              </Link>
        );
      })}
    </div>
  );
}
