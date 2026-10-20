'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';

/** M7: two-step sign-in, from Settings → Security. */
export interface TwoStepStatus {
  enabled: boolean;
  enabledAt: string | null;
  backupCodesLeft: number;
  required: boolean;
}

const fail = (err: unknown, fallback: string) => {
  if (isRedirect(err)) throw err;
  return { error: err instanceof ApiError ? err.message : fallback };
};

/** Password first; then a code is emailed to confirm switching on or off. */
export async function sendTwoStepCode(password: string): Promise<{ sentTo?: string; delivered?: boolean; error?: string }> {
  try {
    return await api('/v1/admin/me/two-step/code', { method: 'POST', body: JSON.stringify({ password }) });
  } catch (err) {
    return fail(err, 'Could not send a code');
  }
}

export async function enableTwoStep(code: string): Promise<{ backupCodes?: string[]; error?: string }> {
  try {
    const r = await api<{ backupCodes: string[] }>('/v1/admin/me/two-step/enable', { method: 'POST', body: JSON.stringify({ code: code.trim() }) });
    revalidatePath('/settings');
    return r;
  } catch (err) {
    return fail(err, 'Could not turn on two-step sign-in');
  }
}

export async function regenerateBackupCodes(password: string): Promise<{ backupCodes?: string[]; error?: string }> {
  try {
    const r = await api<{ backupCodes: string[] }>('/v1/admin/me/two-step/backup-codes', { method: 'POST', body: JSON.stringify({ password }) });
    revalidatePath('/settings');
    return r;
  } catch (err) {
    return fail(err, 'Could not make new backup codes');
  }
}

export async function disableTwoStep(password: string, code: string): Promise<{ ok?: true; error?: string }> {
  try {
    await api('/v1/admin/me/two-step/disable', { method: 'POST', body: JSON.stringify({ password, code: code.trim() }) });
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return fail(err, 'Could not turn off two-step sign-in');
  }
}

/** Owners only (the API checks): require two-step sign-in for every admin. */
export async function setTwoStepRequired(required: boolean, password: string): Promise<{ ok?: true; error?: string }> {
  try {
    await api('/v1/admin/settings/two-step-required', { method: 'PUT', body: JSON.stringify({ required, password }) });
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    return fail(err, 'Could not change the setting');
  }
}
