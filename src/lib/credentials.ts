/** System → API keys (27 Oct 2026): the keys grouped into one card per provider. */

export interface CredentialItem {
  name: string;
  group: string;
  label: string;
  hint: string;
  envVar: string;
  source: 'database' | 'environment' | 'unset';
  last4: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface ProviderCard {
  group: string;
  description: string;
  /** 'ready': every key is set (here or on the server). */
  status: 'ready' | 'missing';
  missing: number;
  credentials: CredentialItem[];
}

const PROVIDERS: Array<{ group: string; description: string }> = [
  { group: 'Quidax', description: 'Crypto: customer accounts, deposit addresses, prices, buy, sell, swap and withdrawals.' },
  { group: 'Payrep', description: 'Naira: customer account numbers, deposits, withdrawals and Treasury moves.' },
  { group: 'Dojah', description: 'Identity checks: BVN/NIN, ID document, selfie, proof of address, AML screening.' },
  { group: 'Email', description: 'Sending every email: sign-up codes, receipts and alerts. The mail server is on Server settings.' },
  { group: 'File storage', description: 'Cloudflare R2: ID documents, selfies and gift-card photos. The bucket is on Server settings.' },
  { group: 'Push', description: 'Firebase: push notifications to phones.' },
];

export function providerCards(credentials: CredentialItem[]): ProviderCard[] {
  const groups = [...new Set(credentials.map((c) => c.group))];
  const rank = (g: string) => {
    const i = PROVIDERS.findIndex((p) => p.group === g);
    return i === -1 ? PROVIDERS.length : i;
  };
  return groups
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((group) => {
      const mine = credentials.filter((c) => c.group === group);
      const missing = mine.filter((c) => c.source === 'unset').length;
      return {
        group,
        description: PROVIDERS.find((p) => p.group === group)?.description ?? '',
        status: missing === 0 ? 'ready' : 'missing',
        missing,
        credentials: mine,
      };
    });
}
