import { LadderScreen } from '@/components/ladder-screen';

export const dynamic = 'force-dynamic';

/**
 * The withdrawal fee: what the platform adds to sending a coin out.
 *
 * Only half of what the user pays. The chain takes its own cut, quoted by
 * Quidax at the moment of the send and set by nobody here — the two are always
 * shown as separate lines so this ladder cannot appear to move on its own.
 */
export default function WithdrawalFeesPage() {
  return (
    <LadderScreen
      kind="WITHDRAWAL"
      title="Withdrawal fee"
      description="What we add to an external crypto withdrawal, in dollars, banded by how much is going out. The chain's own fee is quoted separately at send time and added on top — the user sees both lines."
      globalSubtitle="Every coin without its own withdrawal ladder falls back to this."
    />
  );
}
