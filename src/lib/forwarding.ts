import { isIP } from 'node:net';

const MAX_LENGTH = 512;

/**
 * The X-Forwarded-For to send on to the API (spec §3.1).
 *
 * Behind Nginx the header reads "whatever the browser claimed, …, the real
 * client", and the API identifies the client by the right-most untrusted
 * entry. So only that entry is forwarded: whatever junk a browser puts to its
 * left can neither reach the API nor knock the real client out of the header
 * (which would drop everyone into one shared bucket). If the right-most entry
 * is not a real IP, nothing is forwarded.
 */
export function forwardedFor(incoming: string | null | undefined): Record<string, string> {
  if (!incoming || incoming.length > MAX_LENGTH) return {};
  const rightMost = incoming.split(',').pop()?.trim() ?? '';
  return isIP(rightMost) ? { 'x-forwarded-for': rightMost } : {};
}
