'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';

/** Decide a Basic verification waiting for identity review. Audited by the API. */
export async function decideBasic(userId: string, approve: boolean, reason: string): Promise<{ ok?: true; state?: string; error?: string }> {
  try {
    const r = await api<{ state: string }>(`/v1/admin/kyc/${encodeURIComponent(userId)}/basic-decision`, {
      method: 'POST',
      body: JSON.stringify({ approve, reason }),
    });
    revalidatePath('/kyc');
    return { ok: true, state: r.state };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : 'Could not save the decision' };
  }
}

/** Decide an Advanced check waiting for a person (spec 2026-10-21 §8). Audited by the API. */
export async function decideAdvanced(id: string, approve: boolean, reason: string, note?: string): Promise<{ ok?: true; state?: string; error?: string }> {
  try {
    const r = await api<{ state: string }>(`/v1/admin/kyc/advanced/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      body: JSON.stringify({ approve, reason, note }),
    });
    revalidatePath('/kyc/advanced');
    return { ok: true, state: r.state };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : 'Could not save the decision' };
  }
}
