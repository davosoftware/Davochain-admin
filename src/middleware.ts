import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';
import { SECURITY_HEADERS } from '@/lib/security-headers';

/**
 * Fail closed. Everything needs a session except /login itself.
 *
 * This only checks that a cookie EXISTS — it cannot verify the signature,
 * because the secret lives on the API. Real enforcement is the API rejecting
 * the token; this just avoids rendering a dashboard shell that will 401 on
 * every panel.
 */
/** M7: every page carries the security headers, whichever way it is answered. */
export function middleware(request: NextRequest) {
  const response = route(request);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
  return response;
}

function route(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  // The one route that must run with a stale cookie in hand — clearing it is
  // the entire job. Blocking it here is how you build a redirect loop.
  if (pathname === '/signed-out') return NextResponse.next();

  // An invited admin has no session yet and no password to make one with, so
  // this has to be reachable signed out. The token in the link is what proves
  // who they are; the API checks it, not this.
  if (pathname === '/invite') return NextResponse.next();

  if (pathname === '/login') {
    if (hasSession) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL('/login', request.url);
    // Come back to where they were headed once signed in.
    if (pathname !== '/') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /*
   * `tinymce` is excluded because it is not a route.
   *
   * The editor loads its skin, icon pack and plugins as separate files at
   * runtime — dozens of them. Sending each through the session check costs a
   * redirect per file, and a signed-out preview or a slow cookie would render
   * the toolbar as a broken shell. They are static build output copied from
   * node_modules, and there is nothing in them to protect.
   */
  matcher: ['/((?!api|_next/static|_next/image|tinymce|favicon.ico|.*\\.svg).*)'],
};
