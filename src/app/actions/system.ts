'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import type { CredentialsView, KycTierLimit } from '@/lib/types-admin';

const message = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

export async function saveKycLimits(input: {
  tier: string;
  ngnDepositSingle: string;
  ngnDepositDaily: string;
  ngnWithdrawSingle: string;
  ngnWithdrawDaily: string;
}): Promise<{ limits?: KycTierLimit[]; error?: string }> {
  try {
    const limits = await api<KycTierLimit[]>('/v1/admin/kyc-limits', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    revalidatePath('/system/kyc-limits');
    return { limits };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save those limits') };
  }
}

/**
 * The value goes one way.
 *
 * It is sent to the API, encrypted there and never returned — so this action
 * has nothing to hand back but the masked list.
 */
export async function saveCredential(
  name: string,
  value: string,
): Promise<{ view?: CredentialsView; error?: string }> {
  try {
    const view = await api<CredentialsView>('/v1/admin/credentials', {
      method: 'PUT',
      body: JSON.stringify({ name, value }),
    });
    revalidatePath('/system/credentials');
    return { view };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save that key') };
  }
}

export async function clearCredential(
  name: string,
): Promise<{ view?: CredentialsView; error?: string }> {
  try {
    const view = await api<CredentialsView>(`/v1/admin/credentials/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    revalidatePath('/system/credentials');
    return { view };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not clear that key') };
  }
}
