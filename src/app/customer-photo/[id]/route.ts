import { NextResponse } from 'next/server';
import { getToken } from '@/lib/session';
import { API_BASE } from '@/lib/api';
import { clientForwardHeaders } from '@/lib/client-ip';
import { PHOTO_ID } from '@/lib/customer-photo';

/**
 * Serves a customer's profile photo (29 Oct 2026).
 *
 * Same reason as the admin avatar route: an <img> cannot send the httpOnly
 * admin token, so the bytes come through the server that holds it. Only a
 * photo id is forwarded, never any other path.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  if (!PHOTO_ID.test(id)) return new NextResponse(null, { status: 404 });

  const token = await getToken();
  if (!token) return new NextResponse(null, { status: 401 });

  const res = await fetch(`${API_BASE}/v1/admin/avatars/${id}`, {
    headers: { authorization: `Bearer ${token}`, ...(await clientForwardHeaders()) },
    cache: 'no-store',
  }).catch(() => null);

  if (!res || !res.ok) return new NextResponse(null, { status: res?.status ?? 502 });

  return new NextResponse(await res.arrayBuffer(), {
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
      // The id changes with every new photo. Private: it is a person's face.
      'cache-control': 'private, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
}
