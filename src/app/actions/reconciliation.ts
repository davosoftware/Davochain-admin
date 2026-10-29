'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import type { CustomerMismatches } from '@/lib/reconciliation';

const message = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

/** One coin: the customers whose record doesn't match Quidax, and why. */
export async function loadCustomers(asset: string): Promise<{ data?: CustomerMismatches; error?: string }> {
  try {
    return { data: await api<CustomerMismatches>(`/v1/admin/reconciliation/${encodeURIComponent(asset)}/customers`) };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not load the customers') };
  }
}

/** Owners only (the API refuses anyone else): put a customer's record right, with a reason. */
export async function correctBalance(input: {
  userId: string;
  asset: string;
  direction: 'CREDIT' | 'DEBIT';
  amount: string;
  reason: string;
}): Promise<{ before?: string; after?: string; error?: string }> {
  try {
    const r = await api<{ before: string; after: string }>('/v1/admin/reconciliation/corrections', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/reconciliation');
    return r;
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not correct the balance') };
  }
}

/** Owners only: decide a send that is being checked (RECONCILING). */
export async function decideTransaction(
  id: string,
  outcome: 'COMPLETED' | 'FAILED',
  note: string,
): Promise<{ ok?: true; error?: string }> {
  try {
    await api(`/v1/admin/transactions/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ outcome, note }),
    });
    revalidatePath('/reconciliation');
    revalidatePath('/transactions');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not decide it') };
  }
}
