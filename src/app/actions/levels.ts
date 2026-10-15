'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import type { LevelsView } from '@/lib/level-rules';

/** The whole table at once: one save, one audit entry (PUT /v1/admin/levels). */
export async function saveLevels(
  input: Omit<LevelsView, 'actions'>,
): Promise<{ view?: LevelsView; error?: string }> {
  try {
    const view = await api<LevelsView>('/v1/admin/levels', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    revalidatePath('/system/levels');
    return { view };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : 'Could not save the verification levels' };
  }
}
