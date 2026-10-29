/** The 32-character id in a customer photo link (29 Oct 2026). */
export const PHOTO_ID = /^[0-9a-f]{32}$/;

/**
 * Where an <img> loads a customer's profile photo from: this dashboard's own
 * route, which adds the admin sign-in the browser cannot send itself.
 */
export function customerPhotoSrc(apiUrl: string | null | undefined): string | null {
  const id = apiUrl?.match(/^\/v1\/admin\/avatars\/([^/]+)$/)?.[1];
  return id && PHOTO_ID.test(id) ? `/customer-photo/${id}` : null;
}
