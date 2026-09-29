import { LadderScreen } from '@/components/ladder-screen';

export const dynamic = 'force-dynamic';

/**
 * The naira cash-out fee: what a user pays to move naira to a bank.
 *
 * Priced in naira, because naira is what leaves. Banded on the dollar value so
 * every ladder in the system breaks on one axis.
 */
export default function NgnWithdrawalFeesPage() {
  return (
    <LadderScreen
      kind="NGN_WITHDRAWAL"
      title="Naira withdrawal fee"
      description="A flat naira charge when a user cashes out to a Nigerian bank, banded by how much is leaving. The payout rail itself is not built yet — this sets the price so it is agreed before the provider is chosen."
      globalSubtitle="Naira is one currency, so this one ladder is the whole story."
      perCoin={false}
    />
  );
}
