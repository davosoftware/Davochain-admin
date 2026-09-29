import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * Drops the session cookie, then sends them to sign in.
 *
 * A page cannot do this itself: cookies may only be written from a Server
 * Action or a Route Handler, never while rendering. So when `api()` sees a 401
 * it redirects here, and here the cookie is actually cleared — without which
 * the middleware would see a stale cookie on /login, bounce back to /, and
 * loop forever.
 */
export function GET(request: NextRequest): NextResponse {
  const reason = request.nextUrl.searchParams.get('reason');

  const url = new URL('/login', request.url);
  if (reason) url.searchParams.set('reason', reason);

  const res = NextResponse.redirect(url);
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
