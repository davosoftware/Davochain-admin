import { NextResponse } from 'next/server';
import { getToken } from '@/lib/session';
import { API_BASE } from '@/lib/api';

/**
 * Serves an admin's picture from the API.
 *
 * A browser <img> cannot send an Authorization header, and the admin token is
 * httpOnly by design, so the bytes have to come through the server that holds
 * the cookie. This is the whole reason the route exists.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const token = await getToken();
  if (!token) return new NextResponse(null, { status: 401 });

  const res = await fetch(`${API_BASE}/v1/admin/admins/${encodeURIComponent(id)}/avatar`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => null);

  if (!res || !res.ok) return new NextResponse(null, { status: res?.status ?? 502 });

  return new NextResponse(await res.arrayBuffer(), {
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
      // Safe to hold onto: the URL carries a version, and a new picture is a
      // new version. Private, because it is one identifiable person's face.
      'cache-control': 'private, max-age=31536000, immutable',
    },
  });
}
