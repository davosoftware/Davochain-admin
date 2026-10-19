'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';

const message = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

/** Owners only (the API checks): the payout reserve and/or the Quidax funding account. */
export async function saveTreasurySettings(input: {
  payoutReserveNgn?: number;
  fundingBankCode?: string;
  fundingAccountNumber?: string;
  password: string;
}): Promise<{ ok?: true; error?: string }> {
  try {
    await api('/v1/admin/treasury/settings', { method: 'PUT', body: JSON.stringify(input) });
    revalidatePath('/treasury');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save') };
  }
}

/** The bank's name for an account, before saving it. */
export async function checkAccountName(bankCode: string, accountNumber: string): Promise<{ accountName?: string; bankName?: string; error?: string }> {
  try {
    return await api('/v1/admin/treasury/check-name', { method: 'POST', body: JSON.stringify({ bankCode, accountNumber }) });
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not check that account') };
  }
}

/** Owners only: send naira from the naira rail to Quidax. */
export async function sendToQuidax(amount: number, password: string): Promise<{ status?: string; reason?: string | null; error?: string }> {
  try {
    const r = await api<{ status: string; reason: string | null }>('/v1/admin/treasury/moves', {
      method: 'POST',
      body: JSON.stringify({ amount, password }),
    });
    revalidatePath('/treasury');
    return r;
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not send it') };
  }
}

/** Ask the bank about one move now, instead of waiting for the 10-minute re-check. */
export async function checkMove(id: string): Promise<{ status?: string; error?: string }> {
  try {
    const r = await api<{ status: string }>(`/v1/admin/treasury/moves/${encodeURIComponent(id)}/check`, { method: 'POST' });
    revalidatePath('/treasury');
    return r;
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not check it') };
  }
}
