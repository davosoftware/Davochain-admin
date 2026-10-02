'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import type {
  CredentialsView,
  KycTierLimit,
  NgnInFlight,
  NgnWithdrawalsState,
} from '@/lib/types-admin';

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

/** A switch outcome: the new state, an in-progress warning to show, or an error. */
export interface NgnSwitchResult {
  state?: NgnWithdrawalsState;
  inFlight?: NgnInFlight;
  error?: string;
}

/** A 409 from the API means "withdrawals are in progress — ask first". */
function ngnSwitchError(err: unknown, fallback: string): NgnSwitchResult {
  if (err instanceof ApiError && err.status === 409) {
    const body = err.body as { code?: string; count?: number; totalNgn?: string } | undefined;
    if (body?.code === 'NGN_WITHDRAWALS_IN_FLIGHT') {
      return { inFlight: { count: body.count ?? 0, totalNgn: body.totalNgn ?? '0.00' } };
    }
  }
  return { error: message(err, fallback) };
}

/** Fresh state, read at the moment an admin clicks — not when the page loaded. */
export async function getNgnWithdrawals(): Promise<NgnSwitchResult> {
  try {
    return { state: await api<NgnWithdrawalsState>('/v1/admin/withdrawals/ngn') };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not read naira withdrawals') };
  }
}

/** Switch on (owners) or off (withdrawals.manage). The API checks the password. */
export async function setNgnWithdrawals(input: {
  enabled: boolean;
  password: string;
  reason?: string;
  confirmInFlight?: boolean;
}): Promise<NgnSwitchResult> {
  try {
    const reason = input.reason?.trim();
    const state = await api<NgnWithdrawalsState>('/v1/admin/withdrawals/ngn', {
      method: 'PUT',
      body: JSON.stringify({
        enabled: input.enabled,
        password: input.password,
        ...(reason ? { reason } : {}),
        ...(input.confirmInFlight ? { confirmInFlight: true } : {}),
      }),
    });
    revalidatePath('/system/withdrawals');
    return { state };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return ngnSwitchError(err, 'Could not change naira withdrawals');
  }
}

/** Back to NGN_WITHDRAWALS_ENABLED (owners only). */
export async function resetNgnWithdrawals(input: {
  password: string;
  reason?: string;
  confirmInFlight?: boolean;
}): Promise<NgnSwitchResult> {
  try {
    const reason = input.reason?.trim();
    const state = await api<NgnWithdrawalsState>('/v1/admin/withdrawals/ngn/reset', {
      method: 'POST',
      body: JSON.stringify({
        password: input.password,
        ...(reason ? { reason } : {}),
        ...(input.confirmInFlight ? { confirmInFlight: true } : {}),
      }),
    });
    revalidatePath('/system/withdrawals');
    return { state };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return ngnSwitchError(err, 'Could not reset naira withdrawals');
  }
}
