import { NextResponse } from 'next/server';
import { getToken } from '@/lib/session';
import { API_BASE } from '@/lib/api';
import { clientForwardHeaders } from '@/lib/client-ip';
import { documentApiPath } from '@/lib/kyc-documents';

/**
 * Opens a customer's ID document (H8).
 *
 * The admin token is httpOnly, so the file comes through this server route,
 * like gift-card photos do. The API checks "kyc.view" and records who opened
 * which document before sending it. Only a document id is accepted, so this
 * can never forward anywhere else in the admin API.
 *
 * Nothing keeps a copy: no-store all the way, and the browser is told not to
 * guess the type and not to run anything inside it.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const path = documentApiPath(id);
  if (!path) return new NextResponse(null, { status: 404 });

  const token = await getToken();
  if (!token) return new NextResponse(null, { status: 401 });

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { authorization: `Bearer ${token}`, ...(await clientForwardHeaders()) },
    cache: 'no-store',
  }).catch(() => null);

  if (!res || !res.ok) {
    // The API's own words (e.g. "uploaded before secure storage", "storage unavailable").
    const body = res ? await res.json().catch(() => null) : null;
    const message = (body as { message?: string } | null)?.message ?? 'Could not open this document.';
    return new NextResponse(message, { status: res?.status ?? 502, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  }

  const headers: Record<string, string> = {
    'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "sandbox; default-src 'none'",
  };
  const disposition = res.headers.get('content-disposition');
  if (disposition) headers['content-disposition'] = disposition;
  return new NextResponse(await res.arrayBuffer(), { headers });
}
