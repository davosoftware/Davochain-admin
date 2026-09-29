import 'server-only';
import { redirect } from 'next/navigation';
import { getToken } from './session';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The session is gone — the caller should bounce to /login. */
  get isUnauthorized() {
    return this.status === 401;
  }
}

/**
 * Server-side API client. Runs only on the server, so the admin token never
 * reaches the browser.
 */
export async function api<T>(
  path: string,
  init: RequestInit & { authenticated?: boolean; onUnauthorized?: 'redirect' | 'throw' } = {},
): Promise<T> {
  const { authenticated = true, onUnauthorized = 'redirect', ...rest } = init;

  const headers = new Headers(rest.headers);
  headers.set('accept', 'application/json');
  if (rest.body) headers.set('content-type', 'application/json');

  if (authenticated) {
    const token = await getToken();
    if (!token) throw new ApiError('Not signed in', 401);
    headers.set('authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      ...rest,
      headers,
      // Admin data is live operational state; a cached inventory figure is worse
      // than a slow one.
      cache: 'no-store',
    });
  } catch (err) {
    throw new ApiError(
      `Cannot reach the API at ${API_URL}. Is it running?`,
      503,
      (err as Error).message,
    );
  }

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const message =
      (parsed as { message?: string | string[] })?.message ?? `Request failed (${res.status})`;
    const text = Array.isArray(message) ? message.join(', ') : message;

    /*
     * The session ended — idled out, password changed, account deactivated.
     *
     * Showing an error card strands somebody on a page that will never load,
     * so send them to sign in with the reason attached. Via /signed-out
     * because the cookie has to go too, and cookies cannot be written while
     * rendering — only from a Route Handler or a Server Action.
     */
    if (res.status === 401 && authenticated && onUnauthorized === 'redirect') {
      redirect(`/signed-out?reason=${encodeURIComponent(text)}`);
    }

    throw new ApiError(text, res.status, parsed);
  }

  return parsed as T;
}

export const API_BASE = API_URL;

/**
 * Next signals a redirect by throwing, so any `catch` that turns errors into
 * a message will swallow one. Every action that catches has to let this back
 * out, or a dead session shows "could not save" and stays on a page it can
 * never load again.
 */
export function isRedirect(err: unknown): boolean {
  const digest = (err as { digest?: unknown })?.digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}
