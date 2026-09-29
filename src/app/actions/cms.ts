'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, isRedirect } from '@/lib/api';
import type { EmailPreview, FaqRow, SocialLinkRow, StaticPageRow } from '@/lib/types-admin';

const message = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : fallback;

/**
 * The API's message is shown verbatim wherever it refuses something.
 *
 * It is the only place that knows *why* — that a page is linked from the apps
 * by its address, or that the slug is taken. Replacing those with "could not
 * save" throws away the part the admin needs to act on.
 */

// ── static pages ────────────────────────────────────────────

export async function createPage(input: {
  title: string;
  slug?: string;
  body: string;
  excerpt?: string;
  isPublished?: boolean;
}): Promise<{ page?: StaticPageRow; error?: string }> {
  try {
    const page = await api<StaticPageRow>('/v1/admin/cms/pages', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/cms/pages');
    return { page };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not create that page') };
  }
}

export async function updatePage(
  id: string,
  input: {
    title?: string;
    slug?: string;
    body?: string;
    excerpt?: string;
    isPublished?: boolean;
  },
): Promise<{ page?: StaticPageRow; error?: string }> {
  try {
    const page = await api<StaticPageRow>(`/v1/admin/cms/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    revalidatePath('/cms/pages');
    return { page };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save that page') };
  }
}

export async function deletePage(id: string): Promise<{ ok?: true; error?: string }> {
  try {
    await api(`/v1/admin/cms/pages/${id}`, { method: 'DELETE' });
    revalidatePath('/cms/pages');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not delete that page') };
  }
}

// ── FAQs ────────────────────────────────────────────────────

export async function createFaq(input: {
  question: string;
  answer: string;
  category?: string;
  isPublished?: boolean;
}): Promise<{ faq?: FaqRow; error?: string }> {
  try {
    const faq = await api<FaqRow>('/v1/admin/cms/faqs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/cms/faqs');
    return { faq };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not add that question') };
  }
}

export async function updateFaq(
  id: string,
  input: { question?: string; answer?: string; category?: string; isPublished?: boolean },
): Promise<{ faq?: FaqRow; error?: string }> {
  try {
    const faq = await api<FaqRow>(`/v1/admin/cms/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    revalidatePath('/cms/faqs');
    return { faq };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save that question') };
  }
}

export async function deleteFaq(id: string): Promise<{ ok?: true; error?: string }> {
  try {
    await api(`/v1/admin/cms/faqs/${id}`, { method: 'DELETE' });
    revalidatePath('/cms/faqs');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not delete that question') };
  }
}

/** One call for the whole arrangement — see the note on the API route. */
export async function reorderFaqs(ids: string[]): Promise<{ ok?: true; error?: string }> {
  try {
    await api('/v1/admin/cms/faqs-order', { method: 'PUT', body: JSON.stringify({ ids }) });
    revalidatePath('/cms/faqs');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save the order') };
  }
}

// ── email templates ─────────────────────────────────────────

export async function saveEmailTemplate(
  key: string,
  input: { subject?: string; body?: string; isActive?: boolean },
): Promise<{ ok?: true; error?: string }> {
  try {
    await api(`/v1/admin/cms/email-templates/${key}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    revalidatePath('/cms/emails');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save that template') };
  }
}

/** Back to the wording this install shipped with. */
export async function resetEmailTemplate(key: string): Promise<{ ok?: true; error?: string }> {
  try {
    await api(`/v1/admin/cms/email-templates/${key}`, { method: 'DELETE' });
    revalidatePath('/cms/emails');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not reset that template') };
  }
}

/**
 * Renders what is in the editor, with sample values.
 *
 * Deliberately previews the unsaved draft: seeing the finished email before
 * committing to it is the only way to catch a mangled placeholder before every
 * user receives it.
 */
export async function previewEmailTemplate(
  key: string,
  input: { subject?: string; body?: string; sendTo?: string },
): Promise<{ preview?: EmailPreview; error?: string }> {
  try {
    const preview = await api<EmailPreview>(`/v1/admin/cms/email-templates/${key}/preview`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return { preview };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not render a preview') };
  }
}

/**
 * The picture that rides under the header on one email.
 *
 * Sent as a data URL because the browser downscales it on a canvas first —
 * which keeps a 12 MP phone photo off the wire and saves the API a resizing
 * dependency. Same reasoning as the admin avatar.
 */
export async function setEmailImage(
  key: string,
  dataUrl: string,
  alt?: string,
): Promise<{ imageUrl?: string; imageAlt?: string | null; error?: string }> {
  try {
    const result = await api<{ imageUrl: string; imageAlt: string | null }>(
      `/v1/admin/cms/email-templates/${key}/image`,
      { method: 'PUT', body: JSON.stringify({ dataUrl, alt }) },
    );
    revalidatePath('/cms/emails');
    return result;
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save that picture') };
  }
}

export async function clearEmailImage(key: string): Promise<{ ok?: true; error?: string }> {
  try {
    await api(`/v1/admin/cms/email-templates/${key}/image`, { method: 'DELETE' });
    revalidatePath('/cms/emails');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not remove that picture') };
  }
}

/** The wording under the social icons on every email. One row, global. */
export async function saveEmailFooter(input: {
  emailLegalName?: string;
  emailAddressLine?: string;
  emailOptInNote?: string;
  emailUnsubscribeNote?: string;
  emailUnsubscribeUrl?: string;
}): Promise<{ ok?: true; error?: string }> {
  try {
    await api('/v1/admin/site-settings', { method: 'PUT', body: JSON.stringify(input) });
    revalidatePath('/cms/emails');
    revalidatePath('/system/general');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save the footer') };
  }
}

// ── social links ────────────────────────────────────────────

export async function createSocial(input: {
  label: string;
  url: string;
}): Promise<{ link?: SocialLinkRow; error?: string }> {
  try {
    const link = await api<SocialLinkRow>('/v1/admin/cms/socials', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/cms/socials');
    return { link };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not add that link') };
  }
}

export async function updateSocial(
  id: string,
  input: { label?: string; url?: string; isEnabled?: boolean },
): Promise<{ link?: SocialLinkRow; error?: string }> {
  try {
    const link = await api<SocialLinkRow>(`/v1/admin/cms/socials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    revalidatePath('/cms/socials');
    return { link };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save that link') };
  }
}

export async function deleteSocial(id: string): Promise<{ ok?: true; error?: string }> {
  try {
    await api(`/v1/admin/cms/socials/${id}`, { method: 'DELETE' });
    revalidatePath('/cms/socials');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not remove that link') };
  }
}

export async function reorderSocials(ids: string[]): Promise<{ ok?: true; error?: string }> {
  try {
    await api('/v1/admin/cms/socials-order', { method: 'PUT', body: JSON.stringify({ ids }) });
    revalidatePath('/cms/socials');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save the order') };
  }
}

export async function setSocialIcon(
  id: string,
  dataUrl: string,
): Promise<{ iconUrl?: string; error?: string }> {
  try {
    const result = await api<{ iconUrl: string }>(`/v1/admin/cms/socials/${id}/icon`, {
      method: 'PUT',
      body: JSON.stringify({ dataUrl }),
    });
    revalidatePath('/cms/socials');
    return result;
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not save that icon') };
  }
}

export async function clearSocialIcon(id: string): Promise<{ ok?: true; error?: string }> {
  try {
    await api(`/v1/admin/cms/socials/${id}/icon`, { method: 'DELETE' });
    revalidatePath('/cms/socials');
    return { ok: true };
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: message(err, 'Could not remove that icon') };
  }
}
