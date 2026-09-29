'use server';

import { API_BASE } from '@/lib/api';

/**
 * Accepting an invitation, for somebody who is not signed in.
 *
 * Like the reset actions, deliberately not routed through the `api` helper:
 * there is no session yet, so there is no token to attach and no 401 to
 * redirect on.
 */

export interface InviteCheck {
  valid: boolean;
  email?: string;
  name?: string;
  role?: 'OWNER' | 'SUB_ADMIN';
}

const messageOf = (data: unknown, fallback: string): string => {
  const m = (data as { message?: string | string[] })?.message;
  if (Array.isArray(m)) return m.join(', ');
  return m ?? fallback;
};

/**
 * Is this link still good?
 *
 * The API answers `{ valid: false }` for expired, consumed and never-existed
 * alike — telling those apart would confirm to somebody holding a guessed
 * token that they had guessed a real one.
 */
export async function checkInvite(token: string): Promise<InviteCheck> {
  try {
    const res = await fetch(`${API_BASE}/v1/admin/auth/invite?token=${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return { valid: false };
    return (await res.json()) as InviteCheck;
  } catch {
    return { valid: false };
  }
}

export async function acceptInvite(
  token: string,
  password: string,
): Promise<{ email?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/v1/admin/auth/invite/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: messageOf(data, 'Could not set your password') };
    return { email: (data as { email: string }).email };
  } catch {
    return { error: `Cannot reach the API at ${API_BASE}. Is it running?` };
  }
}
