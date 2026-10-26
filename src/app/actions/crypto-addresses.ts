'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import type { AdminAddress, AutoCreateNetwork } from '@/lib/crypto-addresses';

const message = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

/** Waiting: ask Quidax again. Failed: try again (a late address first, else one new request). */
export async function retryAddress(id: string): Promise<{ address?: AdminAddress; error?: string }> {
  try {
    const address = await api<AdminAddress>(`/v1/admin/deposit-addresses/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
    });
    revalidatePath('/crypto-addresses');
    return { address };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not try that address again') };
  }
}

/** Switch "Create in advance" for one coin network. Needs inventory.manage; the API checks the password. */
export async function setAutoCreate(input: {
  asset: string;
  network: string;
  enabled: boolean;
  password: string;
}): Promise<{ network?: AutoCreateNetwork; error?: string }> {
  try {
    const network = await api<AutoCreateNetwork>(
      `/v1/admin/asset-networks/${encodeURIComponent(input.asset)}/${encodeURIComponent(input.network)}/auto-create`,
      { method: 'PUT', body: JSON.stringify({ enabled: input.enabled, password: input.password }) },
    );
    revalidatePath('/crypto-addresses');
    return { network };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not change that switch') };
  }
}
