'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import type { ReferralSettings } from '@/lib/types-admin';

const message = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

/**
 * Change the offer.
 *
 * Amounts travel as strings the whole way. A naira figure that has been
 * through a JavaScript number is not necessarily the figure that was typed,
 * and this one is copied onto every reward promised from here on.
 */
export async function saveReferralSettings(
  changes: Partial<{
    isEnabled: boolean;
    referrerRewardNgn: string;
    refereeRewardNgn: string;
    unlockTier: string;
    refereeTradeVolumeNgn: string;
    maxPaidReferralsPerUser: number;
    maxEarningsPerUserNgn: string;
    headline: string;
    terms: string;
  }>,
): Promise<{ settings?: ReferralSettings; error?: string }> {
  try {
    const settings = await api<ReferralSettings>('/v1/admin/referrals/settings', {
      method: 'PUT',
      body: JSON.stringify(changes),
    });
    revalidatePath('/referrals');
    return { settings };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save the referral settings') };
  }
}
