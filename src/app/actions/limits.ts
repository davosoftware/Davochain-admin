'use server';

import { api, ApiError, isRedirect } from '@/lib/api';
import type { CustomerUsage } from '@/lib/daily-limits';

/** One customer's use of each daily limit (today by default), for the Users page. */
export async function getUserLimits(
  userId: string,
  date?: string,
): Promise<{ date?: string; customer?: CustomerUsage | null; error?: string }> {
  try {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    return await api<{ date: string; customer: CustomerUsage | null }>(`/v1/admin/users/${encodeURIComponent(userId)}/limits${q}`);
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: err instanceof ApiError ? err.message : 'Could not load the limits' };
  }
}
