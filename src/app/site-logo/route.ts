import { NextResponse } from 'next/server';
import { API_BASE } from '@/lib/api';
import { clientForwardHeaders } from '@/lib/client-ip';

/**
 * The site logo, proxied.
 *
 * Public on the API, so no token is needed — this exists so the admin can
 * render it from its own origin rather than hard-coding the API host into an
 * <img> that then breaks in every environment but this one.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const version = new URL(request.url).searchParams.get('v') ?? '';
  const res = await fetch(`${API_BASE}/v1/site/logo?v=${encodeURIComponent(version)}`, {
    headers: await clientForwardHeaders(),
    cache: 'no-store',
  }).catch(() => null);

  if (!res || !res.ok) return new NextResponse(null, { status: res?.status ?? 502 });

  return new NextResponse(await res.arrayBuffer(), {
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'x-content-type-options': 'nosniff',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
