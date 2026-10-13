'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import type { AlertRecipientRow } from '@/lib/types-admin';

const message = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export async function addAlertRecipient(type: string, email: string): Promise<{ row?: AlertRecipientRow; error?: string }> {
  try {
    const row = await api<AlertRecipientRow>('/v1/admin/alert-recipients', {
      method: 'POST',
      body: JSON.stringify({ type, email }),
    });
    revalidatePath('/system/alert-recipients');
    return { row };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not add that recipient') };
  }
}

export async function setAlertRecipientEnabled(id: string, enabled: boolean): Promise<{ error?: string }> {
  try {
    await api(`/v1/admin/alert-recipients/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
    revalidatePath('/system/alert-recipients');
    return {};
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not change that recipient') };
  }
}

export async function removeAlertRecipient(id: string): Promise<{ error?: string }> {
  try {
    await api(`/v1/admin/alert-recipients/${encodeURIComponent(id)}`, { method: 'DELETE' });
    revalidatePath('/system/alert-recipients');
    return {};
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not remove that recipient') };
  }
}
