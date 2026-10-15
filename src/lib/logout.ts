/**
 * End this admin session on the API (PROJECT_REVIEW M7).
 *
 * Deleting the cookie alone left the session valid on the server until it
 * idled out. Never throws: an API that is down must not stop someone signing
 * out of the dashboard; the cookie is cleared either way.
 */
export async function endServerSession(
  token: string | null,
  apiBase: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!token) return;
  try {
    await fetchImpl(`${apiBase}/v1/admin/me/logout`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    // Signing out still clears the cookie below.
  }
}
