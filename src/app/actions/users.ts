'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import type { FeeKind, UserDetail } from '@/lib/types-admin';
import type { CloseCheck } from '@/lib/account-closure';

export async function loadUser(
  userId: string,
): Promise<{ user?: UserDetail; error?: string }> {
  try {
    return { user: await api<UserDetail>(`/v1/admin/users/${userId}`) };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : 'Could not load this user' };
  }
}

export async function suspendUser(
  userId: string,
  reason: string,
): Promise<{ ok?: true; error?: string }> {
  try {
    await api(`/v1/admin/users/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    revalidatePath('/users');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : 'Could not suspend this user' };
  }
}

export async function reinstateUser(userId: string): Promise<{ ok?: true; error?: string }> {
  try {
    await api(`/v1/admin/users/${userId}/reinstate`, { method: 'POST' });
    revalidatePath('/users');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : 'Could not reinstate this user' };
  }
}

/** An admin removes a customer's saved withdrawal destination; the customer is emailed the reason. */
export async function removeSavedDestination(
  userId: string,
  kind: 'bank' | 'crypto',
  id: string,
  reason: string,
): Promise<{ ok?: true; error?: string }> {
  try {
    const path = kind === 'bank' ? 'bank-accounts' : 'crypto-addresses';
    await api(`/v1/admin/users/${userId}/${path}/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : 'Could not remove it' };
  }
}

export async function sendBroadcast(input: {
  title: string;
  body: string;
  userIds?: string[];
}): Promise<{ recipientCount?: number; audience?: string; error?: string }> {
  try {
    const result = await api<{ recipientCount: number; audience: string }>(
      '/v1/admin/broadcasts',
      { method: 'POST', body: JSON.stringify(input) },
    );
    revalidatePath('/system/notifications');
    return result;
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : 'Could not send' };
  }
}

export async function saveFeeLadder(input: {
  kind: FeeKind;
  asset?: string;
  bands: { minAmount: string; maxAmount: string | null; value: string }[];
  /** Put this coin back on the global default instead of setting rungs. */
  inherits?: boolean;
}): Promise<{ ok?: true; error?: string }> {
  try {
    await api('/v1/admin/fee-ladders', { method: 'PUT', body: JSON.stringify(input) });
    // Both screens read from the same ladders, and the preview on one quotes
    // numbers from the other.
    revalidatePath('/rates');
    revalidatePath('/swap-fees');
    revalidatePath('/withdrawal-fees');
    revalidatePath('/ngn-withdrawal-fees');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : 'Could not save the ladder' };
  }
}

/** What stops this account being closed right now (People → Users → Close account). */
export async function checkCloseUser(userId: string): Promise<{ check?: CloseCheck; error?: string }> {
  try {
    return { check: await api<CloseCheck>(`/v1/admin/users/${encodeURIComponent(userId)}/close-check`) };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : 'Could not check this account' };
  }
}

/** Owners only: closes the account. The API refuses while money is held or anything is in progress. */
export async function closeUser(
  userId: string,
  input: { password: string; reason: string },
): Promise<{ ok?: true; error?: string }> {
  try {
    await api(`/v1/admin/users/${encodeURIComponent(userId)}/close`, {
      method: 'POST',
      body: JSON.stringify({ password: input.password, reason: input.reason.trim() }),
    });
    revalidatePath('/users');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : 'Could not close this account' };
  }
}
