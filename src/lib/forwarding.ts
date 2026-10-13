const MAX_LENGTH = 512;
const MAX_HOPS = 10;
const IP_LIKE = /^[0-9A-Fa-f:.]{2,45}$/;

/**
 * The X-Forwarded-For to send on to the API (spec §3.1).
 *
 * Behind Nginx this is "whatever the browser claimed, then the real client".
 * The API trusts only the right-most untrusted entry, so passing it on
 * unchanged is safe. Anything that is not a short list of IP-like entries is
 * dropped rather than forwarded: the API then sees the dashboard's own
 * address, the old shared bucket, instead of something malformed.
 */
export function forwardedFor(incoming: string | null | undefined): Record<string, string> {
  if (!incoming || incoming.length > MAX_LENGTH) return {};
  const hops = incoming.split(',').map((s) => s.trim());
  if (hops.length === 0 || hops.length > MAX_HOPS) return {};
  if (hops.some((h) => !IP_LIKE.test(h))) return {};
  return { 'x-forwarded-for': hops.join(', ') };
}
