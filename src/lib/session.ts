import 'server-only';
import { cookies } from 'next/headers';

/**
 * The admin token lives in an httpOnly cookie, never localStorage.
 *
 * A token in localStorage is readable by any script that ends up on the page —
 * one bad dependency and an attacker has an admin session that can move the
 * treasury. httpOnly means JavaScript cannot read it at all, so every
 * authenticated call is proxied through a server route.
 */
export const SESSION_COOKIE = 'davochain_admin';

export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // Matches ADMIN_JWT_EXPIRES_IN on the API. If the cookie outlived the
    // token the UI would look signed in and every call would 401.
    maxAge: 60 * 60 * 8,
  });
}

export async function clearToken(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Decode the JWT payload for display. NOT verification — the API does that. */
export function readClaims(token: string): { sub: string; email: string; exp: number } | null {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
