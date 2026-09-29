'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import type { SiteSettings } from '@/lib/types-admin';

const message = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

export async function saveSiteSettings(
  input: Record<string, unknown>,
): Promise<{ settings?: SiteSettings; error?: string }> {
  try {
    const settings = await api<SiteSettings>('/v1/admin/site-settings', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    revalidatePath('/system/general');
    // The shell shows the company name, so it has to be rebuilt too.
    revalidatePath('/', 'layout');
    return { settings };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save these settings') };
  }
}

export async function saveSiteLogo(
  dataUrl: string,
): Promise<{ settings?: SiteSettings; error?: string }> {
  try {
    const settings = await api<SiteSettings>('/v1/admin/site-settings/logo', {
      method: 'PUT',
      body: JSON.stringify({ dataUrl }),
    });
    revalidatePath('/system/general');
    revalidatePath('/', 'layout');
    return { settings };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save that logo') };
  }
}

export async function removeSiteLogo(): Promise<{ settings?: SiteSettings; error?: string }> {
  try {
    const settings = await api<SiteSettings>('/v1/admin/site-settings/logo', { method: 'DELETE' });
    revalidatePath('/system/general');
    revalidatePath('/', 'layout');
    return { settings };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not remove that logo') };
  }
}
