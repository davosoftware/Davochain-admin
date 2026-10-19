'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import type { DojahSettingsPatch } from '@/lib/dojah';

const message = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

/** Save the hard stop, warning level and tries. null = back to the server default. */
export async function saveDojahSettings(patch: DojahSettingsPatch): Promise<{ ok?: true; error?: string }> {
  try {
    await api('/v1/admin/dojah/settings', { method: 'PUT', body: JSON.stringify(patch) });
    revalidatePath('/system/dojah');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save the Dojah settings') };
  }
}

/** Owners only: Basic verification on, off, or back to the server default (null). */
export async function setBasicSwitch(enabled: boolean | null, password: string): Promise<{ ok?: true; error?: string }> {
  try {
    await api('/v1/admin/dojah/basic-switch', { method: 'POST', body: JSON.stringify({ enabled, password }) });
    revalidatePath('/system/dojah');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not change the switch') };
  }
}

/** The calculator: suggested numbers from Dojah's prices. Saves nothing. */
export async function suggestThresholds(input: {
  lookupPrice: number;
  amlPrice: number;
  leadDays?: number;
}): Promise<{ minBalance?: number; lowBalanceWarn?: number; workings?: string[]; error?: string }> {
  try {
    return await api('/v1/admin/dojah/thresholds', { method: 'POST', body: JSON.stringify(input) });
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not work out the numbers') };
  }
}
