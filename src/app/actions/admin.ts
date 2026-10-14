'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';

export async function claimFees(
  assets: string[],
): Promise<{ queued?: number; runId?: string; error?: string }> {
  try {
    const result = await api<{ runId: string; queued: number }>('/v1/admin/fees/claim', {
      method: 'POST',
      body: JSON.stringify({ assets }),
    });
    revalidatePath('/fees');
    return result;
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : 'Unexpected error' };
  }
}

export async function reviewKyc(
  userId: string,
  approve: boolean,
  reason?: string,
): Promise<{ ok?: true; error?: string }> {
  try {
    await api(`/v1/admin/kyc/${userId}/review`, {
      method: 'POST',
      // No tier: Basic (TIER_1) is decided through basic-decision; this route is for later tiers.
      body: JSON.stringify({ approve, reason }),
    });
    revalidatePath('/kyc');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : 'Unexpected error' };
  }
}
