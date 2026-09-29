import { NextResponse } from 'next/server';
import { getToken } from '@/lib/session';
import { API_BASE } from '@/lib/api';

/**
 * Tells the API somebody is still here.
 *
 * The session clock lives on the API and only advances when a request arrives.
 * Someone filling in a long form is active but silent, so without this their
 * session would idle out underneath them and the save would be the thing that
 * discovers it. Any authenticated call touches the session; this is the
 * cheapest one.
 */
export async function GET(): Promise<NextResponse> {
  const token = await getToken();
  if (!token) return NextResponse.json({ alive: false }, { status: 401 });

  const res = await fetch(`${API_BASE}/v1/admin/me/sessions`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => null);

  if (!res || !res.ok) {
    return NextResponse.json({ alive: false }, { status: res?.status ?? 502 });
  }
  return NextResponse.json({ alive: true });
}
