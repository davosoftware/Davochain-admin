import { NextResponse } from 'next/server';
import { getToken } from '@/lib/session';
import { API_BASE } from '@/lib/api';

/**
 * Serves a photograph somebody sent with a gift card.
 *
 * A browser `<img>` cannot send an Authorization header and the admin token is
 * httpOnly by design, so these bytes have to come through the server that
 * holds the cookie — the same reason the avatar route exists.
 *
 * **Brand logos do not come through here.** They are public, versioned and
 * immutable on the API, so an `<img>` points straight at it — the app loads
 * the same URL. Proxying those would add a hop per row and a second cache for
 * nothing.
 *
 * The one shape below is the only path this forwards. A catch-all that passed
 * anything through with an admin token would be a proxy for the whole admin
 * API, which is a far larger thing than a picture route.
 */
const TRADE_IMAGE = /^trades\/[0-9a-f-]{36}\/images\/[0-9a-f-]{36}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await params;
  const joined = path.join('/');

  if (!TRADE_IMAGE.test(joined)) return new NextResponse(null, { status: 404 });

  const token = await getToken();
  if (!token) return new NextResponse(null, { status: 401 });

  const res = await fetch(`${API_BASE}/v1/admin/giftcards/${joined}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => null);

  if (!res || !res.ok) return new NextResponse(null, { status: res?.status ?? 502 });

  return new NextResponse(await res.arrayBuffer(), {
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
      /*
       * Private, and only for an hour.
       *
       * This is somebody's voucher. It must not sit in a shared cache, and it
       * should not outlive the session that was allowed to see it by much.
       */
      'cache-control': 'private, max-age=3600',
    },
  });
}
