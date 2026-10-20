'use server';

import { API_BASE } from '@/lib/api';
import { clientForwardHeaders } from '@/lib/client-ip';
import { authFailureMessage } from '@/lib/auth-errors';
import { setToken } from '@/lib/session';

/**
 * Password reset by emailed code.
 *
 * Deliberately not routed through the `api` helper: nobody is signed in yet, so
 * there is no token to attach and no session to redirect on a 401.
 */
async function post(
  path: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; retryAfter: string | null; data: unknown }> {
  try {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await clientForwardHeaders()) },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    return { ok: res.ok, status: res.status, retryAfter: res.headers.get('retry-after'), data: await res.json().catch(() => null) };
  } catch {
    return { ok: false, status: 0, retryAfter: null, data: { message: `Cannot reach the API at ${API_BASE}. Is it running?` } };
  }
}

const messageOf = (data: unknown, fallback: string): string => {
  const m = (data as { message?: string | string[] })?.message;
  if (Array.isArray(m)) return m.join(', ');
  return m ?? fallback;
};

export async function requestResetCode(
  email: string,
): Promise<{ sent?: true; error?: string }> {
  const { ok, status, retryAfter, data } = await post('/v1/admin/auth/reset/request', { email });
  // The API answers the same way whether or not the email matched, so that
  // this form cannot be used to find out which addresses are admins.
  if (!ok) return { error: authFailureMessage(status, data, retryAfter, messageOf(data, 'Could not send a code')) };
  return { sent: true };
}

export async function confirmReset(input: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ ok?: true; error?: string; signInRequired?: boolean }> {
  const { ok, status, retryAfter, data } = await post('/v1/admin/auth/reset/confirm', input);
  if (!ok) return { error: authFailureMessage(status, data, retryAfter, messageOf(data, 'Could not reset your password')) };

  // M7: with two-step sign-in on, a reset changes the password but does not
  // sign in: they sign in afresh with the new password and their code.
  if ((data as { signInRequired?: boolean }).signInRequired) return { ok: true, signInRequired: true };

  // A completed reset signs them in — they have just proved control of the
  // inbox and set a password, and asking them to type it again is friction
  // with no security in it.
  await setToken((data as { accessToken: string }).accessToken);
  return { ok: true };
}
