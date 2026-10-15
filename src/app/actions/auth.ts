'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { clearToken, getToken, setToken } from '@/lib/session';
import { endServerSession } from '@/lib/logout';
import { API_BASE } from '@/lib/api';
import { clientForwardHeaders } from '@/lib/client-ip';
import { authFailureMessage } from '@/lib/auth-errors';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export interface LoginState {
  error?: string;
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

  const { accessToken } = (await res.json()) as { accessToken: string };
  await setToken(accessToken);
  redirect('/');
}

export async function logout(): Promise<void> {
  // M7: end the session on the API too, not just the cookie here.
  await endServerSession(await getToken(), API_BASE);
  await clearToken();
  redirect('/login');
}
