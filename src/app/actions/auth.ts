'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { clearToken, getToken, setToken } from '@/lib/session';
import { endServerSession } from '@/lib/logout';
import { API_BASE } from '@/lib/api';
import { clientForwardHeaders } from '@/lib/client-ip';
import { authFailureMessage } from '@/lib/auth-errors';
import { parseLoginAnswer } from '@/lib/two-step';

/**
 * M7: the ticket of a sign-in waiting for its second step. httpOnly, like the
 * session cookie: browser JavaScript never sees it. Ten minutes, as on the API.
 */
const TICKET_COOKIE = 'davochain_admin_2fa';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export interface LoginState {
  error?: string;
  /** M7: the password was right and a second step is needed. */
  step?: 'CODE' | 'SETUP';
  sentTo?: string;
  delivered?: boolean;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  let res: Response;
  try {
    res = await fetch(API_BASE + '/v1/admin/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await clientForwardHeaders()) },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });
  } catch {
    return { error: `Cannot reach the API at ${API_BASE}. Is it running?` };
  }

  if (!res.ok) {
    // Deliberately vague for every failure but 429/503: confirming which half
    // was wrong, or that an account is locked, tells an attacker which admin
    // emails exist.
    const data = await res.json().catch(() => null);
    return {
      error: authFailureMessage(res.status, data, res.headers.get('retry-after'), 'Incorrect email or password'),
    };
  }

  const answer = parseLoginAnswer(await res.json().catch(() => null));
  if (answer.kind === 'CODE' || answer.kind === 'SETUP') {
    (await cookies()).set(TICKET_COOKIE, answer.ticket, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 10 * 60,
    });
    return { step: answer.kind, sentTo: answer.sentTo, delivered: answer.delivered };
  }
  if (answer.kind !== 'token') return { error: 'Could not sign in. Try again.' };
  await setToken(answer.accessToken);
  redirect('/');
}

/** POST the waiting sign-in's ticket (and code) to one of the second-step routes. */
async function withTicket(path: string, extra: Record<string, string> = {}) {
  const ticket = (await cookies()).get(TICKET_COOKIE)?.value;
  if (!ticket) return { ok: false, expired: true, status: 401, data: null as unknown, retryAfter: null as string | null };
  try {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await clientForwardHeaders()) },
      body: JSON.stringify({ ticket, ...extra }),
      cache: 'no-store',
    });
    return { ok: res.ok, expired: res.status === 401, status: res.status, data: (await res.json().catch(() => null)) as unknown, retryAfter: res.headers.get('retry-after') };
  } catch {
    return { ok: false, expired: false, status: 0, data: { message: `Cannot reach the API at ${API_BASE}. Is it running?` } as unknown, retryAfter: null };
  }
}

const EXPIRED = 'Your sign-in expired. Sign in again with your password.';
const message = (data: unknown, fallback: string) => {
  const m = (data as { message?: string | string[] } | null)?.message;
  return Array.isArray(m) ? m.join(', ') : (m ?? fallback);
};

/** M7: the emailed code or a backup code finishes the sign-in. */
export async function verifyLoginCode(code: string): Promise<{ error?: string; expired?: boolean }> {
  const r = await withTicket('/v1/admin/auth/login/verify', { code: code.trim() });
  if (r.expired) {
    (await cookies()).delete(TICKET_COOKIE);
    return { error: EXPIRED, expired: true };
  }
  if (!r.ok) return { error: authFailureMessage(r.status, r.data, r.retryAfter, message(r.data, 'That code is not right.')) };
  (await cookies()).delete(TICKET_COOKIE);
  await setToken((r.data as { accessToken: string }).accessToken);
  redirect('/');
}

/** M7: send the code again (once a minute). */
export async function resendLoginCode(): Promise<{ sentTo?: string; delivered?: boolean; error?: string; expired?: boolean }> {
  const r = await withTicket('/v1/admin/auth/login/resend');
  if (r.expired) return { error: EXPIRED, expired: true };
  if (!r.ok) return { error: authFailureMessage(r.status, r.data, r.retryAfter, message(r.data, 'Could not send a new code')) };
  return r.data as { sentTo: string; delivered: boolean };
}

/**
 * M7: an owner requires two-step; the emailed code switches it on. Signs in and
 * hands back the backup codes, which the screen shows once before going on.
 */
export async function completeTwoStepSetup(code: string): Promise<{ backupCodes?: string[]; email?: string; error?: string; expired?: boolean }> {
  const r = await withTicket('/v1/admin/auth/login/setup', { code: code.trim() });
  if (r.expired) {
    (await cookies()).delete(TICKET_COOKIE);
    return { error: EXPIRED, expired: true };
  }
  if (!r.ok) return { error: authFailureMessage(r.status, r.data, r.retryAfter, message(r.data, 'That code is not right.')) };
  (await cookies()).delete(TICKET_COOKIE);
  const { accessToken, backupCodes, email } = r.data as { accessToken: string; backupCodes: string[]; email?: string };
  await setToken(accessToken);
  return { backupCodes, email };
}

/** M7: "Back to sign in" forgets the waiting sign-in. */
export async function abandonTwoStep(): Promise<void> {
  (await cookies()).delete(TICKET_COOKIE);
}

export async function logout(): Promise<void> {
  // M7: end the session on the API too, not just the cookie here.
  await endServerSession(await getToken(), API_BASE);
  await clearToken();
  redirect('/login');
}
