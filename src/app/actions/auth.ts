'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { clearToken, setToken } from '@/lib/session';
import { API_BASE } from '@/lib/api';

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
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });
  } catch {
    return { error: `Cannot reach the API at ${API_BASE}. Is it running?` };
  }

  if (!res.ok) {
    // Deliberately vague: confirming which half was wrong tells an attacker
    // which admin emails exist.
    return { error: 'Incorrect email or password' };
  }

  const { accessToken } = (await res.json()) as { accessToken: string };
  await setToken(accessToken);
  redirect('/');
}

export async function logout(): Promise<void> {
  await clearToken();
  redirect('/login');
}
