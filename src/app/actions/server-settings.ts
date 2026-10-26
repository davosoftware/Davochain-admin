'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import type { ServerSetting } from '@/lib/server-settings';

const message = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

/** Save a value on System → Server settings. Owners only; the API checks the password. */
export async function saveServerSetting(input: {
  key: string;
  value: unknown;
  password: string;
  reason: string;
}): Promise<{ setting?: ServerSetting; error?: string }> {
  try {
    const setting = await api<ServerSetting>(`/v1/admin/server-settings/${encodeURIComponent(input.key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value: input.value, password: input.password, reason: input.reason.trim() }),
    });
    revalidatePath('/system/server-settings');
    return { setting };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save that setting') };
  }
}

/** Forget the dashboard value, so the server's .env value applies again. */
export async function resetServerSetting(input: {
  key: string;
  password: string;
  reason: string;
}): Promise<{ setting?: ServerSetting; error?: string }> {
  try {
    const setting = await api<ServerSetting>(`/v1/admin/server-settings/${encodeURIComponent(input.key)}`, {
      method: 'DELETE',
      body: JSON.stringify({ password: input.password, reason: input.reason.trim() }),
    });
    revalidatePath('/system/server-settings');
    return { setting };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not reset that setting') };
  }
}

/** Emergency: every customer must sign in again. Owners are emailed. */
export async function signOutAllCustomers(input: {
  password: string;
  reason: string;
}): Promise<{ result?: { signedOutAt: string; refreshTokensRevoked: number }; error?: string }> {
  try {
    const result = await api<{ signedOutAt: string; refreshTokensRevoked: number }>(
      '/v1/admin/emergency/sign-out-customers',
      { method: 'POST', body: JSON.stringify({ password: input.password, reason: input.reason.trim() }) },
    );
    return { result };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not sign customers out') };
  }
}
