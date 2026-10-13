import 'server-only';
import { headers } from 'next/headers';
import { forwardedFor } from './forwarding';

/**
 * The browser's forwarding chain, to pass on to the API on every server-side
 * call (spec §3.1). Outside a request (build time, a background task),
 * `headers()` throws; then nothing is forwarded.
 */
export async function clientForwardHeaders(): Promise<Record<string, string>> {
  try {
    return forwardedFor((await headers()).get('x-forwarded-for'));
  } catch {
    return {};
  }
}
